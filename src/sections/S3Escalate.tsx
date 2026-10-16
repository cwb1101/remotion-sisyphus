import React from 'react';
import { beat, cue, section } from '../data/script';
import { LIGHTS } from '../theme';
import { camTrack, mixLight } from '../lib/camera';
import { clamp, ease, impulse, lerp, prog, rgba, rnd, shake, track, v } from '../lib/anim';
import { coil, lunge, WOUND_SEG } from '../lib/snake';
import { Saw, SAW } from '../components/Saw';
import { Snake } from '../components/Snake';
import { Ground } from '../components/Ground';
import { R_FINAL, R_LOOSE, restPose, SectionDef } from './story';
import { S2_END } from './S2Scratch';

/**
 * S3 升级三连（屏 9–15）：光线转成紧张的暖红，景别越来越近。
 * 抬头 → 扑咬（火花）→ 头部暖光脉动 → 缠上锯条 → 越勒越紧、锯齿变长变暖
 * → 循环箭头越转越快 → 最后一勒，大字“松不开”。
 */
const S = section('S3');
const C12 = cue(12);
const C13 = cue(13);
const C14 = cue(14);
const C15 = cue(15);
const F_STRIKE = beat(10, 'strike');
const F_PAIN = beat(11, 'pain');
const F_WRAP = beat(12, 'wrap');
const F_SQUEEZE = beat(13, 'squeeze');
const F_LOOP = beat(14, 'loop');
const F_SLAM = beat(15, 'slam');
const BPM13 = cue(13).sfx[0].bpm ?? 104;
const TARGET = v(1478, SAW.y - 14);
const SAW_C = v(SAW.x0 + SAW.length / 2, SAW.y + SAW.w / 2);

const radiusAt = (f: number) =>
  track(f, [
    [C13.start, R_LOOSE],
    [C13.end - 4, 74],
    [C15.start, 68, ease.linear],
    [F_SLAM, R_FINAL, ease.in],
  ]);

const strikeT = (f: number) => {
  if (f < F_STRIKE - 12) return 0;
  if (f <= F_STRIKE) return ease.in(prog(f, F_STRIKE - 12, F_STRIKE));
  if (f <= F_STRIKE + 3) return 1;
  return 1 - ease.out(prog(f, F_STRIKE + 3, F_STRIKE + 20));
};

const camera = (f: number) => {
  const c = camTrack(f, [
    [S.start, S2_END.cam],
    [S.start + 40, { x: 1510, y: 515, z: 1.55 }, ease.inOut],
    [F_STRIKE + 24, { x: 1495, y: 535, z: 1.5 }, ease.inOut],
    [F_PAIN + 40, { x: 1485, y: 520, z: 1.78 }, ease.inOut],
    [F_WRAP, { x: 1485, y: 522, z: 1.78 }, ease.linear],
    [C12.end - 16, { x: 1290, y: 600, z: 1.12 }, ease.inOut],
    [C13.end, { x: 1290, y: 608, z: 1.3, r: 0 }, ease.inOut],
    [C14.end, { x: 1286, y: 610, z: 1.55, r: 2 }, ease.inOut],
    [F_SLAM + 2, { x: 1280, y: 612, z: 2.0, r: 0 }, ease.out],
    [S.end, { x: 1280, y: 612, z: 2.1, r: 0 }, ease.linear],
  ]);
  const amp = 11 * impulse(f, F_STRIKE, 6) + 26 * impulse(f, F_SLAM, 8) + (f >= F_SQUEEZE && f < F_SLAM ? 2.2 : 0);
  const s = shake(f, amp, 3);
  return { ...c, x: c.x + s.x, y: c.y + s.y };
};

/** S3 每一帧的蛇与锯子状态（S4 从 S3 最后一帧的状态接着演）。 */
export const s3State = (frame: number) => {
  const base = restPose();
  const coilP = prog(frame, F_WRAP, C12.end - 8);
  const period = (30 * 60) / BPM13;
  const throb = frame >= F_SQUEEZE ? Math.pow(Math.max(0, Math.sin(((frame - F_SQUEEZE) / period) * Math.PI * 2)), 4) : 0;
  let segs = lunge(base, TARGET, strikeT(frame));
  if (coilP > 0) segs = coil(segs, coilP, radiusAt(frame) - throb * 3, throb * 2);

  const warmth = track(frame, [
    [S.start, 0],
    [S.start + 50, 0.35],
    [F_PAIN, 0.4],
    [C12.end, 0.55],
    [C14.end, 0.82],
    [F_SLAM, 1, ease.in],
  ]);
  const crack = track(frame, [
    [F_SQUEEZE, 0],
    [C13.end, 0.45],
    [C14.end, 0.75],
    [F_SLAM, 1],
  ]);
  const toothGrow = track(frame, [
    [F_SQUEEZE, 1],
    [C13.end, 1.38],
    [C14.end, 1.42],
    [F_SLAM, 1.55, ease.in],
  ]);
  const teethWarm = track(frame, [
    [F_SQUEEZE, 0],
    [C13.end, 0.55],
    [F_SLAM, 1],
  ]);
  const headScale = 1 + 0.28 * ease.inOut(prog(frame, S.start, S.start + 30)) * (1 - coilP);
  const pain = frame >= F_PAIN ? 0.55 + 0.35 * Math.sin((frame - F_PAIN) * 0.35) : 0;
  const headGlow = Math.max(0.6 * impulse(frame, F_STRIKE, 10), pain * (1 - coilP * 0.4));
  return { segs, coilP, warmth, crack, toothGrow, teethWarm, headScale, headGlow };
};

