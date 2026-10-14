// 用代码合成全部声音（不用任何音频素材），按 src/data/cues.json 摆放。
// 三层：环境底（连续、每节换音色、交叉淡化）/ 动作音 / 重音。
// 混完用 ffmpeg ebur128 实测，校到 -18 LUFS，真峰值 ≤ -2 dBTP。
//
// 用法：node scripts/synth-audio.mjs [--from=0] [--to=918] [--out=public/audio/preview.wav]
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const arg = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.split('=')[1] : d;
};
const {cues, fps} = JSON.parse(fs.readFileSync('src/data/cues.json', 'utf8'));
const subs = JSON.parse(fs.readFileSync('src/data/subtitles.json', 'utf8'));
const FROM = Number(arg('from', subs.preview.from));
const TO = Number(arg('to', subs.preview.to));
const OUT = arg('out', 'public/audio/preview.wav');
const SR = 48000;
const T0 = FROM / fps;
const DUR = (TO - FROM) / fps;
const N = Math.round(DUR * SR);
const TARGET_LUFS = -18;
const CEILING_DBTP = -2.3;
const db = (x) => Math.pow(10, x / 20);

// ---------- 基础 ----------
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const hash = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);

class Biquad {
  constructor(type, f, q = 0.707) {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(type, f, q);
  }
  set(type, f, q = 0.707) {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
    const c = Math.cos(w);
    const al = Math.sin(w) / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
    else if (type === 'hp') [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    else [b0, b1, b2] = [al, 0, -al]; // bp
    [a0, a1, a2] = [1 + al, -2 * c, 1 - al];
    this.b = [b0 / a0, b1 / a0, b2 / a0];
    this.a = [a1 / a0, a2 / a0];
  }
  p(x) {
    const y = this.b[0] * x + this.b[1] * this.x1 + this.b[2] * this.x2 - this.a[0] * this.y1 - this.a[1] * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}
const chain = (...fs) => (x) => fs.reduce((v, f) => f.p(v), x);

const pinkGen = (r) => {
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  return () => {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    return out * 0.11;
  };
};
const brownGen = (r) => {
  let v = 0;
  return () => {
    v = (v + (r() * 2 - 1) * 0.02) * 0.998;
    return v * 3;
  };
};

// Schroeder 混响（梳状 + 全通），给拱廊、房间一点空间
const reverb = (buf, {mix = 0.25, size = 1, damp = 0.4, fb = 0.78} = {}) => {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({d: Math.round(d * size * (SR / 44100)), b: null, i: 0, f: 0}));
  combs.forEach((c) => (c.b = new Float32Array(c.d)));
  const aps = [225, 556].map((d) => ({d: Math.round(d * (SR / 44100)), b: null, i: 0}));
  aps.forEach((a) => (a.b = new Float32Array(a.d)));
  const out = new Float32Array(buf.length);
  for (let n = 0; n < buf.length; n++) {
    const x = buf[n];
    let s = 0;
    for (const c of combs) {
      const y = c.b[c.i];
      c.f = y * (1 - damp) + c.f * damp;
      c.b[c.i] = x + c.f * fb;
      c.i = (c.i + 1) % c.d;
      s += y;
    }
    s *= 0.25;
    for (const a of aps) {
      const y = a.b[a.i];
      const v = s + y * 0.5;
      a.b[a.i] = v;
      a.i = (a.i + 1) % a.d;
      s = y - v * 0.5;
    }
    out[n] = x * (1 - mix) + s * mix;
  }
  return out;
};

// ITU-R BS.1770 K 计权（48kHz 系数）：电平校准与 ebur128 测量用同一把尺
const kweight = (a) => {
  const st = [
    {b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [-1.69065929318241, 0.73248077421585]},
    {b: [1, -2, 1], a: [-1.99004745483398, 0.99007225036621]},
  ];
  let x = a;
  for (const {b, a: aa} of st) {
    const y = new Float32Array(x.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < x.length; i++) {
      const v = b[0] * x[i] + b[1] * x1 + b[2] * x2 - aa[0] * y1 - aa[1] * y2;
      x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
    }
    x = y;
  }
  return x;
};
const rms = (a, s = 0, e = a.length) => {
  let sum = 0;
  for (let i = s; i < e; i++) sum += a[i] * a[i];
  return Math.sqrt(sum / Math.max(1, e - s));
};
const fadeEdges = (a, ms = 12) => {
  const n = Math.round((ms / 1000) * SR);
  for (let i = 0; i < n && i < a.length; i++) {
    a[i] *= i / n;
    a[a.length - 1 - i] *= i / n;
  }
  return a;
};

// ---------- 环境底音色（以绝对时间生成，保证跨节连续） ----------
const AMBIENCE = {
  // ①窗边室内：房间底噪 + 55Hz 柔和长音
  room: (t0, n, ch) => {
    const r = rng(101 + ch);
    const pink = pinkGen(r);
    const f = chain(new Biquad('lp', 1800), new Biquad('hp', 80));
    const pf = new Biquad('lp', 900);
    const out = new Float32Array(n);
    const det = ch ? 0.12 : 0;
    for (let i = 0; i < n; i++) {
      const t = t0 + i / SR;
      const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.06 * t + ch);
      const pad =
        Math.sin(2 * Math.PI * (55 + det) * t) +
        0.45 * Math.sin(2 * Math.PI * (82.5 + det) * t) +
        0.3 * Math.sin(2 * Math.PI * (110 - det) * t) +
        0.1 * Math.sin(2 * Math.PI * (165 + det) * t);
      out[i] = f(pink()) * 1.0 + pf.p(pad) * 0.11 * lfo;
    }
    return out;
  },
  // ②拱廊：低沉的空间底 + 穿过拱洞的风（带通噪声，中心频率与音量缓慢起伏）
  arcade: (t0, n, ch) => {
    const r = rng(202 + ch);
    const brown = brownGen(r);
    const rumble = chain(new Biquad('lp', 500), new Biquad('hp', 45));
    const bp = new Biquad('bp', 400, 0.9);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = t0 + i / SR;
      if (i % 64 === 0) bp.set('bp', 320 + 260 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.07 * t + ch * 0.7)), 0.9);
      const gust = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 0.11 * t + ch * 1.3), 1.6) * 0.8 + 0.2;
      const hollow = 0.06 * (Math.sin(2 * Math.PI * 73.4 * t) + 0.5 * Math.sin(2 * Math.PI * 110.1 * t)) * (0.7 + 0.3 * Math.sin(2 * Math.PI * 0.05 * t));
      out[i] = rumble(brown()) * 0.6 + bp.p(r() * 2 - 1) * 0.55 * gust + hollow;
    }
    return reverb(out, {mix: 0.3, size: 1.3, fb: 0.8});
  },
};

