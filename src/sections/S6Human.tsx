import React, { useMemo } from 'react';
import { beat, cue, section, WARM } from '../data/script';
import { LIGHTS } from '../theme';
import { camTrack, mixLight } from '../lib/camera';
import { clamp, ease, impulse, lerp, mix, prog, rgba, rnd, v, vlerp } from '../lib/anim';
import { Plain, FLOOR } from '../components/Plain';
import { Person } from '../components/Person';
import { Saw } from '../components/Saw';
import { LoopArrows } from '../components/LoopArrows';
import { Light } from '../theme';
import { SectionDef } from './story';
import { horseDust, HORSE_DUST_COUNT, S5Name } from './S5Name';
import { BLOCK, BLOCK_C, chestAt, personAt, PERSON_F as F, PERSON_SCALE } from './human';

/**
 * S6 人的版本（屏 27–36）：同一条地平线，光线换成冷蓝，景别拉近到人。
 * 马的粒子聚成人 → 一把缩小的锯子（刺块）落在路上 → 人被扎一下、转身、推、用肩膀顶
 * （刺块纹丝不动，左上角 0 cm）→ 月亮升起、来回踱步 → 定住 → 又顶上去、满身裂纹
 * → 蛇缠绕的残影叠在人身上、循环箭头 → 箭头慢下来停住。
 */
const S = section('S6');
const C28 = cue(28);
const C31 = cue(31);
const C32 = cue(32);
const C33 = cue(33);
const C34 = cue(34);
const C35 = cue(35);
const C36 = cue(36);
const F_BLOCK = beat(28, 'block');
const F_LOOP = beat(35, 'loop');

/** 人的轮廓上的点（粒子聚形用，站立、面朝右）。 */
const BODY_PTS: [number, number][] = [
  [0, -390], [-20, -372], [20, -372], [0, -350], [-30, -300], [30, -300], [0, -280], [-30, -240], [30, -240], [0, -220],
  [-30, -190], [30, -190], [-50, -260], [50, -260], [-56, -210], [56, -210], [-14, -150], [14, -150], [-16, -90], [16, -90], [-18, -30], [18, -30],
];

export const lightS6 = (f: number): Light => {
  const toMoon = ease.inOut(prog(f, C32.start, C32.start + 36)) * (1 - ease.inOut(prog(f, C34.start, C34.start + 24)));
  const toTense = ease.inOut(prog(f, C34.start, C34.start + 24)) * (1 - ease.inOut(prog(f, C36.start, C36.start + 40)));
  let L = mixLight(LIGHTS.plain, LIGHTS.cool, ease.inOut(prog(f, S.start, S.start + 40)));
  L = mixLight(L, LIGHTS.moon, toMoon);
  L = mixLight(L, LIGHTS.tense, toTense * 0.85);
  return L;
};

export const blockScale = (f: number) => ease.out(prog(f, F_BLOCK - 2, F_BLOCK + 14));

const camera = (f: number) =>
  camTrack(f, [
    [S.start, S5Name.camera(S.start)],
    [S.start + 36, { x: 560, y: 560, z: 1.15 }, ease.inOut],
    [F.walk1, { x: 650, y: 560, z: 1.1 }, ease.inOut],
    [C28.end, { x: 980, y: 560, z: 1.08 }, ease.linear],
    [F.hit + 34, { x: 1250, y: 560, z: 1.08 }, ease.inOut],
    [F.push, { x: 1300, y: 560, z: 1.12 }, ease.inOut],
    [C31.start, { x: 1290, y: 552, z: 1.16 }, ease.linear],
    [C31.end, { x: 1240, y: 540, z: 1.04 }, ease.inOut],
    [C32.end, { x: 1380, y: 545, z: 1.0 }, ease.inOut],
    [C33.end, { x: 1340, y: 578, z: 1.34 }, ease.inOut],
    [C34.start + 30, { x: 1390, y: 600, z: 1.45 }, ease.inOut],
    [C34.end, { x: 1385, y: 596, z: 1.5 }, ease.linear],
    [C35.start + 24, { x: 1320, y: 575, z: 1.22 }, ease.inOut],
    [S.end, { x: 1320, y: 562, z: 1.12 }, ease.inOut],
  ]);

