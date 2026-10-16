import React, { useMemo } from 'react';
import { beat, COOL, cue, section, WARM } from '../data/script';
import { LIGHTS, PALETTE } from '../theme';
import { camTrack } from '../lib/camera';
import { clamp, ease, impulse, lerp, mix, prog, rgba, rnd, shake, track, v, Vec } from '../lib/anim';
import { Plain, FLOOR, HORIZON } from '../components/Plain';
import { Horse, HORSE_POINTS } from '../components/Horse';
import { SectionDef } from './story';

/**
 * S5 命名·野马客串（屏 22–26）：侧视地平线，换成远景与暖色天际。
 * 冷色细线画出地平线 → 大字“野马效应”砸下，地平线一震 → 一枚锯齿长出翅膀（蝙蝠）飞进来
 * → 野马出现，被咬住后腿，扬蹄 → 暴怒狂奔、跪倒、侧躺、碎成粒子（交给 S6 聚成人）。
 */
const S = section('S5');
const C22 = cue(22);
const C23 = cue(23);
const C24 = cue(24);
const C25 = cue(25);
const C26 = cue(26);
const F_SLAM = C23.start + (C23.beats.slam ?? 4);
const F_BITE = beat(25, 'bite');
const F_REAR = beat(25, 'rear');
const F_RUN = beat(26, 'run');
const F_FALL = beat(26, 'fall');

export const HORSE_END_X = 400;
const horseX = (f: number) =>
  track(f, [
    [C25.start, 1180],
    [F_RUN, 1180],
    [F_FALL - 10, 470, (t) => t * t * (3 - 2 * t)],
    [F_FALL + 4, HORSE_END_X, ease.out],
  ]);
const runAmt = (f: number) => track(f, [[F_RUN - 6, 0], [F_RUN + 6, 1], [F_FALL - 14, 1], [F_FALL, 0.2]]);
const rearAmt = (f: number) => track(f, [[F_REAR, 0], [F_REAR + 10, 1], [F_REAR + 30, 1], [F_RUN, 0.15], [F_RUN + 8, 0]]);
const kneelAmt = (f: number) => ease.inOut(prog(f, F_FALL - 4, F_FALL + 6));
const lieAmt = (f: number) => ease.inOut(prog(f, F_FALL + 6, F_FALL + 16));
const F_DISSOLVE = F_FALL + 12;

/** 马碎成的粒子（S6 接着把它们聚成人形）。 */
export const horseDust = (k: number, f: number): Vec & { o: number } => {
  const [px, py] = HORSE_POINTS[k % HORSE_POINTS.length];
  const jx = (rnd(`hdx${k}`) - 0.5) * 50;
  const jy = (rnd(`hdy${k}`) - 0.5) * 30;
  const base = { x: HORSE_END_X - px + jx, y: FLOOR + py * 0.45 - 20 + jy };
  const t = Math.max(0, f - F_DISSOLVE - rnd(`hdt${k}`) * 8);
  const k1 = 1 - Math.exp(-t / 24);
  return { x: base.x + (rnd(`hvx${k}`) - 0.5) * 120 * k1, y: base.y - (40 + rnd(`hvy${k}`) * 90) * k1, o: clamp(t / 4) };
};
export const HORSE_DUST_COUNT = 70;

const camera = (f: number) => {
  const c = camTrack(f, [
    [S.start, { x: 960, y: 540, z: 1.0 }],
    [C23.start, { x: 1060, y: 524, z: 1.14 }, ease.inOut],
    [C24.start, { x: 900, y: 520, z: 1.0 }, ease.inOut],
    [C25.start, { x: 1040, y: 545, z: 1.08 }, ease.inOut],
    [F_RUN, { x: 1010, y: 548, z: 1.04 }, ease.linear],
    [F_FALL, { x: 700, y: 560, z: 1.06 }, ease.inOut],
    [S.end, { x: 640, y: 560, z: 1.12 }, ease.inOut],
  ]);
  const s = shake(f, 18 * impulse(f, F_SLAM, 7) + 4 * impulse(f, F_FALL, 6), 5);
  return { ...c, x: c.x + s.x, y: c.y + s.y };
};

/** 蝙蝠：一枚锯齿当身体，两片三角翅膀扇动。 */
const Bat: React.FC<{ p: Vec; flap: number; scale?: number }> = ({ p, flap, scale = 1 }) => {
  const w = 0.35 + 0.65 * Math.abs(Math.sin(flap));
  return (
    <g transform={`translate(${p.x} ${p.y}) scale(${scale})`}>
      <path d={`M-4 0 L-46 ${-26 * w} L-30 ${6 * w} Z`} fill={mix(PALETTE.steelDark, WARM, 0.25)} />
      <path d={`M4 0 L46 ${-26 * w} L30 ${6 * w} Z`} fill={mix(PALETTE.steelDark, WARM, 0.25)} />
      <path d="M-11 -10 L0 18 L11 -10 Z" fill={PALETTE.steelLight} stroke={WARM} strokeWidth={1.4} />
    </g>
  );
};

const batPos = (f: number): Vec => {
  const hx = horseX(f);
  if (f < F_BITE) {
    const t = ease.inOut(prog(f, C24.start + 10, F_BITE));
    const a = v(-80, 140);
    const b = v(hx - 6, FLOOR - 70);
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) - Math.sin(t * Math.PI) * 120 + Math.sin(f * 0.3) * 10 * (1 - t) };
  }
  if (f < F_FALL + 2) return { x: hx - 6, y: FLOOR - 70 + Math.sin(f * 0.6) * 2 };
  const t = ease.in(prog(f, F_FALL + 2, F_FALL + 30));
  return { x: hx - 6 - 600 * t, y: FLOOR - 70 - 520 * t };
};