// ---------- 动作音与重音（单声道） ----------
const env = (t, a, d) => (t < 0 ? 0 : (1 - Math.exp(-t / a)) * Math.exp(-t / d));
const EVENTS = {
  // 水滴落在木桌上：短促的“嗒”，木头的低频身体
  'drop-on-wood': () => {
    const n = Math.round(0.5 * SR);
    const r = rng(7);
    const lp = new Biquad('lp', 3000);
    const out = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 750 + 550 * Math.exp(-t / 0.012);
      ph += (2 * Math.PI * f) / SR;
      out[i] = Math.sin(ph) * env(t, 0.0015, 0.02) * 0.6 + Math.sin(2 * Math.PI * 210 * t) * env(t, 0.002, 0.05) * 0.5 + lp.p(r() * 2 - 1) * env(t, 0.0008, 0.005) * 0.3;
    }
    return {buf: reverb(out, {mix: 0.18, size: 0.7}), body: 0.12};
  },
  // 重音①：低沉的闷响（不是鼓，不是爆炸）
  'low-thud': () => {
    const n = Math.round(2.6 * SR);
    const r = rng(9);
    const lpN = new Biquad('lp', 180);
    const lp = new Biquad('lp', 420);
    const out = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const f = 56 + 20 * Math.exp(-t / 0.12);
      ph += (2 * Math.PI * f) / SR;
      const e = env(t, 0.025, 0.6);
      out[i] = lp.p(Math.sin(ph) * e + 0.22 * Math.sin(2 * ph) * e + lpN.p(r() * 2 - 1) * env(t, 0.01, 0.08) * 0.5);
    }
    return {buf: out, body: 0.8};
  },
  // 石地脚步：一串，每步含脚跟与脚掌两下
  'footsteps-stone': (c) => {
    const step = c.interval / fps;
    const n = Math.round(((c.steps - 1) * step + 0.6) * SR);
    const r = rng(hash(c.id));
    const out = new Float32Array(n);
    for (let k = 0; k < c.steps; k++) {
      const bp = new Biquad('bp', 260 + r() * 60, 0.8);
      const lp = new Biquad('lp', 1100 + r() * 200);
      const g = 0.85 + r() * 0.25;
      const s0 = Math.round(k * step * SR);
      for (let i = 0; i < Math.round(0.3 * SR) && s0 + i < n; i++) {
        const t = i / SR;
        // 软起音（6ms）、稍长的衰减：鞋底落在石头上，而不是“咔”的一下
        const hit = env(t, 0.006, 0.06) + 0.5 * env(t - 0.06, 0.006, 0.05);
        const w = r() * 2 - 1;
        out[s0 + i] += g * (bp.p(w) * 1.4 * hit + lp.p(w) * 0.3 * hit + Math.sin(2 * Math.PI * 95 * t) * env(t, 0.008, 0.06) * 0.35);
      }
    }
    return {buf: reverb(out, {mix: 0.32, size: 1.3, fb: 0.8}), body: 0.1, perStep: step};
  },
  // 木门被风推开一寸：低沉的木头摩擦，没有尖锐的吱呀
  'door-wood': () => {
    const n = Math.round(1.6 * SR);
    const r = rng(13);
    const b1 = new Biquad('bp', 220, 3);
    const b2 = new Biquad('bp', 430, 4);
    const lpG = new Biquad('lp', 480);
    const lp = new Biquad('lp', 1500);
    const out = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const sw = t < 1.15 ? Math.pow(Math.sin((Math.PI * t) / 1.15), 1.5) : 0;
      const f = 78 + 6 * Math.sin(2 * Math.PI * 3 * t) + (r() - 0.5) * 4;
      ph += (2 * Math.PI * f) / SR;
      const groan = Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.3 * Math.sin(3 * ph) + 0.2 * Math.sin(4 * ph);
      const w = r() * 2 - 1;
      out[i] = lp.p((b1.p(w) * 1.2 + b2.p(w) * 0.6) * sw + lpG.p(groan) * 0.3 * sw);
    }
    return {buf: reverb(out, {mix: 0.3, size: 1.3}), body: 0.9};
  },
  // 衣袖摩擦：两下很轻的“沙”
  'sleeve-rustle': () => {
    const n = Math.round(0.9 * SR);
    const r = rng(17);
    const bp = new Biquad('bp', 2000, 0.6);
    const lp = new Biquad('lp', 5500);
    const out = new Float32Array(n);
    const bump = (t, s, d) => (t > s && t < s + d ? Math.pow(Math.sin((Math.PI * (t - s)) / d), 2) : 0);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const g = bump(t, 0.03, 0.24) + 0.7 * bump(t, 0.33, 0.28);
      out[i] = lp.p(bp.p(r() * 2 - 1)) * g * (0.8 + 0.2 * r());
    }
    return {buf: reverb(out, {mix: 0.2, size: 1.2}), body: 0.6};
  },
};

