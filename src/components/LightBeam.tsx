// 斜光束：drop 时从左上扫过全屏，之后留成一束柔光（后面“暗淡蓝点”还会用）
import React from 'react';
import type { Beam } from './Dust';
import { C, H } from '../film/theme';

export const beamGeometry = (sweep: number, intensity: number, f: number): Beam => {
  // sweep 0→1：光束中线从画面左上外侧扫到最终位置
  const angle = 58;
  // 从画面左外侧扫进来，停在画面左中（后面的场景接着用这束光）
  const x = -900 + sweep * 1550 + Math.sin(f / 90) * 20;
  return { x, y: H / 2, angle, halfWidth: 260, intensity };
};

export const LightBeam: React.FC<{ beam: Beam }> = ({ beam }) => {
  if (beam.intensity <= 0.001) return null;
  const a = (beam.angle * Math.PI) / 180;
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy;
  const ny = dx;
  const L = 2600;
  const w = beam.halfWidth * 1.8;
  const p = (s: number, t: number) => `${beam.x + dx * s + nx * t},${beam.y + dy * s + ny * t}`;
  return (
    <g opacity={beam.intensity}>
      <defs>
        <linearGradient
          id="beamGrad"
          gradientUnits="userSpaceOnUse"
          x1={beam.x - nx * w}
          y1={beam.y - ny * w}
          x2={beam.x + nx * w}
          y2={beam.y + ny * w}
        >
          <stop offset={0} stopColor={C.gold} stopOpacity={0} />
          <stop offset={0.3} stopColor={C.gold} stopOpacity={0.12} />
          <stop offset={0.5} stopColor={C.ivory} stopOpacity={0.3} />
          <stop offset={0.7} stopColor={C.gold} stopOpacity={0.12} />
          <stop offset={1} stopColor={C.gold} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={[p(-L, -w), p(L, -w), p(L, w), p(-L, w)].join(' ')} fill="url(#beamGrad)" />
    </g>
  );
};
