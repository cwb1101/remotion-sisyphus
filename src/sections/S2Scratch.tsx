import React from 'react';
import { beat, cue, section } from '../data/script';
import { LIGHTS } from '../theme';
import { camTrack, mixLight } from '../lib/camera';
import { clamp, ease, impulse, lerp, prog, rgba, rnd, v } from '../lib/anim';
import { bendHead, crawl, WOUND_SEG } from '../lib/snake';
import { Saw, SAW } from '../components/Saw';
import { Snake } from '../components/Snake';
import { Ground } from '../components/Ground';
import { BEND, F_SCRATCH, F_STOP, HEAD, SectionDef } from './story';
import { S1_END_CAM } from './S1Hook';

/**
 * S2 划伤（屏 4–8）：“那天”——光线从夜色转成黄昏暖光，远景。
 * 蛇正弦爬行越过锯齿 → 被划一道小口子 → 镜头猛推到伤口特写
 * → 拉远，半透明的“另一种可能”继续爬走 → 真蛇停下、回头。
 */
const S = section('S2');
const C6 = cue(6);
const C7 = cue(7);
const F_ZOOM = beat(6, 'zoom');
const HEARTBEAT = cue(8).sfx[0].bpm ?? 56;

const realS = (f: number) => HEAD.at(f);
const bendAt = (f: number) => BEND * ease.inOut(prog(f, F_STOP, F_STOP + 44));
const realSegs = (f: number) => bendHead(crawl(realS(f)), bendAt(f));
const woundPos = (f: number) => realSegs(f)[WOUND_SEG];

const ghostS = (f: number) => {
  const t = Math.max(0, f - C7.start);
  return realS(C7.start) + 5.5 * t + 0.11 * t * t;
};

const camera = (f: number) => {
  const base = camTrack(f, [
    [S.start, S1_END_CAM],
    [S.start + 90, { x: 820, y: 650, z: 1.0 }, ease.inOut],
    [F_SCRATCH, { x: 1180, y: 600, z: 1.12 }, ease.inOut],
    [C6.start, { x: 1260, y: 585, z: 1.16 }, ease.linear],
    [C7.start + 36, { x: 1470, y: 560, z: 0.86 }, ease.inOut],
    [F_STOP, { x: 1520, y: 552, z: 0.9 }, ease.linear],
    [S.end, { x: 1530, y: 515, z: 1.3 }, ease.inOut],
  ]);
  // 屏 6：猛推到伤口特写，再拉开
  const ecu = ease.out(prog(f, F_ZOOM, F_ZOOM + 14)) * (1 - ease.inOut(prog(f, C6.end - 6, C7.start + 22)));
  const w = woundPos(f);
  return {
    x: lerp(base.x, w.x, ecu),
    y: lerp(base.y, w.y + 40, ecu),
    z: lerp(base.z, 3.2, ecu),
    r: base.r + ecu * -6,
  };
};

const World: SectionDef['World'] = ({ frame, cam, light }) => {
  const segs = realSegs(frame);
  const scratched = frame >= F_SCRATCH;
  const period = (30 * 60) / HEARTBEAT;
  const beatPulse = frame >= F_STOP ? Math.pow(Math.max(0, Math.sin(((frame - F_STOP) / period) * Math.PI * 2)), 6) : 0;
  const wound = scratched ? { index: WOUND_SEG, amount: 0.7 + 0.3 * impulse(frame, F_SCRATCH, 14) + 0.3 * beatPulse } : null;
  const toothX = 1217;
  const tooth = frame >= F_SCRATCH - 3 && frame < F_SCRATCH + 16 ? toothX : null;
  const ghostO = 0.42 * clamp((frame - C7.start) / 12) * (1 - clamp((frame - (C7.end - 26)) / 22));
  const sparkT = frame - F_SCRATCH;
  return (
    <g>
      <Ground frame={frame} cam={cam} light={light} wind={lerp(0.6, 1, prog(frame, S.start, S.start + 24))} />
      <Saw id="s2saw" glint={tooth} flash={0.5 * impulse(frame, F_SCRATCH, 8)} holeColor={light.ground} />
      {ghostO > 0.01 && <Snake id="s2ghost" segs={crawl(ghostS(frame))} opacity={ghostO} shadow={false} />}
      <Snake id="s2" segs={segs} wound={wound} headGlow={0} />
      {sparkT >= 0 && sparkT < 20 && (
        <g>
          {Array.from({ length: 10 }, (_, i) => {
            const a = -Math.PI / 2 + (rnd(`sa${i}`) - 0.5) * 2.2;
            const d = sparkT * (2.5 + rnd(`sd${i}`) * 3);
            return <circle key={i} cx={toothX + Math.cos(a) * d} cy={SAW.y - 20 + Math.sin(a) * d} r={2} fill={rgba('#E9FFFC', 1 - sparkT / 20)} />;
          })}
        </g>
      )}
    </g>
  );
};

export const S2Scratch: SectionDef = {
  id: 'S2',
  start: S.start,
  end: S.end,
  camera,
  light: (f) => mixLight(LIGHTS.night, LIGHTS.dusk, ease.inOut(prog(f, S.start, S.start + 40))),
  lightAt: (f) => {
    const s = realSegs(f)[8];
    return v(lerp(s.x, 1260, 0.3), lerp(s.y, 600, 0.3));
  },
  World,
};

export const S2_END = { cam: camera(S.end), segs: realSegs(S.end) };