// ---------- 混音 ----------
const L = new Float32Array(N);
const R = new Float32Array(N);
const inRange = (c) => c.frame < TO;
const ambs = cues.filter((c) => c.type === 'ambience' && inRange(c)).sort((a, b) => a.frame - b.frame);
const nextAmbFrame = (i) => (ambs[i + 1] ? ambs[i + 1].frame : TO);

// 环境底：各段统一到同一 RMS，等功率交叉淡化
const AMB_RMS = 0.05;
for (let i = 0; i < ambs.length; i++) {
  const a = ambs[i];
  const gen = AMBIENCE[a.sound];
  if (!gen) throw new Error(`no ambience generator: ${a.sound}`);
  const xIn = (a.crossfadeFrames ?? 60) / fps;
  const xOutNext = ambs[i + 1] ? (ambs[i + 1].crossfadeFrames ?? 60) / fps : 0;
  const s = Math.max(a.frame / fps, T0);
  const e = Math.min(nextAmbFrame(i) / fps + xOutNext, T0 + DUR);
  const n = Math.round((e - s) * SR);
  for (const [ch, out] of [[0, L], [1, R]]) {
    const buf = gen(s, n, ch);
    const g = AMB_RMS / rms(kweight(buf));
    const off = Math.round((s - T0) * SR);
    for (let k = 0; k < n && off + k < N; k++) {
      const t = s + k / SR;
      let w = 1;
      if (t < a.frame / fps + xIn) w *= Math.sin(((t - a.frame / fps) / xIn) * (Math.PI / 2));
      if (ambs[i + 1] && t > nextAmbFrame(i) / fps) w *= Math.cos(((t - nextAmbFrame(i) / fps) / xOutNext) * (Math.PI / 2));
      out[off + k] += buf[k] * g * Math.max(0, w);
    }
  }
}