const World: SectionDef['World'] = ({ frame, cam, light }) => {
  const { segs, coilP, warmth, crack, toothGrow, teethWarm, headScale, headGlow } = s3State(frame);
  const teethOnTop = coilP > 0.3;
  const sparkT = frame - F_STRIKE;
  const local = frame >= F_STRIKE - 2 && frame < F_STRIKE + 14 ? TARGET.x : null;

  // 循环箭头：越转越快，大字砸下时骤停
  const loopIn = clamp((frame - F_LOOP) / 10) * (1 - clamp((frame - F_SLAM) / 10));
  const loopAng = (() => {
    const t = Math.max(0, Math.min(frame, F_SLAM) - F_LOOP);
    return t * 2.2 + t * t * 0.06;
  })();

  const snakeProps = { warmth, crack, headGlow, headScale, wound: { index: WOUND_SEG, amount: 0.8 } };
  return (
    <g>
      <Ground frame={frame} cam={cam} light={light} wind={0.4} />
      <Snake id="s3u" segs={segs} layer="under" {...snakeProps} shadow={false} />
      <Saw id="s3saw" layer="body" glint={local} holeColor={light.ground} />
      {!teethOnTop && <Saw id="s3t0" layer="teeth" glint={local} flash={0.7 * impulse(frame, F_STRIKE, 6)} />}
      <Snake id="s3o" segs={segs} layer="over" {...snakeProps} />
      {teethOnTop && <Saw id="s3t1" layer="teeth" toothGrow={toothGrow} warm={teethWarm} flash={0.6 * impulse(frame, F_SLAM, 8)} />}
      {sparkT >= 0 && sparkT < 24 && (
        <g>
          {Array.from({ length: 16 }, (_, i) => {
            const a = -Math.PI / 2 + (rnd(`ka${i}`) - 0.5) * 2.8;
            const d = sparkT * (3 + rnd(`kd${i}`) * 4.5);
            return <circle key={i} cx={TARGET.x + Math.cos(a) * d} cy={TARGET.y + Math.sin(a) * d + sparkT * sparkT * 0.05} r={2.4} fill={rgba('#E9FFFC', 1 - sparkT / 24)} />;
          })}
        </g>
      )}
      {loopIn > 0.01 && (
        <g transform={`translate(${SAW_C.x} ${SAW_C.y})`} opacity={loopIn}>
          {[0, 120, 240].map((a0) => {
            const a = ((a0 + loopAng) * Math.PI) / 180;
            const span = 0.95;
            const rx = 420;
            const ry = 210;
            const pts = Array.from({ length: 16 }, (_, k) => {
              const t = a + (k / 15) * span;
              return `${rx * Math.cos(t)},${ry * Math.sin(t)}`;
            }).join(' ');
            const te = a + span;
            const tip = v(rx * Math.cos(te), ry * Math.sin(te));
            const tan = Math.atan2(ry * Math.cos(te), -rx * Math.sin(te));
            const hw = 16;
            const head = [
              `${tip.x + Math.cos(tan) * 22},${tip.y + Math.sin(tan) * 22}`,
              `${tip.x + Math.cos(tan + Math.PI / 2) * hw},${tip.y + Math.sin(tan + Math.PI / 2) * hw}`,
              `${tip.x + Math.cos(tan - Math.PI / 2) * hw},${tip.y + Math.sin(tan - Math.PI / 2) * hw}`,
            ].join(' ');
            return (
              <g key={a0}>
                <polyline points={pts} fill="none" stroke={rgba('#FF5A3C', 0.85)} strokeWidth={7} strokeLinecap="round" />
                <polygon points={head} fill={rgba('#FF5A3C', 0.9)} />
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
};

export const S3Escalate: SectionDef = {
  id: 'S3',
  start: S.start,
  end: S.end,
  camera,
  light: (f) => mixLight(LIGHTS.dusk, LIGHTS.tense, ease.inOut(prog(f, S.start, S.start + 36))),
  lightAt: (f) => {
    const t = ease.inOut(prog(f, F_WRAP, C12.end));
    return v(lerp(1500, SAW_C.x, t), lerp(500, SAW_C.y, t));
  },
  lightBoost: (f) => s3LightBoost(f),
  World,
};

/** 冲击时光池额外增亮（给 Film 用）。 */
export const s3LightBoost = (f: number) => 0.18 * impulse(f, F_SLAM, 12) + 0.1 * impulse(f, F_STRIKE, 8);
