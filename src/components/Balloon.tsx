import React from 'react';
import { C } from '../theme';
import { clamp } from '../lib/anim';

/**
 * 贯穿全片的物件：发光气球（= 想法）。
 * 想法越多它越大、环越多；它可以被人握着，也可以独自悬在画面里当主角。
 */
export type BalloonProps = {
  id: string; // 渐变 id 前缀，同一帧里多个气球不能重名
  cx: number;
  cy: number;
  r: number;
  /** 0..1.5 外发光强度 */
  glow?: number;
  /** 同心环数量，可以是小数（新环正在长出来） */
  rings?: number;
  /** 绳子下端；不传则绳子自然下垂 stringLen */
  anchor?: { x: number; y: number } | null;
  stringLen?: number;
  /** 绳子的横向摆动（px） */
  sway?: number;
  opacity?: number;
  /** 0..1：只有朝上的半边亮着（第四节“只看了一半”预留） */
  halfDark?: number;
  /** 0..1 暖色光晕把周围罩住（第 12 屏） */
  halo?: number;
  /** 绳子单独的透明度（拉远交接时人还没显出来，绳子也先不出现） */
  stringOpacity?: number;
};

export const Balloon: React.FC<BalloonProps> = ({
  id,
  cx,
  cy,
  r,
  glow = 0.6,
  rings = 0,
  anchor = null,
  stringLen = 60,
  sway = 0,
  opacity = 1,
  halfDark = 0,
  halo = 0,
  stringOpacity = 1,
}) => {
  const knot = { x: cx, y: cy + r };
  const end = anchor ?? { x: cx + sway * 0.6, y: cy + r + stringLen };
  const ctrl = { x: (knot.x + end.x) / 2 + sway, y: (knot.y + end.y) / 2 };
  const ringEls = [];
  const nRings = Math.ceil(rings);
  for (let i = 0; i < nRings; i++) {
    const grow = clamp(rings - i);
    const rr = r * (0.3 + 0.17 * i) * (0.85 + 0.15 * grow);
    ringEls.push(
      <circle
        key={i}
        cx={cx - r * 0.05}
        cy={cy - r * 0.05}
        r={rr}
        fill="none"
        stroke="#FFF3E2"
        strokeOpacity={0.42 * grow}
        strokeWidth={Math.max(1.5, r * 0.025)}
      />,
    );
  }
  return (
    <g opacity={opacity}>
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={C.think} stopOpacity={0.55} />
          <stop offset="45%" stopColor={C.think} stopOpacity={0.18} />
          <stop offset="100%" stopColor={C.think} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-body`} cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor={C.balloonCore} />
          <stop offset="55%" stopColor={C.think} />
          <stop offset="100%" stopColor="#D9782E" />
        </radialGradient>
        <linearGradient id={`${id}-dark`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="48%" stopColor="#161A2B" stopOpacity={0} />
          <stop offset="56%" stopColor="#161A2B" stopOpacity={0.82} />
          <stop offset="100%" stopColor="#161A2B" stopOpacity={0.9} />
        </linearGradient>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0%" stopColor={C.think} stopOpacity={0.32} />
          <stop offset="60%" stopColor={C.think} stopOpacity={0.12} />
          <stop offset="100%" stopColor={C.think} stopOpacity={0} />
        </radialGradient>
      </defs>
      {halo > 0 ? <circle cx={cx} cy={cy + r * 1.4} r={r * 3.4 * (0.6 + 0.4 * halo)} fill={`url(#${id}-halo)`} opacity={halo} /> : null}
      <circle cx={cx} cy={cy} r={r * (2.1 + 0.5 * glow)} fill={`url(#${id}-glow)`} opacity={clamp(glow, 0, 1.5) / 1.5 + 0.25} />
      <path
        d={`M ${knot.x} ${knot.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`}
        fill="none"
        stroke="#F4E3CF"
        strokeOpacity={0.85 * stringOpacity}
        strokeWidth={Math.max(2, r * 0.018)}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id}-body)`} />
      {ringEls}
      <ellipse cx={cx - r * 0.36} cy={cy - r * 0.4} rx={r * 0.16} ry={r * 0.09} fill="#FFFFFF" opacity={0.55} transform={`rotate(-35 ${cx - r * 0.36} ${cy - r * 0.4})`} />
      <path d={`M ${knot.x - r * 0.07} ${knot.y + r * 0.08} L ${knot.x + r * 0.07} ${knot.y + r * 0.08} L ${knot.x} ${knot.y - r * 0.02} Z`} fill="#D9782E" />
      {halfDark > 0 ? <circle cx={cx} cy={cy} r={r * 1.01} fill={`url(#${id}-dark)`} opacity={halfDark} /> : null}
    </g>
  );
};
