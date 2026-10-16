import React from 'react';
import { beat, COOL, cue, section, WARM } from '../data/script';
import { LIGHTS, PALETTE } from '../theme';
import { camTrack, mixLight } from '../lib/camera';
import { clamp, ease, impulse, lerp, prog, rgba, rnd, v } from '../lib/anim';
import { Plain, FLOOR } from '../components/Plain';
import { Person } from '../components/Person';
import { Saw } from '../components/Saw';
import { Balance } from '../components/Balance';
import { SectionDef } from './story';
import { lightS6, S6Human } from './S6Human';
import { BLOCK, BLOCK_C, chestAt, personAt, personX, PERSON_F as F } from './human';

/**
 * S7 松手三步（屏 37–46）：光线转成平静的青色，景别先近后远。
 * 停（大字“停”，颤抖停下）→ 深呼吸（胸口冷色呼吸圈，裂纹变暗）→ 看（抬头，左上角 0 cm）
 * → 天平：一枚小锯齿 vs 一整晚的月亮 → 松手后退 → 大字“松开”，刺块缩成小石子，描边转冷色
 * → 转身绕开往右走，留下冷色脚印 → 回头看一眼 → 远景：石子还在原地 → 呼出最后一口气。
 */
const S = section('S7');
const C37 = cue(37);
const C38 = cue(38);
const C39 = cue(39);
const C40 = cue(40);
const C41 = cue(41);
const C42 = cue(42);
const C43 = cue(43);
const C44 = cue(44);
const C45 = cue(45);
const C46 = cue(46);
const F_TILT = beat(40, 'tilt');
const F_EXHALE = beat(46, 'exhale');
const F_LOOSEN = C42.start + 4;

const camera = (f: number) =>
  camTrack(f, [
    [S.start, S6Human.camera(S.start)],
    [C37.end, { x: 1330, y: 560, z: 1.2 }, ease.inOut],
    [C38.end - 20, { x: 1350, y: 590, z: 1.36 }, ease.inOut],
    [C39.end, { x: 1300, y: 556, z: 1.16 }, ease.inOut],
    [C40.start + 30, { x: 1060, y: 500, z: 0.95 }, ease.inOut],
    [C40.end, { x: 1080, y: 505, z: 0.98 }, ease.linear],
    [C41.end, { x: 1220, y: 545, z: 1.08 }, ease.inOut],
    [C42.end, { x: 1250, y: 552, z: 1.14 }, ease.linear],
    [C43.end, { x: 1700, y: 550, z: 1.05 }, ease.inOut],
    [C44.end, { x: 2250, y: 548, z: 1.0 }, ease.linear],
    [C45.start + 30, { x: 1950, y: 560, z: 0.72 }, ease.inOut],
    [C46.start + 18, { x: 2400, y: 555, z: 0.86 }, ease.inOut],
    [S.end, { x: 3420, y: 545, z: 1.12 }, ease.inOut],
  ]);

export const lightS7 = (f: number) =>
  mixLight(mixLight(lightS6(S.start), LIGHTS.calm, ease.inOut(prog(f, S.start, S.start + 50))), LIGHTS.night, ease.inOut(prog(f, S.end - 40, S.end)));

