// 背景：暖近黑 → 冷灰黑（换场景时）、主光方向上的一团柔光、四角压暗
import React from 'react';
import { C, H, W } from '../film/theme';

const mix = (a: string, b: string, t: number) => {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * t)).join(',')})`;
};

export const Backdrop: React.FC<{ cool: number; lightAngle: number; ambient: number }> = ({ cool, lightAngle, ambient }) => {
  const la = (lightAngle * Math.PI) / 180;
  const gx = W / 2 + Math.cos(la) * 900;
  const gy = H / 2 + Math.sin(la) * 520;
  return (
    <g>
      <defs>
        <radialGradient id="keylight" gradientUnits="userSpaceOnUse" cx={gx} cy={gy} r={1100}>
          <stop offset={0} stopColor={cool > 0.5 ? '#B9B4AA' : C.gold} stopOpacity={0.11 * ambient} />
          <stop offset={1} stopColor={C.gold} stopOpacity={0} />
        </radialGradient>
        <radialGradient id="vignette" cx="50%" cy="50%" r="75%">
          <stop offset={0.55} stopColor="#000" stopOpacity={0} />
          <stop offset={1} stopColor="#000" stopOpacity={0.72} />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={mix(C.bg, C.bgCool, cool)} />
      <rect width={W} height={H} fill="url(#keylight)" />
    </g>
  );
};

export const Vignette: React.FC = () => <rect width={W} height={H} fill="url(#vignette)" />;
