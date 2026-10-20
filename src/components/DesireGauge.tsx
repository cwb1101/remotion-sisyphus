import React from 'react';
import {C, FONT_SANS} from '../theme';
import {clamp01, mixColor} from '../lib/anim';

// 贯穿全片的物件：「欲望水位计」——一支玻璃试管，墨绿刻度线表示"刚刚好"。
// 液面低于刻度是绿色，越过就变朱红；溢出的部分顺着管壁流下。

export const TUBE_W = 84;
export const TUBE_H = 380;
export const OK_LINE = 0.55;

let seq = 0;

export type TubeProps = {
  /** 管身中心 x、管口 y */
  x: number;
  y: number;
  w?: number;
  h?: number;
  /** 液面 0–1 */
  level: number;
  /** 0 绿 → 1 红；不传则按液面是否越过刻度自动判断 */
  heat?: number;
  frame: number;
  label?: string;
  labelOpacity?: number;
  labelSize?: number;
  /** 是否画刻度线 */
  okLine?: boolean;
  /** 溢出 0–1 */
  overflow?: number;
  opacity?: number;
  /** 管口发光（被点亮） */
  glow?: number;
  /** 玻璃里的倒影内容（坐标以管身左上角为原点，会被裁剪） */
  reflection?: React.ReactNode;
  scale?: number;
};

export const Tube: React.FC<TubeProps> = ({
  x,
  y,
  w = TUBE_W,
  h = TUBE_H,
  level,
  heat,
  frame,
  label,
  labelOpacity = 1,
  labelSize = 34,
  okLine = true,
  overflow = 0,
  opacity = 1,
  glow = 0,
  reflection,
  scale = 1,
}) => {
  const [id] = React.useState(() => `tube${seq++}`);
  const r = w / 2;
  const left = -r;
  // 管身路径：直壁 + 半圆底
  const body = `M${left} 0 L${left} ${h - r} A${r} ${r} 0 0 0 ${r} ${h - r} L${r} 0 Z`;
  const lv = clamp01(level);
  const surf = h - lv * (h - 6);
  const autoHeat = clamp01((lv - OK_LINE) / 0.08);
  const ht = heat ?? autoHeat;
  const liquid = mixColor(C.ok, C.accent, ht);
  const liquidLight = mixColor('#7CC7AA', '#F08A6E', ht);
  const wave = (k: number) => Math.sin(frame * 0.18 + k) * 3.5;
  const surfacePath = `M${left - 2} ${surf + wave(0)} Q${-r / 2} ${surf - 5 + wave(1)} 0 ${surf + wave(2)} T${r + 2} ${surf + wave(3)} L${r + 2} ${h + 4} L${left - 2} ${h + 4} Z`;
  const okY = h - OK_LINE * (h - 6);

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <defs>
        <clipPath id={`${id}c`}>
          <path d={body} />
        </clipPath>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={liquidLight} stopOpacity={0.7} />
          <stop offset="1" stopColor={liquidLight} stopOpacity={0} />
        </radialGradient>
      </defs>
      {glow > 0 ? <ellipse cx={0} cy={h * 0.55} rx={w * 1.6} ry={h * 0.75} fill={`url(#${id}g)`} opacity={glow * 0.5} /> : null}
      {/* 玻璃底色 */}
      <path d={body} fill="#FFFFFF" opacity={0.06} />
      <g clipPath={`url(#${id}c)`}>
        {reflection ? <g transform={`translate(${left} 0)`}>{reflection}</g> : null}
        <path d={surfacePath} fill={liquid} opacity={0.92} />
        <path d={`M${left} ${surf + 8} L${r} ${surf + 8}`} stroke={liquidLight} strokeWidth={3} opacity={0.5} />
        {/* 小气泡 */}
        {Array.from({length: 4}, (_, i) => {
          const t = ((frame * 0.6 + i * 23) % 60) / 60;
          const by = h - 10 - t * (h - surf);
          return by > surf + 6 ? <circle key={i} cx={left + 14 + ((i * 17) % (w - 24))} cy={by} r={2.5 + (i % 2)} fill="#FFF" opacity={0.3} /> : null;
        })}
      </g>
      {/* 溢出：液体从管口沿外壁流下 */}
      {overflow > 0 ? (
        <path
          d={`M${r - 6} -4 Q${r + 10} 6 ${r + 6} ${20 + overflow * (h - 20)}`}
          stroke={C.accent}
          strokeWidth={10}
          strokeLinecap="round"
          fill="none"
          opacity={0.9}
        />
      ) : null}
      {/* 玻璃轮廓与高光 */}
      <path d={body} fill="none" stroke={C.paper} strokeOpacity={0.78} strokeWidth={3.5} />
      <rect x={left + 9} y={14} width={7} height={h - r - 20} rx={3.5} fill="#FFF" opacity={0.22} />
      <rect x={left - 8} y={-8} width={w + 16} height={12} rx={6} fill={C.paper} opacity={0.85} />
      {/* 刚刚好 刻度线 */}
      {okLine ? (
        <g>
          <line x1={left - 14} y1={okY} x2={r + 14} y2={okY} stroke={C.okLine} strokeWidth={4} strokeLinecap="round" />
          <circle cx={left - 14} cy={okY} r={4} fill={C.okLine} />
        </g>
      ) : null}
      {label ? (
        <text
          x={0}
          y={h + 56}
          textAnchor="middle"
          fontFamily={FONT_SANS}
          fontWeight={700}
          fontSize={labelSize}
          fill={ht > 0.5 ? C.accent : C.paper}
          opacity={labelOpacity}
          letterSpacing={2}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
};

/** 一排试管 + 木架 */
export const TubeRack: React.FC<{
  x: number;
  y: number;
  tubes: Omit<TubeProps, 'y' | 'frame'>[];
  frame: number;
  shelfWidth?: number;
  opacity?: number;
}> = ({x, y, tubes, frame, shelfWidth = 1060, opacity = 1}) => (
  <g transform={`translate(${x} ${y})`} opacity={opacity}>
    <rect x={-shelfWidth / 2} y={TUBE_H - 70} width={shelfWidth} height={26} rx={8} fill="#5B4636" />
    <rect x={-shelfWidth / 2} y={TUBE_H - 70} width={shelfWidth} height={8} rx={4} fill="#7A604A" />
    {tubes.map((t, i) => (
      <Tube key={i} {...t} y={0} frame={frame} />
    ))}
    <rect x={-shelfWidth / 2 + 20} y={TUBE_H - 44} width={18} height={70} fill="#4A382B" />
    <rect x={shelfWidth / 2 - 38} y={TUBE_H - 44} width={18} height={70} fill="#4A382B" />
  </g>
);
