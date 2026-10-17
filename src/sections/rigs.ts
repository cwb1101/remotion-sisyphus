/**
 * 每一节的“机位 + 道具 + 人物”几何。画面组件只负责画，时间点全部从 script.json 取（at / cue）。
 * 三节共用一个连续镜头：
 *   开头 →（推近，气球变成满屏的“想法之球”）→ 拆开命题 →（拉远，那颗球缩回少年头顶的小气球）→ 早熟长什么样
 * 交接帧上两节的气球在屏幕上严格重合，所以看起来是同一颗东西在长大/缩小。
 */
import { at, screen } from '../data/script';
import { type Cam, ease, mixCam, prog, shake, toScreen, track } from '../lib/anim';
import { figureJoints, lerpPose, POSES, poseTrack, walkPose, type FigureProps, type Pose } from '../components/Figure';
import type { Footprint } from '../components/Footprints';
import { impactFrame } from '../components/BigWord';
import { C } from '../theme';

/** 某屏第 i 个音效对应的全片帧号——画面动作要和这个声音对齐时用它。 */
export const cue = (id: number, i = 0) => {
  const s = screen(id);
  return s.startFrame + s.sfx[i].atFrame;
};

// ───────────────────────────── 拆开命题（屏 03–06）：想法之球 ─────────────────────────────
const ORB = { x: 1100, y: 360 };
export const THESIS_GROUND = 760;

export const thesisCam = (f: number): Cam => {
  const s5 = shake(f, impactFrame(screen(5)), 10);
  const s6 = shake(f, impactFrame(screen(6)), 13, 7);
  return {
    z: 1 + 0.05 * prog(f, at(3), at(7), ease.linear),
    fx: 960,
    fy: 540,
    sx: 960 + s5.x + s6.x,
    sy: 540 + s5.y + s6.y,
  };
};

export const orbR = (f: number) => {
  const hit = impactFrame(screen(5));
  const pulse = f >= hit ? 38 * Math.exp(-(f - hit) / 10) : 0;
  return 300 + 5 * Math.sin(f / 14) + pulse;
};

export const orbWorld = (f: number) => ({ x: ORB.x + 6 * Math.sin(f / 37), y: ORB.y + 5 * Math.cos(f / 29) });

export const orbScreen = (f: number) => {
  const cam = thesisCam(f);
  const p = toScreen(cam, orbWorld(f).x, orbWorld(f).y);
  return { x: p.x, y: p.y, r: orbR(f) * cam.z };
};

// ───────────────────────────── 开头（屏 01–02） ─────────────────────────────
export const OPEN_GROUND = 760;
const OPEN_TEEN_X = 480;
const STRIDE = 118;
const WALK_IN = 30;
const WALK_X0 = -90;
const WALK_X1 = 1700;

const HOLD_LOW: Pose = { ...POSES.stand, rSh: 38, rEl: 46, head: 6 };
const HOLD_MID: Pose = { ...POSES.lookUp, rSh: 110, rEl: 20, head: 30 };
const LOOK_WALKER: Pose = { ...POSES.dangle, head: -16, torso: 4 };
const LOOK_WALKER2: Pose = { ...POSES.dangle, head: -6, torso: 6, lHip: -4, rHip: 10 };

export const openingRig = (f: number) => {
  const f1 = at(2);
  const f2 = at(3);
  const hover = track(f, [[44, 0], [f1 + 8, 28], [f2, 46], [f2 + 30, 54]]);
  const pose = poseTrack(
    f,
    [
      [0, HOLD_LOW],
      [24, HOLD_MID],
      [f1 - 14, POSES.holdUp],
      [f1 + 6, POSES.dangle],
      [f1 + 30, LOOK_WALKER],
      [f2, LOOK_WALKER2],
    ],
    ease.inOut,
  );
  const teen: FigureProps = { x: OPEN_TEEN_X, groundY: OPEN_GROUND, scale: 1.3, facing: 1, color: C.teen, pose, hover };
  const hand = figureJoints(teen).nearHand;
  const r = track(f, [[0, 14], [f1, 104], [f2, 120], [f2 + 30, 122]], ease.out);
  const stringLen = track(f, [[0, 6], [f1, 96], [f2, 118]], ease.out);
  const sway = Math.sin(f / 18) * 6;
  const balloon = {
    cx: hand.x + 18 + sway * 0.5,
    cy: hand.y - stringLen - r,
    r,
    rings: track(f, [[6, 0], [f1, 2.4], [f2, 3]], ease.linear),
    glow: 0.5 + 0.45 * prog(f, 0, f1),
    anchor: hand,
    sway,
  };

  // 先走路的人：匀速从左走到 x≈1700，脚印只出现在地面上（禁字区里只有脚印，没有字）
  const speed = (WALK_X1 - WALK_X0) / (f2 - WALK_IN);
  const wx = WALK_X0 + speed * Math.max(0, f - WALK_IN);
  const walker: FigureProps = {
    x: wx,
    groundY: OPEN_GROUND,
    scale: 1.2,
    facing: 1,
    color: C.walker,
    pose: walkPose((wx - WALK_X0) / STRIDE, 1.1),
  };
  const prints: Footprint[] = [];
  for (let k = 0; k < 20; k++) {
    const x = WALK_X0 + (k + 0.5) * STRIDE + 26;
    if (x < -20 || x > WALK_X1 + 40) continue;
    prints.push({ x, y: OPEN_GROUND + 7, born: WALK_IN + (x - 26 - WALK_X0) / speed });
  }

  // 机位：缓慢推进 → 交接段把气球推成拆开命题那颗满屏大球
  const base: Cam = {
    z: 1 + 0.035 * prog(f, 0, f2 - 24, ease.linear),
    fx: 950 + 30 * prog(f, 0, f2 - 24, ease.linear),
    fy: 540,
    sx: 960,
    sy: 540,
  };
  const O = orbScreen(f2);
  const target: Cam = { z: O.r / r, fx: balloon.cx, fy: balloon.cy, sx: O.x, sy: O.y };
  const cam = mixCam(base, target, prog(f, f2 - 24, f2, ease.inOut));
  return { cam, teen, balloon, walker, prints };
};

