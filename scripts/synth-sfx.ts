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

// —— §2–§7 的一次性音效
const partials = (len: number, list: [number, number, number][], attack = 0.004) => {
  let x = buf(len);
  for (const [f, a, d] of list) x = add(x, sine(len, () => f, (i) => a * env(i, attack, d)));
  return x;
};
const glass = () => fadeEdges(normalize(reverb(partials(2.4, [[1760, 0.4, 1.2], [2637, 0.3, 0.9], [3520, 0.18, 0.7], [1318, 0.25, 1.4]], 0.25), 1.4, 0.45, 2), 0.55), 0.05, 0.4);
const glassHit = () => {
  const sub = sine(3, (t) => 46 + 60 * Math.exp(-t / 0.07), (i) => env(i, 0.003, 0.6));
  const ring = partials(4, [[880, 0.35, 2.4], [1321, 0.25, 1.9], [2217, 0.18, 1.3], [3109, 0.1, 0.9]]);
  const tr = lowpass(buf(0.08).map((_, i) => noise() * env(i, 0.0005, 0.015)), 5000);
  return fadeEdges(normalize(reverb(add(add(sub, ring, 0.8), tr, 0.5), 1.5, 0.35, 3), 0.95), 0.002, 0.8);
};
const cloth = () => fadeEdges(normalize(bandpass(buf(0.6).map((_, i) => noise() * Math.sin(Math.PI * Math.min(1, i / SR / 0.6))), 1800, 0.8), 0.5), 0.01, 0.1);
const page = () => {
  let x = buf(0.7);
  for (const t0 of [0, 0.09, 0.2]) x = add(x, buf(0.7).map((_, i) => (i / SR > t0 ? noise() * env(i - t0 * SR, 0.002, 0.03) : 0)));
  return fadeEdges(normalize(reverb(highpass(x, 1800), 0.8, 0.25, 0.6), 0.6));
};
const murmurOut = () => {
  const len = 3.2;
  const n = Math.ceil(len * SR);
  const raw = new Float32Array(n).map(() => noise());
  const syll = new Float32Array(n).map((_, i) => 0.55 + 0.45 * Math.sin(i / SR * 9.3 + Math.sin(i / SR * 3.1) * 2) * Math.sin(i / SR * 5.7));
  const y = bandpass(raw.map((v, i) => v * syll[i]), (i) => 700 - 400 * (i / n), 1.4).map((v, i) => v * Math.exp(-i / SR / 1.1));
  return fadeEdges(normalize(reverb(y, 1.2, 0.35, 1.2), 0.55), 0.05, 0.5);
};
const swell = () => {
  const len = 2.2;
  const r = sine(len, (t) => 70 + 120 * (t / len), (i) => Math.pow(i / SR / len, 2.2));
  const nz = bandpass(buf(len).map((_, i) => noise() * Math.pow(i / SR / len, 2)), (i) => 300 + 2200 * (i / SR / len), 1.1);
  return fadeEdges(normalize(add(r, nz, 0.6), 0.6), 0.05, 0.06);
};
const clink = () => fadeEdges(normalize(reverb(partials(0.6, [[2600, 0.5, 0.18], [3900, 0.3, 0.12], [5150, 0.2, 0.08]], 0.0008), 0.7, 0.25, 0.5), 0.6));
const surge = () => {
  const len = 3.6;
  const w = lowpass(buf(len).map((_, i) => noise() * (i / SR < 0.35 ? i / SR / 0.35 : Math.exp(-(i / SR - 0.35) / 0.9))), 650);
  const sub = sine(len, (t) => 44 + 30 * Math.exp(-t / 0.1), (i) => env(i, 0.005, 0.7));
  return fadeEdges(normalize(reverb(add(w, sub, 0.9), 1.4, 0.3, 2), 0.95), 0.003, 0.6);
};
const ball = () => {
  let x = buf(1.4);
  [0, 0.42, 0.72, 0.9].forEach((t0, k) => {
    const a = Math.pow(0.6, k);
    x = add(x, buf(1.4).map((_, i) => (i / SR > t0 ? Math.sin(2 * Math.PI * 105 * (i / SR - t0)) * a * env(i - t0 * SR, 0.001, 0.05) : 0)));
  });
  return fadeEdges(normalize(reverb(x, 1.0, 0.25, 0.8), 0.6));
};
const rope = () => {
  const len = 0.9;
  const y = bandpass(buf(len).map((_, i) => noise() * (0.5 + 0.5 * Math.sin(i / SR * 70)) * Math.sin(Math.PI * Math.min(1, i / SR / len))), (i) => 380 + 120 * Math.sin(i / SR * 4), 6);
  return fadeEdges(normalize(reverb(y, 0.8, 0.2, 0.5), 0.5));
};
const ropeDrop = () => {
  const thud = sine(1.6, (t) => 58 + 50 * Math.exp(-t / 0.04), (i) => env(i, 0.002, 0.3));
  const slap = lowpass(buf(0.5).map((_, i) => noise() * env(i, 0.001, 0.07)), 1400);
  const coil = bandpass(buf(0.8).map((_, i) => noise() * env(i, 0.02, 0.18)), 500, 2);
  return fadeEdges(normalize(reverb(add(add(thud, slap, 0.6), coil, 0.4), 1.5, 0.35, 2.4), 0.95), 0.002, 0.6);
};
const typeK = (f: number) => fadeEdges(normalize(highpass(buf(0.05).map((_, i) => noise() * env(i, 0.0004, 0.006)), f), 0.45));
const clockHit = () => fadeEdges(normalize(reverb(add(typeK(2600), sine(0.4, () => 900, (i) => env(i, 0.001, 0.05) * 0.5)), 1.2, 0.4, 1.4), 0.7));
const heartbeat = () => {
  const h = (t0: number, a: number) => sine(0.8, (t) => 52 + 18 * Math.exp(-(t - t0) / 0.03), (i) => (i / SR > t0 ? a * env(i - t0 * SR, 0.004, 0.08) : 0));
  return fadeEdges(normalize(lowpass(add(h(0, 1), h(0.22, 0.7)), 180), 0.75));
};
const stepStairs = () => {
  const n = lowpass(buf(0.15).map((_, i) => noise() * env(i, 0.002, 0.04)), 1500);
  const t = sine(0.15, () => 140, (i) => env(i, 0.002, 0.03) * 0.7);
  return fadeEdges(normalize(reverb(add(n, t), 1.6, 0.45, 1.8), 0.7));
};
const chairCreak = () => {
  const len = 0.7;
  const y = bandpass(buf(len).map((_, i) => noise() * (0.4 + 0.6 * Math.abs(Math.sin(i / SR * 38))) * Math.sin(Math.PI * Math.min(1, i / SR / len))), (i) => 300 + 260 * (i / SR / len), 9);
  return fadeEdges(normalize(add(reverb(y, 1.0, 0.25, 0.8), wood(), 0.3), 0.6));
};
const chord = () => {
  const len = 6;
  let x = buf(len);
  for (const [f, a] of [
    [130.81, 0.5],
    [164.81, 0.4],
    [196.0, 0.4],
    [261.63, 0.25],
    [329.63, 0.12],
  ] as [number, number][]) {
    for (const det of [-0.6, 0.6]) x = add(x, sine(len, () => f + det, (i) => a * Math.min(1, i / SR / 0.7) * Math.exp(-Math.max(0, i / SR - 0.7) / 2.4)));
  }
  return fadeEdges(normalize(reverb(x, 1.5, 0.35, 3), 0.75), 0.02, 0.8);
};

