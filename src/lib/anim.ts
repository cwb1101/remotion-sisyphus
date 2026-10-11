import {Easing, interpolate, interpolateColors} from 'remotion';

export type Pt = {x: number; y: number};

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t)});

export const inOut = Easing.inOut(Easing.cubic);
export const out = Easing.out(Easing.cubic);
export const easeIn = Easing.in(Easing.cubic);

/** frame 在 [a, b] 之间时从 0 走到 1，两端夹住 */
export const ramp = (frame: number, a: number, b: number, easing: (t: number) => number = inOut) =>
  b <= a
    ? frame >= b
      ? 1
      : 0
    : interpolate(frame, [a, b], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing});

export const mixColor = (t: number, a: string, b: string) => interpolateColors(clamp(t), [0, 1], [a, b]);

/** 0..1 的确定性伪随机数 */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** 平滑的一维噪声，输出 -1..1 */
export const noise1 = (x: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u) * 2 - 1;
};

/** 先升后降的脉冲：t 在 [0, w] 内从 0 到 1 再回 0 */
export const pulse = (t: number, w: number) => (t < 0 || t > w ? 0 : Math.sin((Math.PI * t) / w));
