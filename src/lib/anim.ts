import { Easing, interpolate } from 'remotion';

export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const ease = {
  linear: (t: number) => t,
  inOut: Easing.inOut(Easing.cubic),
  out: Easing.out(Easing.cubic),
  in: Easing.in(Easing.cubic),
  outBack: Easing.out(Easing.back(1.6)),
  sine: Easing.inOut(Easing.sin),
};

/** frame 在 [a, b] 之间的进度 0..1（带缓动，两端钳制）。 */
export const prog = (frame: number, a: number, b: number, e: (t: number) => number = ease.inOut) =>
  interpolate(frame, [a, b], [0, 1], { easing: e, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

/** 多关键帧数值轨道：[[frame, value], ...]，段与段之间用同一种缓动。 */
export const track = (frame: number, keys: [number, number][], e: (t: number) => number = ease.inOut) => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [f1, v1] = keys[i];
    const [f0, v0] = keys[i - 1];
    if (frame <= f1) return lerp(v0, v1, e(clamp((frame - f0) / Math.max(1e-6, f1 - f0))));
  }
  return keys[keys.length - 1][1];
};

/** 对数空间插值缩放，推拉镜头速度更自然。 */
export const zoomLerp = (z0: number, z1: number, t: number) => Math.exp(lerp(Math.log(z0), Math.log(z1), t));

/** 衰减抖动：砸字时给镜头的一次冲击。 */
export const shake = (frame: number, at: number, amp: number, decay = 6) => {
  const d = frame - at;
  if (d < 0 || d > decay * 6) return { x: 0, y: 0 };
  const k = amp * Math.exp(-d / decay);
  return { x: k * Math.sin(d * 2.3), y: k * Math.cos(d * 1.7) * 0.7 };
};

export type Cam = { z: number; fx: number; fy: number; sx: number; sy: number };

export const IDENTITY_CAM: Cam = { z: 1, fx: 960, fy: 540, sx: 960, sy: 540 };

export const camTransform = (c: Cam) => `translate(${c.sx} ${c.sy}) scale(${c.z}) translate(${-c.fx} ${-c.fy})`;

/** 世界坐标 → 屏幕坐标 */
export const toScreen = (c: Cam, x: number, y: number) => ({ x: (x - c.fx) * c.z + c.sx, y: (y - c.fy) * c.z + c.sy });

export const mixCam = (a: Cam, b: Cam, t: number): Cam => ({
  z: zoomLerp(a.z, b.z, t),
  fx: lerp(a.fx, b.fx, t),
  fy: lerp(a.fy, b.fy, t),
  sx: lerp(a.sx, b.sx, t),
  sy: lerp(a.sy, b.sy, t),
});
