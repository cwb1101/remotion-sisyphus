/**
 * 后半片（不是懒 → 先走路的人 → 出口 → 收尾）共用的一个世界：
 * 同一条地面（y=760，和开头同一高度）、同一个少年、同一个先走路的人、同一颗气球。
 * 每节只决定镜头和本节特有的道具；人物和气球的状态都从这里按帧取，
 * 所以节与节交接时两边画的是同一个状态，直接切换也看不出接缝。
 */
import { at, screen } from '../data/script';
import { clamp, ease, lerp, prog, track } from '../lib/anim';
import { figureJoints, lerpPose, POSES, poseTrack, walkPose, type FigureProps, type Pose } from '../components/Figure';
import type { Footprint } from '../components/Footprints';
import { C } from '../theme';
import { cue } from './rigs';

export const SG = 760;
const TEEN_X0 = 600;
const TS = 1.3;
const WS = 1.25;
/** 一步 9.6 帧（0.32 s），和 gen-sfx 里 steps 的间隔一致 */
export const STEP_F = 9.6;
const T_STRIDE = 110;
const W_STRIDE = 120;
const TV = T_STRIDE / STEP_F;
const WV = W_STRIDE / STEP_F;

// ───────────────────────────── 天色：深夜 → 黎明前 → 黎明 ─────────────────────────────
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`;
};
const SKY: [number, string, string, string, number, number][] = [
  // frame, top, mid, bottom, 地平线暖光, 星星亮度
  [at(19), '#090C18', '#121831', '#1A2140', 0, 0.5],
  [at(31), '#090C18', '#121831', '#1A2140', 0, 0.5],
  [at(34), '#0D1426', '#172640', '#24405A', 0.03, 0.42],
  [at(39), '#10162C', '#1D2747', '#2E3A5E', 0.05, 0.38],
  [at(47), '#161B36', '#2A3158', '#5A4E6E', 0.1, 0.26],
  [at(54), '#1A2042', '#343A66', '#7E6070', 0.16, 0.18],
];
export const skyAt = (f: number) => {
  let i = SKY.findIndex((k) => k[0] > f);
  if (i === -1) i = SKY.length;
  if (i === 0) i = 1;
  const a = SKY[i - 1];
  const b = SKY[Math.min(i, SKY.length - 1)];
  const t = b[0] === a[0] ? 0 : ease.inOut(clamp((f - a[0]) / (b[0] - a[0])));
  return { top: mix(a[1], b[1], t), mid: mix(a[2], b[2], t), bottom: mix(a[3], b[3], t), warm: lerp(a[4], b[4], t), stars: lerp(a[5], b[5], t) };
};

// ───────────────────────────── 少年 ─────────────────────────────
const DANGLE_A: Pose = { ...POSES.dangle, head: 20 };
const LOOK_ADULTS: Pose = { ...POSES.dangle, head: 4, torso: 0 };
const LIMP: Pose = { torso: 4, head: -12, lSh: -4, lEl: 8, rSh: 126, rEl: 30, lHip: -4, lKn: -12, rHip: 4, rKn: -8, lift: 0 };
const UP: Pose = { ...POSES.dangle, head: 36 };
const PUSH: Pose = { torso: -4, head: 32, lSh: 150, lEl: 30, rSh: 140, rEl: 22, lHip: -6, lKn: -16, rHip: 6, rKn: -10, lift: 0 };
const SLUMP: Pose = { ...LIMP, torso: 12, head: -24 };
const REACH_FWD: Pose = { ...POSES.dangle, head: -10, lHip: 18, lKn: -10, rHip: 56, rKn: -8 };
const LOOK_BACK: Pose = { ...POSES.dangle, head: 0 };
const FOLLOW: Pose = { ...POSES.dangle, head: -36, torso: 8 };
const CURL: Pose = { torso: 22, head: -30, lSh: 50, lEl: 90, rSh: 126, rEl: 30, lHip: 95, lKn: -130, rHip: 100, rKn: -125, lift: 0 };
const LOOK_DOWN: Pose = { ...POSES.dangle, head: -44, torso: 10 };
const GRIP: Pose = { ...POSES.dangle, head: 14, lSh: 140, lEl: 24, rSh: 130, rEl: 26 };
const TOE_DOWN: Pose = { ...GRIP, head: -30, lHip: -4, lKn: -4, rHip: 8, rKn: 0 };
const STAND_HOLD: Pose = { ...POSES.stand, rSh: 126, rEl: 30, head: -12 };
const WALK_HOLD: Pose = { ...POSES.stand, rSh: 126, rEl: 30, head: 4 };
const CROUCH: Pose = { torso: 46, head: -20, lSh: 70, lEl: 10, rSh: 126, rEl: 30, lHip: 75, lKn: -115, rHip: 60, rKn: -100, lift: -34 };
const LANTERN: Pose = { ...POSES.stand, rSh: 24, rEl: 50, head: 8 };
const FWD: Pose = { ...POSES.stand, rSh: 18, rEl: 46, head: 10, torso: -3 };

type Walk = { t0: number; t1: number; x0: number };
const W1: Walk = { t0: cue(46), t1: at(51) + 2, x0: TEEN_X0 };
const W2: Walk = { t0: cue(54) - STEP_F, t1: cue(55), x0: W1.x0 + TV * (W1.t1 - W1.t0) };
const MEET = at(56) + 40; // 先走路的人追上来的那一帧，两人一起出发
const W3: Walk = { t0: MEET, t1: 99999, x0: W2.x0 + TV * (W2.t1 - W2.t0) };
const WALKS = [W1, W2, W3];
export const TEEN_FINAL_X = W3.x0; // 屏 55 站定的位置：和开头一样放在屏幕 x=480

export const teenX = (f: number) => {
  let x = TEEN_X0;
  for (const w of WALKS) {
    if (f <= w.t0) return x;
    x = w.x0 + TV * (Math.min(f, w.t1) - w.t0);
    if (f <= w.t1) return x;
  }
  return x;
};

const walking = (f: number) => WALKS.find((w) => f >= w.t0 && f < w.t1) ?? null;

const teenBasePose = (f: number): Pose =>
  poseTrack(
    f,
    [
      [at(19), DANGLE_A],
      [at(20) + 4, DANGLE_A],
      [at(20) + 18, LOOK_ADULTS],
      [at(21), LOOK_ADULTS],
      [at(21) + 14, LIMP],
      [at(22), LIMP],
      [at(22) + 12, UP],
      [at(24) - 6, UP],
      [at(24) + 4, PUSH],
      [cue(25) - 8, PUSH],
      [cue(25) + 8, SLUMP],
      [at(27), SLUMP],
      [at(27) + 12, UP],
      [at(28), UP],
      [at(28) + 8, REACH_FWD],
      [at(28) + 24, REACH_FWD],
      [at(28) + 34, LOOK_BACK],
      [at(29), LOOK_BACK],
      [at(29) + 10, FOLLOW],
      [at(30), FOLLOW],
      [at(30) + 20, CURL],
      [at(38), CURL],
      [at(38) + 22, DANGLE_A],
      [at(39) + 4, DANGLE_A],
      [at(39) + 26, LOOK_DOWN],
      [at(40), LOOK_DOWN],
      [at(40) + 14, GRIP],
      [cue(43) - 10, GRIP],
      [cue(43) - 2, TOE_DOWN],
      [cue(43) + 8, STAND_HOLD],
      [at(45) + 2, STAND_HOLD],
      [at(45) + 12, CROUCH],
      [at(46) - 2, CROUCH],
      [W1.t0, WALK_HOLD],
      [W1.t1, STAND_HOLD],
      [W1.t1 + 6, STAND_HOLD],
      [at(51) + 46, LANTERN],
      [W2.t0, LANTERN],
      [W2.t1, LANTERN],
      [W2.t1 + 14, FWD],
      [W3.t0, FWD],
    ],
    ease.inOut,
  );

export const teenPose = (f: number): Pose => {
  const w = walking(f);
  if (w) {
    const phase = (f - w.t0) / STEP_F + 0.5;
    const base = w === W1 ? WALK_HOLD : LANTERN;
    const p = walkPose(phase, 1.05, base);
    const into = prog(f, w.t0 - 1, w.t0 + 4); // 起步那几帧从站姿过渡
    const blended = lerpPose(teenBasePose(f), p, into);
    return w === W1 ? { ...blended, rSh: 126, rEl: 30 } : blended;
  }
  let p = teenBasePose(f);
  // 屏 21：慢慢蹬腿，像在水里
  if (f > at(21) + 14 && f < at(22) + 6) {
    const k = Math.sin((f - at(21) - 14) / 9) * prog(f, at(21) + 14, at(21) + 24) * (1 - prog(f, at(22) - 6, at(22) + 6));
    p = { ...p, lHip: p.lHip + 20 * k, rHip: p.rHip - 20 * k, lKn: p.lKn - 14 * Math.abs(k), rKn: p.rKn - 14 * Math.abs(k) };
  }
  // 屏 24：两次往上推（和下行音同一帧）
  const pushes = [cue(24), cue(24) + 32];
  const pulse = pushes.reduce((m, t) => Math.max(m, Math.exp(-(((f - t) / 4) ** 2))), 0);
  if (pulse > 0.01) p = { ...p, lEl: p.lEl * (1 - pulse), rEl: p.rEl * (1 - pulse), lSh: p.lSh + 10 * pulse };
  // 屏 41–42：一手接一手往下拉绳
  if (f > at(41) + 4 && f < cue(43) - 6) {
    const ph = f < at(42) ? ((f - at(41) - 4) / 14) * Math.PI * 2 : ((at(42) - at(41) - 4) / 14) * Math.PI * 2 + ((f - at(42)) / 22) * Math.PI * 2;
    const k = prog(f, at(41) + 4, at(41) + 12) * (1 - prog(f, cue(43) - 16, cue(43) - 6));
    p = { ...p, lSh: p.lSh + 18 * Math.sin(ph) * k, rSh: p.rSh - 18 * Math.sin(ph) * k, lEl: p.lEl + 14 * Math.cos(ph) * k, rEl: p.rEl - 14 * Math.cos(ph) * k };
  }
  // 屏 44：远侧手往后一引、往前一送（纸飞机出手 = 提示音那一帧）
  const thr = cue(44);
  if (f > thr - 10 && f < thr + 24) p = { ...p, lSh: track(f, [[thr - 10, p.lSh], [thr - 4, -40], [thr + 2, 125], [thr + 24, p.lSh]]), lEl: 10, head: 10 };
  // 屏 45：蹲下用手在地上划一道
  if (f > at(45) + 12 && f < at(46) - 2) p = { ...p, lSh: 70 + 12 * Math.sin((f - at(45) - 12) / 4) };
  // 屏 51：把绳子在手腕上绕两圈
  if (f > at(51) + 8 && f < at(51) + 42) {
    const ph = ((f - at(51) - 8) / 17) * Math.PI * 2;
    p = { ...p, rSh: 60 + 22 * Math.sin(ph), rEl: 70 + 20 * Math.cos(ph), head: -14 };
  }
  return p;
};

export const teenHover = (f: number) => {
  const j = cue(43);
  if (f >= j) return 0;
  return track(f, [[at(19), 70], [at(27), 70], [at(27) + 48, 150], [at(41), 150], [at(42), 110], [j - 10, 30], [j, 0]]);
};

export const teenFacing = (f: number) => track(f, [[at(28) + 34, 1], [at(28) + 46, -1], [at(28) + 54, -1], [at(28) + 66, 1]]);

/** 屏 26：被大人从背后一推，像钟摆一样荡出去再荡回来（绕握绳的手转） */
export const teenSwing = (f: number) => {
  const t = f - cue(26) - 2;
  if (t < 0) return 0;
  return -22 * Math.exp(-t / 26) * Math.sin(t / 6.5);
};

export const teenProps = (f: number): FigureProps => ({
  x: teenX(f),
  groundY: SG,
  scale: TS,
  facing: teenFacing(f),
  color: C.teen,
  pose: teenPose(f),
  hover: teenHover(f),
});

// ───────────────────────────── 气球 ─────────────────────────────
export const balloonAt = (f: number) => {
  const teen = teenProps(f);
  const hand = figureJoints(teen).nearHand;
  const r = track(
    f,
    [
      [at(19), 150],
      [at(27), 150],
      [at(27) + 24, 195],
      [at(42), 195],
      [at(42) + 50, 160],
      [at(51) + 12, 160],
      [at(51) + 54, 24],
    ],
    ease.inOut,
  );
  // 屏 49：每踩一步，绳子缩短一截
  const s49 = cue(49);
  const shortSteps = f >= s49 ? Math.min(4, Math.floor((f - s49) / STEP_F) + 1) : 0;
  const stringLen =
    f < at(51)
      ? track(f, [[at(41) + 4, 110], [cue(43), 70]]) - 7.5 * shortSteps
      : track(f, [[at(51) + 8, 40], [at(51) + 42, 10]]);
  const turn = 45 * Math.sin(Math.PI * prog(f, at(28) + 34, at(28) + 66, ease.linear));
  const sway = Math.sin(f / 19) * (f > at(50) ? 3 : 7) + turn;
  const behind = track(f, [[W1.t0, 14], [W1.t0 + 14, -46], [at(51) + 20, -46], [at(51) + 46, 10]]);
  return {
    cx: hand.x + behind + sway * 0.5,
    cy: hand.y - stringLen - r,
    r,
    rings: track(f, [[at(19), 3], [at(19) + 54, 6], [at(42), 6], [at(42) + 50, 5], [at(51) + 12, 5], [at(51) + 52, 1]]),
    ringGap: 0.11,
    glow: track(f, [
      [at(19), 1.0],
      [cue(25) - 4, 1.0],
      [cue(25) + 8, 0.65],
      [at(27) + 8, 0.85],
      [at(30), 0.85],
      [at(30) + 46, 0.6],
      [at(38), 0.6],
      [at(38) + 24, 0.85],
      [at(40), 0.85],
      [at(40) + 16, 1.0],
      [at(50), 1.0],
      [at(50) + 30, 1.35],
      [at(51) + 54, 1.1],
    ]),
    halfDark: 1 - prog(f, at(19), at(19) + 28),
    anchor: hand,
    sway,
  };
};

// ───────────────────────────── 先走路的人 ─────────────────────────────
const WA0 = cue(29); // 屏 29 第一声脚步 = 他入画后的第一次落脚
const WX_IN = -450;
const DOOR_STOP = cue(33) - 8;
const DOOR_GO = cue(33) + 4;
const TRIP = cue(34);
const SIT_END = TRIP + 46;
const STOP = at(36) + 6;
export const BOOKS_X = WX_IN + WV * (at(33) + 8 - WA0) + 30;
export const DOOR_X = WX_IN + WV * (DOOR_STOP - WA0) + 34;
const X_DOOR = WX_IN + WV * (DOOR_STOP - WA0);
const X_TRIP = X_DOOR + WV * (TRIP - DOOR_GO);
export const TRIP_X = X_TRIP + 30;
const X_SIT = X_TRIP + 35;
export const WALKER_STOP_X = X_SIT + WV * (STOP - SIT_END);
export const BLOCK_X = (X_DOOR + X_TRIP) / 2;

// 收尾：他从左边追上来，和少年并肩
const WB0 = at(56);
const WB_X0 = TEEN_FINAL_X - 800;
const WB_V = (800 - 70) / (MEET - WB0);

export const walkerX = (f: number) => {
  if (f >= WB0 - 1) {
    if (f <= MEET) return WB_X0 + WB_V * (f - WB0);
    return TEEN_FINAL_X - 70 + TV * (f - MEET);
  }
  if (f <= DOOR_STOP) return WX_IN + WV * (f - WA0);
  if (f <= DOOR_GO) return X_DOOR;
  if (f <= TRIP) return X_DOOR + WV * (f - DOOR_GO);
  if (f <= TRIP + 8) return X_TRIP + 35 * prog(f, TRIP, TRIP + 8, ease.out);
  if (f <= SIT_END) return X_SIT;
  if (f <= STOP) return X_SIT + WV * (f - SIT_END);
  return WALKER_STOP_X;
};

export const walkerVisible = (f: number) => (f >= WA0 - 2 && f < at(39) + 20) || f >= WB0 - 1;

const W_BASE: Pose = { ...POSES.stand, rSh: 22, rEl: 44, head: 2 };
const FALL: Pose = { torso: 70, head: -10, lSh: 70, lEl: 10, rSh: 60, rEl: 10, lHip: 30, lKn: -60, rHip: -20, rKn: -40, lift: -30 };
const SIT: Pose = { ...POSES.sit, rSh: 30, rEl: 50 };
const JOY: Pose = { torso: -6, head: 30, lSh: 165, lEl: 6, rSh: 155, rEl: 8, lHip: 30, lKn: -60, rHip: 20, rKn: -50, lift: 0 };
const PUSH_DOOR: Pose = { ...W_BASE, torso: 8, rSh: 82, rEl: 4 };
const LOOK_UP_W: Pose = { ...W_BASE, head: 30 };
const FIST_UP: Pose = { ...W_BASE, head: 26, rSh: 165, rEl: 0 };

export const walkerPose = (f: number): Pose => {
  const x = walkerX(f);
  const moving =
    (f < DOOR_STOP) || (f > DOOR_GO && f < TRIP) || (f > SIT_END && f < STOP) || (f >= WB0 - 1);
  if (moving) {
    const phase = f >= WB0 - 1 ? (x - WB_X0) / W_STRIDE + 0.5 : (x - WX_IN) / W_STRIDE + 0.5;
    let p = walkPose(phase, 1.0, W_BASE);
    // 跨过那摞书：抬腿
    const bump = Math.exp(-(((x - BOOKS_X) / 60) ** 2)) * (f < DOOR_STOP ? 1 : 0);
    if (bump > 0.02) p = { ...p, lift: p.lift + 16 * bump, lKn: p.lKn - 40 * bump, rKn: p.rKn - 40 * bump };
    return p;
  }
  return poseTrack(
    f,
    [
      [DOOR_STOP, W_BASE],
      [cue(33) - 2, PUSH_DOOR],
      [cue(33) + 2, PUSH_DOOR],
      [DOOR_GO, W_BASE],
      [TRIP, W_BASE],
      [TRIP + 8, FALL],
      [TRIP + 12, FALL],
      [TRIP + 20, SIT],
      [TRIP + 22, SIT],
      [TRIP + 30, W_BASE],
      [TRIP + 32, JOY],
      [SIT_END - 4, JOY],
      [SIT_END, W_BASE],
      [STOP, W_BASE],
      [STOP + 14, LOOK_UP_W],
      [at(37) + 6, LOOK_UP_W],
      [at(37) + 18, FIST_UP],
    ],
    ease.inOut,
  );
};

/** 屏 34 跳起来那一下的离地高度（狂喜音 = fallJoy 的第二段，在落地后 1.2 s） */
export const walkerHover = (f: number) => {
  const j0 = TRIP + 32;
  const j1 = SIT_END - 4;
  return f > j0 && f < j1 ? 46 * Math.sin((Math.PI * (f - j0)) / (j1 - j0)) : 0;
};

export const walkerProps = (f: number): FigureProps => ({
  x: walkerX(f),
  groundY: SG,
  scale: WS,
  facing: 1,
  color: C.walker,
  pose: walkerPose(f),
  hover: walkerHover(f),
});

/** 他手腕上那颗小灯（色①）：屏 36 抬头时从核桃大长到拳头大 */
export const walkerLanternR = (f: number) => (f >= WB0 - 1 ? 24 : track(f, [[cue(36), 10], [cue(36) + 18, 22]], ease.outBack));

// ───────────────────────────── 脚印（预先算好，按出生帧显示） ─────────────────────────────
const frontFoot = (p: FigureProps) => {
  const j = figureJoints(p);
  return Math.max(j.nearFoot.x, j.farFoot.x);
};

const contacts = (propsAt: (f: number) => FigureProps, phaseAt: (f: number) => number | null, f0: number, f1: number) => {
  const out: Footprint[] = [];
  let prev = phaseAt(f0);
  for (let f = f0; f <= f1; f += 0.2) {
    const ph = phaseAt(f);
    if (ph !== null && prev !== null && Math.floor(ph - 0.5) !== Math.floor(prev - 0.5)) {
      out.push({ x: frontFoot(propsAt(f)), y: SG + 7, born: f });
    }
    prev = ph;
  }
  return out;
};

export const WALKER_PRINTS: Footprint[] = [
  ...contacts(
    walkerProps,
    (f) => {
      const moving = f < DOOR_STOP || (f > DOOR_GO && f < TRIP) || (f > SIT_END && f < STOP);
      return moving ? (walkerX(f) - WX_IN) / W_STRIDE + 0.5 : null;
    },
    WA0 - 0.2,
    STOP,
  ),
];

export const WALKER_PRINTS_END: Footprint[] = contacts(
  walkerProps,
  (f) => (f >= WB0 ? (walkerX(f) - WB_X0) / W_STRIDE + 0.5 : null),
  WB0,
  screen(56).endFrame + 60,
);

export const TEEN_PRINTS: Footprint[] = (() => {
  const out: Footprint[] = [{ x: figureJoints(teenProps(cue(43))).nearFoot.x, y: SG + 7, born: cue(43) }];
  for (const w of WALKS) {
    out.push(
      ...contacts(
        teenProps,
        (f) => (f >= w.t0 && f < w.t1 ? (f - w.t0) / STEP_F + 0.5 : null),
        w.t0 - 0.2,
        Math.min(w.t1, screen(56).endFrame + 60),
      ),
    );
    out.push({ x: frontFoot(teenProps(w.t0)), y: SG + 7, born: w.t0 });
  }
  return out.sort((a, b) => a.born - b.born);
})();

// ───────────────────────────── 大人（屏 20 指指点点，屏 26 从背后推） ─────────────────────────────
const POINT: Pose = { ...POSES.stand, rSh: 100, rEl: 0, head: -6 };
const PUSH_FWD: Pose = { ...POSES.stand, torso: 10, lSh: 105, lEl: 6, rSh: 100, rEl: 6, head: 10 };

export const adultsAt = (f: number): FigureProps[] => {
  const out: FigureProps[] = [];
  const enter = at(20);
  const leave0 = at(27) + 8;
  [
    { x0: 1850, x1: 1250, h: 1.0 },
    { x0: 2000, x1: 1400, h: 1.08 },
    { x0: 2150, x1: 1550, h: 0.96 },
  ].forEach((a, i) => {
    if (f < enter - 2 || f > leave0 + 70) return;
    const arrive = enter + 30 + i * 2;
    const x =
      f < leave0
        ? track(f, [[enter, a.x0], [arrive, a.x1]], ease.out)
        : track(f, [[leave0 + 8, a.x1], [leave0 + 70, a.x1 + 900]], ease.in);
    const facing = track(f, [[leave0, -1], [leave0 + 8, 1]]);
    let pose: Pose;
    if (f < arrive) pose = walkPose((a.x0 - x) / 150, 0.9);
    else if (f > leave0 + 8) pose = walkPose((x - a.x1) / 150, 0.9);
    else pose = poseTrack(f, [[arrive, POSES.stand], [arrive + 8, POINT], [at(21) + 10, POINT], [at(21) + 24, POSES.stand]], ease.inOut);
    out.push({ x, groundY: SG, scale: 1.7 * a.h, facing, color: C.adult, pose, opacity: f > at(21) + 24 ? 0.7 : 1 });
  });
  // 推他的那个大人：从左边进来，推一下，再走回去
  const p0 = at(26) - 14;
  const hit = cue(26);
  if (f >= p0 && f < at(27) + 6) {
    const x = track(f, [[p0, -250], [hit - 4, 470], [hit + 26, 470], [at(27) + 6, -260]], ease.inOut);
    const back = f > hit + 26;
    let pose: Pose;
    if (f < hit - 4) pose = walkPose((x + 250) / 150, 0.9);
    else if (back) pose = walkPose((470 - x) / 150, 0.9);
    else pose = poseTrack(f, [[hit - 4, POSES.stand], [hit, PUSH_FWD], [hit + 10, PUSH_FWD], [hit + 22, POSES.stand]], ease.inOut);
    out.push({ x, groundY: SG, scale: 1.75, facing: back ? -1 : 1, color: C.adult, pose });
  }
  return out;
};


// ───────────────────────────── 出口 → 收尾 共用的平移机位 ─────────────────────────────
/** 屏 52 镜头离开少年往前看，屏 54–55 停在“和开头同一个构图”：地面在 y=760，少年站在屏幕 x=480 */
export const endingPan = (f: number) => ({
  z: 1,
  fx: track(f, [[at(52), W2.x0 + 120], [at(54) + 8, TEEN_FINAL_X + 480], [at(56), TEEN_FINAL_X + 480], [at(56) + 144, TEEN_FINAL_X + 420]]),
  fy: 540,
  sx: 960,
  sy: 540,
});
export const W1_END_X = W2.x0;
