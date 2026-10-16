import React from 'react';
import { beat, cue, section } from '../data/script';
import { LIGHTS } from '../theme';
import { camTrack } from '../lib/camera';
import { clamp, ease, impulse, lerp, prog, rgba, rnd, track, v } from '../lib/anim';
import { Saw, SAW } from '../components/Saw';
import { Snake } from '../components/Snake';
import { Ground } from '../components/Ground';
import { lerpPose, Person, POSES, Pose, walkPose } from '../components/Person';
import { finalCoil, SectionDef } from './story';

/**
 * S8 收尾（屏 47–51）：回到开场的夜色、开场的锯子、开场的构图。
 * 锯齿特写拉远（和第 1 屏同一组镜头）→ 开场那条蛇只剩一道暗色残影，亮一下暖光后散掉（回答主线问题）
 * → 同一个人走进来，在锯子旁停下、低头看、抬头 → 0 cm → 镜头推回锯齿特写，人走出画面。
 */
const S = section('S8');
const C47 = cue(47);
const C48 = cue(48);
const C49 = cue(49);
const C50 = cue(50);
const C51 = cue(51);
const F_GLINT = beat(47, 'glint');
const F_BELL = beat(48, 'bell');
const F_GLINT2 = beat(50, 'glint');
const SAW_C = v(SAW.x0 + SAW.length / 2, SAW.y + SAW.w / 2);
const FEET = 762;
const SCALE = 0.8;
const COIL = finalCoil();

const LOOK_DOWN: Pose = { ...POSES.stand, neck: 16, torso: 4 };
const STOP = C49.start + 46;
const personX = (f: number) =>
  track(f, [
    [C49.start, 220],
    [STOP, 700, ease.out],
    [C50.start + 4, 700],
    [C51.end, 700 + 7.6 * (C51.end - C50.start - 4), ease.linear],
  ]);
const poseAt = (f: number): Pose => {
  const walk = walkPose(f * 0.5, 1);
  if (f < STOP - 8) return walk;
  if (f < C50.start + 4) {
    let p = lerpPose(walk, POSES.stand, prog(f, STOP - 8, STOP + 2));
    p = lerpPose(p, LOOK_DOWN, ease.inOut(prog(f, STOP + 2, STOP + 12)));
    return lerpPose(p, POSES.lookUp, ease.inOut(prog(f, STOP + 14, C50.start - 2)));
  }
  return lerpPose(POSES.lookUp, walk, ease.inOut(prog(f, C50.start + 4, C50.start + 14)));
};

const camera = (f: number) =>
  camTrack(f, [
    [S.start, { x: 1532, y: 596, z: 3.7 }],
    [S.start + 78, { x: 1262, y: 612, z: 1.22 }, ease.inOut],
    [C48.end, { x: 1236, y: 602, z: 1.5 }, ease.inOut],
    [C49.start + 30, { x: 1120, y: 650, z: 1.04 }, ease.inOut],
    [C50.end, { x: 1262, y: 640, z: 1.0 }, ease.inOut],
    [S.end, { x: 1130, y: 598, z: 2.7 }, ease.inOut],
  ]);

const World: SectionDef['World'] = ({ frame, cam, light }) => {
  const glintAt = (t0: number) =>
    frame >= t0 - 22 && frame <= t0 + 22 ? lerp(SAW.x0 - 120, SAW.x0 + SAW.length + 120, prog(frame, t0 - 22, t0 + 22)) : null;
  const glint = glintAt(F_GLINT) ?? glintAt(F_GLINT2) ?? glintAt(C51.end - 30);
  // 开场那条蛇的残影：屏 48 亮一下暖光，然后散掉
  const ghostO = track(frame, [
    [S.start, 0.28],
    [F_BELL - 4, 0.28],
    [F_BELL + 4, 0.75],
    [F_BELL + 40, 0],
  ]);
  const ghostWarm = Math.exp(-Math.max(0, frame - F_BELL) / 20) * (frame >= F_BELL ? 1 : 0);
  const dissolve = frame - (F_BELL + 14);
  const x = personX(frame);
  const personO = clamp((frame - C49.start) / 6);
  return (
    <g>
      <Ground frame={frame} cam={cam} light={light} wind={0.6} />
      {ghostO > 0.01 && <Snake id="s8u" segs={COIL} layer="under" dim={1 - ghostWarm} warmth={ghostWarm} opacity={ghostO} shadow={false} />}
      <Saw id="s8saw" layer="body" glint={glint} holeColor={light.ground} />
      {ghostO > 0.01 && <Snake id="s8o" segs={COIL} layer="over" dim={1 - ghostWarm} warmth={ghostWarm} opacity={ghostO} shadow={false} />}
      <Saw id="s8t" layer="teeth" glint={glint} flash={0.5 * impulse(frame, F_BELL, 10)} />
      {dissolve >= 0 && dissolve < 60 && (
        <g>
          {COIL.map((s, i) => {
            const a = -Math.PI / 2 + (rnd(`gd${i}`) - 0.5) * 1.6;
            const d = dissolve * (1.2 + rnd(`gs${i}`) * 1.6);
            return <circle key={i} cx={s.x + Math.cos(a) * d} cy={s.y + Math.sin(a) * d} r={2.6} fill={rgba(i % 3 ? '#B8C8D0' : '#FF8A6A', Math.max(0, 0.8 - dissolve / 60))} />;
          })}
        </g>
      )}
      {personO > 0 && <Person x={x} y={FEET} scale={SCALE} facing={1} pose={poseAt(frame)} calm={1} opacity={personO} />}
    </g>
  );
};

export const S8Ending: SectionDef = {
  id: 'S8',
  start: S.start,
  end: S.end,
  camera,
  light: () => LIGHTS.night,
  lightAt: (f) => (f < C49.start ? SAW_C : v(lerp(SAW_C.x, personX(f), 0.35), SAW_C.y + 60)),
  lightBoost: (f) => 0.12 * impulse(f, F_BELL, 14),
  blendIn: 22,
  World,
};
