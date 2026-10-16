import React from 'react';
import { PALETTE } from '../theme';
import { COOL, WARM } from '../data/script';
import { mix, rgba } from '../lib/anim';

/** 贯穿全片的物件：一把静止的锯子。默认放在世界坐标的这个位置。 */
export const SAW = { x0: 880, length: 760, y: 585, w: 64 };

export type SawProps = {
  id: string;
  layer?: 'body' | 'teeth' | 'all';
  x0?: number;
  y?: number;
  length?: number;
  w?: number;
  /** 冷光扫过的位置（世界 x），null 表示没有 */
  glint?: number | null;
  /** 齿尖变暖发光 0..1（嵌进蛇身时） */
  warm?: number;
  /** 齿长倍数（“嵌得越深”时齿变长） */
  toothGrow?: number;
  /** 所有齿尖整体闪冷光 0..1 */
  flash?: number;
  /** 把手显隐 0..1（后面缩成“刺块”时淡出） */
  handle?: number;
  /** 0 = 锯条；1 = 两边都长齿的刺块 */
  morph?: number;
  holeColor?: string;
  opacity?: number;
};

const teethPath = (x0: number, len: number, y: number, th: number, dir: 1 | -1) => {
  const n = Math.max(4, Math.round(len / 25));
  const s = (len - 24) / n;
  const out: { d: string; cx: number }[] = [];
  for (let i = 0; i < n; i++) {
    const a = x0 + 14 + i * s;
    const apexX = a + s * 0.72;
    out.push({ d: `M${a} ${y} L${apexX} ${y - dir * th} L${a + s} ${y} Z`, cx: apexX });
  }
  return out;
};

export const Saw: React.FC<SawProps> = ({
  id,
  layer = 'all',
  x0 = SAW.x0,
  y = SAW.y,
  length = SAW.length,
  w = SAW.w,
  glint = null,
  warm = 0,
  toothGrow = 1,
  flash = 0,
  handle = 1,
  morph = 0,
  holeColor = '#121821',
  opacity = 1,
}) => {
  const x1 = x0 + length;
  const th = 24 * toothGrow;
  const top = teethPath(x0, length, y + 1, th, 1);
  const bottom = morph > 0 ? teethPath(x0 + 20, length - 30, y + w - 1, th * 0.9, -1) : [];
  const toothFill = mix(PALETTE.steelLight, WARM, warm * 0.75);
  const glow = (cx: number) => (glint === null ? 0 : Math.exp(-(((cx - glint) / 46) ** 2)));

  const body = (
    <g>
      <defs>
        <linearGradient id={`${id}-blade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={PALETTE.steelLight} />
          <stop offset="0.35" stopColor={PALETTE.steel} />
          <stop offset="1" stopColor={PALETTE.steelDark} />
        </linearGradient>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#E9FFFC" stopOpacity="0.75" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={`M${x0} ${y + 10} L${x0 + 14} ${y} L${x1} ${y} L${x1} ${y + w} L${x0 + 30} ${y + w * 0.82} Q${x0} ${y + w * 0.62} ${x0} ${y + 10} Z`} />
        </clipPath>
      </defs>
      {/* 投影 */}
      <ellipse cx={(x0 + x1) / 2 + 14} cy={y + w + 16} rx={length * 0.55} ry={16} fill="rgba(0,0,0,0.45)" />
      <path
        d={`M${x0} ${y + 10} L${x0 + 14} ${y} L${x1} ${y} L${x1} ${y + w} L${x0 + 30} ${y + w * 0.82} Q${x0} ${y + w * 0.62} ${x0} ${y + 10} Z`}
        fill={`url(#${id}-blade)`}
        stroke="#2A2F38"
        strokeWidth={1.5}
      />
      <line x1={x0 + 22} y1={y + 9} x2={x1} y2={y + 9} stroke="rgba(255,255,255,0.28)" strokeWidth={2} />
      <line x1={x0 + 60} y1={y + w * 0.62} x2={x1 - 40} y2={y + w * 0.66} stroke="rgba(0,0,0,0.18)" strokeWidth={3} />
      {glint !== null && (
        <g clipPath={`url(#${id}-clip)`}>
          <polygon
            points={`${glint - 70},${y - 10} ${glint + 110},${y - 10} ${glint + 70},${y + w + 10} ${glint - 110},${y + w + 10}`}
            fill={`url(#${id}-glint)`}
          />
        </g>
      )}
      {handle > 0 && (
        <g opacity={handle}>
          <path
            d={`M${x1 - 6} ${y - 22} C${x1 + 60} ${y - 48} ${x1 + 150} ${y - 40} ${x1 + 178} ${y - 6} L${x1 + 186} ${y + w + 18} C${x1 + 140} ${y + w + 40} ${x1 + 40} ${y + w + 38} ${x1 - 6} ${y + w + 14} Z`}
            fill={PALETTE.handle}
            stroke="#5A6170"
            strokeWidth={2}
          />
          <ellipse cx={x1 + 108} cy={y + w / 2 + 4} rx={44} ry={26} fill={holeColor} stroke="#232831" strokeWidth={3} />
          <circle cx={x1 + 20} cy={y + 15} r={6} fill={PALETTE.steelLight} />
          <circle cx={x1 + 20} cy={y + w - 13} r={6} fill={PALETTE.steelLight} />
        </g>
      )}
    </g>
  );

  const allTeeth = [...top, ...bottom.map((t) => ({ ...t, faded: true }))];
  const teeth = (
    <g>
      {warm > 0.01 && (
        <g filter={`url(#${id}-blur)`} opacity={warm}>
          <defs>
            <filter id={`${id}-blur`} x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation={6} />
            </filter>
          </defs>
          {top.map((t, i) => (
            <path key={i} d={t.d} fill={WARM} />
          ))}
        </g>
      )}
      {allTeeth.map((t, i) => {
        const g = Math.min(1, glow(t.cx) + flash);
        const faded = 'faded' in t;
        return (
          <g key={i} opacity={faded ? morph : 1}>
            <path d={t.d} fill={toothFill} stroke="#3A404B" strokeWidth={1.2} />
            {g > 0.02 && <path d={t.d} fill={rgba(COOL, g * 0.55)} stroke={rgba('#E9FFFC', g)} strokeWidth={2} />}
          </g>
        );
      })}
    </g>
  );

  return (
    <g opacity={opacity}>
      {layer !== 'teeth' && body}
      {layer !== 'body' && teeth}
    </g>
  );
};
