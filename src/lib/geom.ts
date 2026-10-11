import {lerp, type Pt} from './anim';

/** 一条山坡：从 foot 到 top。u=0 在坡底，u=1 在坡顶；lift 是沿法线向上抬起的距离 */
export type Slope = {foot: Pt; top: Pt; len: number; dir: Pt; up: Pt; at: (u: number, lift?: number) => Pt; angle: number};

export const makeSlope = (foot: Pt, top: Pt): Slope => {
  const len = Math.hypot(top.x - foot.x, top.y - foot.y);
  const dir = {x: (top.x - foot.x) / len, y: (top.y - foot.y) / len};
  const up = {x: dir.y, y: -dir.x};
  return {
    foot,
    top,
    len,
    dir,
    up,
    at: (u, lift = 0) => ({x: foot.x + dir.x * len * u + up.x * lift, y: foot.y + dir.y * len * u + up.y * lift}),
    angle: (Math.atan2(dir.y, dir.x) * 180) / Math.PI,
  };
};

/** 两条山坡之间插值（用来让坡变平、变陡、变成另一座山） */
export const mixSlope = (a: Slope, b: Slope, t: number) =>
  makeSlope({x: lerp(a.foot.x, b.foot.x, t), y: lerp(a.foot.y, b.foot.y, t)}, {x: lerp(a.top.x, b.top.x, t), y: lerp(a.top.y, b.top.y, t)});

/** 分段线性的关键帧插值：[[帧, 值], ...]，每段用 ease 过渡 */
export const keyed = (f: number, keys: [number, number][], ease: (t: number) => number = (t) => t) => {
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, v0] = keys[i];
    const [f1, v1] = keys[i + 1];
    if (f < f1) return lerp(v0, v1, ease((f - f0) / (f1 - f0)));
  }
  return keys[keys.length - 1][1];
};
