import { Easing } from 'remotion';

export type EaseFn = (t: number) => number;

export const ease = {
  linear: (t: number) => t,
  in: Easing.in(Easing.cubic),
  out: Easing.out(Easing.cubic),
  inOut: Easing.inOut(Easing.cubic),
  outQuart: Easing.out(Easing.poly(4)),
  inQuart: Easing.in(Easing.poly(4)),
  inOutQuart: Easing.inOut(Easing.poly(4)),
  outBack: Easing.out(Easing.back(1.7)),
  sine: Easing.inOut(Easing.sin),
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 帧 f 在 [a, b] 区间里的进度（0–1），可选缓动 */
export const prog = (f: number, a: number, b: number, e: EaseFn = ease.linear) =>
  e(clamp((f - a) / (b - a)));

/** 关键帧：[帧, 值, 进入该帧时用的缓动] */
export type Key = [number, number, EaseFn?];

export const track = (f: number, keys: Key[]): number => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1, e] = keys[i + 1];
    if (f <= f1) {
      const t = f1 === f0 ? 1 : (f - f0) / (f1 - f0);
      return v0 + (v1 - v0) * (e ? e(t) : t);
    }
  }
  return keys[keys.length - 1][1];
};

/** 每帧的变化量（用来驱动运动模糊） */
export const velocity = (f: number, keys: Key[]) => track(f + 0.5, keys) - track(f - 0.5, keys);

/** 衰减弹簧：在 start 帧被"敲"一下后的回弹，返回 -1..1 的偏移系数 */
export const wobble = (f: number, start: number, freq = 0.35, damp = 0.12) => {
  if (f < start) return 0;
  const t = f - start;
  return Math.sin(t * freq * Math.PI) * Math.exp(-t * damp);
};

/** 确定性伪随机 */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
