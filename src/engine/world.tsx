/** 场景共用件：按深度分前 / 中 / 后三层（各自模糊）、体积光锥、尘埃、平滑镜头路径。 */
import React from 'react';
import {random} from 'remotion';
import {C} from '../theme';
import {Cam, P2, V3, project} from './projection';

export type Item = {z: number; node: React.ReactNode; key: string};

/**
 * 把场景物件按相机深度排序后分三层画：
 * 远景（> far 米）模糊 + 雾，中景清晰，近景（< near 米）大幅失焦。
 */
export const DepthLayers: React.FC<{
  items: Item[];
  far: number;
  near: number;
  farBlur?: number;
  nearBlur?: number;
  /** 中景模糊（转移焦点时用，默认 0） */
  midBlur?: number;
  children?: React.ReactNode;
}> = ({items, far, near, farBlur = 3, nearBlur = 12, midBlur = 0, children}) => {
  const sorted = [...items].sort((a, b) => b.z - a.z);
  const farI = sorted.filter((i) => i.z >= far);
  const midI = sorted.filter((i) => i.z < far && i.z >= near);
  const nearI = sorted.filter((i) => i.z < near);
  const svg = (list: Item[], blur: number) => (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: blur > 0 ? `blur(${blur}px)` : undefined, overflow: 'visible'}}>
      {list.map((i) => (
        <React.Fragment key={i.key}>{i.node}</React.Fragment>
      ))}
    </svg>
  );
  return (
    <>
      {svg(farI, farBlur)}
      {svg(midI, midBlur)}
      {children}
      {svg(nearI, nearBlur)}
    </>
  );
};

/** 单调三次样条（Fritsch–Carlson）：镜头经过关键点不停顿、不过冲 */
export const spline = (t: number, xs: number[], ys: number[]) => {
  const n = xs.length;
  if (t <= xs[0]) return ys[0];
  if (t >= xs[n - 1]) return ys[n - 1];
  const d: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m.push(0);
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  m.push(0);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const h = a * a + b * b;
    if (h > 9) {
      const k = 3 / Math.sqrt(h);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  let i = 0;
  while (t > xs[i + 1]) i++;
  const hh = xs[i + 1] - xs[i];
  const s = (t - xs[i]) / hh;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * hh * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * hh * m[i + 1]
  );
};

export type CamKey = {f: number; x: number; y: number; z: number; yaw: number; pitch?: number; focal?: number};
export const camPath = (frame: number, keys: CamKey[], f = 1500): Cam => {
  const xs = keys.map((k) => k.f);
  const g = (k: keyof CamKey) => spline(frame, xs, keys.map((q) => (q[k] as number) ?? 0));
  // focal：可选焦距（推长焦特写用）；没给就用默认 f
  const focal = keys.some((k) => k.focal !== undefined) ? spline(frame, xs, keys.map((q) => q.focal ?? f)) : f;
  return {x: g('x'), y: g('y'), z: g('z'), yaw: g('yaw'), pitch: g('pitch'), f: focal};
};

/** 投影一个物件的落脚点：返回屏幕位置、每米像素、相机深度 */
export const place = (p: V3, cam: Cam): P2 => project(p, cam);

/** 体积光锥：从光源投到地面圆盘（屏幕空间梯形 + 渐变），screen 混合 */
export const LightCone: React.FC<{
  id: string;
  src: V3;
  floor: V3;
  radius: number;
  cam: Cam;
  intensity: number;
  color?: string;
}> = ({id, src, floor, radius, cam, intensity, color = C.paper}) => {
  const a = project(src, cam);
  const l = project({x: floor.x - radius, y: floor.y, z: floor.z}, cam);
  const r = project({x: floor.x + radius, y: floor.y, z: floor.z}, cam);
  const nearP = project({x: floor.x, y: floor.y, z: floor.z - radius}, cam);
  const farP = project({x: floor.x, y: floor.y, z: floor.z + radius}, cam);
  if (a.z < 0.2 || l.z < 0.2 || r.z < 0.2) return null;
  const cx = (l.x + r.x) / 2;
  const cy = (nearP.y + farP.y) / 2;
  const rx = Math.abs(r.x - l.x) / 2;
  const ry = Math.max(4, Math.abs(nearP.y - farP.y) / 2);
  const w0 = Math.max(2, a.s * 0.12);
  return (
    <g style={{mixBlendMode: 'screen'}}>
      <defs>
        <linearGradient id={`${id}-g`} x1={a.x} y1={a.y} x2={cx} y2={cy} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={color} stopOpacity={0.5 * intensity} />
          <stop offset="0.55" stopColor={color} stopOpacity={0.16 * intensity} />
          <stop offset="1" stopColor={color} stopOpacity={0.05 * intensity} />
        </linearGradient>
        <radialGradient id={`${id}-p`}>
          <stop offset="0" stopColor={color} stopOpacity={0.28 * intensity} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <path d={`M${a.x - w0},${a.y}L${a.x + w0},${a.y}L${cx + rx},${cy}L${cx - rx},${cy}Z`} fill={`url(#${id}-g)`} />
      <ellipse cx={cx} cy={cy} rx={rx * 1.15} ry={ry * 1.15} fill={`url(#${id}-p)`} />
    </g>
  );
};

/** 尘埃：只做陪衬，固定 seed，体积光里更亮 */
export const Dust: React.FC<{
  seed: string;
  n: number;
  box: {x0: number; x1: number; y0: number; y1: number; z0: number; z1: number};
  cam: Cam;
  frame: number;
  bright?: (p: V3) => number;
}> = ({seed, n, box, cam, frame, bright = () => 0.5}) => {
  const dots: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const rx = random(`${seed}-x${i}`);
    const ry = random(`${seed}-y${i}`);
    const rz = random(`${seed}-z${i}`);
    const sp = 0.3 + random(`${seed}-s${i}`);
    const p = {
      x: box.x0 + (box.x1 - box.x0) * rx + Math.sin(frame / (70 * sp) + i) * 0.08,
      y: box.y0 + (((box.y1 - box.y0) * ry - frame * 0.0015 * sp) % (box.y1 - box.y0) + (box.y1 - box.y0)) % (box.y1 - box.y0),
      z: box.z0 + (box.z1 - box.z0) * rz,
    };
    const q = project(p, cam);
    if (q.z < 0.3 || q.x < -20 || q.x > 1940 || q.y < -20 || q.y > 1100) continue;
    const b = bright(p);
    if (b < 0.03) continue;
    dots.push(<circle key={i} cx={q.x} cy={q.y} r={Math.max(0.6, Math.min(3.5, q.s * 0.006))} fill={C.paper} opacity={b * (0.35 + 0.65 * random(`${seed}-b${i}`))} />);
  }
  return <g style={{mixBlendMode: 'screen'}}>{dots}</g>;
};
