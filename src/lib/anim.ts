import { Easing, random } from 'remotion';

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 把 frame 在 [a, b] 里映射到 0..1（夹紧）。 */
export const prog = (frame: number, a: number, b: number) => (b === a ? (frame >= b ? 1 : 0) : clamp((frame - a) / (b - a)));

export const ease = {
  inOut: Easing.bezier(0.45, 0, 0.2, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  in: Easing.bezier(0.6, 0, 0.9, 0.4),
  linear: (t: number) => t,
};

export type Key<T> = [frame: number, value: T, easing?: (t: number) => number];

/** 分段关键帧插值；easing 写在“到达”的那一帧上。 */
export const track = (frame: number, keys: Key<number>[]): number => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1, e = ease.inOut] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (frame <= f1) return lerp(v0, v1, e(prog(frame, f0, f1)));
  }
  return keys[keys.length - 1][1];
};

export type Vec = { x: number; y: number };
export const v = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
export const len = (a: Vec) => Math.hypot(a.x, a.y);
export const norm = (a: Vec): Vec => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
export const rot = (a: Vec, ang: number): Vec => ({
  x: a.x * Math.cos(ang) - a.y * Math.sin(ang),
  y: a.x * Math.sin(ang) + a.y * Math.cos(ang),
});
export const vlerp = (a: Vec, b: Vec, t: number): Vec => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/** 确定性随机数（渲染多进程时每帧结果一致）。 */
export const rnd = (seed: string | number) => random(String(seed));

const hexToRgb = (h: string) => {
  if (h.startsWith('rgb')) return h.replace(/[^\d,]/g, '').split(',').slice(0, 3).map(Number);
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a: string, b: string, t: number) => {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((x, i) => Math.round(lerp(x, B[i], clamp(t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
};
export const rgba = (h: string, a: number) => {
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r},${g},${b},${clamp(a)})`;
};

/** 平滑抖动（多频正弦叠加，无随机跳变）。 */
export const shake = (frame: number, amp: number, seed = 0) => ({
  x: amp * (Math.sin(frame * 1.7 + seed) * 0.6 + Math.sin(frame * 3.1 + seed * 2) * 0.4),
  y: amp * (Math.cos(frame * 1.3 + seed) * 0.6 + Math.sin(frame * 2.7 + seed * 3) * 0.4),
});

/** 冲击包络：t=0 时为 1，按 decay 帧指数衰减；t<0 为 0。 */
export const impulse = (frame: number, at: number, decay = 10) => (frame < at ? 0 : Math.exp(-(frame - at) / decay));
