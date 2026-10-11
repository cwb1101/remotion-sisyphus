// 用代码合成全部音效，输出到 public/sfx/*.wav（44.1kHz / 16bit / 立体声）。
// 不读取任何音频素材；随机数用固定种子，每次生成的结果完全一致。
import {mkdirSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const SR = 44100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sfx');
const TAU = Math.PI * 2;

// ---------- 基础工具 ----------
const rng = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const buf = (sec) => new Float32Array(Math.round(sec * SR));
const env = (t, attack, decay) => (t < attack ? t / attack : Math.exp(-(t - attack) / decay));
const fill = (sec, fn) => {
  const b = buf(sec);
  for (let i = 0; i < b.length; i++) b[i] = fn(i / SR, i);
  return b;
};
const mix = (...layers) => {
  const len = Math.max(...layers.map(([b, , offset = 0]) => b.length + Math.round(offset * SR)));
  const out = new Float32Array(len);
  for (const [b, g = 1, offset = 0] of layers) {
    const o = Math.round(offset * SR);
    for (let i = 0; i < b.length && i + o < len; i++) out[i + o] += b[i] * g;
  }
  return out;
};
const noise = (sec, seed) => {
  const r = rng(seed);
  return fill(sec, () => r() * 2 - 1);
};
const brown = (sec, seed) => {
  const r = rng(seed);
  let v = 0;
  return fill(sec, () => {
    v = (v + (r() * 2 - 1) * 0.02) * 0.998;
    return v * 8;
  });
};

// RBJ 双二阶滤波，fc 可以是随时间变化的函数
const biquad = (x, type, fc, q = 0.707) => {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const f = typeof fc === 'function' ? fc(i / SR) : fc;
    const w = (TAU * Math.min(f, SR * 0.45)) / SR;
    const cw = Math.cos(w), sw = Math.sin(w), a = sw / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') { b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; }
    else if (type === 'hp') { b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; }
    const a0 = 1 + a, a1 = -2 * cw, a2 = 1 - a;
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
};
const shape = (x, fn) => x.map((v, i) => v * fn(i / SR));

// 简化版 Freeverb：返回左右两路，带一点立体声展宽
const reverb = (x, {mix: wet = 0.3, size = 0.84, damp = 0.3, tail = 1.5} = {}) => {
  const len = x.length + Math.round(tail * SR);
  const input = new Float32Array(len);
  input.set(x);
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const run = (spread) => {
    const out = new Float32Array(len);
    for (const d0 of combs) {
      const d = d0 + spread, line = new Float32Array(d);
      let idx = 0, lp = 0;
      for (let i = 0; i < len; i++) {
        const o = line[idx];
        lp = o * (1 - damp) + lp * damp;
        line[idx] = input[i] * 0.015 + lp * size;
        out[i] += o;
        idx = (idx + 1) % d;
      }
    }
    for (const d0 of aps) {
      const d = d0 + spread, line = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < len; i++) {
        const b = line[idx], v = out[i];
        out[i] = -v + b;
        line[idx] = v + b * 0.5;
        idx = (idx + 1) % d;
      }
    }
    return out.map((v, i) => input[i] * (1 - wet) + v * wet);
  };
  return [run(0), run(23)];
};

const write = (name, sig) => {
  const [L, R] = Array.isArray(sig) ? sig : [sig, sig];
  const n = Math.max(L.length, R.length);
  let peak = 1e-9;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i] ?? 0), Math.abs(R[i] ?? 0));
  const g = 0.89 / peak;
  const fade = Math.round(0.01 * SR);
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    const f = i > n - fade ? (n - i) / fade : 1;
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, (L[i] ?? 0) * g * f)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, (R[i] ?? 0) * g * f)) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT, `${name}.wav`), Buffer.concat([h, data]));
  console.log(`sfx/${name}.wav  ${(n / SR).toFixed(2)}s`);
};

