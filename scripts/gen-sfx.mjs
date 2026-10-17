#!/usr/bin/env node
// 合成全部音效 → public/audio/sfx-preview.wav（48 kHz / 16 bit / 立体声）
// 时间点和档位全部取自 src/data/script.json；改字幕只改那一个文件，然后重跑本脚本。
//
// 用法：node scripts/gen-sfx.mjs [--start 0] [--end 900] [--out public/audio/sfx-preview.wav]
//
// 规则（对应全片硬性规范第 4 条）：
//   - 三档峰值：weak / mid / strong 取 script.json rules.sfxPeakDbfs
//   - 噪声类（沙粒、风声）：先 HP 100 Hz + LP 6 kHz（各 24 dB/oct），再额外压低 noiseSfxExtraAttenuationDb
//   - 每个音效首尾 15 ms 升余弦淡入淡出
//   - 总线前视限幅，上限 rules.busCeilingDbfs；不加抖动，空白处是数字静音
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const script = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/script.json'), 'utf8'));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []),
);
const START = Number(args.start ?? script.preview.startFrame);
const END = Number(args.end ?? script.preview.endFrame);
const LAST = Number(args.last ?? (args.end ? Infinity : script.preview.lastScreen));
const OUT = path.resolve(ROOT, args.out ?? 'public/audio/sfx-preview.wav');
const STEMS = path.join(ROOT, 'out/sfx-stems');

const SR = 48000;
const FPS = script.fps;
const FADE = Math.round(0.015 * SR);
const dbToLin = (db) => 10 ** (db / 20);
const linToDb = (v) => 20 * Math.log10(Math.max(v, 1e-12));

// ───────────── 基础 DSP ─────────────
const buf = (sec) => new Float64Array(Math.round(sec * SR));
const TAU = Math.PI * 2;

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RBJ biquad，原地处理 */
function biquad(x, type, f0, q = Math.SQRT1_2) {
  const w = (TAU * f0) / SR;
  const cw = Math.cos(w);
  const al = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lp') [b0, b1, b2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2];
  else if (type === 'hp') [b0, b1, b2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
  else [b0, b1, b2] = [al, 0, -al]; // bp, 峰值增益 0 dB
  const a0 = 1 + al;
  const a1 = -2 * cw;
  const a2 = 1 - al;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let n = 0; n < x.length; n++) {
    const y = (b0 * x[n] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[n]; y2 = y1; y1 = y;
    x[n] = y;
  }
  return x;
}
const lp = (x, f, stages = 1) => { for (let i = 0; i < stages; i++) biquad(x, 'lp', f); return x; };
const hp = (x, f, stages = 1) => { for (let i = 0; i < stages; i++) biquad(x, 'hp', f); return x; };

/** 噪声类音效的强制带限：HP 100 Hz ×2（24 dB/oct）切轰鸣；LP 5 kHz ×4（48 dB/oct），让 6 kHz 以上的嘶声压到 -40 dB 以下 */
const noiseBand = (x) => lp(hp(x, 100, 2), 5000, 4);

/** 时变带通（TPT 状态变量滤波器），cutoff(t) 每个采样点可变 */
function svfBandpass(x, cutoffAt, q) {
  let ic1 = 0, ic2 = 0;
  const k = 1 / q;
  for (let n = 0; n < x.length; n++) {
    const g = Math.tan((Math.PI * cutoffAt(n / SR)) / SR);
    const a1 = 1 / (1 + g * (g + k));
    const v3 = x[n] - ic2;
    const v1 = a1 * ic1 + g * a1 * v3;
    const v2 = ic2 + g * v1;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    x[n] = v1 * k; // 归一化带通
  }
  return x;
}

/** 正弦/三角振荡器，频率可随时间变化（相位累加，不会因变频产生断点） */
function osc(out, { t0 = 0, dur, freq, gain = 1, env, shape = 'sine', partials = null }) {
  const n0 = Math.round(t0 * SR);
  const N = Math.min(out.length - n0, Math.round(dur * SR));
  let ph = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const f = typeof freq === 'function' ? freq(t) : freq;
    ph += (TAU * f) / SR;
    let s;
    if (partials) s = partials.reduce((acc, [m, g]) => acc + g * Math.sin(ph * m), 0);
    else if (shape === 'tri') s = (2 / Math.PI) * Math.asin(Math.sin(ph));
    else s = Math.sin(ph);
    out[n0 + i] += gain * env(t) * s;
  }
  return out;
}

