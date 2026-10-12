// 用代码合成全部音效（不使用任何音频素材），输出 48kHz 16bit 单声道 wav 到 public/sfx/
// 每个音效都是确定性的：同一份脚本每次生成的文件完全一样。
import fs from 'node:fs';
import path from 'node:path';

const SR = 48000;
const OUT = path.resolve('public/sfx');
fs.mkdirSync(OUT, {recursive: true});

/* ---------------- 基础工具 ---------------- */
const mulberry = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const buf = (sec) => new Float32Array(Math.round(sec * SR));
const white = (n, rnd) => {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = rnd() * 2 - 1;
  return b;
};
const brown = (n, rnd) => {
  const b = new Float32Array(n);
  let v = 0;
  for (let i = 0; i < n; i++) {
    v = (v + (rnd() * 2 - 1) * 0.02) * 0.998;
    b[i] = v * 8;
  }
  return b;
};

/** RBJ 双二阶滤波器；freq 可以是数字或 (i)=>频率 */
const biquad = (input, type, freq, q = 0.707, gainDb = 0) => {
  const out = new Float32Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let b0, b1, b2, a1, a2;
  const coeffs = (f) => {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
    const cs = Math.cos(w);
    const sn = Math.sin(w);
    const alpha = sn / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let a0;
    if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = (1 - cs) / 2; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; }
    else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = (1 + cs) / 2; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; }
    else if (type === 'bp') { b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cs; a2 = 1 - alpha; }
    else { b0 = 1 + alpha * A; b1 = -2 * cs; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cs; a2 = 1 - alpha / A; }
    b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  };
  const dyn = typeof freq === 'function';
  if (!dyn) coeffs(freq);
  for (let i = 0; i < input.length; i++) {
    if (dyn && i % 32 === 0) coeffs(freq(i));
    const x = input[i];
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    out[i] = y;
  }
  return out;
};

const mixInto = (dst, src, offset = 0, gain = 1) => {
  for (let i = 0; i < src.length && i + offset < dst.length; i++) {
    if (i + offset >= 0) dst[i + offset] += src[i] * gain;
  }
  return dst;
};
const env = (n, fn) => {
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) b[i] = fn(i / SR, i / n);
  return b;
};
/** 逐点相乘：b 可以是常数、包络函数 (t, u) 或另一段缓冲 */
const mul = (a, b) =>
  a.map((v, i) => v * (typeof b === 'number' ? b : typeof b === 'function' ? b(i / SR, i / a.length) : b[i]));
const sine = (n, freq, phase = 0) => {
  const b = new Float32Array(n);
  let ph = phase;
  for (let i = 0; i < n; i++) {
    const f = typeof freq === 'function' ? freq(i / SR, i / n) : freq;
    ph += (2 * Math.PI * f) / SR;
    b[i] = Math.sin(ph);
  }
  return b;
};
/** 冲击响应式共振：在 input 的脉冲上叠加若干衰减正弦 */
const resonate = (input, modes) => {
  const out = new Float32Array(input.length);
  for (const [freq, decay, gain] of modes) {
    const r = Math.exp(-1 / (decay * SR));
    const w = (2 * Math.PI * freq) / SR;
    const c = 2 * r * Math.cos(w);
    let y1 = 0, y2 = 0;
    for (let i = 0; i < input.length; i++) {
      const y = input[i] * gain + c * y1 - r * r * y2;
      y2 = y1; y1 = y;
      out[i] += y * (1 - r);
    }
  }
  return out;
};
const fade = (b, inSec = 0.005, outSec = 0.05) => {
  const ni = Math.round(inSec * SR);
  const no = Math.round(outSec * SR);
  for (let i = 0; i < ni && i < b.length; i++) b[i] *= i / ni;
  for (let i = 0; i < no && i < b.length; i++) b[b.length - 1 - i] *= i / no;
  return b;
};
const normalize = (b, peak = 0.89) => {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  return m > 0 ? b.map((v) => (v / m) * peak) : b;
};
const softClip = (b, drive = 1.5) => b.map((v) => Math.tanh(v * drive) / Math.tanh(drive));