// ───────────────────────────── 早熟长什么样（屏 07–13） ─────────────────────────────
export const EARLY_GROUND = 800;
const SIT_LOW: Pose = { ...POSES.sit, rSh: 120, rEl: 30, head: -6 };
const SIT_UP: Pose = { ...POSES.sit, rSh: 128, rEl: 26, head: 34, torso: 2 };
const STAND_HOLD: Pose = { ...POSES.holdUp, head: 30 };
const LOOK_BACK: Pose = { ...POSES.dangle, head: 40, torso: -6 };
const FACE_ADULTS: Pose = { ...POSES.dangle, head: 4, torso: 2 };
const PROUD_AIR: Pose = { ...POSES.proud, lHip: -8, lKn: -14, rHip: 6, rKn: -8 };
const REACH: Pose = { ...POSES.reachDown };

const ADULTS = [
  { x0: 2160, x1: 1480, h: 1.0 },
  { x0: 2300, x1: 1640, h: 1.08 },
  { x0: 2440, x1: 1800, h: 0.96 },
];

export const earlyRig = (f: number) => {
  const walk0 = at(9) + 20;
  const walk1 = walk0 + 26;
  const teenX = track(f, [[walk0, 520], [walk1, 612]], ease.linear);
  let pose: Pose;
  if (f > walk0 && f < walk1) {
    pose = { ...walkPose((f - walk0) / 13, 0.8, STAND_HOLD), rSh: 126, rEl: 30, head: 26 };
  } else {
    pose = poseTrack(
      f,
      [
        [at(7), SIT_LOW],
        [at(8) - 10, { ...SIT_LOW, head: 8 }],
        [cue(8) + 14, SIT_UP],
        [at(9), SIT_UP],
        [walk0, STAND_HOLD],
        [walk1, STAND_HOLD],
        [at(10) + 10, POSES.holdUp],
        [at(10) + 30, LOOK_BACK],
        [at(11) + 4, LOOK_BACK],
        [at(11) + 18, FACE_ADULTS],
        [at(12) + 4, FACE_ADULTS],
        [at(12) + 24, PROUD_AIR],
        [at(13) + 10, PROUD_AIR],
        [at(13) + 40, REACH],
      ],
      ease.inOut,
    );
  }
  const facing = track(f, [[at(10) + 12, 1], [at(10) + 26, -1], [at(11) + 4, -1], [at(11) + 18, 1]]);
  const hover = track(f, [[at(10) + 20, 0], [at(11), 18], [at(12), 22], [at(13), 24], [screen(13).endFrame, 36], [screen(13).endFrame + 60, 40]]);
  const teen: FigureProps = { x: teenX, groundY: EARLY_GROUND, scale: 1.25, facing, color: C.teen, pose, hover };
  const hand = figureJoints(teen).nearHand;

  // 每问一个问题，气球胀一圈：膨胀起点 = 气泡音的那一帧
  const b8 = cue(8);
  const b9 = cue(9);
  const b10 = cue(10);
  const r = track(
    f,
    [
      [at(7), 34],
      [b8, 34],
      [b8 + 18, 62],
      [b9, 62],
      [b9 + 18, 92],
      [b10, 92],
      [b10 + 18, 132],
      [at(12), 132],
      [at(12) + 30, 140],
      [at(13) + 70, 142],
    ],
    ease.outBack,
  );
  const rings = track(f, [[b8, 0], [b8 + 18, 1], [b9, 1], [b9 + 18, 2], [b10, 2], [b10 + 18, 3]], ease.out);
  // 大人每拍一次手，气球亮一档
  const clapFrames = screen(11).sfx.map((c) => screen(11).startFrame + c.atFrame);
  const glow =
    0.5 +
    clapFrames.reduce((g, cf) => g + 0.25 * prog(f, cf - 2, cf + 6, ease.out), 0) +
    0.2 * prog(f, at(12), at(12) + 20);
  const halo = track(f, [[at(12), 0], [at(12) + 28, 1], [at(13), 1], [at(13) + 26, 0]]);
  const stringLen = track(f, [[at(7), 64], [b10 + 18, 104]]);
  const sway = Math.sin(f / 19) * 7 + (facing < 0 ? -14 : 0) * prog(f, at(10) + 12, at(10) + 30);
  const balloon = {
    cx: hand.x + 14 * Math.sign(facing || 1) + sway * 0.5,
    cy: hand.y - stringLen - r,
    r,
    rings,
    glow,
    halo,
    anchor: hand,
    sway,
  };

  // 大人剪影：从右侧走进来，停下后点头拍手（拍手帧 = 轻拍音）
  const arrive = at(11) + 22;
  const adults: FigureProps[] = ADULTS.map((a, i) => {
    const x = track(f, [[at(11) - 24, a.x0], [arrive + i * 2, a.x1]], ease.out);
    const moving = f < arrive + i * 2;
    let p: Pose;
    if (moving) {
      p = walkPose((a.x0 - x) / 150, 0.9);
    } else {
      const near = clapFrames.reduce((m, cf) => Math.min(m, Math.abs(f - cf)), 99);
      p = lerpPose(POSES.clapShut, POSES.clapOpen, Math.min(1, near / 5));
      // 点头：拍手之后慢慢抬回来
      p = { ...p, head: p.head - 8 * Math.max(0, 1 - near / 8) };
    }
    return { x, groundY: EARLY_GROUND, scale: 1.7 * a.h, facing: -1, color: C.adult, pose: p };
  });

  // 机位：拉远交接 → S09 右移 → S11 稍拉开容纳大人 → S13 推近到脚
  const end13 = screen(13).endFrame;
  const normal: Cam = {
    z: track(f, [[at(7), 1], [at(11), 1], [at(11) + 30, 0.93], [at(12), 0.93], [at(13), 1], [end13, 1.9], [end13 + 60, 2.05]]),
    fx: track(f, [[at(7), 960], [at(9), 960], [at(10), 1090], [at(13), 1090], [end13, 612]]) + 8 * Math.sin(f / 60),
    fy: track(f, [[at(7), 540], [at(13), 540], [end13, 772]]),
    sx: track(f, [[at(13), 960], [end13, 900]]),
    sy: track(f, [[at(13), 540], [end13, 560]]),
  };
  const O = orbScreen(Math.min(f, at(7)));
  const handoff: Cam = { z: O.r / r, fx: balloon.cx, fy: balloon.cy, sx: O.x, sy: O.y };
  const cam = mixCam(handoff, normal, prog(f, at(7), at(7) + 52, ease.inOut));
  return { cam, teen, balloon, adults, questions: questionShapes(f, balloon) };
};

