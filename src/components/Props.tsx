import React from 'react';
import {C, FONT_SERIF} from '../theme';
import {clamp01, ease} from '../lib/anim';

/** 朱红印章。p 为落下进度 0–1（从大到小、带一点回弹） */
export const Stamp: React.FC<{x: number; y: number; text: string; p: number; size?: number; rotate?: number}> = ({
  x,
  y,
  text,
  p,
  size = 150,
  rotate = -8,
}) => {
  if (p <= 0) return null;
  const k = ease.outBack(clamp01(p));
  const s = 1.7 - 0.7 * k;
  const ink = clamp01(p * 3);
  // 落地后墨迹向外晕开一圈
  const spread = clamp01((p - 0.55) / 0.45);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${s})`} opacity={ink}>
      {spread > 0 ? (
        <rect
          x={-size / 2 - spread * 18}
          y={-size / 2 - spread * 18}
          width={size + spread * 36}
          height={size + spread * 36}
          rx={14}
          fill="none"
          stroke={C.accent}
          strokeWidth={3}
          opacity={(1 - spread) * 0.5}
        />
      ) : null}
      <rect x={-size / 2} y={-size / 2} width={size} height={size} rx={14} fill={C.accent} opacity={0.12} />
      <rect x={-size / 2 + 6} y={-size / 2 + 6} width={size - 12} height={size - 12} rx={10} fill="none" stroke={C.accent} strokeWidth={7} />
      <text
        x={0}
        y={size * 0.17}
        textAnchor="middle"
        fontFamily={FONT_SERIF}
        fontWeight={900}
        fontSize={size * 0.42}
        fill={C.accent}
        letterSpacing={2}
      >
        {text}
      </text>
    </g>
  );
};

/** 指针式闹钟（不用冒号数字，避免屏幕上出现标点） */
export const Clock: React.FC<{x: number; y: number; hour: number; minute: number; r?: number; ring?: number}> = ({
  x,
  y,
  hour,
  minute,
  r = 64,
  ring = 0,
}) => {
  const ma = minute * 6;
  const ha = (hour % 12) * 30 + minute * 0.5;
  const shake = Math.sin(ring * 40) * 3 * ring;
  return (
    <g transform={`translate(${x} ${y}) rotate(${shake})`}>
      <circle cx={-r * 0.62} cy={-r * 0.86} r={r * 0.26} fill={C.mustard} />
      <circle cx={r * 0.62} cy={-r * 0.86} r={r * 0.26} fill={C.mustard} />
      <circle r={r + 8} fill={C.mustard} />
      <circle r={r} fill={C.paper} />
      {Array.from({length: 12}, (_, i) => (
        <line
          key={i}
          x1={0}
          y1={-r + 8}
          x2={0}
          y2={-r + (i % 3 === 0 ? 20 : 14)}
          stroke={C.line}
          strokeWidth={i % 3 === 0 ? 4 : 2.5}
          transform={`rotate(${i * 30})`}
          strokeLinecap="round"
        />
      ))}
      <line x1={0} y1={6} x2={0} y2={-r * 0.5} stroke={C.line} strokeWidth={7} strokeLinecap="round" transform={`rotate(${ha})`} />
      <line x1={0} y1={8} x2={0} y2={-r * 0.78} stroke={C.accent} strokeWidth={4} strokeLinecap="round" transform={`rotate(${ma})`} />
      <circle r={6} fill={C.line} />
      <rect x={-r * 0.7} y={r + 2} width={10} height={18} rx={4} fill={C.mustard} transform="rotate(20)" />
      <rect x={r * 0.55} y={r - 2} width={10} height={18} rx={4} fill={C.mustard} transform="rotate(-20)" />
    </g>
  );
};

/** 挂在绳上的纸签（"致命"） */
export const PaperTag: React.FC<{x: number; y: number; text: string; swing: number; scale?: number; opacity?: number; string?: number}> = ({
  x,
  y,
  text,
  swing,
  scale = 1,
  opacity = 1,
  string = 260,
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    <g transform={`rotate(${swing})`}>
      <line x1={0} y1={-string} x2={0} y2={0} stroke={C.paperDim} strokeWidth={2.5} />
      <g transform="translate(0 0)">
        <path d="M-70 18 L-48 0 L48 0 L70 18 L70 150 Q70 162 58 162 L-58 162 Q-70 162 -70 150 Z" fill={C.paper} />
        <circle cx={0} cy={18} r={7} fill={C.ink} />
        <text x={0} y={118} textAnchor="middle" fontFamily={FONT_SERIF} fontWeight={900} fontSize={62} fill={C.accent}>
          {text}
        </text>
      </g>
    </g>
  </g>
);

/** 披斗篷的修士（色块剪影，不带任何宗教符号）。write 0–1 控制写字的手 */
export const Monk: React.FC<{x: number; y: number; frame: number; write: number; scale?: number; turn?: number}> = ({
  x,
  y,
  frame,
  write,
  scale = 1,
  turn = 0,
}) => {
  const hand = Math.sin(frame * 0.35) * 10 * write;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={20} cy={4} rx={110} ry={12} fill="#000" opacity={0.25} />
      {/* 斗篷身体（坐姿），右侧一道油灯的暖色轮廓光 */}
      <path d="M-70 0 Q-80 -120 -20 -170 Q20 -190 50 -150 Q80 -100 90 0 Z" fill="#6E4E68" />
      <path d="M50 -150 Q80 -100 90 0 L76 0 Q66 -100 40 -146 Z" fill={C.mustard} opacity={0.35} />
      <path d="M-70 0 Q-60 -60 -40 -110 L-30 0 Z" fill={C.plumDark} opacity={0.5} />
      {/* 兜帽 */}
      <g transform={`rotate(${turn * 8} 10 -190)`}>
        <path d="M-30 -170 Q-30 -240 20 -246 Q66 -244 66 -186 Q60 -150 20 -150 Q-20 -150 -30 -170 Z" fill="#6E4E68" />
        <path d="M52 -236 Q66 -220 66 -186 Q62 -160 46 -152 Q58 -186 52 -236 Z" fill={C.mustard} opacity={0.35} />
        <ellipse cx={34 + turn * 6} cy={-190} rx={22} ry={28} fill={C.plumDark} />
      </g>
      {/* 写字的手臂 */}
      <path d={`M20 -120 Q70 -${90 - hand * 0.3} ${104 + hand} -${46 - hand * 0.4}`} stroke="#7A5874" strokeWidth={26} strokeLinecap="round" fill="none" />
      <circle cx={108 + hand} cy={-44 + hand * 0.4} r={11} fill="#E9D9C2" />
      <line x1={108 + hand} y1={-44 + hand * 0.4} x2={128 + hand} y2={-84 + hand * 0.4} stroke={C.paper} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
};

/** 油灯：火焰随时间摇曳 */
export const OilLamp: React.FC<{x: number; y: number; frame: number; scale?: number}> = ({x, y, frame, scale = 1}) => {
  const f = Math.sin(frame * 0.4) * 0.08 + Math.sin(frame * 0.93) * 0.05;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <defs>
        <radialGradient id="lampglow">
          <stop offset="0" stopColor={C.mustard} stopOpacity={0.55} />
          <stop offset="1" stopColor={C.mustard} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={0} cy={-46} r={170} fill="url(#lampglow)" />
      <path d="M-34 -4 Q-30 -26 0 -26 Q40 -26 52 -14 L36 -8 Q20 0 -20 0 Z" fill="#9C6B3E" />
      <path d={`M24 -24 Q${16 - f * 40} -${54 + f * 30} 26 -${82 + f * 40} Q${40 + f * 30} -54 32 -24 Z`} fill={C.mustard} />
      <path d="M26 -26 Q22 -44 28 -56 Q34 -44 30 -26 Z" fill="#FFF3D6" />
    </g>
  );
};

/** 从画外伸进来的手（袖子颜色可换），托着东西 */
export const Hand: React.FC<{x: number; y: number; sleeve: string; rotate?: number; grip?: number}> = ({
  x,
  y,
  sleeve,
  rotate = 0,
  grip = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate})`}>
    <rect x={-34} y={20} width={68} height={420} rx={26} fill={sleeve} />
    <rect x={-34} y={20} width={68} height={26} rx={12} fill="#000" opacity={0.18} />
    <ellipse cx={0} cy={6} rx={30} ry={26} fill="#E9D9C2" />
    <rect x={-28} y={-22 + (1 - grip) * 10} width={14} height={30} rx={7} fill="#E9D9C2" />
    <rect x={-10} y={-28 + (1 - grip) * 10} width={14} height={34} rx={7} fill="#E9D9C2" />
    <rect x={8} y={-24 + (1 - grip) * 10} width={14} height={30} rx={7} fill="#E9D9C2" />
  </g>
);
