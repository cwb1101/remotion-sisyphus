import React from 'react';
import { C } from '../theme';
import { clamp } from '../lib/anim';

export type Footprint = { x: number; y: number; born: number };

/** 色② 脚印：落下时亮一下，然后稳定在 0.8。 */
export const Footprints: React.FC<{ prints: Footprint[]; frame: number; scale?: number }> = ({ prints, frame, scale = 1 }) => (
  <g>
    {prints
      .filter((p) => frame >= p.born)
      .map((p, i) => {
        const age = frame - p.born;
        const flash = 1 - clamp(age / 14);
        return (
          <g key={i}>
            <ellipse cx={p.x} cy={p.y} rx={(14 + flash * 10) * scale} ry={(5 + flash * 3) * scale} fill={C.act} opacity={0.18 * flash} />
            <ellipse cx={p.x} cy={p.y} rx={11 * scale} ry={3.6 * scale} fill={C.act} opacity={0.55 + 0.3 * clamp(age / 6) - 0.05} />
          </g>
        );
      })}
  </g>
);
