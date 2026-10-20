// 贯穿全片的物件：一只矮圈足、敞口、金沿的碗。各节复用，外形和金沿始终不变。
// 中世纪是木碗，现代段换成同样外形的瓷碗（material="porcelain"）
import React from "react";
import { useTheme } from "../styles/ThemeContext";
import { HATCH } from "../styles/Defs";

export type BowlProps = {
  /** 碗底中心（圈足落地点） */
  x: number;
  y: number;
  /** 碗口宽度 */
  w?: number;
  /** 奶面高度 0 空 1 满 */
  fill?: number;
  /** 奶面晃动（0–1，落下时给一下，自己衰减由调用方算） */
  wobble?: number;
  /** 旋转（度），绕碗底中心 */
  rotate?: number;
  material?: "wood" | "porcelain";
  /** 金沿发亮（被光照到 / 命名时） */
  glow?: number;
  frame?: number;
};

export const Bowl: React.FC<BowlProps> = ({ x, y, w = 58, fill = 1, wobble = 0, rotate = 0, material = "wood", glow = 0, frame = 0 }) => {
  const th = useTheme();
  const woodcut = th.material === "woodcut";
  const h = w * 0.42;
  const rimRy = w * 0.13;
  const top = y - h;
  const body = material === "wood" ? (woodcut ? th.wood : "#9A6A42") : "#EFEAE0";
  const bodyShade = material === "wood" ? (woodcut ? th.ink : "#6E4528") : "#C9C1B2";
  const ink = th.ink;
  const sw = woodcut ? w * 0.05 : w * 0.03;
  // 碗身：碗口椭圆的前半圈往下收到圈足
  const d = `M${x - w / 2} ${top} C${x - w / 2} ${top + h * 0.75} ${x - w * 0.22} ${y - h * 0.12} ${x - w * 0.2} ${y - h * 0.1} L${x - w * 0.17} ${y} L${x + w * 0.17} ${y} L${x + w * 0.2} ${y - h * 0.1} C${x + w * 0.22} ${y - h * 0.12} ${x + w / 2} ${top + h * 0.75} ${x + w / 2} ${top} Z`;
  const ripple = Math.sin(frame * 0.9) * wobble * rimRy * 0.5;
  const milkRy = rimRy * 0.82;
  const milkY = top + (1 - fill) * h * 0.55 + milkRy * 0.15;
  const milkW = (w / 2) * (0.92 - (1 - fill) * 0.25);
  return (
    <g transform={`rotate(${rotate} ${x} ${y})`}>
      <ellipse cx={x} cy={top} rx={w / 2} ry={rimRy} fill={shadeInside(body)} stroke={ink} strokeWidth={sw} />
      {fill > 0.02 ? (
        <ellipse cx={x + ripple * 0.4} cy={milkY} rx={milkW} ry={milkRy + ripple * 0.3} fill={th.milk} stroke={woodcut ? ink : "none"} strokeWidth={sw * 0.6} />
      ) : null}
      <path d={d} fill={body} stroke={ink} strokeWidth={sw} strokeLinejoin="round" />
      {woodcut ? (
        <path d={d} fill={`url(#${HATCH})`} opacity={0.35} />
      ) : (
        <>
          <path d={`M${x + w * 0.42} ${top + h * 0.18} Q${x + w * 0.36} ${top + h * 0.7} ${x + w * 0.18} ${y - h * 0.12}`} fill="none" stroke={bodyShade} strokeWidth={w * 0.1} opacity={0.55} strokeLinecap="round" />
          <path d={`M${x - w * 0.4} ${top + h * 0.22} Q${x - w * 0.34} ${top + h * 0.62} ${x - w * 0.22} ${y - h * 0.2}`} fill="none" stroke="#E2B37E" strokeWidth={w * 0.035} opacity={0.6} strokeLinecap="round" />
        </>
      )}
      {/* 金沿：碗口前半圈 */}
      <path d={`M${x - w / 2} ${top} A${w / 2} ${rimRy} 0 0 0 ${x + w / 2} ${top}`} fill="none" stroke={th.gold} strokeWidth={w * 0.06} strokeLinecap="round" />
      {glow > 0 ? <path d={`M${x - w / 2} ${top} A${w / 2} ${rimRy} 0 0 0 ${x + w / 2} ${top}`} fill="none" stroke="#FFE7A8" strokeWidth={w * 0.12} opacity={glow * 0.5} strokeLinecap="round" /> : null}
    </g>
  );
};

const shadeInside = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const k = 0.62;
  const r = Math.round(((n >> 16) & 255) * k);
  const g = Math.round(((n >> 8) & 255) * k);
  const b = Math.round((n & 255) * k);
  return `rgb(${r},${g},${b})`;
};
