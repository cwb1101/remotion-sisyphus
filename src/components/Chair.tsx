/**
 * 贯穿全片的物件：一把木椅。
 *
 * 由 12 个长方体拼成（4 条腿、座面、2 根后立柱、顶横档、4 根靠背竖条），
 * 每个面按法线和顶光算明暗，背面剔除、远面先画，可以任意旋转、
 * 从高处或低处看，也可以推到占满整个画面（竖条之间透光，用作转场）。
 */
import React from 'react';
import {C, mix} from '../theme';

type V = [number, number, number];

const BOX = (cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) => ({
  c: [cx, cy, cz] as V,
  s: [sx, sy, sz] as V,
});

const LEG = 0.036;
const SEAT_H = 0.46;
const W2 = 0.22;
const D2 = 0.2;

const PARTS = [
  BOX(-W2 + LEG / 2, SEAT_H / 2, -D2 + LEG / 2, LEG, SEAT_H, LEG),
  BOX(W2 - LEG / 2, SEAT_H / 2, -D2 + LEG / 2, LEG, SEAT_H, LEG),
  BOX(-W2 + LEG / 2, 0.475, D2 - LEG / 2, LEG, 0.95, LEG),
  BOX(W2 - LEG / 2, 0.475, D2 - LEG / 2, LEG, 0.95, LEG),
  BOX(0, SEAT_H + 0.015, 0, W2 * 2 + 0.02, 0.03, D2 * 2 + 0.02),
  BOX(0, 0.88, D2 - LEG / 2, W2 * 2, 0.07, LEG * 0.9),
  BOX(0, 0.2, -D2 + LEG / 2, W2 * 2 - LEG, 0.025, 0.02),
  ...[-0.105, -0.035, 0.035, 0.105].map((x) => BOX(x, 0.67, D2 - LEG / 2, 0.034, 0.36, 0.018)),
];

const FACES: {n: V; idx: number[]}[] = [
  {n: [0, 0, -1], idx: [0, 1, 3, 2]},
  {n: [0, 0, 1], idx: [5, 4, 6, 7]},
  {n: [-1, 0, 0], idx: [4, 0, 2, 6]},
  {n: [1, 0, 0], idx: [1, 5, 7, 3]},
  {n: [0, 1, 0], idx: [2, 3, 7, 6]},
  {n: [0, -1, 0], idx: [4, 5, 1, 0]},
];

const corners = (b: {c: V; s: V}): V[] => {
  const out: V[] = [];
  for (let z = 0; z < 2; z++)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++)
        out.push([b.c[0] + (x ? 0.5 : -0.5) * b.s[0], b.c[1] + (y ? 0.5 : -0.5) * b.s[1], b.c[2] + (z ? 0.5 : -0.5) * b.s[2]]);
  return out;
};

export type ChairProps = {
  /** 屏幕上椅子底面中心（px） */
  x: number;
  y: number;
  /** 每米多少像素 */
  scale: number;
  /** 椅子相对镜头的朝向（度）：0 = 正面对镜头，90 = 侧面 */
  yaw?: number;
  /** 俯视角（度）：正值 = 从上往下看 */
  tilt?: number;
  /** 顶光强度 0..1，0 时椅子沉进阴影 */
  lit?: number;
  /** 光从哪边来：-1 左，1 右 */
  light?: number;
  fog?: number;
  fogColor?: string;
  opacity?: number;
  /** 靠背竖条之间透出的光 0..1（推镜穿过椅背时用） */
  gapGlow?: number;
};

export const Chair: React.FC<ChairProps> = ({
  x,
  y,
  scale,
  yaw = 30,
  tilt = 10,
  lit = 1,
  light = -1,
  fog = 0,
  fogColor = C.dark,
  opacity = 1,
  gapGlow = 0,
}) => {
  const cy = Math.cos((yaw * Math.PI) / 180);
  const sy = Math.sin((yaw * Math.PI) / 180);
  const ct = Math.cos((tilt * Math.PI) / 180);
  const st = Math.sin((tilt * Math.PI) / 180);
  // 局部（x 右, y 上, z 远）→ 观察坐标
  const rot = (p: V): V => {
    const X = cy * p[0] + sy * p[2];
    const Z = -sy * p[0] + cy * p[2];
    const Y = ct * p[1] - st * Z;
    const Z2 = st * p[1] + ct * Z;
    return [X, Y, Z2];
  };
  const L: V = [light * 0.45, 0.8, -0.4];
  const ll = Math.hypot(...L);
  const polys: {d: string; z: number; col: string; edge: number}[] = [];
  for (const b of PARTS) {
    const cs = corners(b).map(rot);
    for (const f of FACES) {
      const n = rot(f.n);
      if (n[2] > -0.02) continue; // 背面剔除（z 朝远处）
      const diff = Math.max(0, (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) / ll);
      const shade = 0.06 + diff * 0.5 * lit + (n[1] > 0.5 ? 0.12 * lit : 0);
      const pts = f.idx.map((i) => cs[i]);
      const z = pts.reduce((a, p) => a + p[2], 0) / 4;
      const d = 'M' + pts.map((p) => `${(p[0] * scale).toFixed(2)},${(-p[1] * scale).toFixed(2)}`).join('L') + 'Z';
      polys.push({d, z, col: mix(mix(C.black, C.light, shade), fogColor, fog), edge: diff});
    }
  }
  polys.sort((a, b) => b.z - a.z);
  // 靠背竖条之间的透光（画在椅子后面）
  const back = [rot([-W2, SEAT_H + 0.03, D2 + 0.01]), rot([W2, SEAT_H + 0.03, D2 + 0.01]), rot([W2, 0.85, D2 + 0.01]), rot([-W2, 0.85, D2 + 0.01])];
  const backD = 'M' + back.map((p) => `${p[0] * scale},${-p[1] * scale}`).join('L') + 'Z';
  const rimW = Math.max(0.8, Math.min(3, scale * 0.0025));
  return (
    <g transform={`translate(${x},${y})`} opacity={opacity}>
      {gapGlow > 0 ? <path d={backD} fill={C.paper} opacity={gapGlow} /> : null}
      {polys.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.col}
          stroke={mix(C.paper, fogColor, fog)}
          strokeOpacity={Math.max(0, p.edge - 0.35) * 1.2 * lit * (1 - fog)}
          strokeWidth={rimW}
          strokeLinejoin="round"
        />
      ))}
    </g>
  );
};
