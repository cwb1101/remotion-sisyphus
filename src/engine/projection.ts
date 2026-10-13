/**
 * 极简 2.5D 引擎：世界坐标（米，y 朝上，z 朝画面里）→ 屏幕像素。
 * 所有场景都用真透视投影，镜头一动，前中后三层自然出现不同的移动速度。
 */
import {interpolate, Easing} from 'remotion';

export type V3 = {x: number; y: number; z: number};
export type Cam = {x: number; y: number; z: number; yaw: number; pitch: number; f: number};

export const CX = 960;
export const CY = 540;
export const NEAR = 0.15;

const rad = (d: number) => (d * Math.PI) / 180;

/** 世界 → 相机坐标 */
export const toCam = (p: V3, c: Cam): V3 => {
  const dx = p.x - c.x;
  const dy = p.y - c.y;
  const dz = p.z - c.z;
  const cy = Math.cos(rad(c.yaw));
  const sy = Math.sin(rad(c.yaw));
  const x1 = cy * dx - sy * dz;
  const z1 = sy * dx + cy * dz;
  const cp = Math.cos(rad(c.pitch));
  const sp = Math.sin(rad(c.pitch));
  const y2 = cp * dy - sp * z1;
  const z2 = sp * dy + cp * z1;
  return {x: x1, y: y2, z: z2};
};

export type P2 = {x: number; y: number; z: number; s: number};

/** 相机坐标 → 屏幕；s = 每米多少像素（在该深度） */
export const camToScreen = (q: V3, c: Cam): P2 => {
  const z = Math.max(q.z, 1e-4);
  const s = c.f / z;
  return {x: CX + q.x * s, y: CY - q.y * s, z: q.z, s};
};

export const project = (p: V3, c: Cam): P2 => camToScreen(toCam(p, c), c);

/** 多边形按近裁剪面裁剪后投影（Sutherland–Hodgman） */
export const projectPoly = (pts: V3[], c: Cam): {x: number; y: number}[] | null => {
  const q = pts.map((p) => toCam(p, c));
  const out: V3[] = [];
  for (let i = 0; i < q.length; i++) {
    const a = q[i];
    const b = q[(i + 1) % q.length];
    const ain = a.z >= NEAR;
    const bin = b.z >= NEAR;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (NEAR - a.z) / (b.z - a.z);
      out.push({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: NEAR});
    }
  }
  if (out.length < 3) return null;
  return out.map((p) => camToScreen(p, c));
};

export const pathOf = (pts: {x: number; y: number}[] | null) =>
  pts ? 'M' + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L') + 'Z' : '';

/** 雾：随深度指数增加 */
export const fogAt = (depth: number, density: number, start = 0) =>
  1 - Math.exp(-Math.max(0, depth - start) * density);

/** 镜头关键帧：每段之间慢进慢出 */
export type CamKey = {f: number} & Partial<Cam>;
export const camTrack = (frame: number, keys: CamKey[], base: Cam): Cam => {
  const fields: (keyof Cam)[] = ['x', 'y', 'z', 'yaw', 'pitch', 'f'];
  const out = {...base};
  for (const k of fields) {
    const ks = keys.filter((x) => x[k] !== undefined);
    if (ks.length === 0) continue;
    if (ks.length === 1) {
      out[k] = ks[0][k] as number;
      continue;
    }
    out[k] = interpolate(
      frame,
      ks.map((x) => x.f),
      ks.map((x) => x[k] as number),
      {easing: Easing.inOut(Easing.sin), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
    );
  }
  return out;
};

/** 分段慢进慢出插值（每一段单独做 easing，而不是整条曲线一个 easing） */
export const keyed = (frame: number, fs: number[], vs: number[], ease = Easing.inOut(Easing.cubic)) => {
  if (frame <= fs[0]) return vs[0];
  for (let i = 0; i < fs.length - 1; i++) {
    if (frame <= fs[i + 1]) {
      const t = (frame - fs[i]) / Math.max(1e-6, fs[i + 1] - fs[i]);
      return vs[i] + (vs[i + 1] - vs[i]) * ease(t);
    }
  }
  return vs[vs.length - 1];
};

/** 相机坐标 → 世界坐标（toCam 的逆变换），用来把物件钉在「此刻镜头前某个位置」 */
export const camToWorld = (q: V3, c: Cam): V3 => {
  const cp = Math.cos(rad(c.pitch));
  const sp = Math.sin(rad(c.pitch));
  const y1 = cp * q.y + sp * q.z;
  const z1 = -sp * q.y + cp * q.z;
  const cy = Math.cos(rad(c.yaw));
  const sy = Math.sin(rad(c.yaw));
  const dx = cy * q.x + sy * z1;
  const dz = -sy * q.x + cy * z1;
  return {x: dx + c.x, y: y1 + c.y, z: dz + c.z};
};

/** 长方体：返回朝向镜头的面（已裁剪、按顶光算好明暗） */
export const boxFaces = (c: V3, s: V3, cam: Cam, base: string, lightK = 1) => {
  const h = {x: s.x / 2, y: s.y / 2, z: s.z / 2};
  const P = (dx: number, dy: number, dz: number): V3 => ({x: c.x + dx * h.x, y: c.y + dy * h.y, z: c.z + dz * h.z});
  const faces: {pts: V3[]; n: V3; shade: number}[] = [
    {pts: [P(-1, -1, -1), P(1, -1, -1), P(1, 1, -1), P(-1, 1, -1)], n: {x: 0, y: 0, z: -1}, shade: 0.35},
    {pts: [P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1)], n: {x: 0, y: 0, z: 1}, shade: 0.3},
    {pts: [P(-1, -1, -1), P(-1, -1, 1), P(-1, 1, 1), P(-1, 1, -1)], n: {x: -1, y: 0, z: 0}, shade: 0.45},
    {pts: [P(1, -1, -1), P(1, -1, 1), P(1, 1, 1), P(1, 1, -1)], n: {x: 1, y: 0, z: 0}, shade: 0.25},
    {pts: [P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)], n: {x: 0, y: 1, z: 0}, shade: 0.75},
  ];
  const out: {d: string; shade: number}[] = [];
  for (const f of faces) {
    // 背面剔除：面中心指向镜头的向量与法线同向才画
    const fc = f.pts.reduce((a, p) => ({x: a.x + p.x / 4, y: a.y + p.y / 4, z: a.z + p.z / 4}), {x: 0, y: 0, z: 0});
    const v = {x: cam.x - fc.x, y: cam.y - fc.y, z: cam.z - fc.z};
    if (v.x * f.n.x + v.y * f.n.y + v.z * f.n.z <= 0) continue;
    const pp = projectPoly(f.pts, cam);
    if (pp) out.push({d: pathOf(pp), shade: f.shade * lightK});
  }
  return {faces: out, base};
};
