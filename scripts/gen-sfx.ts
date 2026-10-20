// 用代码合成全部音效，写到 public/sfx/*.wav（48kHz 单声道 16bit）。
// 音色原则：柔和、低频为主；每个音效都有淡入淡出包络；高频用低通压住；
// 单个文件峰值归一到 -6dBFS，给叠加留余量（成片峰值另行检测，要求低于 -3dB）。

import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {FPS, PAD_FRAMES, beat, type SoundName} from '../src/data/script';

const SR = 48000;
const OUT = join(__dirname, '..', 'public', 'sfx');
const TAU = Math.PI * 2;

// ── 工具 ──────────────────────────────────────────

let seed = 1234567;
const rand = () => {
  // 确定性随机数，保证每次合成结果一致
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const noise = () => rand() * 2 - 1;

const buf = (seconds: number) => new Float64Array(Math.round(seconds * SR));

/** RBJ 双二阶滤波器 */
const biquad = (
  x: Float64Array,
  type: 'lowpass' | 'highpass' | 'bandpass',
  freq: number | ((i: number) => number),
  q = 0.707,
) => {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = typeof freq === 'number' ? freq : freq(i);
    const w = (TAU * Math.min(f, SR * 0.45)) / SR;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lowpass') {
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = (1 - cos) / 2;
    } else if (type === 'highpass') {
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = (1 + cos) / 2;
    } else {
      b0 = alpha; b1 = 0; b2 = -alpha;
    }
    const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
    const out = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = out;
    y[i] = out;
  }
  return y;
};

/** 淡入淡出包络：所有音效都过一遍，首尾归零，杜绝咔哒声 */
const fadeEdges = (x: Float64Array, attack = 0.006, release = 0.04) => {
  const a = Math.max(1, Math.round(attack * SR));
  const r = Math.max(1, Math.round(release * SR));
  for (let i = 0; i < a && i < x.length; i++) x[i] *= Math.sin((i / a) * (Math.PI / 2)) ** 2;
  for (let i = 0; i < r && i < x.length; i++) {
    const k = x.length - 1 - i;
    x[k] *= Math.sin((i / r) * (Math.PI / 2)) ** 2;
  }
  return x;
};

const normalize = (x: Float64Array, peakDb = -6) => {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const target = 10 ** (peakDb / 20);
  if (peak > 0) for (let i = 0; i < x.length; i++) x[i] *= target / peak;
  return x;
};

const mix = (...parts: [Float64Array, number][]) => {
  const len = Math.max(...parts.map(([p]) => p.length));
  const y = new Float64Array(len);
  for (const [p, g] of parts) for (let i = 0; i < p.length; i++) y[i] += p[i] * g;
  return y;
};

/** 指数衰减包络 */
const expEnv = (i: number, tau: number) => Math.exp(-i / SR / tau);

const sine = (seconds: number, freq: (t: number) => number, env: (i: number) => number) => {
  const x = buf(seconds);
  let ph = 0;
  for (let i = 0; i < x.length; i++) {
    ph += (TAU * freq(i / SR)) / SR;
    x[i] = Math.sin(ph) * env(i);
  }
  return x;
};

const writeWav = (name: string, x: Float64Array) => {
  const data = Buffer.alloc(x.length * 2);
  for (let i = 0; i < x.length; i++) {
    const v = Math.max(-1, Math.min(1, x[i]));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  }
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
  writeFileSync(join(OUT, `${name}.wav`), Buffer.concat([h, data]));
};

// ── 音色 ──────────────────────────────────────────

/** 柔和低频冲击：正弦下滑 + 一点低通过的"体" */
const impact = (seconds: number, f0: number, f1: number, tau: number, body: number) => {
  const tone = sine(seconds, (t) => f1 + (f0 - f1) * Math.exp(-t / 0.06), (i) => expEnv(i, tau));
  const n = buf(seconds).map((_, i) => noise() * expEnv(i, 0.05));
  const thud = biquad(biquad(n, 'lowpass', 260), 'lowpass', 260);
  return mix([tone, 1], [thud, body]);
};