// 重音前压低环境底 6dB（只压环境底）
for (const c of cues.filter((c) => c.duck && inRange(c))) {
  const s = c.duck.from / fps - T0;
  const hit = c.frame / fps - T0;
  const rel = c.duck.releaseFrames / fps;
  const low = db(c.duck.db);
  for (let i = Math.max(0, Math.round(s * SR)); i < N; i++) {
    const t = i / SR;
    let g;
    if (t < s + 0.3) g = 1 + (low - 1) * Math.sin(((t - s) / 0.3) * (Math.PI / 2));
    else if (t < hit + 0.2) g = low;
    else if (t < hit + 0.2 + rel) g = low + (1 - low) * (1 - Math.cos(((t - hit - 0.2) / rel) * Math.PI)) / 2;
    else break;
    L[i] *= g;
    R[i] *= g;
  }
}

// 动作音与重音：发声段 RMS = 环境底 RMS + db
const placed = [];
for (const c of cues.filter((c) => (c.type === 'action' || c.type === 'accent') && inRange(c) && c.frame >= FROM)) {
  const gen = EVENTS[c.sound];
  if (!gen) throw new Error(`no event generator: ${c.sound}`);
  const {buf} = gen(c);
  fadeEdges(buf, 12);
  // 与 ebur128 的瞬时响度同窗（400ms）：取最响的那一段作为该声音的电平
  const win = Math.round(0.4 * SR);
  const kb = kweight(buf);
  let ref = 0;
  for (let i = 0; i + win <= Math.max(kb.length, win); i += Math.round(0.05 * SR)) ref = Math.max(ref, rms(kb, i, Math.min(kb.length, i + win)));
  const g = (AMB_RMS * db(c.db)) / ref;
  const off = Math.round((c.frame / fps - T0) * SR);
  for (let k = 0; k < buf.length && off + k < N; k++) {
    L[off + k] += buf[k] * g;
    R[off + k] += buf[k] * g;
  }
  placed.push(c);
}

// 母线：40Hz 以下高通，8kHz 以上低通；首尾淡入淡出
const master = (x) => {
  const f = chain(new Biquad('hp', 40), new Biquad('hp', 40), new Biquad('lp', 8000), new Biquad('lp', 8000));
  const y = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = f(x[i]);
  return y;
};
let mL = master(L);
let mR = master(R);
const fadeIn = Math.round((FROM === 0 ? 0.4 : 0.01) * SR);
const fadeOut = Math.round(0.6 * SR);
for (let i = 0; i < fadeIn; i++) {
  mL[i] *= i / fadeIn;
  mR[i] *= i / fadeIn;
}
for (let i = 0; i < fadeOut; i++) {
  const g = Math.max(0.03, i / fadeOut); // 结尾不归零到数字静音
  mL[N - 1 - i] *= g;
  mR[N - 1 - i] *= g;
}