// 频率随时间变化的正弦
const sweep = (sec, freqFn, ampFn) => {
  let ph = 0;
  return fill(sec, (t) => {
    ph += (TAU * freqFn(t)) / SR;
    return Math.sin(ph) * ampFn(t);
  });
};
// FM 钟声
const fmBell = (sec, fc, ratio, index, decay) =>
  fill(sec, (t) => {
    const e = Math.exp(-t / decay);
    return Math.sin(TAU * fc * t + index * e * Math.sin(TAU * fc * ratio * t)) * env(t, 0.003, decay);
  });
// 金属撞击：不成谐波的分音
const clink = (f0, decay, seed) => {
  const r = rng(seed);
  const parts = [1, 2.76, 5.4, 8.93].map((m) => [f0 * m * (0.98 + r() * 0.04), 1 / m]);
  return fill(decay * 6, (t) => parts.reduce((s, [f, a]) => s + Math.sin(TAU * f * t) * a, 0) * env(t, 0.001, decay));
};

mkdirSync(OUT, {recursive: true});

// ---------- 各个音效 ----------

// 背景低频嗡声：12 秒，所有频率在 12 秒内都是整数周期，可以无缝循环
write('drone', fill(12, (t) => {
  const lfo = 0.75 + 0.25 * Math.sin((TAU * t) / 6);
  return (Math.sin(TAU * 55 * t) * 0.6 + Math.sin(TAU * 55.25 * t) * 0.5 + Math.sin(TAU * 110 * t) * 0.12 * lfo + Math.sin(TAU * 82.5 * t) * 0.1) * lfo;
}));

// 石头落地闷响
write('thump', reverb(mix(
  [sweep(1.0, (t) => 38 + 70 * Math.exp(-t / 0.05), (t) => env(t, 0.002, 0.28))],
  [shape(biquad(noise(0.5, 1), 'lp', 320), (t) => env(t, 0.001, 0.05)), 0.7],
  [shape(biquad(noise(0.2, 2), 'bp', 2200, 1.2), (t) => env(t, 0.0005, 0.012)), 0.25],
), {mix: 0.18, tail: 0.6}));

// 重点词砸下来的冲击
write('impact', reverb(mix(
  [sweep(2.2, (t) => 32 + 90 * Math.exp(-t / 0.08), (t) => env(t, 0.002, 0.55))],
  [shape(biquad(noise(1.0, 3), 'lp', (t) => 200 + 2400 * Math.exp(-t / 0.08)), (t) => env(t, 0.001, 0.16)), 0.9],
  [shape(biquad(noise(0.2, 4), 'hp', 3000), (t) => env(t, 0.0005, 0.02)), 0.35],
), {mix: 0.35, size: 0.88, tail: 1.6}));

// 计数时的短促 tick
write('tick', mix(
  [fill(0.08, (t) => Math.sin(TAU * 2400 * t) * env(t, 0.0005, 0.006))],
  [shape(biquad(noise(0.05, 5), 'hp', 4000), (t) => env(t, 0.0002, 0.002)), 0.4],
));

// 石头摩擦上坡
write('grind', (() => {
  const r = rng(6);
  const bumps = Array.from({length: 40}, () => r() * 2);
  return shape(biquad(brown(2, 7), 'lp', 420), (t) => {
    const fade = Math.min(1, t / 0.15, (2 - t) / 0.3);
    const am = 0.6 + 0.4 * bumps.reduce((s, b) => s + Math.exp(-((t - b) ** 2) / 0.001), 0);
    return fade * Math.min(am, 1.4);
  });
})());

// 石头滚下坡
write('roll', reverb(shape(biquad(brown(1.8, 8), 'lp', (t) => 260 - 80 * t), (t) => {
  const fade = Math.min(1, t / 0.05) * Math.exp(-t / 0.9);
  return fade * (0.7 + 0.3 * Math.sin(TAU * (6 + 6 * t) * t));
}), {mix: 0.2, tail: 0.8}));