const writeWav = (name, data) => {
  const n = data.length;
  // 防止某个音效因为数值错误变成整段静音（NaN 会被写成 0）
  let bad = 0;
  for (let i = 0; i < n; i++) if (!Number.isFinite(data[i])) bad++;
  if (bad > 0) throw new Error(`${name}: ${bad} 个采样不是有效数字`);
  const out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0);
  out.writeUInt32LE(36 + n * 2, 4);
  out.write('WAVE', 8);
  out.write('fmt ', 12);
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20);
  out.writeUInt16LE(1, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 2, 28);
  out.writeUInt16LE(2, 32);
  out.writeUInt16LE(16, 34);
  out.write('data', 36);
  out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, data[i])) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(OUT, `${name}.wav`), out);
};

/* ---------------- 单个音效 ---------------- */
const hoof = (rnd, gain = 1) => {
  const n = Math.round(0.18 * SR);
  const body = mul(sine(n, (t) => 95 * Math.exp(-t * 6) + 55), (t) => Math.exp(-t * 28));
  const click = mul(biquad(white(n, rnd), 'lp', 1800), (t) => Math.exp(-t * 90));
  const dirt = mul(biquad(white(n, rnd), 'bp', 700, 0.8), (t) => Math.exp(-t * 35));
  return mixInto(mixInto(body.map((v) => v * gain), click, 0, 0.6 * gain), dirt, 0, 0.35 * gain);
};

const whooshCore = (rnd, sec, f0, f1, f2, q, shape = 'bell') => {
  const n = Math.round(sec * SR);
  const noise = white(n, rnd);
  const f = (i) => {
    const u = i / n;
    return u < 0.5 ? f0 + (f1 - f0) * (u / 0.5) : f1 + (f2 - f1) * ((u - 0.5) / 0.5);
  };
  const x = biquad(biquad(noise, 'bp', f, q), 'bp', f, q);
  const e = (t, u) => (shape === 'bell' ? Math.pow(Math.sin(Math.PI * u), 2.2) : Math.pow(u, 3) * (u < 0.97 ? 1 : (1 - u) / 0.03));
  return mul(x, e);
};

/** 简单的 Schroeder 混响：4 个梳状 + 2 个全通，用于大厅、回忆里的声音 */
const reverb = (input, wet = 0.4, size = 1, tailSec = 1.5) => {
  const n = input.length + Math.round(tailSec * SR);
  const dry = new Float32Array(n);
  dry.set(input);
  const out = new Float32Array(n);
  const combs = [29.7, 37.1, 41.1, 43.7].map((ms) => Math.round((ms * size * SR) / 1000));
  for (const d of combs) {
    const buf2 = new Float32Array(d);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const y = buf2[idx];
      lp = y * 0.7 + lp * 0.3;
      buf2[idx] = dry[i] + lp * 0.8;
      idx = (idx + 1) % d;
      out[i] += y * 0.25;
    }
  }
  let x = out;
  for (const ms of [5, 1.7]) {
    const d = Math.round((ms * SR) / 1000);
    const b2 = new Float32Array(d);
    const y = new Float32Array(n);
    let idx = 0;
    for (let i = 0; i < n; i++) {
      const bo = b2[idx];
      const v = x[i] + bo * 0.7;
      y[i] = bo - v * 0.7;
      b2[idx] = v;
      idx = (idx + 1) % d;
    }
    x = y;
  }
  for (let i = 0; i < n; i++) x[i] = dry[i] * (1 - wet) + x[i] * wet * 2.2;
  return x;
};