const writeWav = (path, l, r, gain = 1) => {
  const data = Buffer.alloc(l.length * 2 * 3);
  let o = 0;
  for (let i = 0; i < l.length; i++) {
    for (const v of [l[i] * gain, r[i] * gain]) {
      const s = Math.max(-8388608, Math.min(8388607, Math.round(v * 8388607)));
      data.writeIntLE(s, o, 3);
      o += 3;
    }
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 6, 28);
  h.writeUInt16LE(6, 32);
  h.writeUInt16LE(24, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path, Buffer.concat([h, data]));
};

const parse = (txt) => {
  const I = Number(/I:\s+(-?[\d.]+) LUFS\s*\n\s*Threshold/.exec(txt)?.[1]);
  const TP = Number(/True peak:\s*\n\s*Peak:\s+(-?[\d.]+|-inf) dBFS/.exec(txt)?.[1]);
  const LRA = Number(/LRA:\s+(-?[\d.]+) LU\s*\n\s*Threshold/.exec(txt)?.[1]);
  let Smax = -Infinity;
  let Mmax = -Infinity;
  for (const m of txt.matchAll(/t:\s*([\d.]+)\s+TARGET.*?M:\s*(-?[\d.]+)\s+S:\s*(-?[\d.]+)/g)) {
    if (Number(m[1]) >= 3) Smax = Math.max(Smax, Number(m[3]));
    Mmax = Math.max(Mmax, Number(m[2]));
  }
  return {I, TP, LRA, Smax, Mmax};
};
const measureFile = (path) => {
  const out = execFileSync('bash', ['-c', `ffmpeg -hide_banner -nostats -v verbose -i "${path}" -filter_complex ebur128=peak=true -f null - 2>&1`], {encoding: 'utf8', maxBuffer: 1 << 28});
  return parse(out);
};

// 第一遍：量出整体响度，求增益
fs.mkdirSync('out', {recursive: true});
const tmp = 'out/_mix_raw.wav';
writeWav(tmp, mL, mR);
const m0 = measureFile(tmp);
let gain = db(TARGET_LUFS - m0.I);

// 峰值保护：真峰值超限时用平滑的前瞻限幅（不做硬削波）
const limit = (l, r, g) => {
  const ceil = db(CEILING_DBTP - 0.4);
  const look = Math.round(0.005 * SR);
  const relS = Math.exp(-1 / (0.15 * SR));
  const need = new Float32Array(l.length);
  for (let i = 0; i < l.length; i++) {
    const p = Math.max(Math.abs(l[i]), Math.abs(r[i])) * g;
    need[i] = p > ceil ? ceil / p : 1;
  }
  let cur = 1;
  for (let i = 0; i < l.length; i++) {
    let m = 1;
    for (let k = 0; k < look && i + k < l.length; k++) m = Math.min(m, need[i + k]);
    cur = m < cur ? m : 1 - (1 - cur) * relS;
    l[i] *= cur;
    r[i] *= cur;
  }
};
writeWav(OUT, mL, mR, gain);
let m1 = measureFile(OUT);
for (let pass = 0; pass < 3 && (m1.TP > CEILING_DBTP || Math.abs(m1.I - TARGET_LUFS) > 0.3); pass++) {
  if (m1.TP > CEILING_DBTP) limit(mL, mR, gain);
  writeWav(tmp, mL, mR);
  gain = db(TARGET_LUFS - measureFile(tmp).I);
  writeWav(OUT, mL, mR, gain);
  m1 = measureFile(OUT);
}
fs.unlinkSync(tmp);

const report = {
  file: OUT,
  range: {fromFrame: FROM, toFrame: TO, seconds: DUR},
  integratedLUFS: m1.I,
  truePeakDBTP: m1.TP,
  maxShortTermLUFS: m1.Smax,
  shortTermOverIntegratedLU: +(m1.Smax - m1.I).toFixed(1),
  maxMomentaryLUFS: m1.Mmax,
  loudnessRangeLU: m1.LRA,
  events: placed.map((c) => ({frame: c.frame, time: +(c.frame / fps).toFixed(2), type: c.type, sound: c.sound, action: c.action, dbOverBed: c.db})),
};
fs.writeFileSync('out/audio-report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