// 清亮钟声 / 低音钟
write('bell', reverb(mix([fmBell(4, 880, 1.4, 2.2, 1.1)], [fmBell(4, 1320, 2.01, 0.8, 0.7), 0.3]), {mix: 0.35, tail: 2}));
write('bell_low', reverb(mix([fmBell(5, 130.8, 1.4, 3, 1.8)], [fmBell(5, 65.4, 1, 1, 2.2), 0.5]), {mix: 0.4, size: 0.88, tail: 2.5}));

// 字碎裂
write('shatter', reverb((() => {
  const r = rng(9);
  const layers = [[shape(biquad(noise(0.4, 10), 'hp', 1800), (t) => env(t, 0.0005, 0.05)), 0.8]];
  for (let k = 0; k < 70; k++) {
    const f = 2500 + r() * 6000, d = 0.008 + r() * 0.03, a = 0.1 + r() * 0.3;
    layers.push([fill(0.3, (t) => Math.sin(TAU * f * t) * env(t, 0.0005, d)), a, r() ** 1.6 * 0.9]);
  }
  return mix(...layers);
})(), {mix: 0.3, tail: 1}));

// 粒子沙沙声
write('sizzle', (() => {
  const r = rng(11);
  const layers = [];
  for (let k = 0; k < 160; k++) {
    const t0 = r() * 1.8;
    layers.push([shape(biquad(noise(0.06, 100 + k), 'bp', 4000 + r() * 5000, 3), (t) => env(t, 0.003, 0.012)), 0.15 + r() * 0.2, t0]);
  }
  return shape(mix(...layers), (t) => Math.min(1, t / 0.2, (2 - t) / 0.6));
})());

// 镜头运动的风声，以及反向“吸入”的版本
const whooshSig = shape(biquad(noise(1.4, 12), 'bp', (t) => 300 + 2600 * Math.sin((Math.PI * t) / 1.4) ** 2, 1.6),
  (t) => Math.sin((Math.PI * t) / 1.4) ** 2);
write('whoosh', reverb(whooshSig, {mix: 0.2, tail: 0.6}));
write('riser', reverb(mix(
  [shape(biquad(noise(1.8, 13), 'bp', (t) => 200 * Math.pow(30, t / 1.8), 2), (t) => (t / 1.8) ** 2)],
  [sweep(1.8, (t) => 110 * Math.pow(4, t / 1.8), (t) => (t / 1.8) ** 3 * 0.4)],
), {mix: 0.25, tail: 0.3}));

// 清亮的 ping（在 Remotion 里用 playbackRate 变调）
write('ping', reverb(mix(
  [fill(1.4, (t) => Math.sin(TAU * 660 * t) * env(t, 0.002, 0.35))],
  [fill(1.4, (t) => Math.sin(TAU * 1320 * t) * env(t, 0.002, 0.12)), 0.25],
), {mix: 0.35, tail: 1.2}));

// 两声上滑音
write('slide', mix(
  [sweep(0.3, (t) => 420 * Math.pow(3, t / 0.25), (t) => env(t, 0.005, 0.08))],
  [sweep(0.3, (t) => 560 * Math.pow(3, t / 0.25), (t) => env(t, 0.005, 0.08)), 0.9, 0.16],
));

// 电流噼啪
write('zap', reverb((() => {
  const r = rng(14);
  let ph = 0;
  const buzz = fill(1.0, (t) => {
    ph += (TAU * (110 + r() * 40)) / SR;
    const saw = ((ph / TAU) % 1) * 2 - 1;
    return saw * env(t, 0.005, 0.25) * (r() < 0.3 ? 1 : 0.3);
  });
  const cracks = [];
  for (let k = 0; k < 18; k++) cracks.push([shape(biquad(noise(0.05, 200 + k), 'hp', 2500), (t) => env(t, 0.0002, 0.006)), 0.8, r() * 0.6]);
  return mix([biquad(buzz, 'lp', 3000), 0.6], ...cracks);
})(), {mix: 0.25, tail: 0.6}));

