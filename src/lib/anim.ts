import {Easing, interpolateColors} from 'remotion';

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** frame 在 [start, start+dur] 内的 0–1 进度 */
export const prog = (frame: number, start: number, dur: number) =>
  dur <= 0 ? (frame >= start ? 1 : 0) : clamp01((frame - start) / dur);

export const ease = {
  linear: (t: number) => t,
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  out: Easing.bezier(0.16, 1, 0.3, 1),
  outSoft: Easing.bezier(0.33, 1, 0.68, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
  inStrong: Easing.bezier(0.7, 0, 0.84, 0),
  /** 带轻微回弹的落地 */
  outBack: (t: number) => {
    const c1 = 1.4;
    const c3 = c1 + 1;
    return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
  },
};

export const mixColor = (a: string, b: string, t: number) => interpolateColors(clamp01(t), [0, 1], [a, b]);

/** 0→1→0 的钟形 */
export const bell = (t: number) => Math.sin(clamp01(t) * Math.PI);

/** 确定性伪随机 */
export const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** 按关键帧分段插值，每段可指定缓动 */
export const keyframes = (
  frame: number,
  keys: {f: number; v: number; e?: (t: number) => number}[],
) => {
  if (frame <= keys[0].f) return keys[0].v;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (frame <= k.f) {
      const p = keys[i - 1];
      const t = (frame - p.f) / (k.f - p.f);
      return lerp(p.v, k.v, (k.e ?? ease.inOut)(t));
    }
  }
  return keys[keys.length - 1].v;
};