const sounds: Record<SoundName, () => Float64Array> = {
  thumpSoft: () => fadeEdges(impact(0.6, 120, 55, 0.16, 0.5), 0.004, 0.08),
  thump: () => fadeEdges(impact(0.8, 110, 48, 0.22, 0.6), 0.004, 0.1),
  thumpHeavy: () => {
    const a = impact(1.3, 95, 38, 0.38, 0.7);
    const sub = sine(1.3, () => 41, (i) => expEnv(i, 0.45) * Math.min(1, i / (SR * 0.02)));
    return fadeEdges(mix([a, 1], [sub, 0.55]), 0.005, 0.25);
  },
  // 轻点击：低通过的短促木质音，不用高频
  click: () => {
    const x = mix(
      [sine(0.08, () => 820, (i) => expEnv(i, 0.012)), 1],
      [sine(0.08, () => 1240, (i) => expEnv(i, 0.007)), 0.35],
    );
    return fadeEdges(biquad(x, 'lowpass', 2600), 0.002, 0.02);
  },
  tick: () => {
    const x = mix(
      [sine(0.1, () => 640, (i) => expEnv(i, 0.018)), 1],
      [sine(0.1, () => 1900, (i) => expEnv(i, 0.006)), 0.2],
    );
    return fadeEdges(biquad(x, 'lowpass', 2400), 0.002, 0.03);
  },
  wood: () => {
    const x = mix(
      [sine(0.18, () => 210, (i) => expEnv(i, 0.04)), 1],
      [sine(0.18, () => 470, (i) => expEnv(i, 0.02)), 0.5],
    );
    return fadeEdges(biquad(x, 'lowpass', 1800), 0.002, 0.04);
  },
  // 气流：带通噪声，中心频率扫上再扫下，整体压在 1.2kHz 以下
  whoosh: () => {
    const len = 0.75;
    const n = buf(len).map(() => noise());
    const N = n.length;
    const f = (i: number) => 220 + 700 * Math.sin((i / N) * Math.PI);
    const y = biquad(biquad(n, 'bandpass', f, 0.9), 'lowpass', 1400);
    for (let i = 0; i < N; i++) y[i] *= Math.sin((i / N) * Math.PI) ** 2;
    return fadeEdges(y, 0.01, 0.08);
  },
  whip: () => {
    const len = 0.4;
    const n = buf(len).map(() => noise());
    const N = n.length;
    const f = (i: number) => 300 + 1100 * Math.sin((i / N) * Math.PI) ** 1.5;
    const y = biquad(biquad(n, 'bandpass', f, 1.1), 'lowpass', 1800);
    for (let i = 0; i < N; i++) {
      const t = i / N;
      y[i] *= t < 0.55 ? (t / 0.55) ** 2 : ((1 - t) / 0.45) ** 1.5;
    }
    return fadeEdges(y, 0.008, 0.05);
  },
  doorAir: () => {
    const len = 0.5;
    const n = buf(len).map(() => noise());
    const N = n.length;
    const y = biquad(n, 'lowpass', (i) => 900 - 650 * (i / N));
    for (let i = 0; i < N; i++) y[i] *= Math.sin((i / N) * Math.PI) ** 1.5;
    const thud = impact(len, 90, 60, 0.08, 0.2);
    for (let i = 0; i < N; i++) thud[i] *= i > N * 0.7 ? 1 : 0;
    return fadeEdges(mix([y, 1], [thud, 0.5]), 0.01, 0.06);
  },
  // 玻璃轻碰：几条不谐和的正弦，低通处理、短衰减，不尖
  glass: () => {
    const parts: [Float64Array, number][] = [
      [sine(0.9, () => 1046, (i) => expEnv(i, 0.18)), 1],
      [sine(0.9, () => 1568, (i) => expEnv(i, 0.11)), 0.45],
      [sine(0.9, () => 2489, (i) => expEnv(i, 0.06)), 0.18],
    ];
    return fadeEdges(biquad(mix(...parts), 'lowpass', 3000), 0.003, 0.2);
  },
  // 柔和上扬：三角波和弦往上滑，结尾快速收
  riser: () => {
    const len = 0.6;
    const N = Math.round(len * SR);
    const env = (i: number) => {
      const t = i / N;
      return t < 0.85 ? (t / 0.85) ** 2 : ((1 - t) / 0.15) ** 2;
    };
    const tri = (f0: number) => {
      const x = buf(len);
      let ph = 0;
      for (let i = 0; i < N; i++) {
        const t = i / N;
        ph += (f0 * (1 + 0.6 * t * t)) / SR;
        const p = ph % 1;
        x[i] = (4 * Math.abs(p - 0.5) - 1) * env(i);
      }
      return x;
    };
    const y = mix([tri(220), 1], [tri(330), 0.6], [tri(440), 0.35]);
    return fadeEdges(biquad(y, 'lowpass', 1600), 0.01, 0.05);
  },
  // 纸声：低通噪声的两段起伏，音量小
  paper: () => {
    const len = 0.35;
    const n = buf(len).map(() => noise());
    const N = n.length;
    const y = biquad(biquad(n, 'bandpass', 1300, 0.8), 'lowpass', 2600);
    for (let i = 0; i < N; i++) {
      const t = i / N;
      y[i] *= Math.sin(t * Math.PI) ** 2 * (0.6 + 0.4 * Math.sin(t * Math.PI * 3));
    }
    return fadeEdges(y, 0.01, 0.06);
  },
  // 咕嘟：正弦音高快速上滑的小水泡
  bubble: () => {
    const blip = (f0: number) => sine(0.09, (t) => f0 * (1 + 2.2 * (t / 0.09)), (i) => Math.sin((i / (0.09 * SR)) * Math.PI));
    const y = buf(0.4);
    [0, 0.12, 0.22].forEach((off, k) => {
      const b = blip(220 + k * 60);
      const o = Math.round(off * SR);
      for (let i = 0; i < b.length && o + i < y.length; i++) y[o + i] += b[i] * (1 - k * 0.2);
    });
    return fadeEdges(biquad(y, 'lowpass', 1500), 0.004, 0.05);
  },
  bubbles: () => {
    const y = buf(1.6);
    for (let k = 0; k < 11; k++) {
      const f0 = 180 + rand() * 220;
      const d = 0.07 + rand() * 0.05;
      const b = sine(d, (t) => f0 * (1 + 2 * (t / d)), (i) => Math.sin((i / (d * SR)) * Math.PI));
      const o = Math.round((0.05 + k * 0.13 + rand() * 0.04) * SR);
      for (let i = 0; i < b.length && o + i < y.length; i++) y[o + i] += b[i] * (0.5 + rand() * 0.5);
    }
    return fadeEdges(biquad(y, 'lowpass', 1400), 0.01, 0.15);
  },
  // 年份往回滚：一串越来越慢的轻点击（时间由字幕稿的 rulerRoll→rollEnd 决定）
  tickRoll: () => {
    const len = (beat('o6', 'rollEnd') - beat('o6', 'rulerRoll')) / FPS + 0.1;
    const y = buf(len);
    const tick = sounds.tick();
    let t = 0;
    let gap = 0.035;
    while (t < len - 0.12) {
      const o = Math.round(t * SR);
      const g = 0.35 + 0.65 * (t / len);
      for (let i = 0; i < tick.length && o + i < y.length; i++) y[o + i] += tick[i] * g;
      t += gap;
      gap *= 1.09;
    }
    return fadeEdges(y, 0.005, 0.08);
  },
  // 定格：声音被"抽走"的一下，低频下沉 + 很短的低通气流
  freeze: () => {
    const len = 0.55;
    const tone = sine(len, (t) => 160 * Math.exp(-t * 3), (i) => expEnv(i, 0.15));
    const n = buf(len).map(() => noise());
    const N = n.length;
    const air = biquad(n, 'lowpass', (i) => 1200 * (1 - i / N) + 120);
    for (let i = 0; i < N; i++) air[i] *= expEnv(i, 0.12);
    return fadeEdges(mix([tone, 1], [air, 0.35]), 0.004, 0.12);
  },
  // 背景和弦垫底：很轻的正弦和弦，慢起慢收（不是噪声铺底）
  pad: () => {
    const len = PAD_FRAMES / FPS;
    const N = Math.round(len * SR);
    const notes = [110, 164.81, 220, 277.18];
    const x = buf(len);
    for (const f of notes) {
      let ph = 0;
      for (let i = 0; i < N; i++) {
        const t = i / SR;
        ph += (TAU * f * (1 + 0.002 * Math.sin(TAU * 0.2 * t))) / SR;
        x[i] += Math.sin(ph) * (0.8 + 0.2 * Math.sin(TAU * 0.07 * t + f));
      }
    }
    const y = biquad(x, 'lowpass', 900);
    const a = 2.5 * SR, r = 2 * SR;
    for (let i = 0; i < N; i++) {
      const fi = Math.min(1, i / a);
      const fo = Math.min(1, (N - 1 - i) / r);
      y[i] *= Math.sin((fi * Math.PI) / 2) ** 2 * Math.sin((fo * Math.PI) / 2) ** 2;
    }
    return y;
  },
};

mkdirSync(OUT, {recursive: true});
for (const [name, make] of Object.entries(sounds)) {
  writeWav(name, normalize(make(), name === 'pad' ? -9 : -6));
}
console.log(`音效已合成：${Object.keys(sounds).length} 个 → ${OUT}`);