// 不和谐低音鼓胀
write('swell', reverb((() => {
  const freqs = [55, 58.27, 82.41, 87.31, 116.54];
  const sig = fill(2.4, (t) => freqs.reduce((s, f) => s + (((f * t) % 1) * 2 - 1), 0) / freqs.length);
  return shape(biquad(sig, 'lp', (t) => 150 + 900 * (t / 2.4) ** 2), (t) => Math.min(1, (t / 2.0) ** 1.5) * Math.min(1, (2.4 - t) / 0.08));
})(), {mix: 0.3, tail: 1.2}));

// 锁链叮当
write('chain', reverb((() => {
  const r = rng(15);
  const layers = [];
  for (let k = 0; k < 9; k++) layers.push([clink(1100 + r() * 900, 0.06 + r() * 0.05, 300 + k), 0.5 + r() * 0.5, k * 0.13 + r() * 0.05]);
  return mix(...layers);
})(), {mix: 0.25, tail: 0.8}));

// 锁扣
write('lock', reverb(mix(
  [clink(900, 0.05, 16), 0.7],
  [sweep(0.4, (t) => 140 - 60 * t, (t) => env(t, 0.001, 0.06))],
  [shape(biquad(noise(0.2, 17), 'bp', 1500, 2), (t) => env(t, 0.0005, 0.015)), 0.8],
  [clink(1250, 0.04, 18), 0.6, 0.09],
), {mix: 0.25, tail: 0.6}));

// 诡异的高频细音
write('whine', reverb(fill(3, (t) => {
  const vib = Math.sin(TAU * 5 * t) * 4;
  return (Math.sin(TAU * (1760 + vib) * t) + Math.sin(TAU * 1767 * t) * 0.8 + Math.sin(TAU * 2637 * t) * 0.2) * Math.min(1, t / 0.6, (3 - t) / 0.8);
}), {mix: 0.4, tail: 1}));

// 锁链崩断
write('snap', reverb((() => {
  const r = rng(19);
  const layers = [[shape(biquad(noise(0.3, 20), 'hp', 1200), (t) => env(t, 0.0003, 0.03)), 1]];
  for (let k = 0; k < 7; k++) layers.push([clink(1300 + r() * 1200, 0.04 + r() * 0.04, 400 + k), 0.4, 0.05 + r() * 0.5]);
  return mix(...layers);
})(), {mix: 0.3, tail: 0.8}));

// 下沉的低音
write('sub_drop', fill(2.2, (t) => Math.sin(TAU * (30 + 60 * Math.exp(-t / 0.6)) * t) * env(t, 0.02, 0.9)));

// 轻巧上行琶音（五声音阶）
write('arp', reverb(mix(...[0, 2, 4, 7, 9, 12, 14].map((st, k) => [
  fill(0.9, (t) => (Math.sin(TAU * 440 * 2 ** (st / 12) * t) + 0.3 * Math.sin(TAU * 880 * 2 ** (st / 12) * t)) * env(t, 0.003, 0.18)),
  0.6,
  k * 0.11,
])), {mix: 0.35, tail: 1.2}));

// 低沉轰鸣
write('rumble', reverb(mix(
  [shape(biquad(brown(3, 21), 'lp', 140), (t) => Math.min(1, t / 0.08) * Math.exp(-t / 1.1))],
  [sweep(3, () => 41, (t) => env(t, 0.05, 1.0)), 0.6],
), {mix: 0.3, size: 0.88, tail: 1.5}));

// 不和谐和弦重击（给荒诞段预留）
write('dissonant_hit', reverb(mix(...[98, 103.8, 146.8, 155.6].map((f) => [
  fill(2.5, (t) => (((f * t) % 1) * 2 - 1) * env(t, 0.004, 0.6)), 0.3,
])), {mix: 0.35, tail: 1.5}));
