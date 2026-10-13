/**
 * 用代码合成全部音效，写成 public/sfx/*.wav（48kHz / 16bit / 单声道），不用任何音频素材。
 *
 * 一次性音效（tick、脚步、砸落、钟、门、木头……）在 SfxTrack 里按 script.ts 的帧号摆放；
 * 环境底噪（bed-*）的长度和内部变化（降半音、风声停、静音）直接从 script.ts 的屏时间算出来。
 */
import fs from 'node:fs';
import path from 'node:path';
import {FPS} from '../src/data/script';
import {OVERLAP, cueTimes, sceneRange, screen} from '../src/data/timeline';

const SR = 48000;
const OUT = path.join(__dirname, '..', 'public', 'sfx');
fs.mkdirSync(OUT, {recursive: true});

// —— 基础 DSP
let seed = 1234567;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const buf = (sec: number) => new Float32Array(Math.ceil(sec * SR));

const lowpass = (x: Float32Array, hz: number | ((i: number) => number)) => {
  const y = new Float32Array(x.length);
  let s = 0;
  for (let i = 0; i < x.length; i++) {
    // 截止频率必须为正，否则一阶滤波器发散成 NaN（整条音轨会变成静音）
    const f = Math.max(1, typeof hz === 'number' ? hz : hz(i));
    const a = 1 - Math.exp((-2 * Math.PI * f) / SR);
    s += a * (x[i] - s);
    y[i] = s;
  }
  return y;
};
const highpass = (x: Float32Array, hz: number) => {
  const lp = lowpass(x, hz);
  return x.map((v, i) => v - lp[i]);
};
/** 二阶带通（RBJ） */
const bandpass = (x: Float32Array, hz: number | ((i: number) => number), q: number) => {
  const y = new Float32Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = typeof hz === 'number' ? hz : hz(i);
    const w = (2 * Math.PI * f) / SR;
    const al = Math.sin(w) / (2 * q);
    const b0 = al;
    const a0 = 1 + al;
    const a1 = -2 * Math.cos(w);
    const a2 = 1 - al;
    const v = (b0 * x[i] - b0 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
};
/** Schroeder 混响：4 个梳状 + 2 个全通 */
const reverb = (x: Float32Array, size: number, mix: number, tail = 2) => {
  const n = x.length + Math.floor(tail * SR);
  const dry = new Float32Array(n);
  dry.set(x);
  const wet = new Float32Array(n);
  const combs = [1557, 1617, 1491, 1422].map((d) => Math.floor(d * size));
  for (const d of combs) {
    const line = new Float32Array(d);
    let p = 0;
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const out = line[p];
      lp = out * 0.7 + lp * 0.3;
      line[p] = dry[i] + lp * 0.84;
      wet[i] += out * 0.25;
      p = (p + 1) % d;
    }
  }
  for (const d of [225, 556].map((v) => Math.floor(v * size))) {
    const line = new Float32Array(d);
    let p = 0;
    for (let i = 0; i < n; i++) {
      const b = line[p];
      const v = wet[i];
      line[p] = v + b * 0.5;
      wet[i] = b - v * 0.5;
      p = (p + 1) % d;
    }
  }
  return dry.map((v, i) => v * (1 - mix) + wet[i] * mix);
};
const env = (i: number, a: number, d: number) => {
  const t = i / SR;
  return t < a ? t / a : Math.exp(-(t - a) / d);
};
const normalize = (x: Float32Array, peak: number) => {
  let m = 1e-9;
  for (const v of x) m = Math.max(m, Math.abs(v));
  return x.map((v) => (v / m) * peak);
};
const fadeEdges = (x: Float32Array, inS = 0.005, outS = 0.05) => {
  const a = Math.floor(inS * SR);
  const b = Math.floor(outS * SR);
  for (let i = 0; i < a && i < x.length; i++) x[i] *= i / a;
  for (let i = 0; i < b && i < x.length; i++) x[x.length - 1 - i] *= i / b;
  return x;
};
const add = (a: Float32Array, b: Float32Array, k = 1) => {
  const n = Math.max(a.length, b.length);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) y[i] = (a[i] ?? 0) + (b[i] ?? 0) * k;
  return y;
};
const writeWav = (name: string, x: Float32Array) => {
  let peak = 0;
  for (const v of x) {
    if (!Number.isFinite(v)) throw new Error(`${name}: 合成结果里有 NaN / Infinity`);
    peak = Math.max(peak, Math.abs(v));
  }
  if (peak < 1e-3) throw new Error(`${name}: 合成结果是静音`);
  const data = Buffer.alloc(x.length * 2);
  for (let i = 0; i < x.length; i++) data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767))), i * 2);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([h, data]));
  console.log(`  ${name}.wav  ${(x.length / SR).toFixed(2)}s`);
};
const sine = (sec: number, f: (t: number) => number, amp: (i: number) => number) => {
  const x = buf(sec);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    ph += (2 * Math.PI * f(i / SR)) / SR;
    x[i] = Math.sin(ph) * amp(i);
  }
  return x;
};