const glide = (f0, f1, T) => (t) => f0 * (f1 / f0) ** Math.min(1, t / T);
// 包络：起音 a 秒（正弦升），之后指数衰减 tau
const ad = (a, tau) => (t) => (t < a ? Math.sin((Math.PI / 2) * (t / a)) : Math.exp(-(t - a) / tau));
// 包络：起音 a、保持到 h、释放 r（全为升余弦）
const ahr = (a, h, r) => (t) =>
  t < a ? 0.5 - 0.5 * Math.cos((Math.PI * t) / a) : t < h ? 1 : t < h + r ? 0.5 + 0.5 * Math.cos((Math.PI * (t - h)) / r) : 0;

const bell = [[1, 1], [2, 0.22], [3, 0.06]];

// ───────────── 音色 ─────────────
// 每个函数返回一段未归一化的单声道信号；noise: true 表示噪声类
const SYNTHS = {
  // 气球胀起：上行正弦滑音
  balloonRise: () => {
    const x = buf(1.7);
    osc(x, { dur: 1.7, freq: glide(196, 392, 1.1), env: ahr(0.35, 0.9, 0.75), partials: [[1, 1], [2, 0.14]] });
    return lp(x, 3000);
  },
  // 开头钩子：低频柔“咚” + 两音上行和声（关键句，强）
  hookChord: () => {
    const x = buf(2.8);
    osc(x, { dur: 1.2, freq: glide(92, 55, 0.18), env: ad(0.012, 0.32), gain: 1 });
    osc(x, { t0: 0.1, dur: 2.6, freq: 146.83, env: ad(0.18, 1.1), gain: 0.22 });
    osc(x, { t0: 0.1, dur: 2.6, freq: 220, env: ad(0.18, 1.1), gain: 0.18 });
    osc(x, { t0: 0.12, dur: 2.5, freq: 293.66, env: ad(0.014, 0.85), gain: 0.42, partials: bell });
    osc(x, { t0: 0.42, dur: 2.3, freq: 440, env: ad(0.014, 0.9), gain: 0.38, partials: bell });
    return lp(x, 4000);
  },
  // 推近转场：带通噪声扫频（滤波后的“风”）+ 低频正弦托底
  whooshIn: () => whoosh(250, 1800, 0.72),
  whooshOut: () => whoosh(1800, 260, 0.32),
  // 一快一慢两个音：快的上滑短促，慢的低而长
  twoTones: () => {
    const x = buf(1.8);
    osc(x, { dur: 0.4, freq: glide(880, 1320, 0.12), env: ad(0.012, 0.09), gain: 0.55 });
    osc(x, { dur: 1.8, freq: 330, env: ad(0.09, 0.55), gain: 0.6, partials: [[1, 1], [2, 0.1]] });
    return lp(x, 3500);
  },
  // 砸“脑子”：中低频闷击 + 短尾音
  slam: () => {
    const x = buf(1.3);
    osc(x, { dur: 1.0, freq: glide(120, 52, 0.12), env: ad(0.01, 0.26), gain: 1 });
    osc(x, { dur: 0.4, freq: 180, env: ad(0.01, 0.06), gain: 0.3, shape: 'tri' });
    osc(x, { t0: 0.02, dur: 1.2, freq: 220, env: ad(0.02, 0.45), gain: 0.22, partials: bell });
    return lp(x, 1800);
  },
  // 砸“人生”：落地低频 + 大三和弦（关键句，强）
  landChord: () => {
    const x = buf(3.2);
    osc(x, { dur: 1.4, freq: glide(84, 50, 0.2), env: ad(0.012, 0.38), gain: 1 });
    const notes = [98, 146.83, 196, 246.94, 293.66];
    notes.forEach((f, i) =>
      osc(x, { t0: 0.02 + i * 0.012, dur: 3.1, freq: (t) => f * (1 + 0.0015 * Math.sin(TAU * 4.5 * t)), env: ad(0.03, 1.3), gain: 0.2, partials: [[1, 1], [2, 0.12]] }),
    );
    return lp(x, 3500);
  },
  // 念头被吸进气球：稀疏的沙粒（带通噪声颗粒，再强制带限）
  sand: () => {
    const x = buf(2.2);
    const rnd = mulberry32(7);
    for (let g = 0; g < 70; g++) {
      const t0 = 0.05 + rnd() ** 0.8 * 1.9;
      const len = Math.round((0.025 + rnd() * 0.035) * SR);
      const grain = new Float64Array(len);
      for (let i = 0; i < len; i++) grain[i] = (rnd() * 2 - 1) * Math.sin((Math.PI * i) / len) ** 2;
      biquad(grain, 'bp', 900 + rnd() * 1200, 2.2);
      const amp = 0.4 + rnd() * 0.6;
      const n0 = Math.round(t0 * SR);
      for (let i = 0; i < len && n0 + i < x.length; i++) x[n0 + i] += amp * grain[i];
    }
    const env = ahr(0.45, 1.5, 0.65);
    for (let n = 0; n < x.length; n++) x[n] *= env(n / SR);
    return noiseBand(x);
  },
  // 提问：柔和气泡音，variant = 升几个半音
  bubble: (v = 0) => {
    const x = buf(0.7);
    const f0 = 420 * 2 ** (v / 12);
    osc(x, { dur: 0.5, freq: glide(f0, f0 * 1.6, 0.07), env: ad(0.012, 0.11), gain: 1 });
    osc(x, { t0: 0.11, dur: 0.5, freq: glide(f0 * 1.2, f0 * 1.9, 0.06), env: ad(0.012, 0.09), gain: 0.35 });
    return lp(x, 3000);
  },
  // 大人拍手：轻拍（正弦短包络，不用噪声）
  tap: () => {
    const x = buf(0.3);
    osc(x, { dur: 0.3, freq: 520, env: ad(0.01, 0.045), partials: [[1, 1], [1.5, 0.35], [2.1, 0.12]] });
    return lp(x, 2200);
  },
  // 柔光罩住：暖色铺底淡入
  padIn: () => pad(1.0, 0.65, 1.35, 0.55),
  // 代价：铺底下滑半音
  padSlide: () => pad(2 ** (-1 / 12), 0.25, 1.5, 0.7),
};

