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
const mul = (a, b) => a.map((v, i) => v * (typeof b === 'function' ? b(i / SR, i / a.length) : b[i]));
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
};

let count = 0;
for (const [name, fn] of Object.entries(SOUNDS)) {
  const seed = [...name].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  writeWav(name, normalize(fn(mulberry(seed))));
  count++;
}
console.log(`sfx: ${count} files -> ${OUT}`);
export const SOUND_NAMES = Object.keys(SOUNDS);