// —— §2–§7 的环境底噪：长度和变化点来自 script.ts
const rmsNorm = (x: Float32Array, db: number, peak = 0.6) => {
  let s = 0;
  let m = 1e-9;
  for (const v of x) {
    s += v * v;
    m = Math.max(m, Math.abs(v));
  }
  const rms = Math.sqrt(s / x.length) || 1e-9;
  const k = Math.min(Math.pow(10, db / 20) / rms, peak / m);
  return x.map((v) => v * k);
};
const bedFrame = (scene: Parameters<typeof sceneRange>[0]) => {
  const r = sceneRange(scene);
  const start = r.start - OVERLAP / 2;
  const len = (r.end - r.start + OVERLAP) / FPS + (scene === 'stairs' ? 2 : 0.5);
  return {start, len, n: Math.ceil(len * SR), at: (id: string) => f2i(screen(id).start, start)};
};
const ramp = (i: number, a: number, dur: number) => Math.min(1, Math.max(0, (i - a) / (SR * dur)));
const BED_DB = -17.5;
const bedMirrors = () => {
  const b = bedFrame('mirrors');
  const off = b.at('s14');
  const on = b.at('s16');
  const drone = sine(b.len, () => 49, (i) => 0.5 * (0.85 + 0.15 * Math.sin(i / SR / 2.1)));
  const hum = add(sine(b.len, () => 1318.5, () => 0.05), sine(b.len, () => 1321.5, () => 0.05)).map((v, i) => v * (1 - ramp(i, off, 0.25) + ramp(i, on, 2)));
  const air = lowpass(new Float32Array(b.n).map(() => noise()), 500).map((v) => v * 0.5);
  return fadeEdges(rmsNorm(add(add(drone, hum), air), BED_DB), 0.6, 0.6);
};
const bedSea = () => {
  const b = bedFrame('seawall');
  const calm = b.at('s27');
  const raw = new Float32Array(b.n).map(() => noise());
  const waves = lowpass(raw, (i) => 380 + 300 * Math.max(0, Math.sin(i / SR / 1.05))).map((v, i) => {
    const t = i / SR;
    const swellA = 0.35 + 0.65 * Math.pow(Math.max(0, Math.sin(t * 1.05)), 2);
    return v * swellA * (1 - 0.5 * ramp(i, calm, 2.5)) * 2.2;
  });
  const wind = lowpass(new Float32Array(b.n).map(() => noise()), 220).map((v) => v * 1.2);
  // 海浪起伏大（峰值因子高），放宽峰值上限，否则整体会偏轻
  return fadeEdges(rmsNorm(add(waves, wind), BED_DB, 0.95), 0.6, 0.8);
};
const bedArches = () => {
  const b = bedFrame('arches');
  const dark = b.at('s33');
  const warm = (f: number, a: number) => sine(b.len, () => f, (i) => a * (0.8 + 0.2 * Math.sin(i / SR / 1.7 + f)) * (1 - ramp(i, dark, 0.3) * 0.92));
  const low = sine(b.len, () => 49, () => 0.35);
  const x = add(add(add(warm(65.41, 0.4), warm(98, 0.25)), warm(130.81, 0.15)), low);
  const air = lowpass(new Float32Array(b.n).map(() => noise()), 400).map((v) => v * 0.5);
  return fadeEdges(rmsNorm(add(x, air), BED_DB), 0.6, 0.6);
};
const bedRoom = () => {
  const b = bedFrame('room');
  const loud = b.at('s39');
  const fade = b.at('s41');
  const tone = add(sine(b.len, () => 55, () => 0.25), lowpass(new Float32Array(b.n).map(() => noise()), 300).map((v) => v * 0.7));
  const tk = typeK(3000);
  const tock = typeK(1800);
  const x = new Float32Array(b.n);
  for (let k = 0; k * SR < b.n; k++) {
    const i0 = Math.floor(k * SR + 0.15 * SR);
    const g = (0.25 + 0.75 * ramp(i0, loud, 0.3)) * (1 - 0.7 * ramp(i0, fade, 2.5));
    const src = k % 2 ? tock : tk;
    for (let j = 0; j < src.length && i0 + j < b.n; j++) x[i0 + j] += src[j] * g * 0.35;
  }
  return fadeEdges(rmsNorm(add(tone, x), BED_DB), 0.6, 0.6);
};
const bedRidge = () => {
  const b = bedFrame('ridge');
  const stop = b.at('s46');
  const wind = lowpass(new Float32Array(b.n).map(() => noise()), (i) => Math.max(80, 320 + 220 * Math.sin(i / SR / 1.3) + 120 * Math.sin(i / SR / 0.4))).map((v, i) => v * 2 * (1 - 0.85 * ramp(i, stop, 0.4)));
  const sand = highpass(new Float32Array(b.n).map(() => (rnd() < 0.08 ? noise() : 0)), 3000).map((v) => v * 0.35);
  const low = sine(b.len, () => 46, () => 0.2);
  return fadeEdges(rmsNorm(add(add(wind, sand), low), BED_DB), 0.6, 0.6);
};
const bedStairs = () => {
  const b = bedFrame('stairs');
  const warm = b.at('s52');
  const drone = sine(b.len, () => 55, (i) => 0.5 * (0.85 + 0.15 * Math.sin(i / SR / 1.7)));
  const fifth = sine(b.len, () => 82.4, () => 0.15);
  const third = add(sine(b.len, () => 69.3, (i) => 0.18 * ramp(i, warm, 3)), sine(b.len, () => 110, (i) => 0.12 * ramp(i, warm, 4)));
  const air = lowpass(new Float32Array(b.n).map(() => noise()), 350).map((v) => v * 0.4);
  return fadeEdges(rmsNorm(add(add(add(drone, fifth), third), air), BED_DB), 0.6, 1.8);
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
writeWav('glass', glass());
writeWav('glass-hit', glassHit());
writeWav('cloth', cloth());
writeWav('page', page());
writeWav('murmur-out', murmurOut());
writeWav('swell', swell());
writeWav('clink', clink());
writeWav('surge', surge());
writeWav('ball', ball());
writeWav('rope', rope());
writeWav('rope-drop', ropeDrop());
writeWav('type', typeK(3200));
writeWav('delete', typeK(1700));
writeWav('clock-hit', clockHit());
writeWav('heartbeat', heartbeat());
writeWav('steps-stairs', stepStairs());
writeWav('chair-creak', chairCreak());
writeWav('chord', chord());
writeWav('bed-mirrors', bedMirrors());
writeWav('bed-sea', bedSea());
writeWav('bed-arches', bedArches());
writeWav('bed-room', bedRoom());
writeWav('bed-ridge', bedRidge());
writeWav('bed-stairs', bedStairs());
