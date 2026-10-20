// 已故历史人物的符号化头像：只用轮廓和标志特征（王冠 鹰 眼镜 胡子…），不画写实五官，
// 放在画框 邮票 海报 报纸头版这类载体里。在世的人不用这个组件。
import React from "react";
import { useTheme } from "../styles/ThemeContext";

export type Emblem = "crown" | "falcon" | "glasses" | "beard" | "wig";
export type Carrier = "frame" | "stamp" | "poster" | "newspaper" | "tapestry";

export type IconicPortraitProps = {
  x: number;
  y: number;
  w: number;
  carrier: Carrier;
  emblems: Emblem[];
  /** 底色 */
  ground?: string;
  /** 剪影色 */
  ink?: string;
  /** 画框里的名字（写在载体上的小字，可不填） */
  caption?: string;
  fontFamily?: string;
};

export const IconicPortrait: React.FC<IconicPortraitProps> = ({ x, y, w, carrier, emblems, ground, ink, caption, fontFamily }) => {
  const th = useTheme();
  const h = carrier === "stamp" ? w * 1.2 : carrier === "tapestry" ? w * 1.45 : w * 1.3;
  const g = ground ?? (th.material === "woodcut" ? th.wall : "#7A2E22");
  const k = ink ?? (th.material === "woodcut" ? th.ink : "#1E1510");
  const cx = x + w / 2;
  const headR = w * 0.17;
  const headY = y + h * 0.42;
  const frameColor = th.material === "woodcut" ? th.ink : th.gold;
  // 侧面剪影：头 + 肩，只有轮廓
  const bust = `M${cx - w * 0.36} ${y + h * 0.86} C${cx - w * 0.34} ${headY + headR * 1.6} ${cx - w * 0.18} ${headY + headR * 1.25} ${cx - headR * 0.4} ${headY + headR * 1.05} L${cx + headR * 0.5} ${headY + headR * 1.05} C${cx + w * 0.2} ${headY + headR * 1.3} ${cx + w * 0.34} ${headY + headR * 1.6} ${cx + w * 0.36} ${y + h * 0.86} Z`;
  return (
    <g>
      {carrier === "tapestry" ? (
        <>
          <line x1={x - w * 0.08} y1={y} x2={x + w * 1.08} y2={y} stroke={th.woodDark} strokeWidth={w * 0.05} strokeLinecap="round" />
          <path d={`M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${cx + w * 0.25} ${y + h * 0.93} L${cx} ${y + h} L${cx - w * 0.25} ${y + h * 0.93} L${x} ${y + h} Z`} fill={g} stroke={frameColor} strokeWidth={w * 0.025} />
        </>
      ) : (
        <rect x={x} y={y} width={w} height={h} fill={g} stroke={frameColor} strokeWidth={carrier === "frame" ? w * 0.07 : w * 0.02} strokeDasharray={carrier === "stamp" ? `${w * 0.04} ${w * 0.03}` : undefined} />
      )}
      <path d={bust} fill={k} />
      <circle cx={cx} cy={headY} r={headR} fill={k} />
      {emblems.includes("crown") ? (
        <path
          d={`M${cx - headR * 0.85} ${headY - headR * 0.7} L${cx - headR * 0.95} ${headY - headR * 1.55} L${cx - headR * 0.45} ${headY - headR * 1.1} L${cx} ${headY - headR * 1.75} L${cx + headR * 0.45} ${headY - headR * 1.1} L${cx + headR * 0.95} ${headY - headR * 1.55} L${cx + headR * 0.85} ${headY - headR * 0.7} Z`}
          fill={th.gold}
          stroke={k}
          strokeWidth={w * 0.01}
        />
      ) : null}
      {emblems.includes("falcon") ? (
        <g transform={`translate(${cx + w * 0.22} ${y + h * 0.66})`}>
          <ellipse cx={0} cy={0} rx={w * 0.07} ry={w * 0.1} fill={k} stroke={th.gold} strokeWidth={w * 0.008} />
          <circle cx={w * 0.02} cy={-w * 0.11} r={w * 0.045} fill={k} stroke={th.gold} strokeWidth={w * 0.008} />
          <path d={`M${w * 0.06} ${-w * 0.11} l${w * 0.035} ${w * 0.015} l${-w * 0.03} ${w * 0.015} Z`} fill={th.gold} />
        </g>
      ) : null}
      {caption ? (
        <text x={cx} y={y + h * 0.965} textAnchor="middle" fontSize={w * 0.075} fill={th.gold} fontFamily={fontFamily}>
          {caption}
        </text>
      ) : null}
    </g>
  );
};