// —— 一次性音效
const tick = () => {
  const n = buf(0.05).map((_, i) => noise() * env(i, 0.0005, 0.004));
  const p = sine(0.05, () => 2400, (i) => env(i, 0.0005, 0.01) * 0.3);
  return fadeEdges(normalize(reverb(add(highpass(n, 2500), p), 0.5, 0.25, 0.4), 0.7));
};
const step = (far: boolean) => {
  const n = lowpass(buf(0.12).map((_, i) => noise() * env(i, 0.002, far ? 0.03 : 0.045)), far ? 500 : 1100);
  const t = sine(0.12, () => 95, (i) => env(i, 0.002, 0.035) * 0.8);
  return fadeEdges(normalize(reverb(add(n, t), far ? 1.3 : 1.05, far ? 0.55 : 0.35, 1.2), 0.75));
};
const slam = () => {
  const sub = sine(1.4, (t) => 42 + 90 * Math.exp(-t / 0.08), (i) => env(i, 0.003, 0.45));
  const hitN = lowpass(buf(0.1).map((_, i) => noise() * env(i, 0.001, 0.02)), 2800);
  const body = lowpass(buf(0.6).map((_, i) => noise() * env(i, 0.002, 0.12)), 260);
  return fadeEdges(normalize(reverb(add(add(sub, hitN, 0.5), body, 0.8), 1.2, 0.25, 1.5), 0.9));
};
const pitchDown = () =>
  fadeEdges(
    normalize(
      add(
        sine(3.5, (t) => 61.7 - 3.4 * Math.min(1, t / 1.6), (i) => Math.min(1, i / SR / 0.4) * Math.exp(-Math.max(0, i / SR - 1.8) / 0.9)),
        sine(3.5, (t) => 123.4 - 6.8 * Math.min(1, t / 1.6), (i) => 0.3 * Math.min(1, i / SR / 0.4) * Math.exp(-Math.max(0, i / SR - 1.8) / 0.9)),
      ),
      0.6,
    ),
    0.05,
    0.4,
  );
const whoosh = () => {
  const len = 1.4;
  const x = buf(len).map((_, i) => noise() * Math.pow(Math.sin(Math.PI * Math.min(1, i / SR / len)), 2));
  const y = bandpass(x, (i) => 250 + 1500 * Math.sin(Math.PI * (i / SR / len)), 1.2);
  return fadeEdges(normalize(reverb(y, 0.9, 0.2, 0.6), 0.7));
};
const bell = () => {
  const f0 = 98;
  const partials: [number, number, number][] = [
    [0.5, 0.6, 5],
    [1, 1, 3.8],
    [1.19, 0.5, 2.6],
    [1.56, 0.35, 2.0],
    [2.0, 0.4, 1.6],
    [2.74, 0.2, 1.1],
    [3.0, 0.15, 0.9],
    [4.1, 0.08, 0.6],
  ];
  let x = buf(6);
  for (const [r, a, d] of partials) x = add(x, sine(6, () => f0 * r, (i) => a * env(i, 0.004, d)));
  const strike = lowpass(buf(0.05).map((_, i) => noise() * env(i, 0.0005, 0.01)), 1800);
  return fadeEdges(normalize(reverb(add(x, strike, 0.4), 1.5, 0.35, 3), 0.85), 0.002, 0.6);
};
const door = () => {
  const thump = sine(0.6, (t) => 68 + 30 * Math.exp(-t / 0.03), (i) => env(i, 0.002, 0.09));
  const click = highpass(buf(0.04).map((_, i) => noise() * env(i, 0.0005, 0.006)), 1800);
  const rattle = bandpass(buf(0.25).map((_, i) => noise() * env(i, 0.01, 0.05)), 420, 3);
  return fadeEdges(normalize(reverb(add(add(thump, click, 0.35), rattle, 0.6), 1.25, 0.4, 1.8), 0.85));
};
const wood = () => {
  const ex = buf(0.5).map((_, i) => noise() * env(i, 0.0005, 0.004));
  const y = add(bandpass(ex, 210, 18), bandpass(ex, 530, 14), 0.6);
  const t = sine(0.5, () => 120, (i) => env(i, 0.001, 0.05) * 0.4);
  return fadeEdges(normalize(reverb(add(y, t), 1.1, 0.3, 1.4), 0.85));
};
const hush = () => {
  // 空气被抽走：低频噪声快速收窄、变暗，然后几乎无声
  const len = 1.6;
  const x = buf(len).map((_, i) => noise() * Math.exp(-i / SR / 0.35) * Math.min(1, i / SR / 0.02));
  return fadeEdges(normalize(lowpass(x, (i) => 1800 * Math.exp(-i / SR / 0.25) + 60), 0.6), 0.005, 0.3);
};
const beep = () =>
  fadeEdges(
    normalize(reverb(add(sine(0.16, () => 1320, (i) => env(i, 0.008, 0.05)), sine(0.16, () => 1980, (i) => 0.2 * env(i, 0.008, 0.03))), 0.6, 0.2, 0.5), 0.5),
  );
