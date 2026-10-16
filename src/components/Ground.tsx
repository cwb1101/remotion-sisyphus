import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { Light } from '../theme';
import { Cam, toScreen, viewBounds } from '../lib/camera';
import { mix, rgba, rnd, Vec } from '../lib/anim';

type Tuft = { x: number; y: number; h: number; lean: number; ph: number; n: number };
type Grain = { x: number; y: number; r: number; a: number };
type Stone = { x: number; y: number; rx: number; ry: number; rot: number };

const AREA = { x0: -1400, x1: 3400, y0: -700, y1: 1900 };

const useField = () =>
  useMemo(() => {
    const tufts: Tuft[] = [];
    for (let i = 0; i < 520; i++) {
      tufts.push({
        x: AREA.x0 + rnd(`tx${i}`) * (AREA.x1 - AREA.x0),
        y: AREA.y0 + rnd(`ty${i}`) * (AREA.y1 - AREA.y0),
        h: 18 + rnd(`th${i}`) * 34,
        lean: (rnd(`tl${i}`) - 0.5) * 0.6,
        ph: rnd(`tp${i}`) * Math.PI * 2,
        n: 2 + Math.floor(rnd(`tn${i}`) * 3),
      });
    }
    const grains: Grain[] = [];
    for (let i = 0; i < 900; i++) {
      grains.push({
        x: AREA.x0 + rnd(`gx${i}`) * (AREA.x1 - AREA.x0),
        y: AREA.y0 + rnd(`gy${i}`) * (AREA.y1 - AREA.y0),
        r: 1 + rnd(`gr${i}`) * 2.2,
        a: 0.15 + rnd(`ga${i}`) * 0.35,
      });
    }
    const stones: Stone[] = [];
    for (let i = 0; i < 46; i++) {
      stones.push({
        x: AREA.x0 + rnd(`sx${i}`) * (AREA.x1 - AREA.x0),
        y: AREA.y0 + rnd(`sy${i}`) * (AREA.y1 - AREA.y0),
        rx: 10 + rnd(`srx${i}`) * 26,
        ry: 6 + rnd(`sry${i}`) * 14,
        rot: rnd(`sr${i}`) * 180,
      });
    }
    return { tufts, grains, stones };
  }, []);

/** 世界里的地面：草叶、沙粒、石子。只画进入画面的部分。 */
export const Ground: React.FC<{ frame: number; cam: Cam; light: Light; wind?: number }> = ({ frame, cam, light, wind = 1 }) => {
  const { tufts, grains, stones } = useField();
  const b = viewBounds(cam);
  const inView = (p: Vec) => p.x > b.x0 && p.x < b.x1 && p.y > b.y0 && p.y < b.y1;
  const grainColor = mix(light.grass, '#FFFFFF', 0.25);
  return (
    <g>
      <rect x={AREA.x0 - 2000} y={AREA.y0 - 2000} width={AREA.x1 - AREA.x0 + 4000} height={AREA.y1 - AREA.y0 + 4000} fill={light.ground} />
      {stones.filter(inView).map((s, i) => (
        <g key={`s${i}`} transform={`translate(${s.x} ${s.y}) rotate(${s.rot})`}>
          <ellipse rx={s.rx} ry={s.ry} fill={mix(light.ground, '#000000', 0.25)} transform="translate(4 5)" />
          <ellipse rx={s.rx} ry={s.ry} fill={mix(light.ground, light.grass, 0.7)} />
          <ellipse rx={s.rx * 0.6} ry={s.ry * 0.35} cy={-s.ry * 0.3} fill={rgba('#FFFFFF', 0.05)} />
        </g>
      ))}
      {grains.filter(inView).map((g, i) => (
        <circle key={`g${i}`} cx={g.x} cy={g.y} r={g.r} fill={grainColor} opacity={g.a} />
      ))}
      {tufts.filter(inView).map((t, i) => {
        const sway = Math.sin(frame * 0.05 + t.ph) * 0.16 * wind + Math.sin(frame * 0.11 + t.ph * 2) * 0.05 * wind;
        return (
          <g key={`t${i}`} transform={`translate(${t.x} ${t.y})`}>
            {Array.from({ length: t.n }, (_, k) => {
              const off = (k - (t.n - 1) / 2) * 6;
              const ang = t.lean + sway + (k - (t.n - 1) / 2) * 0.22;
              const h = t.h * (0.75 + 0.25 * ((k + 1) % 2));
              const tipX = off + Math.sin(ang) * h;
              const tipY = -Math.cos(ang) * h;
              return <path key={k} d={`M${off - 3} 0 L${tipX} ${tipY} L${off + 3} 0 Z`} fill={light.grass} opacity={0.9} />;
            })}
          </g>
        );
      })}
    </g>
  );
};

/** 屏幕空间的光：光池（跟着世界里的光源走）+ 暗角。 */
export const Lighting: React.FC<{ cam: Cam; light: Light; at: Vec; extra?: number }> = ({ cam, light, at, extra = 0 }) => {
  const p = toScreen(cam, at);
  const r = light.poolRadius * Math.max(0.8, Math.min(2.2, cam.z));
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle ${r}px at ${p.x}px ${p.y}px, ${rgba(light.pool, light.poolAlpha + extra)} 0%, ${rgba(light.pool, (light.poolAlpha + extra) * 0.35)} 45%, rgba(0,0,0,0) 100%)`,
          mixBlendMode: 'screen',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 75% 80% at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,${light.vignette}) 100%)`,
        }}
      />
    </AbsoluteFill>
  );
};
