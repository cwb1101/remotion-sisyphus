// 贯穿物件：那一粒尘埃 = 地球。
// 同一个圆在不同镜头距离下会变成：笔直的地平线 → 弧 → 球 → 光里的一粒尘。
// 半径可能大到几百万像素（贴着地平线时），所以超大半径时只画出画面附近的那段弧。
import React, { useId } from 'react';
import { C, H, W } from '../film/theme';

export interface MoteProps {
  cx: number;
  cy: number;
  r: number;
  /** 光从哪个方向来（度，0 = 右，-90 = 上） */
  lightAngle: number;
  /** 受光面亮度 0–1 */
  lightAmt: number;
  /** 大气薄边亮度倍数 */
  rim: number;
  /** 整体亮度（break 时变暗） */
  ambient: number;
}

const BIG = 30000;

/** 超大圆：只取画面附近 ±D 像素对应的那段弧 */
const arcPoints = (cx: number, cy: number, r: number, inset = 0) => {
  const phi0 = Math.atan2(H / 2 - cy, W / 2 - cx);
  const D = 2800;
  const delta = Math.asin(Math.min(1, D / r));
  const n = 160;
  const rr = r - inset;
  const pts: string[] = [];
  for (let i = 0; i <= n; i++) {
    const a = phi0 - delta + (2 * delta * i) / n;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts;
};

export const limbPath = (cx: number, cy: number, r: number) =>
  r < BIG
    ? `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`
    : `M ${arcPoints(cx, cy, r).join(' L ')}`;

const discPath = (cx: number, cy: number, r: number) => {
  if (r < BIG) return limbPath(cx, cy, r);
  const outer = arcPoints(cx, cy, r);
  const inner = arcPoints(cx, cy, r, 4000).reverse();
  return `M ${outer.join(' L ')} L ${inner.join(' L ')} Z`;
};

/** 圆上离屏幕点 (x, _) 最近的边缘 y（用来把标签贴在地平线上） */
export const limbYAt = (cx: number, cy: number, r: number, x: number) => {
  const dx = x - cx;
  if (Math.abs(dx) >= r) return cy;
  return cy - Math.sqrt(r * r - dx * dx);
};

export const Mote: React.FC<MoteProps> = ({ cx, cy, r, lightAngle, lightAmt, rim, ambient }) => {
  const id = useId().replace(/:/g, '');
  const band = Math.min(0.2 * r, 150);
  const la = (lightAngle * Math.PI) / 180;
  const lx = cx + Math.cos(la) * r * 0.55;
  const ly = cy + Math.sin(la) * r * 0.55;
  // 大气光晕宽度随球的屏幕大小缩放，球很小时不至于糊成一团
  const k = Math.max(0.12, Math.min(1, r / 500));
  // 一组从宽到窄的描边叠出大气光晕（比 SVG 模糊滤镜便宜，超大半径时也不会爆内存）
  const glow = Array.from({ length: 14 }, (_, i) => {
    const w = 3 * Math.pow(1.36, i);
    return { w, o: 0.22 / Math.pow(1.3, i) };
  });
  const d = limbPath(cx, cy, r);
  return (
    <g opacity={ambient}>
      <defs>
        <radialGradient id={`core${id}`} gradientUnits="userSpaceOnUse" cx={cx} cy={cy} r={r}>
          <stop offset={0} stopColor={C.earthCore} />
          <stop offset={Math.max(0, 1 - (band * 2.5) / r)} stopColor={C.earthCore} />
          <stop offset={Math.max(0, 1 - band / r)} stopColor={C.earthMid} />
          <stop offset={1} stopColor={C.earthRim} />
        </radialGradient>
        <radialGradient id={`lit${id}`} gradientUnits="userSpaceOnUse" cx={lx} cy={ly} r={r * 1.15}>
          <stop offset={0} stopColor={C.gold} stopOpacity={0.3 * lightAmt} />
          <stop offset={0.55} stopColor={C.gold} stopOpacity={0.08 * lightAmt} />
          <stop offset={1} stopColor={C.gold} stopOpacity={0} />
        </radialGradient>
      </defs>
      {glow.map((g, i) => (
        <path key={i} d={d} fill="none" stroke={C.gold} strokeWidth={g.w * k} strokeOpacity={g.o * rim} />
      ))}
      <path d={discPath(cx, cy, r)} fill={`url(#core${id})`} />
      <path d={discPath(cx, cy, r)} fill={`url(#lit${id})`} />
      <path d={d} fill="none" stroke={C.ivory} strokeWidth={Math.max(1.2, 2.2 * k)} strokeOpacity={Math.min(1, 0.85 * rim)} />
    </g>
  );
};