function whoosh(fA, fB, peakAt) {
  const D = 1.15;
  const x = buf(D);
  const rnd = mulberry32(fA * 7 + fB);
  for (let n = 0; n < x.length; n++) x[n] = rnd() * 2 - 1;
  svfBandpass(x, (t) => fA * (fB / fA) ** Math.min(1, t / D), 1.3);
  noiseBand(x);
  const env = (t) => (t < peakAt ? Math.sin((Math.PI / 2) * (t / peakAt)) ** 2 : Math.cos((Math.PI / 2) * Math.min(1, (t - peakAt) / (D - peakAt))) ** 2);
  for (let n = 0; n < x.length; n++) x[n] *= env(n / SR);
  // 正弦托底让转场有“体积”，放在 110–160 Hz，不进 100 Hz 以下
  const sub = buf(D);
  osc(sub, { dur: D, freq: glide(fA < fB ? 110 : 160, fA < fB ? 160 : 110, D), env, gain: 0.3 });
  for (let n = 0; n < x.length; n++) x[n] = x[n] * 3 + sub[n];
  return x;
}

function pad(ratioEnd, attack, hold, release) {
  const D = attack + hold + release + 0.05;
  const x = buf(D);
  const chord = [220, 277.18, 329.63, 440];
  const env = ahr(attack, attack + hold, release);
  chord.forEach((f, i) => {
    [-0.5, 0.5].forEach((det) =>
      osc(x, {
        dur: D,
        freq: (t) => (f + det) * (1 + (ratioEnd - 1) * Math.min(1, Math.max(0, (t - 0.4) / 1.0))),
        env,
        gain: i === 3 ? 0.12 : 0.25,
        partials: [[1, 1], [2, 0.08]],
      }),
    );
  });
  return lp(x, 2400);
}

const NOISE_TYPES = new Set(['sand', 'whooshIn', 'whooshOut']);

// ───────────── 排时间轴 ─────────────
const tiers = script.rules.sfxPeakDbfs;
const noiseCut = script.rules.noiseSfxExtraAttenuationDb;
const ceiling = dbToLin(script.rules.busCeilingDbfs);
const total = Math.round(((END - START) / FPS) * SR);
const bus = new Float64Array(total);
const report = [];

fs.mkdirSync(STEMS, { recursive: true });
for (const f of fs.readdirSync(STEMS)) fs.unlinkSync(path.join(STEMS, f));