const World: SectionDef['World'] = ({ frame, light }) => {
  const p = personAt(frame);
  const ch = chestAt(frame);
  const shrink = ease.inOut(prog(frame, F_LOOSEN, F_LOOSEN + 26));
  const len = lerp(BLOCK.len, 46, shrink);
  const w = lerp(BLOCK.w, 24, shrink);
  const balO = ease.out(prog(frame, C40.start, C40.start + 20)) * (1 - clamp((frame - C41.end + 10) / 16));
  const balAng = 16 * ease.inOut(prog(frame, F_TILT - 6, F_TILT + 24)) + (frame > F_TILT + 24 ? Math.exp(-(frame - F_TILT - 24) / 12) * Math.sin((frame - F_TILT - 24) * 0.5) * 2.5 : 0);
  const ringT = frame - C38.start;
  const steps = frame >= F.walk2 ? Math.floor((frame - F.walk2) / 9) : -1;

  return (
    <g>
      <Plain frame={frame} light={light} stars={0.5} />
      {/* 屏 40：天平——一枚小锯齿 vs 一整晚（月亮） */}
      {balO > 0.01 && (
        <Balance
          x={730}
          y={250}
          arm={220}
          drop={130}
          angle={balAng}
          opacity={balO}
          left={(lp) => <path d={`M${lp.x - 14} ${lp.y - 2} L${lp.x + 5} ${lp.y - 30} L${lp.x + 14} ${lp.y - 2} Z`} fill={PALETTE.steelLight} stroke="#3A404B" strokeWidth={1.2} />}
          right={(rp) => <path d={`M${rp.x - 4} ${rp.y - 76} A34 34 0 1 0 ${rp.x - 4} ${rp.y - 8} A27 27 0 1 1 ${rp.x - 4} ${rp.y - 76} Z`} fill="#DDE6F5" />}
        />
      )}
      {/* 冷色脚印：一步一个，慢慢淡掉 */}
      {steps >= 0 &&
        Array.from({ length: steps + 1 }, (_, i) => {
          const at = F.walk2 + i * 9;
          const age = frame - at;
          if (age > 70) return null;
          const x = personX(at);
          return <ellipse key={i} cx={x + (i % 2 ? 10 : -10)} cy={FLOOR + 6} rx={16} ry={5} fill={rgba(COOL, 0.45 * (1 - age / 70))} />;
        })}
      {/* 刺块：屏 42 缩成一颗小石子 */}
      <g>
        <Saw
          id="s7block"
          x0={BLOCK_C.x - len / 2}
          y={BLOCK.y + (BLOCK.w - w)}
          length={len}
          w={w}
          morph={1}
          handle={0}
          toothGrow={lerp(1, 0.45, shrink)}
          flash={Math.max(0.7 * impulse(frame, C39.start + 4, 10), 0.6 * impulse(frame, F_LOOSEN, 10), 0.6 * impulse(frame, C45.start + 6, 10))}
        />
      </g>
      <Person {...p} />
      {/* 屏 38：胸口一圈圈冷色呼吸圈 */}
      {ringT >= 0 &&
        frame < C38.end + 30 &&
        [0, 45].map((d) => {
          const t = ringT - d;
          if (t < 0 || t > 60) return null;
          return <circle key={d} cx={ch.x} cy={ch.y} r={30 + t * 2.6} fill="none" stroke={rgba(COOL, 0.5 * (1 - t / 60))} strokeWidth={3} />;
        })}
      {/* 屏 42：松手的一瞬，冷色波纹 */}
      {frame >= F_LOOSEN && frame < F_LOOSEN + 30 && (
        <circle cx={BLOCK_C.x} cy={BLOCK_C.y} r={20 + (frame - F_LOOSEN) * 9} fill="none" stroke={rgba(COOL, 0.6 * (1 - (frame - F_LOOSEN) / 30))} strokeWidth={4} />
      )}
      {/* 屏 46：那口还没消的气——暖色一缕，呼出去变成冷色散开 */}
      {frame >= C46.start && frame < C46.end && (
        <g>
          {frame < F_EXHALE + 6 && (
            <path
              d={(() => {
                const t = prog(frame, C46.start, F_EXHALE);
                const h = 40 + 90 * t;
                return `M${ch.x} ${ch.y} C${ch.x + 30} ${ch.y - h * 0.3} ${ch.x - 30} ${ch.y - h * 0.6} ${ch.x + 10 * Math.sin(frame * 0.2)} ${ch.y - h}`;
              })()}
              fill="none"
              stroke={rgba(WARM, 0.75 * (1 - clamp((frame - F_EXHALE) / 6)))}
              strokeWidth={8}
              strokeLinecap="round"
            />
          )}
          {frame >= F_EXHALE &&
            Array.from({ length: 22 }, (_, i) => {
              const t = frame - F_EXHALE;
              const a = -Math.PI / 2 + (rnd(`ex${i}`) - 0.5) * 2;
              return (
                <circle
                  key={i}
                  cx={ch.x + Math.cos(a) * t * (2 + rnd(`es${i}`) * 2)}
                  cy={ch.y - 100 + Math.sin(a) * t * (2 + rnd(`es${i}`) * 2)}
                  r={2.6}
                  fill={rgba(COOL, Math.max(0, 0.8 - t / 50))}
                />
              );
            })}
        </g>
      )}
    </g>
  );
};

export const S7Release: SectionDef = {
  id: 'S7',
  start: S.start,
  end: S.end,
  camera,
  light: lightS7,
  lightAt: (f) => {
    const c = chestAt(f);
    return v(c.x, c.y + 80);
  },
  lightBoost: (f) => 0.1 * impulse(f, C37.start + 4, 10) + 0.12 * impulse(f, F_LOOSEN, 14),
  World,
};
