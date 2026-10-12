import {Easing, interpolate} from 'remotion';

/** 慢进慢出 */
export const ease = Easing.bezier(0.45, 0, 0.2, 1);
export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.6, 0, 0.85, 0.3);

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 关键帧插值：keys 为 [帧, 值]，帧必须递增；每段独立缓动 */
export const track = (
  frame: number,
  keys: Array<[number, number]>,
  easing: (t: number) => number = ease,
): number => {
  if (keys.length === 1) {
    return keys[0][1];
  }
  return interpolate(
    frame,
    keys.map((k) => k[0]),
    keys.map((k) => k[1]),
    {easing, extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
};

/** 0→1 的进度 */
export const prog = (
  frame: number,
  from: number,
  to: number,
  easing: (t: number) => number = ease,
) => track(frame, [[from, 0], [to, 1]], easing);

/** 接受 #rrggbb 或 rgb(r,g,b)，返回 [r,g,b] */
const hex = (c: string) => {
  if (c.startsWith('rgb')) {
    return c
      .replace(/[^\d,.]/g, '')
      .split(',')
      .slice(0, 3)
      .map(Number);
  }
  const h = c.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  const k = clamp(t);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};

export const rgba = (c: string, alpha: number) => {
  const [r, g, b] = hex(c);
  return `rgba(${r},${g},${b},${alpha})`;
};
