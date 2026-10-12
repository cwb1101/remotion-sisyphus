import React from 'react';
import {random} from 'remotion';
import {C} from '../theme';

/** 体积光：一束从 (x1,y1) 宽 w1 射向 (x2,y2) 宽 w2 的光，沿光束方向渐隐 */
export const Beam: React.FC<{
  id: string;
  x1: number;
  y1: number;
  w1: number;
  x2: number;
  y2: number;
  w2: number;
  color?: string;
  opacity: number;
}> = ({id, x1, y1, w1, x2, y2, w2, color = C.accent, opacity}) => {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const pts = [
    [x1 + nx * w1 * 0.5, y1 + ny * w1 * 0.5],
    [x2 + nx * w2 * 0.5, y2 + ny * w2 * 0.5],
    [x2 - nx * w2 * 0.5, y2 - ny * w2 * 0.5],
    [x1 - nx * w1 * 0.5, y1 - ny * w1 * 0.5],
  ]
    .map((p) => p.map((v) => v.toFixed(1)).join(','))
    .join(' ');
  return (
    <g style={{mixBlendMode: 'screen'}}>
      <defs>
        <linearGradient id={`beam-${id}`} gradientUnits="userSpaceOnUse" x1={x1} y1={y1} x2={x2} y2={y2}>
          <stop offset="0" stopColor={color} stopOpacity={0.55} />
          <stop offset="0.55" stopColor={color} stopOpacity={0.18} />
          <stop offset="1" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={pts} fill={`url(#beam-${id})`} opacity={opacity} />
    </g>
  );
};

/** 光里的浮尘：只做陪衬，数量少、颗粒小 */
export const Dust: React.FC<{
  seed: string;
  frame: number;
  count: number;
  x: number;
  y: number;
  w: number;
  h: number;
  size?: number;
  opacity?: number;
  color?: string;
  /** 每帧漂移速度（像素） */
  drift?: number;
  /** 反向漂移（倒带） */
  reverse?: boolean;
}> = ({seed, frame, count, x, y, w, h, size = 2.4, opacity = 0.6, color = '#F3D9A0', drift = 0.35, reverse}) => {
  const f = reverse ? -frame : frame;
  return (
    <g style={{mixBlendMode: 'screen'}}>
      {Array.from({length: count}).map((_, i) => {
        const r1 = random(`${seed}-x${i}`);
        const r2 = random(`${seed}-y${i}`);
        const r3 = random(`${seed}-s${i}`);
        const sp = 0.4 + random(`${seed}-v${i}`) * 0.9;
        const px = x + ((r1 * w + f * drift * sp * 0.6 + Math.sin(f * 0.02 + i) * 12) % w + w) % w;
        const py = y + ((r2 * h - f * drift * sp * 0.25 + Math.cos(f * 0.017 + i * 1.7) * 10) % h + h) % h;
        const tw = 0.5 + 0.5 * Math.sin(f * 0.08 + i * 2.1);
        return <circle key={i} cx={px} cy={py} r={size * (0.4 + r3)} fill={color} opacity={opacity * (0.3 + 0.7 * tw)} />;
      })}
    </g>
  );
};