const World: SectionDef['World'] = ({ frame, light }) => {
  const p = personAt(frame);
  const formT = ease.inOut(prog(frame, S.start, S.start + 34));
  const personO = clamp((frame - (S.start + 26)) / 10);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => ({ x: 380 + i * 56, t: C31.start + 8 + i * 5 })), []);
  const monthsO = clamp((frame - C31.start) / 10) * (1 - clamp((frame - C32.start - 20) / 20));
  const moonY = lerp(380, 220, ease.out(prog(frame, C32.start, C32.start + 40)));
  const moonO = clamp((frame - C32.start) / 20) * (1 - clamp((frame - C34.start) / 20));
  const loopO = clamp((frame - F_LOOP) / 10) * (1 - clamp((frame - C36.start - 40) / 20));
  const loopAng = (() => {
    const t = Math.max(0, frame - F_LOOP);
    const tStop = C36.start + 40 - F_LOOP;
    const tt = Math.min(t, tStop);
    // 屏 36：越转越慢直到停下
    const slow = frame > C36.start ? 1 - prog(frame, C36.start, C36.start + 40) : 1;
    return tt * 2.4 + Math.min(tt, C36.start - F_LOOP) * 0.6 * slow;
  })();
  const ghostO = 0.55 * clamp((frame - C35.start) / 12) * (1 - clamp((frame - C35.end + 10) / 16));
  const ch = chestAt(frame);
  const hitT = frame - F.hit;

  return (
    <g>
      <Plain frame={frame} light={light} stars={0.6 + 0.4 * clamp((frame - C32.start) / 30)} />
      {/* 屏 31：12 个月的圆点一颗颗变暖 */}
      {monthsO > 0 &&
        months.map((m, i) => {
          const on = clamp((frame - m.t) / 6);
          return <circle key={i} cx={m.x} cy={300} r={12} fill={mix('#3A4658', WARM, on)} opacity={monthsO} stroke={rgba('#FFFFFF', 0.25)} strokeWidth={1.5} />;
        })}
      {/* 屏 32：月牙升起 */}
      {moonO > 0 && (
        <g opacity={moonO}>
          <circle cx={820} cy={moonY} r={70} fill={rgba('#DDE6F5', 0.06)} />
          <path d={`M${820 - 6} ${moonY - 38} A38 38 0 1 0 ${820 - 6} ${moonY + 38} A30 30 0 1 1 ${820 - 6} ${moonY - 38} Z`} fill="#DDE6F5" />
        </g>
      )}
      {/* 刺块：缩小版的锯子，两边长齿，从一道冷光里落下来 */}
      {frame >= F_BLOCK - 2 && (
        <g transform={`translate(${BLOCK_C.x} ${BLOCK_C.y}) scale(${blockScale(frame)}) translate(${-BLOCK_C.x} ${-BLOCK_C.y})`}>
          <Saw
            id="s6block"
            x0={BLOCK.x0}
            y={BLOCK.y}
            length={BLOCK.len}
            w={BLOCK.w}
            morph={1}
            handle={0}
            flash={Math.max(0.9 * impulse(frame, F_BLOCK, 10), 0.8 * impulse(frame, F.hit, 8), 0.8 * impulse(frame, C33.start, 10))}
          />
        </g>
      )}
      {frame >= F_BLOCK - 14 && frame < F_BLOCK + 10 && (
        <rect x={BLOCK_C.x - 3} y={-200} width={6} height={BLOCK.y + 200} fill={rgba('#E9FFFC', 0.5 * (1 - Math.abs(frame - F_BLOCK + 2) / 12))} />
      )}
      {/* 粒子（来自马）聚成人形 */}
      {frame < S.start + 40 &&
        Array.from({ length: HORSE_DUST_COUNT }, (_, k) => {
          const from = horseDust(k, S.start);
          const [bx, by] = BODY_PTS[k % BODY_PTS.length];
          const to = v(440 + bx * PERSON_SCALE * 0.9 + (rnd(`pf${k}`) - 0.5) * 16, FLOOR + by * PERSON_SCALE * 0.9 + (rnd(`pg${k}`) - 0.5) * 16);
          const t = ease.inOut(clamp((frame - S.start - rnd(`pd${k}`) * 8) / 26));
          const pos = vlerp(from, to, t);
          return <circle key={k} cx={pos.x} cy={pos.y} r={2.4 + (k % 3)} fill={k % 4 === 0 ? rgba(WARM, 0.8) : rgba('#B8C8D0', 0.85)} opacity={from.o * (1 - clamp((frame - S.start - 28) / 10))} />;
        })}
      {/* 循环箭头（屏 35–36）画在人后面 */}
      {loopO > 0.01 && <LoopArrows cx={BLOCK_C.x + 150} cy={FLOOR - 190} rx={360} ry={230} ang={loopAng} opacity={loopO} />}
      {personO > 0 && <Person {...p} opacity={personO * Math.max(formT, 0.3)} />}
      {/* 被扎时的冷色小火花 */}
      {hitT >= 0 && hitT < 18 && (
        <g>
          {Array.from({ length: 8 }, (_, i) => {
            const a = -Math.PI / 2 + (rnd(`hs${i}`) - 0.5) * 2.4;
            return <circle key={i} cx={personX0(frame) + Math.cos(a) * hitT * 4} cy={FLOOR - 120 + Math.sin(a) * hitT * 4} r={2} fill={rgba('#E9FFFC', 1 - hitT / 18)} />;
          })}
        </g>
      )}
      {/* 屏 35：蛇缠绕的残影叠在人身上 */}
      {ghostO > 0.01 && (
        <polyline
          points={Array.from({ length: 70 }, (_, i) => {
            const u = i / 69;
            const th = u * Math.PI * 2 * 3.2 + frame * 0.05;
            return `${ch.x + Math.cos(th) * 70},${FLOOR - 70 - u * 330 + Math.sin(th) * 12}`;
          }).join(' ')}
          fill="none"
          stroke={rgba(WARM, ghostO)}
          strokeWidth={16}
          strokeLinecap="round"
        />
      )}
    </g>
  );
};

const personX0 = (f: number) => personAt(f).x;

export const S6Human: SectionDef = {
  id: 'S6',
  start: S.start,
  end: S.end,
  camera,
  light: lightS6,
  lightAt: (f) => {
    const c = chestAt(f);
    return v(lerp(c.x, BLOCK_C.x, 0.4), c.y + 60);
  },
  lightBoost: (f) => 0.08 * impulse(f, F.hit, 8) + 0.06 * impulse(f, F.push, 10) + 0.06 * impulse(f, F.shove, 10),
  World,
};
