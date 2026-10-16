import React from 'react';
import { PALETTE } from '../theme';
import { Vec } from '../lib/anim';

export type BalanceProps = {
  /** 支点（世界坐标） */
  x: number;
  y: number;
  arm?: number;
  drop?: number;
  /** 横梁倾角（度），正值 = 右边沉下去 */
  angle: number;
  opacity?: number;
  left?: (p: Vec) => React.ReactNode;
  right?: (p: Vec) => React.ReactNode;
};

/** 两个秤盘的中心位置（放东西用）。 */
export const panCenters = ({ x, y, arm = 300, drop = 150, angle }: BalanceProps) => {
  const a = (angle * Math.PI) / 180;
  return {
    left: { x: x - arm * Math.cos(a), y: y - arm * Math.sin(a) + drop },
    right: { x: x + arm * Math.cos(a), y: y + arm * Math.sin(a) + drop },
  };
};

/** 天平：钢灰色几何线条，和锯子同一套材质。 */
export const Balance: React.FC<BalanceProps> = (props) => {
  const { x, y, arm = 300, drop = 150, angle, opacity = 1, left, right } = props;
  const a = (angle * Math.PI) / 180;
  const ends = [
    { x: x - arm * Math.cos(a), y: y - arm * Math.sin(a) },
    { x: x + arm * Math.cos(a), y: y + arm * Math.sin(a) },
  ];
  const pans = panCenters(props);
  const pan = (p: Vec, end: Vec, k: string, content?: (p: Vec) => React.ReactNode) => (
    <g key={k}>
      <line x1={end.x} y1={end.y} x2={p.x - 62} y2={p.y} stroke={PALETTE.steel} strokeWidth={2} opacity={0.8} />
      <line x1={end.x} y1={end.y} x2={p.x + 62} y2={p.y} stroke={PALETTE.steel} strokeWidth={2} opacity={0.8} />
      {content?.(p)}
      <path d={`M${p.x - 78} ${p.y} Q${p.x} ${p.y + 46} ${p.x + 78} ${p.y} Z`} fill={PALETTE.steelDark} stroke={PALETTE.steelLight} strokeWidth={2} />
    </g>
  );
  return (
    <g opacity={opacity}>
      <rect x={x - 7} y={y} width={14} height={300} rx={6} fill={PALETTE.steelDark} />
      <path d={`M${x - 70} ${y + 316} L${x + 70} ${y + 316} L${x + 40} ${y + 290} L${x - 40} ${y + 290} Z`} fill={PALETTE.steelDark} stroke={PALETTE.steel} strokeWidth={1.5} />
      <rect x={x - arm} y={y - 7} width={arm * 2} height={14} rx={7} fill={PALETTE.steel} stroke={PALETTE.steelLight} strokeWidth={1.5} transform={`rotate(${angle} ${x} ${y})`} />
      <circle cx={x} cy={y} r={14} fill={PALETTE.steelLight} stroke={PALETTE.steelDark} strokeWidth={3} />
      {pan(pans.left, ends[0], 'l', left)}
      {pan(pans.right, ends[1], 'r', right)}
    </g>
  );
};
