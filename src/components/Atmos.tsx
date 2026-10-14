import React, {useId} from 'react';
import {random} from 'remotion';

/** 尘埃：只做陪衬，漂在光里。位置由 random(seed) 决定，每次渲染一致。 */
export const Dust: React.FC<{
  seed: string;
  frame: number;
  count: number;
  x: number;
  y: number;
  w: number;
  h: number;
  clip?: string; // 只在光束形状内可见
  opacity?: number;
  size?: number;
}> = ({seed, frame, count, x, y, w, h, clip, opacity = 0.5, size = 2.2}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <g>
      {clip && (
        <clipPath id={`dc${id}`}>
          <path d={clip} />
        </clipPath>
      )}
      <g clipPath={clip ? `url(#dc${id})` : undefined}>
        {Array.from({length: count}, (_, i) => {
          const r = (k: string) => random(`${seed}-${i}-${k}`);
          const sp = 0.15 + r('sp') * 0.35;
          const px = x + ((r('x') * w + frame * sp * (r('dir') > 0.5 ? 1 : -0.6)) % w + w) % w;
          const py = y + ((r('y') * h + frame * sp * 0.5) % h);
          const wob = Math.sin(frame * 0.03 + r('ph') * 6.28) * 6;
          const tw = 0.5 + 0.5 * Math.sin(frame * 0.05 + r('tw') * 6.28);
          return <circle key={i} cx={px + wob} cy={py} r={size * (0.5 + r('s'))} fill="#FBF8F2" opacity={opacity * (0.35 + 0.65 * tw)} />;
        })}
      </g>
    </g>
  );
};

/** 体积光：一道柔和的光束，把空气照亮（screen 混合，只提亮不压暗） */
export const Beam: React.FC<{d: string; opacity: number; blur?: number; from?: [number, number]; to?: [number, number]}> = ({
  d,
  opacity,
  blur = 24,
  from = [0, 0],
  to = [1, 1],
}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <g style={{mixBlendMode: 'screen'}}>
      <defs>
        <linearGradient id={`bg${id}`} x1={from[0]} y1={from[1]} x2={to[0]} y2={to[1]}>
          <stop offset="0" stopColor="#FFFDF8" stopOpacity={opacity} />
          <stop offset="1" stopColor="#FFFDF8" stopOpacity={opacity * 0.15} />
        </linearGradient>
        <filter id={`bb${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={blur} />
        </filter>
      </defs>
      <path d={d} fill={`url(#bg${id})`} filter={`url(#bb${id})`} />
    </g>
  );
};