const World: SectionDef['World'] = ({ frame, light }) => {
  const dust = useMemo(() => Array.from({ length: 40 }, (_, i) => ({ x: rnd(`sdx${i}`) * 1920, ph: rnd(`sdp${i}`) * 9, sp: 0.6 + rnd(`sds${i}`) * 1.4 })), []);
  const lineDraw = ease.inOut(prog(frame, C22.start, C22.start + 60));
  const slamT = frame - F_SLAM;
  const hx = horseX(frame);
  const horseIn = ease.out(prog(frame, C25.start - 4, C25.start + 14)) * (1 - clamp((frame - F_DISSOLVE) / 10));
  const run = runAmt(frame);
  const phase = (frame - F_RUN) * 0.55 * Math.max(0.3, run);
  const rage = clamp((frame - F_BITE) / 10);
  const bigDust = frame >= C23.end - 12 && frame < C24.start + 40;

  return (
    <g>
      <Plain frame={frame} light={light} lineDraw={lineDraw} lineColor={rgba(COOL, 0.9)} />
      {/* 地平线笔头：一颗冷色光点沿线划过 */}
      {lineDraw > 0 && lineDraw < 1 && (
        <g>
          <circle cx={-200 + 1900 * lineDraw} cy={HORIZON} r={26} fill={rgba(COOL, 0.18)} />
          <circle cx={-200 + 1900 * lineDraw} cy={HORIZON} r={7} fill="#E9FFFC" />
        </g>
      )}
      {/* 漂浮的细尘 */}
      {dust.map((d, i) => (
        <circle key={i} cx={(d.x + frame * d.sp) % 2200 - 140} cy={HORIZON - 40 - ((frame * 0.4 * d.sp + d.ph * 60) % 420)} r={1.6} fill={rgba('#E9D8C0', 0.18)} />
      ))}
      {/* 大字落地：地平线扬起一排尘 */}
      {slamT >= 0 && slamT < 40 && (
        <g>
          {Array.from({ length: 36 }, (_, i) => {
            const x = -100 + i * 60 + rnd(`sx${i}`) * 30;
            const h = (20 + rnd(`sh${i}`) * 60) * Math.sin(Math.min(1, slamT / 30) * Math.PI);
            return <circle key={i} cx={x} cy={HORIZON - h} r={2 + rnd(`sr${i}`) * 2.5} fill={rgba(WARM, 0.5 * (1 - slamT / 40))} />;
          })}
        </g>
      )}
      {/* 大字散成暖色粒子 */}
      {bigDust && (
        <g>
          {Array.from({ length: 30 }, (_, i) => {
            const t = frame - (C23.end - 12);
            const a = rnd(`ba${i}`) * Math.PI * 2;
            return (
              <circle
                key={i}
                cx={260 + rnd(`bx${i}`) * 820 + Math.cos(a) * t * 2.4}
                cy={320 + rnd(`by${i}`) * 260 + Math.sin(a) * t * 1.6 - t * 1.2}
                r={2.4}
                fill={rgba(WARM, Math.max(0, 0.7 - t / 60))}
              />
            );
          })}
        </g>
      )}
      {/* 野马 */}
      {horseIn > 0.01 && (
        <Horse x={hx} y={FLOOR} facing={-1} run={run} phase={phase} rear={rearAmt(frame)} kneel={kneelAmt(frame)} lie={lieAmt(frame)} rage={rage} opacity={horseIn} />
      )}
      {/* 狂奔扬起的尘土 */}
      {frame >= F_RUN && frame < F_FALL + 24 && (
        <g>
          {Array.from({ length: 26 }, (_, i) => {
            const born = F_RUN + i * 2.2;
            const t = frame - born;
            if (t < 0 || t > 30) return null;
            const x0 = horseX(born) + 40;
            return <circle key={i} cx={x0 + t * 2.4} cy={FLOOR - 6 - t * 1.4 - rnd(`dy${i}`) * 20} r={4 + t * 0.6} fill={rgba('#C8B8A0', 0.22 * (1 - t / 30))} />;
          })}
        </g>
      )}
      {/* 马碎成粒子 */}
      {frame >= F_DISSOLVE &&
        Array.from({ length: HORSE_DUST_COUNT }, (_, k) => {
          const d = horseDust(k, frame);
          return <circle key={k} cx={d.x} cy={d.y} r={2.4 + (k % 3)} fill={k % 4 === 0 ? rgba(WARM, 0.8) : rgba('#B8C8D0', 0.85)} opacity={d.o} />;
        })}
      {frame >= C24.start + 10 && frame < F_FALL + 32 && <Bat p={batPos(frame)} flap={frame * 0.7} scale={frame >= F_BITE && frame < F_FALL ? 0.9 : 1.6} />}
    </g>
  );
};

export const S5Name: SectionDef = {
  id: 'S5',
  start: S.start,
  end: S.end,
  camera,
  light: () => LIGHTS.plain,
  lightAt: (f) => v(lerp(960, horseX(f), clamp((f - C25.start) / 20) * 0.6), HORIZON + 40),
  lightBoost: (f) => 0.16 * impulse(f, F_SLAM, 12),
  World,
};
