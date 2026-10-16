import { beat, cue } from '../data/script';
import { clamp, ease, lerp, prog, track } from '../lib/anim';
import { lerpPose, Pose, POSES, walkPose } from '../components/Person';
import { FLOOR } from '../components/Plain';

/**
 * S6–S7 里同一个人的完整动作时间线（走 → 被扎 → 转身 → 推 → 顶 → 踱步 → 定住 → 又推
 * → 停 → 呼吸 → 抬头看 → 松手 → 转身走开）。所有时间点都取自字幕数据文件。
 */
export const PERSON_SCALE = 1.3;
export const BLOCK = { x0: 1060, len: 200, y: FLOOR - 62, w: 56 };
export const BLOCK_C = { x: BLOCK.x0 + BLOCK.len / 2, y: BLOCK.y + BLOCK.w / 2 };

const POSE_HOLD: Pose = { torso: 14, neck: -4, shL: -76, elL: -10, shR: -80, elR: -6, hipL: -14, knL: 14, hipR: 16, knR: 4, bob: 3 };
const POSE_LOOK: Pose = { torso: 5, neck: -18, shL: -64, elL: -10, shR: -68, elR: -8, hipL: -8, knL: 8, hipR: 10, knR: 2, bob: 0 };
const POSE_TILT: Pose = { ...POSE_LOOK, neck: -4, torso: 2 };

const F = {
  form: cue(27).start,
  block: beat(28, 'block'),
  walk1: beat(28, 'walk'),
  hit: beat(29, 'hit'),
  turn1: cue(30).start,
  push: beat(30, 'push'),
  shove: beat(31, 'shove'),
  pace: cue(32).start,
  freeze: cue(33).start,
  push2: cue(34).start,
  stop: cue(37).start + 4,
  breath: cue(38).start,
  look: cue(39).start + 2,
  tilt: cue(40).start + 6,
  release: beat(41, 'release'),
  loosen: cue(42).start + 4,
  turn2: cue(43).start + 16,
  walk2: beat(43, 'walk') + 16,
  glance: cue(44).start + 26,
};
export const PERSON_F = F;

type PoseSeg = [from: number, pose: (f: number) => Pose];
const WALK = (f: number) => walkPose(f * 0.36);
const SEGS: PoseSeg[] = [
  [0, () => POSES.stand],
  [F.form + 38, () => POSES.lookUp],
  [F.form + 56, () => POSES.stand],
  [F.walk1, WALK],
  [F.hit, () => POSES.flinch],
  [F.hit + 8, (f) => walkPose(f * 0.36, 1 - prog(f, F.hit + 14, F.hit + 34))],
  [F.hit + 34, () => POSES.stand],
  [F.push - 4, () => POSES.push],
  [F.shove, () => POSES.shoulder],
  [F.pace + 2, () => POSES.stand],
  [F.pace + 16, WALK],
  [F.pace + 44, () => POSES.stand],
  [F.pace + 56, WALK],
  [F.pace + 84, () => POSES.stand],
  [F.push2 + 2, () => POSES.push],
  [F.stop, () => POSE_HOLD],
  [F.look, () => POSE_LOOK],
  [F.tilt, () => POSE_TILT],
  [F.release, () => POSES.release],
  [F.release + 20, () => POSES.stand],
  [F.walk2, WALK],
];

export const poseAt = (f: number): Pose => {
  let i = 0;
  while (i + 1 < SEGS.length && SEGS[i + 1][0] <= f) i++;
  const cur = SEGS[i][1](f);
  if (i === 0) return cur;
  const t = ease.inOut(clamp((f - SEGS[i][0]) / 8));
  return t >= 1 ? cur : lerpPose(SEGS[i - 1][1](f), cur, t);
};

export const personX = (f: number) =>
  track(f, [
    [F.walk1, 440],
    [F.hit, 440 + 0.36 * 24.5 * (F.hit - F.walk1), ease.linear],
    [F.hit + 34, 1400, ease.out],
    [F.pace + 16, 1400],
    [F.pace + 44, 1560, ease.inOut],
    [F.pace + 56, 1560],
    [F.pace + 84, 1420, ease.inOut],
    [F.push2 + 2, 1400],
    [F.release, 1400],
    [F.release + 20, 1450, ease.out],
    [F.walk2, 1450],
    [F.walk2 + 400, 1450 + 8.8 * 400, ease.linear],
  ]);

/** 朝向：每次转身 14–18 帧；glance 是边走边回头看一眼（不真转过去）。 */
const TURNS: [at: number, dur: number][] = [
  [F.turn1, 17],
  [F.pace + 2, 14],
  [F.pace + 44, 12],
  [F.turn2, 18],
];
export const facingAt = (f: number): { facing: 1 | -1; turn: number } => {
  let facing: 1 | -1 = 1;
  for (const [at, dur] of TURNS) {
    if (f >= at + dur) facing = (facing * -1) as 1 | -1;
    else if (f >= at) return { facing, turn: ease.inOut((f - at) / dur) };
  }
  const g = Math.sin(clamp((f - F.glance) / 22) * Math.PI) * 0.36;
  return { facing, turn: g };
};

/** 推的时候身体往前顶（朝刺块方向挪一点，手才贴得上刺块）。 */
export const pushLean = (f: number) => {
  const w1 = prog(f, F.push - 4, F.push + 8) * (1 - prog(f, F.pace + 2, F.pace + 12));
  const w2 = prog(f, F.push2 + 2, F.push2 + 14) * (1 - prog(f, F.release, F.release + 14));
  return -34 * Math.max(w1, w2);
};

export const crackAt = (f: number) =>
  track(f, [
    [F.hit, 0],
    [F.hit + 6, 0.15],
    [F.push, 0.15],
    [cue(30).end, 0.4],
    [cue(31).end, 0.6],
    [F.push2, 0.6],
    [cue(34).end, 0.85],
    [cue(36).start, 0.85],
    [cue(36).end, 0.7],
    [F.breath, 0.7],
    [cue(38).end, 0.35],
    [F.release, 0.35],
    [cue(42).start, 0.08],
    [cue(42).start + 36, 0],
  ]);

export const calmAt = (f: number) => ease.inOut(prog(f, F.loosen, F.loosen + 30));
export const breathAt = (f: number) => (f >= F.breath && f < cue(38).end ? 0.5 - 0.5 * Math.cos(((f - F.breath) / 45) * Math.PI * 2) : 0);
export const trembleAt = (f: number) => {
  const amp = lerp(0, 1.8, prog(f, F.push2 + 10, F.push2 + 40)) * (1 - prog(f, F.stop - 2, F.stop + 4)) + 1.2 * (f >= F.push && f < F.pace ? prog(f, F.push, F.push + 30) : 0);
  return Math.sin(f * 2.1) * amp;
};

/** 一帧里这个人的全部参数（直接喂给 <Person>）。 */
export const personAt = (f: number) => {
  const { facing, turn } = facingAt(f);
  const pose = poseAt(f);
  return {
    x: personX(f) + pushLean(f),
    y: FLOOR,
    scale: PERSON_SCALE,
    facing,
    turn,
    pose: { ...pose, torso: pose.torso + trembleAt(f) },
    crack: crackAt(f),
    calm: calmAt(f),
    breath: breathAt(f),
  };
};

/** 胸口的大致位置（世界坐标），用于呼吸圈、那口气、残影。 */
export const chestAt = (f: number) => ({ x: personX(f) + pushLean(f), y: FLOOR - 250 * PERSON_SCALE * 0.82 });