const SOUNDS = {
  wind_bed: (rnd) => {
    const n = 22 * SR;
    const b = brown(n, rnd);
    const lfo = (i) => 260 + 180 * Math.sin(i / SR * 0.31) + 90 * Math.sin(i / SR * 0.83 + 1);
    const low = biquad(b, 'lp', lfo, 0.9);
    const whistle = mul(biquad(white(n, rnd), 'bp', (i) => 620 + 140 * Math.sin(i / SR * 0.5), 12), (t) => 0.035 * (0.5 + 0.5 * Math.sin(t * 0.7)));
    const gust = (t) => 0.75 + 0.25 * Math.sin(t * 0.43) + 0.12 * Math.sin(t * 1.7);
    return fade(mixInto(mul(low, gust), whistle), 1.2, 1.5);
  },
  room_bed: (rnd) => {
    const n = 26 * SR;
    const b = biquad(brown(n, rnd), 'lp', 220, 0.7);
    const hum = mul(sine(n, 55), 0.04);
    const air = mul(biquad(white(n, rnd), 'bp', 1800, 0.5), 0.012);
    return fade(mixInto(mixInto(b, hum), air), 1.0, 1.5);
  },
  creak: (rnd) => {
    const n = Math.round(2.4 * SR);
    const imp = new Float32Array(n);
    let t = 0;
    while (t < n) {
      const u = t / n;
      const rate = 18 + 50 * Math.sin(Math.PI * u) + rnd() * 8;
      imp[Math.floor(t)] = (0.6 + rnd() * 0.4) * Math.sin(Math.PI * u);
      t += SR / rate;
    }
    const r = resonate(imp, [[310, 0.03, 1], [740, 0.02, 0.7], [1380, 0.012, 0.4], [2150, 0.008, 0.2]]);
    return fade(biquad(r, 'hp', 120), 0.05, 0.3);
  },
  whoosh_low: (rnd) => fade(whooshCore(rnd, 2.0, 120, 520, 160, 1.4), 0.01, 0.2),
  whoosh: (rnd) => fade(whooshCore(rnd, 1.1, 300, 2600, 700, 1.2), 0.01, 0.15),
  whoosh_rev: (rnd) => fade(whooshCore(rnd, 1.4, 200, 900, 2400, 1.1, 'rise'), 0.05, 0.01),
  metal_scrape: (rnd) => {
    const n = Math.round(1.3 * SR);
    const noise = mul(white(n, rnd), (t, u) => Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.3)), 1.5) * (0.6 + 0.4 * rnd()));
    let x = new Float32Array(n);
    for (const [f, g] of [[1850, 1], [2730, 0.8], [4120, 0.6], [5230, 0.4], [7400, 0.25]]) {
      x = mixInto(x, biquad(noise, 'bp', (i) => f * (1 + 0.03 * Math.sin(i / SR * 9)), 18), 0, g);
    }
    return fade(x, 0.02, 0.2);
  },
  snort: (rnd) => {
    const out = buf(0.9);
    for (const [start, len] of [[0, 0.22], [0.3, 0.42]]) {
      const n = Math.round(len * SR);
      const x = mul(biquad(white(n, rnd), 'bp', (i) => 900 - 500 * (i / n), 1.6), (t, u) => Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(t * 160)));
      mixInto(out, x, Math.round(start * SR));
    }
    return fade(out, 0.01, 0.1);
  },
  gallop: (rnd) => {
    const out = buf(3.2);
    let t = 0.02;
    let gap = 0.42;
    while (t < 2.9) {
      for (const [dt, g] of [[0, 0.7], [0.07, 0.85], [0.14, 1]]) {
        mixInto(out, hoof(rnd, g), Math.round((t + dt) * SR));
      }
      t += gap;
      gap = Math.max(0.26, gap * 0.94);
    }
    const rumble = mul(biquad(brown(out.length, rnd), 'lp', 140), (tt, u) => 0.6 * Math.min(1, u * 3) * (1 - u));
    return fade(mixInto(out, rumble), 0.005, 0.3);
  },
  boom: (rnd) => {
    const n = Math.round(3.2 * SR);
    const sub = mul(sine(n, (t) => 32 + 40 * Math.exp(-t * 3)), (t) => Math.exp(-t * 1.4));
    const thump = mul(biquad(white(n, rnd), 'lp', 260), (t) => Math.exp(-t * 7));
    const crack = mul(biquad(white(n, rnd), 'bp', 1200, 0.7), (t) => Math.exp(-t * 40));
    return fade(softClip(mixInto(mixInto(sub, thump, 0, 0.9), crack, 0, 0.25), 1.8), 0.002, 0.4);
  },
  boom_soft: (rnd) => {
    const n = Math.round(2.2 * SR);
    const sub = mul(sine(n, (t) => 44 + 46 * Math.exp(-t * 4)), (t) => Math.exp(-t * 2.2));
    const thump = mul(biquad(white(n, rnd), 'lp', 200), (t) => Math.exp(-t * 9));
    return fade(softClip(mixInto(sub, thump, 0, 0.7), 1.3), 0.003, 0.3);
  },
  metal_roll: (rnd) => {
    const n = Math.round(2.8 * SR);
    const imp = new Float32Array(n);
    let t = 0.0;
    let gap = 0.05;
    while (t < 1.7) {
      imp[Math.round(t * SR)] = 0.5 + rnd() * 0.5;
      t += gap * (0.8 + rnd() * 0.4);
      gap *= 1.07;
    }
    // 最后几下慢慢晃停
    for (const [tt, g] of [[1.86, 0.7], [2.06, 0.45], [2.24, 0.25]]) imp[Math.round(tt * SR)] = g;
    const ring = resonate(imp, [[1180, 0.25, 1], [2090, 0.18, 0.8], [3340, 0.1, 0.5], [4870, 0.06, 0.3]]);
    const scrape = mul(biquad(white(n, rnd), 'bp', 2400, 2), (tt) => 0.05 * Math.max(0, 1 - tt / 1.7));
    return fade(mixInto(biquad(ring, 'hp', 300), scrape), 0.002, 0.3);
  },
  bell: (rnd) => {
    const n = Math.round(4.5 * SR);
    const base = 196;
    const partials = [[0.5, 1, 3.2], [1, 0.8, 2.4], [1.183, 0.5, 1.8], [1.506, 0.35, 1.4], [2, 0.3, 1.1], [2.514, 0.22, 0.8], [2.662, 0.18, 0.7], [3.011, 0.12, 0.5], [4.166, 0.08, 0.35]];
    let x = new Float32Array(n);
    for (const [r, g, d] of partials) {
      x = mixInto(x, mul(sine(n, base * r * (1 + (rnd() - 0.5) * 0.002)), (t) => Math.exp(-t / d) * Math.min(1, t / 0.004)), 0, g);
    }
    return fade(x, 0.001, 0.6);
  },
  thud: (rnd) => {
    const n = Math.round(0.6 * SR);
    const body = mul(sine(n, (t) => 58 + 40 * Math.exp(-t * 20)), (t) => Math.exp(-t * 9));
    const click = mul(biquad(white(n, rnd), 'lp', 900), (t) => Math.exp(-t * 60));
    return fade(mixInto(body, click, 0, 0.5), 0.002, 0.1);
  },
  page_flip: (rnd) => {
    const n = Math.round(0.45 * SR);
    const x = biquad(white(n, rnd), 'hp', 1400);
    return fade(mul(x, (t, u) => Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.4)), 2) * (0.6 + 0.4 * Math.sin(t * 190))), 0.01, 0.08);
  },
  page_flurry: (rnd) => {
    const out = buf(1.8);
    for (let k = 0; k < 9; k++) {
      mixInto(out, SOUNDS.page_flip(rnd), Math.round((0.05 + k * 0.16 + rnd() * 0.04) * SR), 0.5 + rnd() * 0.5);
    }
    return fade(out, 0.01, 0.2);
  },
  wind_gust: (rnd) => {
    const n = Math.round(2.6 * SR);
    const x = biquad(white(n, rnd), 'bp', (i) => 260 + 900 * Math.sin(Math.PI * (i / n)), 0.9);
    return fade(mul(x, (t, u) => Math.pow(Math.sin(Math.PI * u), 2)), 0.05, 0.3);
  },
  ticks_accel: (rnd) => {
    const out = buf(3.6);
    let t = 0.02;
    let gap = 0.5;
    let k = 0;
    while (t < 3.4) {
      const n = Math.round(0.05 * SR);
      const click = resonate(mul(biquad(white(n, rnd), 'hp', 2500), (tt) => Math.exp(-tt * 300)), [[k % 2 ? 2300 : 2650, 0.012, 1], [4100, 0.006, 0.5]]);
      mixInto(out, click, Math.round(t * SR), k % 2 ? 0.8 : 1);
      t += gap;
      gap = Math.max(0.07, gap * 0.86);
      k++;
    }
    return fade(out, 0.001, 0.2);
  },
  paper_fold: (rnd) => {
    const n = Math.round(0.8 * SR);
    const imp = new Float32Array(n);
    for (let i = 0; i < n; i++) if (rnd() < 260 / SR) imp[i] = (rnd() * 2 - 1) * Math.sin((Math.PI * i) / n);
    const crackle = biquad(resonate(imp, [[2600, 0.004, 1], [4300, 0.003, 0.7], [1500, 0.006, 0.6]]), 'hp', 900);
    const swish = mul(biquad(white(n, rnd), 'bp', 3000, 0.6), (t, u) => 0.06 * Math.sin(Math.PI * u));
    return fade(mixInto(crackle, swish), 0.005, 0.1);
  },
  tap: (rnd) => {
    const n = Math.round(0.3 * SR);
    const imp = new Float32Array(n);
    imp[0] = 1;
    imp[Math.round(0.004 * SR)] = 0.4;
    return fade(resonate(imp, [[620, 0.04, 1], [1450, 0.02, 0.5], [210, 0.05, 0.6]]), 0.0005, 0.05);
  },
  sword: (rnd) => {
    const x = whooshCore(rnd, 0.55, 900, 4200, 1500, 2.2);
    const n = x.length;
    const ring = mul(sine(n, 3150), (t, u) => 0.08 * Math.sin(Math.PI * u));
    return fade(mixInto(x, ring), 0.005, 0.08);
  },
  paper_crack: (rnd) => {
    const n = Math.round(0.9 * SR);
    const crack = mul(biquad(white(n, rnd), 'hp', 700), (t) => Math.exp(-t * 55));
    const tail = SOUNDS.paper_fold(rnd);
    const thump = mul(sine(n, (t) => 70 + 50 * Math.exp(-t * 30)), (t) => 0.7 * Math.exp(-t * 14));
    return fade(mixInto(mixInto(crack, tail, Math.round(0.02 * SR), 0.6), thump), 0.0005, 0.1);
  },
  metal_ring: (rnd) => {
    const n = Math.round(3.2 * SR);
    let x = new Float32Array(n);
    for (const [f, g, d] of [[880, 1, 1.6], [884, 0.8, 1.6], [1322, 0.5, 1.2], [1765, 0.35, 0.9], [2648, 0.2, 0.6], [3530, 0.12, 0.4]]) {
      x = mixInto(x, mul(sine(n, f), (t) => Math.min(1, t / 0.25) * Math.exp(-t / d)), 0, g);
    }
    return fade(x, 0.01, 0.4);
  },
  hooves_walk: (rnd) => {
    const out = buf(3.4);
    for (let k = 0; k < 9; k++) {
      mixInto(out, hoof(rnd, k % 2 ? 0.55 : 0.75), Math.round((0.05 + k * 0.37) * SR));
      mixInto(out, hoof(rnd, 0.35), Math.round((0.22 + k * 0.37) * SR));
    }
    return fade(biquad(out, 'lp', 2400), 0.01, 0.3);
  },
  sancho_call: (rnd) => {
    const n = Math.round(1.1 * SR);
    const tone = mul(sine(n, (t) => 300 + 230 * Math.min(1, t / 0.5) + 6 * Math.sin(t * 34)), (t, u) => Math.sin(Math.PI * Math.min(1, u * 1.1)) * 0.7);
    const breath = mul(biquad(white(n, rnd), 'bp', 1400, 1.2), (t, u) => 0.15 * Math.sin(Math.PI * u));
    return fade(reverb(mixInto(tone, breath), 0.25, 0.8, 0.4), 0.02, 0.2);
  },
  wood_crack: (rnd) => {
    const n = Math.round(1.6 * SR);
    const crack = mul(biquad(white(n, rnd), 'hp', 500), (t) => Math.exp(-t * 45));
    const body = resonate(mul(white(n, rnd), (t) => Math.exp(-t * 200)), [[180, 0.12, 1], [410, 0.08, 0.8], [760, 0.05, 0.6], [1300, 0.03, 0.4]]);
    const tail = SOUNDS.paper_fold(rnd);
    const thump = mul(sine(n, (t) => 55 + 60 * Math.exp(-t * 18)), (t) => 0.8 * Math.exp(-t * 6));
    return fade(softClip(mixInto(mixInto(mixInto(crack, body, 0, 3), tail, Math.round(0.05 * SR), 0.5), thump), 1.4), 0.001, 0.2);
  },
  clatter: (rnd) => {
    const out = buf(1.8);
    let t = 0.02;
    let g = 1;
    let gap = 0.16;
    while (t < 1.5 && g > 0.08) {
      const imp = new Float32Array(Math.round(0.25 * SR));
      imp[0] = 1;
      mixInto(out, resonate(imp, [[620 + rnd() * 200, 0.05, 1], [1450 + rnd() * 300, 0.03, 0.6], [2900, 0.015, 0.3]]), Math.round(t * SR), g);
      t += gap;
      gap *= 0.82;
      g *= 0.7;
    }
    return fade(out, 0.001, 0.1);
  },
  whinny: (rnd) => {
    const n = Math.round(1.4 * SR);
    let x = new Float32Array(n);
    const f0 = (t) => (880 - 380 * t / 1.4) * (1 + 0.04 * Math.sin(t * 2 * Math.PI * 9));
    for (let h = 1; h <= 5; h++) x = mixInto(x, sine(n, (t) => f0(t) * h), 0, 1 / h);
    x = biquad(biquad(x, 'bp', 1100, 1.4), 'lp', 2600);
    return fade(reverb(mul(x, (t, u) => Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(t * 20))), 0.3, 1, 0.6), 0.05, 0.3);
  },
  hall_bed: (rnd) => {
    const n = 26 * SR;
    const room = biquad(brown(n, rnd), 'lp', 200, 0.7);
    let murmur = new Float32Array(n);
    for (let v = 0; v < 6; v++) {
      const ph = rnd() * 10;
      const voice = mul(biquad(white(n, rnd), 'bp', 380 + v * 90, 3), (t) => Math.max(0, Math.sin(t * (2.1 + v * 0.37) + ph)) * (0.5 + 0.5 * Math.sin(t * 0.3 + v)));
      murmur = mixInto(murmur, voice, 0, 0.5);
    }
    murmur = biquad(murmur, 'lp', 1100);
    return fade(mixInto(room, reverb(murmur, 0.5, 1.6, 0).slice(0, n), 0, 0.5), 1.2, 1.5);
  },
  hall_steps: (rnd) => {
    const out = buf(3.4);
    for (let k = 0; k < 6; k++) {
      const imp = new Float32Array(Math.round(0.2 * SR));
      imp[0] = 1;
      imp[Math.round(0.012 * SR)] = 0.5;
      mixInto(out, resonate(imp, [[880, 0.03, 1], [2100, 0.015, 0.6], [240, 0.05, 0.5]]), Math.round((0.05 + k * 0.52) * SR), k % 2 ? 0.8 : 1);
    }
    return fade(reverb(out, 0.45, 1.8, 1.2), 0.001, 0.4);
  },
  rustle_wave: (rnd) => {
    const n = Math.round(2.2 * SR);
    const imp = new Float32Array(n);
    for (let i = 0; i < n; i++) if (rnd() < (600 * Math.sin((Math.PI * i) / n)) / SR) imp[i] = rnd() * 2 - 1;
    const x = biquad(resonate(imp, [[1800, 0.006, 1], [3200, 0.004, 0.7], [900, 0.008, 0.5]]), 'hp', 500);
    const swish = mul(biquad(white(n, rnd), 'bp', 2200, 0.5), (t, u) => 0.08 * Math.sin(Math.PI * u));
    return fade(reverb(mixInto(x, swish), 0.3, 1.4, 0.6), 0.05, 0.3);
  },
  laugh: (rnd) => {
    const out = buf(2.6);
    for (let v = 0; v < 7; v++) {
      let t = 0.05 + rnd() * 0.4;
      const pitch = 600 + rnd() * 700;
      for (let k = 0; k < 6 + Math.floor(rnd() * 4); k++) {
        const len = 0.08 + rnd() * 0.05;
        const nn = Math.round(len * SR);
        const ha = mul(biquad(biquad(white(nn, rnd), 'bp', pitch, 4), 'bp', pitch * 1.7, 3), (tt, u) => Math.sin(Math.PI * u));
        mixInto(out, ha, Math.round(t * SR), 0.6 * (1 - k * 0.08));
        t += len + 0.06 + rnd() * 0.04;
      }
    }
    return fade(reverb(biquad(out, 'lp', 1800), 0.5, 1.6, 0.8), 0.02, 0.4);
  },
  chord_swell: (rnd) => {
    const n = Math.round(4.2 * SR);
    let x = new Float32Array(n);
    for (const f0 of [146.8, 220, 293.7, 369.9, 440]) {
      for (const det of [0.998, 1.002]) x = mixInto(x, sine(n, f0 * det), 0, 0.2);
    }
    x = mul(x, (t) => Math.min(1, t / 1.6) * Math.exp(-Math.max(0, t - 2.2) * 1.6));
    return fade(reverb(biquad(x, 'lp', 2000), 0.35, 1.6, 0.8), 0.05, 0.6);
  },
  chimes: (rnd) => {
    const out = buf(3);
    for (let k = 0; k < 5; k++) {
      const n = Math.round(1.8 * SR);
      const f0 = [1318, 1568, 1760, 2093, 2349][k];
      let x = new Float32Array(n);
      for (const [r, g, d] of [[1, 1, 0.9], [2.76, 0.4, 0.4], [5.4, 0.2, 0.2]]) x = mixInto(x, mul(sine(n, f0 * r), (t) => Math.exp(-t / d)), 0, g);
      mixInto(out, x, Math.round((0.02 + k * 0.17 + rnd() * 0.05) * SR), 0.5);
    }
    return fade(reverb(out, 0.3, 1.2, 0.5), 0.001, 0.4);
  },
  mask_clicks: (rnd) => {
    const n = Math.round(1.6 * SR);
    const imp = new Float32Array(n);
    for (let i = 0; i < n; i++) if (rnd() < (90 * Math.exp(-i / SR * 2)) / SR) imp[i] = 0.5 + rnd() * 0.5;
    return fade(reverb(resonate(imp, [[2300, 0.01, 1], [3400, 0.008, 0.6], [1200, 0.012, 0.5]]), 0.3, 1.2, 0.4), 0.001, 0.2);
  },
  wave_crash: (rnd) => {
    const n = Math.round(3.4 * SR);
    const x = biquad(white(n, rnd), 'lp', (i) => 400 + 3200 * Math.exp(-((i / SR - 0.5) ** 2) / 0.2));
    const e = (t) => (t < 0.45 ? Math.pow(t / 0.45, 2) : Math.exp(-(t - 0.45) * 1.3));
    const boom = mul(biquad(brown(n, rnd), 'lp', 160), (t) => e(t) * 0.8);
    return fade(mixInto(mul(x, e), boom), 0.05, 0.6);
  },
  sea_bed: (rnd) => {
    const n = 26 * SR;
    const swell = (t) => 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 6.5), 2);
    const waves = mul(biquad(brown(n, rnd), 'lp', (i) => 300 + 900 * swell(i / SR)), (t) => swell(t));
    const hiss = mul(biquad(white(n, rnd), 'hp', 3000), (t) => 0.04 * swell(t + 0.8));
    return fade(mixInto(waves, hiss), 1.2, 1.5);
  },
  hoof_sand: (rnd) => {
    const out = buf(2.4);
    for (let k = 0; k < 6; k++) mixInto(out, hoof(rnd, 0.6), Math.round((0.05 + k * 0.38) * SR));
    return fade(biquad(out, 'lp', 700), 0.01, 0.3);
  },
  gallop_sand: (rnd) => fade(biquad(SOUNDS.gallop(rnd), 'lp', 1000), 0.01, 0.3),
  clash: (rnd) => {
    const n = Math.round(2 * SR);
    const imp = mul(white(n, rnd), (t) => Math.exp(-t * 300));
    const ring = resonate(imp, [[520, 0.5, 1], [1370, 0.35, 0.8], [2240, 0.25, 0.6], [3610, 0.15, 0.4], [5120, 0.08, 0.3]]);
    const thump = mul(sine(n, (t) => 70 + 40 * Math.exp(-t * 20)), (t) => Math.exp(-t * 10));
    const noise = mul(biquad(white(n, rnd), 'hp', 1500), (t) => Math.exp(-t * 30));
    return fade(softClip(mixInto(mixInto(mul(ring, 12), thump, 0, 0.8), noise, 0, 0.6), 1.3), 0.001, 0.3);
  },
  metal_touch: (rnd) => {
    const n = Math.round(1.4 * SR);
    const imp = new Float32Array(n);
    imp[0] = 1;
    return fade(resonate(imp, [[2400, 0.5, 1], [3710, 0.3, 0.6], [5300, 0.15, 0.3]]), 0.001, 0.3);
  },
  heartbeat: (rnd) => {
    const out = buf(4.2);
    for (let k = 0; k < 5; k++) {
      for (const [dt, g] of [[0, 1], [0.24, 0.7]]) {
        const n = Math.round(0.3 * SR);
        const b = mul(sine(n, (t) => 48 + 30 * Math.exp(-t * 30)), (t) => Math.exp(-t * 18) * Math.min(1, t / 0.008));
        mixInto(out, b, Math.round((0.05 + k * 0.82 + dt) * SR), g);
      }
    }
    return fade(biquad(out, 'lp', 200), 0.005, 0.3);
  },
  hooves_away: (rnd) => {
    const out = buf(3.4);
    for (let k = 0; k < 12; k++) mixInto(out, hoof(rnd, 0.8 * Math.pow(0.86, k)), Math.round((0.05 + k * 0.26) * SR));
    return fade(biquad(out, 'lp', (i) => 1600 - 1100 * (i / out.length)), 0.01, 0.3);
  },
  run_sand: (rnd) => {
    const out = buf(2.6);
    for (let k = 0; k < 8; k++) {
      const n = Math.round(0.12 * SR);
      const step = mul(biquad(white(n, rnd), 'lp', 800), (t) => Math.exp(-t * 40));
      mixInto(out, step, Math.round((0.05 + k * 0.29) * SR), 0.5 + 0.5 * Math.min(1, k / 4));
    }
    return fade(out, 0.005, 0.2);
  },
  clock_bed: (rnd) => {
    const n = 26 * SR;
    const room = biquad(brown(n, rnd), 'lp', 220, 0.7);
    const out = mixInto(new Float32Array(n), room, 0, 1);
    for (let k = 0; k < 26; k++) {
      const m = Math.round(0.04 * SR);
      const click = resonate(mul(biquad(white(m, rnd), 'hp', 2500), (t) => Math.exp(-t * 300)), [[k % 2 ? 2300 : 2650, 0.012, 1]]);
      mixInto(out, click, Math.round((0.3 + k) * SR), 0.25);
    }
    return fade(out, 1.0, 1.5);
  },
  breath: (rnd) => {
    const n = Math.round(1.8 * SR);
    return fade(mul(biquad(white(n, rnd), 'bp', 900, 0.8), (t, u) => Math.pow(Math.sin(Math.PI * u), 2) * 0.6), 0.05, 0.2);
  },
  breath_shaky: (rnd) => {
    const n = Math.round(3.2 * SR);
    const x = mul(biquad(white(n, rnd), 'bp', (i) => 800 + 200 * Math.sin(i / SR * 3), 0.9), (t, u) => Math.pow(Math.sin(Math.PI * u), 1.5) * (0.6 + 0.4 * Math.sin(t * 2 * Math.PI * 7)) * (0.7 + 0.3 * Math.sin(t * 2.3)));
    return fade(x, 0.05, 0.3);
  },
  gallop_ghost: (rnd) => fade(reverb(biquad(SOUNDS.gallop(rnd), 'lp', 1400), 0.6, 1.8, 1.4), 0.05, 0.6),
  shimmer: (rnd) => {
    const n = Math.round(2.6 * SR);
    let x = new Float32Array(n);
    for (const f0 of [1760, 2217, 2637, 3520]) x = mixInto(x, sine(n, (t) => f0 * (1 + 0.02 * t)), 0, 0.25);
    x = mul(x, (t, u) => Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(t * 40)));
    const sparkle = new Float32Array(n);
    for (let i = 0; i < n; i++) if (rnd() < 40 / SR) sparkle[i] = rnd();
    return fade(reverb(mixInto(x, resonate(sparkle, [[4200, 0.05, 1], [6100, 0.03, 0.6]]), 0, 2), 0.4, 1.3, 0.8), 0.1, 0.5);
  },
  tick: (rnd) => {
    const n = Math.round(0.6 * SR);
    const click = resonate(mul(biquad(white(Math.round(0.04 * SR), rnd), 'hp', 2500), (t) => Math.exp(-t * 300)), [[2450, 0.015, 1], [4100, 0.008, 0.5]]);
    return fade(mixInto(new Float32Array(n), click), 0.001, 0.2);
  },
  book_close: (rnd) => {
    const n = Math.round(0.8 * SR);
    const thump = mul(sine(n, (t) => 90 + 50 * Math.exp(-t * 30)), (t) => Math.exp(-t * 14));
    const flap = mul(biquad(white(n, rnd), 'bp', 1200, 0.7), (t) => Math.exp(-t * 25));
    return fade(mixInto(thump, flap, 0, 0.6), 0.002, 0.1);
  },
  metal_decay: (rnd) => {
    const n = Math.round(2.8 * SR);
    let x = new Float32Array(n);
    for (const [f0, g] of [[880, 1], [1320, 0.5], [1760, 0.35]]) x = mixInto(x, mul(sine(n, (t) => f0 * (1 - 0.06 * t)), (t) => Math.exp(-t / 0.9)), 0, g);
    return fade(x, 0.01, 0.4);
  },
};

let count = 0;
for (const [name, fn] of Object.entries(SOUNDS)) {
  const seed = [...name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  writeWav(name, normalize(fn(mulberry(seed))));
  count++;
}
console.log(`sfx: ${count} files -> ${OUT}`);
export const SOUND_NAMES = Object.keys(SOUNDS);