/**
 * 屏 08–10：三个“大问题”先以线条图形出现在画面右侧（意义=轨道，努力=台阶，公平=天平），
 * 在气泡音前 16 帧碎成微粒飞进气球，气泡音那一帧气球胀一圈。
 */
export type QuestionShape = { kind: 'orbit' | 'stairs' | 'scale'; x: number; y: number; draw: number; fade: number; fly: number; target: { x: number; y: number } };
const QUESTIONS: { id: number; kind: QuestionShape['kind']; x: number; y: number }[] = [
  { id: 8, kind: 'orbit', x: 1430, y: 380 },
  { id: 9, kind: 'stairs', x: 1560, y: 430 },
  { id: 10, kind: 'scale', x: 1640, y: 360 },
];
const questionShapes = (f: number, balloon: { cx: number; cy: number }): QuestionShape[] =>
  QUESTIONS.map((q) => {
    const c = cue(q.id);
    return {
      kind: q.kind,
      x: q.x,
      y: q.y + 6 * Math.sin(f / 20 + q.id),
      draw: prog(f, at(q.id), at(q.id) + 16, ease.out),
      fade: prog(f, c - 16, c - 4),
      fly: prog(f, c - 16, c, ease.in),
      target: { x: balloon.cx, y: balloon.cy },
    };
  });

/** 拆开命题 → 早熟长什么样 的拉远：整节画面跟着那颗球一起缩回少年头顶。 */
export const thesisPullOut = (f: number) => {
  const t0 = at(7);
  if (f <= t0) return undefined;
  const O0 = orbScreen(t0);
  const { cam, balloon } = earlyRig(f);
  const B = toScreen(cam, balloon.cx, balloon.cy);
  const k = (balloon.r * cam.z) / O0.r;
  return `translate(${B.x} ${B.y}) scale(${k}) translate(${-O0.x} ${-O0.y})`;
};
