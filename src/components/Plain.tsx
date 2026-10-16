import React, { useMemo } from 'react';
import { Light } from '../theme';
import { mix, rgba, rnd } from '../lib/anim';

/** 侧视场景的地平线（S5–S7）：天空渐变、远处草线、星点、近处地面纹理。世界坐标≈画面坐标。 */
export const HORIZON = 560;
export const FLOOR = 800; // 人和马站立的地面

export const Plain: React.FC<{ frame: number; light: Light; lineDraw?: number; lineColor?: string; stars?: number }> = ({
  frame,
  light,
  lineDraw = 1,
  lineColor,
  stars = 1,
}) => {
  const field = useMemo(() => {
    const st = Array.from({ length: 90 }, (_, i) => ({ x: -1200 + rnd(`px${i}`) * 4400, y: -500 + rnd(`py${i}`) * 980, r: 0.8 + rnd(`pr${i}`) * 1.8, ph: rnd(`pp${i}`) * 6.28 }));
    const grass = Array.from({ length: 160 }, (_, i) => ({ x: -1200 + i * 28 + rnd(`gx${i}`) * 20, h: 6 + rnd(`gh${i}`) * 16 }));
    const streaks = Array.from({ length: 34 }, (_, i) => ({ y: HORIZON + 30 + Math.pow(rnd(`sy${i}`), 1.6) * 700, x: -1200 + rnd(`sx${i}`) * 4400, w: 60 + rnd(`sw${i}`) * 260 }));
    const pebbles = Array.from({ length: 40 }, (_, i) => ({ x: -1200 + rnd(`bx${i}`) * 4400, y: HORIZON + 120 + rnd(`by${i}`) * 560, r: 3 + rnd(`br${i}`) * 7 }));
    return { st, grass, streaks, pebbles };
  }, []);
  const skyLow = mix(light.base, light.pool, 0.22);
  const farGround = mix(light.ground, light.base, 0.35);
  return (
    <g>
      <defs>
        <linearGradient id="plain-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={light.base} />
          <stop offset="1" stopColor={skyLow} />
        </linearGradient>
        <linearGradient id="plain-ground" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={farGround} />
          <stop offset="1" stopColor={light.ground} />
        </linearGradient>
      </defs>
      <rect x={-3000} y={-2000} width={9000} height={2000 + HORIZON} fill="url(#plain-sky)" />
      <rect x={-3000} y={HORIZON} width={9000} height={3000} fill="url(#plain-ground)" />
      {stars > 0 &&
        field.st.map((s, i) => (
          <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={stars * (0.12 + 0.18 * (0.5 + 0.5 * Math.sin(frame * 0.05 + s.ph)))} />
        ))}
      {field.grass.map((g, i) => (
        <path key={i} d={`M${g.x - 5} ${HORIZON + 1} L${g.x + Math.sin(frame * 0.04 + i) * 2} ${HORIZON - g.h} L${g.x + 5} ${HORIZON + 1} Z`} fill={light.grass} />
      ))}
      {field.streaks.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.w * (0.5 + (s.y - HORIZON) / 700)} height={2} fill={rgba('#FFFFFF', 0.03 + 0.03 * ((s.y - HORIZON) / 700))} />
      ))}
      {field.pebbles.map((b, i) => (
        <ellipse key={i} cx={b.x} cy={b.y} rx={b.r * 1.6} ry={b.r} fill={mix(light.ground, light.grass, 0.6)} />
      ))}
      {lineDraw > 0 && lineColor && (
        <line x1={-200} y1={HORIZON} x2={-200 + (1700 + 200) * lineDraw} y2={HORIZON} stroke={lineColor} strokeWidth={2.5} opacity={0.85} />
      )}
    </g>
  );
};