const silenceHit = () => {
  const s = sine(1.2, (t) => 48 + 20 * Math.exp(-t / 0.05), (i) => env(i, 0.004, 0.25));
  return fadeEdges(normalize(reverb(s, 1.4, 0.3, 1), 0.8));
};

// —— 环境底噪：时长与内部变化来自 script.ts
const f2i = (f: number, start: number) => Math.round(((f - start) / FPS) * SR);

const bedHall = () => {
  const r = sceneRange('opening');
  const start = r.start - OVERLAP / 2;
  const len = (r.end - r.start + OVERLAP) / FPS;
  const down = f2i(screen('s03').start, start); // 低频长音下沉半个音
  const windOff = f2i(screen('s04').start, start); // 风声停
  const n = Math.ceil(len * SR);
  const semis = (i: number) => Math.min(1, Math.max(0, (i - down) / (SR * 1.6)));
  const drone = sine(len, (t) => 55 * Math.pow(2, -semis(t * SR) / 12), (i) => 0.55 * (0.85 + 0.15 * Math.sin(i / SR / 1.7)));
  const fifth = sine(len, (t) => 82.4 * Math.pow(2, -semis(t * SR) / 12), (i) => 0.18 * (0.8 + 0.2 * Math.sin(i / SR / 2.3 + 1)));
  const wnd = lowpass(
    new Float32Array(n).map(() => noise()),
    (i) => Math.max(60, 300 + 160 * Math.sin(i / SR / 1.9) + 90 * Math.sin(i / SR / 0.7)),
  ).map((v, i) => v * 1.9 * (1 - Math.min(1, Math.max(0, (i - windOff) / (SR * 0.5)))));
  return fadeEdges(normalize(add(add(drone, fifth), wnd), 0.32), 0.8, 0.5);
};
const bedCorridor = () => {
  const r = sceneRange('corridor');
  const start = r.start - OVERLAP / 2;
  const len = (r.end - r.start + OVERLAP) / FPS + 1;
  const n = Math.ceil(len * SR);
  const airOff = f2i(screen('s10').start, start); // 环境音抽空，只剩低频
  const mute = f2i(cueTimes('s11', 'silence-hit')[0], start); // 静音 0.5 秒
  const hum = sine(len, () => 48, () => 0.4);
  const hum2 = sine(len, () => 96, () => 0.08);
  const air = lowpass(new Float32Array(n).map(() => noise()), 700).map((v, i) => v * 0.9 * (1 - Math.min(1, Math.max(0, (i - airOff) / (SR * 0.4)))));
  const mix = add(add(hum, hum2), air);
  for (let i = 0; i < n; i++) {
    const t = (i - mute) / SR;
    if (t >= 0) mix[i] *= t < 0.5 ? 0.02 : Math.min(1, 0.02 + (t - 0.5) * 0.8);
  }
  return fadeEdges(normalize(mix, 0.3), 0.6, 0.8);
};

console.log('synth sfx →', OUT);
writeWav('tick', tick());
writeWav('steps', step(false));
writeWav('steps-far', step(true));
writeWav('slam', slam());
writeWav('pitch-down', pitchDown());
writeWav('whoosh', whoosh());
writeWav('bell', bell());
writeWav('door', door());
writeWav('wood', wood());
writeWav('hush', hush());
writeWav('beep', beep());
writeWav('silence-hit', silenceHit());
writeWav('bed-hall', bedHall());
writeWav('bed-corridor', bedCorridor());