for (const s of script.screens.filter((x) => x.id <= LAST)) {
  s.sfx.forEach((c, i) => {
    const frame = s.startFrame + c.atFrame;
    if (frame < START || frame >= END) return;
    const synth = SYNTHS[c.type];
    if (!synth) throw new Error(`screen ${s.id}: sfx type "${c.type}" 还没有实现`);
    const x = synth(c.variant);
    let peak = 0;
    for (const v of x) peak = Math.max(peak, Math.abs(v));
    const isNoise = NOISE_TYPES.has(c.type);
    const targetDb = tiers[c.tier] - (isNoise ? noiseCut : 0);
    const g = dbToLin(targetDb) / peak;
    for (let n = 0; n < x.length; n++) x[n] *= g;
    // 首尾 15 ms 升余弦，防咔哒
    for (let n = 0; n < FADE && n < x.length; n++) {
      const w = 0.5 - 0.5 * Math.cos((Math.PI * n) / FADE);
      x[n] *= w;
      x[x.length - 1 - n] *= w;
    }
    const n0 = Math.round(((frame - START) / FPS) * SR);
    for (let n = 0; n < x.length && n0 + n < total; n++) bus[n0 + n] += x[n];
    writeWav(path.join(STEMS, `s${String(s.id).padStart(2, '0')}-${i}-${c.type}.wav`), x);
    report.push({
      screen: s.id,
      type: c.type,
      tier: c.tier,
      noise: isNoise,
      startSec: +((frame - START) / FPS).toFixed(3),
      endSec: +((frame - START) / FPS + x.length / SR).toFixed(3),
      peakDbfs: +targetDb.toFixed(1),
    });
  });
}

// ───────────── 总线限幅（前视 5 ms，释放 80 ms） ─────────────
const L = Math.round(0.005 * SR);
const need = new Float64Array(total);
for (let n = 0; n < total; n++) need[n] = Math.min(1, ceiling / Math.max(1e-12, Math.abs(bus[n])));
// 往前看 2L 取最小，再做 L 点滑动平均让增益变化平滑
const look = new Float64Array(total);
{
  const dq = [];
  for (let n = total - 1; n >= 0; n--) {
    while (dq.length && need[dq[dq.length - 1]] >= need[n]) dq.pop();
    dq.push(n);
    while (dq[0] > n + 2 * L) dq.shift();
    look[n] = need[dq[0]];
  }
}
const gain = new Float64Array(total);
// 因果滑动平均：窗口内每个值都 ≤ 峰值处所需增益，所以平均后仍然压得住峰
let acc = L;
for (let n = 0; n < total; n++) {
  acc += look[n] - (n >= L ? look[n - L] : 1);
  gain[n] = Math.min(look[n], acc / L);
}
const rel = Math.exp(-1 / (0.08 * SR));
let env = 1;
let limited = 0;
for (let n = 0; n < total; n++) {
  env = gain[n] < env ? gain[n] : gain[n] + (env - gain[n]) * rel;
  if (env < 0.999) limited++;
  bus[n] *= env;
}
let busPeak = 0;
for (const v of bus) busPeak = Math.max(busPeak, Math.abs(v));
if (busPeak > ceiling * 1.0001) throw new Error(`bus peak ${linToDb(busPeak).toFixed(2)} dBFS > ceiling`);

writeWav(OUT, bus, 2);
fs.writeFileSync(path.join(STEMS, 'cues.json'), JSON.stringify({ sampleRate: SR, startFrame: START, endFrame: END, cues: report }, null, 2));
console.log(`wrote ${path.relative(ROOT, OUT)}  ${(total / SR).toFixed(2)}s  cues=${report.length}`);
console.log(`bus peak ${linToDb(busPeak).toFixed(2)} dBFS, limiter active on ${limited} samples`);

function writeWav(file, x, channels = 1) {
  const n = x.length;
  const data = Buffer.alloc(n * 2 * channels);
  for (let i = 0; i < n; i++) {
    // 不加抖动：静音段保持严格的数字 0
    const v = Math.max(-32767, Math.min(32767, Math.round(x[i] * 32767)));
    for (let c = 0; c < channels; c++) data.writeInt16LE(v, (i * channels + c) * 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2 * channels, 28);
  h.writeUInt16LE(2 * channels, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([h, data]));
}
