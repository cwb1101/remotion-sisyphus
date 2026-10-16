import { Key, lerp, mix, track, Vec } from './anim';
import { Light } from '../theme';

/** 世界相机：(x, y) 为画面中心对准的世界坐标，z 为缩放，r 为旋转（度）。 */
export type Cam = { x: number; y: number; z: number; r: number };

export const W = 1920;
export const H = 1080;

export const worldTransform = (c: Cam) =>
  `translate(${W / 2} ${H / 2}) rotate(${c.r}) scale(${c.z}) translate(${-c.x} ${-c.y})`;

export const toScreen = (c: Cam, p: Vec): Vec => {
  const dx = (p.x - c.x) * c.z;
  const dy = (p.y - c.y) * c.z;
  const a = (c.r * Math.PI) / 180;
  return { x: W / 2 + dx * Math.cos(a) - dy * Math.sin(a), y: H / 2 + dx * Math.sin(a) + dy * Math.cos(a) };
};

/** 当前画面可见的世界范围（带余量），用来裁掉画外的草叶。 */
export const viewBounds = (c: Cam, pad = 120) => {
  const hw = (W / 2 / c.z) * 1.15 + pad;
  const hh = (H / 2 / c.z) * 1.15 + pad;
  return { x0: c.x - hw, x1: c.x + hw, y0: c.y - hh, y1: c.y + hh };
};

export type CamKey = [frame: number, cam: Partial<Cam> & { x: number; y: number; z: number }, easing?: (t: number) => number];

/** 相机关键帧轨道。 */
export const camTrack = (frame: number, keys: CamKey[]): Cam => {
  const pick = (k: 'x' | 'y' | 'z' | 'r') => track(frame, keys.map(([f, c, e]) => [f, c[k] ?? 0, e] as Key<number>));
  return { x: pick('x'), y: pick('y'), z: pick('z'), r: pick('r') };
};

export const mixLight = (a: Light, b: Light, t: number): Light => ({
  base: mix(a.base, b.base, t),
  ground: mix(a.ground, b.ground, t),
  grass: mix(a.grass, b.grass, t),
  pool: mix(a.pool, b.pool, t),
  poolAlpha: lerp(a.poolAlpha, b.poolAlpha, t),
  poolRadius: lerp(a.poolRadius, b.poolRadius, t),
  vignette: lerp(a.vignette, b.vignette, t),
});
