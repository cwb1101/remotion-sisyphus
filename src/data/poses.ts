// 动作库。角度单位是度，侧面朝右为准（朝左时整体镜像）：
//   躯干 torso：0 = 直立，正值 = 往前俯（头往前）
//   颈 neck：相对躯干，正值 = 低头，负值 = 抬头
//   肩 sh：相对躯干，0 = 手臂顺着躯干下垂，90 = 向前平举，180 = 举过头顶
//   肘 el / 膝 kn：屈曲角，只能 ≥ 0（不反折）。肘往前弯，膝往后弯
//   腕 wr / 踝 an：相对前一段，正值 = 手背/脚尖往上翘
//   髋 hip：大腿相对躯干的屈曲，0 = 顺着躯干，90 = 坐姿大腿平伸
// L = 靠镜头这侧（近侧），R = 远侧。
// pin：feet = 双脚钉在地面，用 IK 让髋去找脚（不滑步）；lowest = 身体最低点落地（躺 跌倒 跪）；root = 骨盆固定在给定位置（坐 抱 婴儿）

import { FRAMES_PER_BEAT } from "../lib/rhythm";

export type Mouth = "neutral" | "smile" | "open" | "cry" | "tight" | "o" | "frown" | "talk";
export type Brows = "neutral" | "sad" | "up" | "knit";
export type Eyes = "open" | "closed" | "happy" | "wide";
export type Face = { mouth: Mouth; brows: Brows; eyes: Eyes };

export type Joints = {
  torso: number;
  neck: number;
  shL: number;
  elL: number;
  wrL: number;
  shR: number;
  elR: number;
  wrR: number;
  hipL: number;
  knL: number;
  anL: number;
  hipR: number;
  knR: number;
  anR: number;
};
export type JointName = keyof Joints;

export type Pin = "feet" | "lowest" | "root";

export type Pose = {
  label: string;
  joints: Joints;
  face: Face;
  pin: Pin;
  /** 手要去够的目标（骨骼上的点），由 IK 解出手臂 */
  reach?: { L?: BodyTarget; R?: BodyTarget };
};
export type BodyTarget = "mouth" | "ear" | "headL" | "headR" | "chest";

/** 关节角度限制，最终角度会被夹在这个范围里 */
export const LIMITS: Record<JointName, [number, number]> = {
  torso: [-100, 95],
  neck: [-40, 50],
  shL: [-70, 185],
  shR: [-70, 185],
  elL: [0, 150],
  elR: [0, 150],
  wrL: [-70, 60],
  wrR: [-70, 60],
  hipL: [-35, 135],
  hipR: [-35, 135],
  knL: [0, 150],
  knR: [0, 150],
  anL: [-35, 45],
  anR: [-35, 45],
};

const face = (mouth: Mouth = "neutral", brows: Brows = "neutral", eyes: Eyes = "open"): Face => ({ mouth, brows, eyes });

const J = (j: Partial<Joints>): Joints => ({
  torso: 2,
  neck: -2,
  shL: 6,
  elL: 14,
  wrL: 4,
  shR: -5,
  elR: 18,
  wrR: 6,
  hipL: 4,
  knL: 5,
  anL: 0,
  hipR: -2,
  knR: 3,
  anR: 0,
  ...j,
});

export const POSES = {
  // —— 要求里的基础动作 ——
  stand: { label: "站立", joints: J({}), face: face(), pin: "feet" },
  push: {
    label: "推",
    joints: J({ torso: 26, neck: -14, shL: 104, elL: 22, wrL: -55, shR: 98, elR: 28, wrR: -50, hipL: 62, knL: 44, anL: 0, hipR: 0, knR: 8 }),
    face: face("tight", "knit"),
    pin: "feet",
  },
  pull: {
    label: "拉",
    joints: J({ torso: -16, neck: 8, shL: 40, elL: 42, wrL: 10, shR: 34, elR: 50, wrR: 10, hipL: 10, knL: 8, hipR: -38, knR: 34 }),
    face: face("tight", "knit"),
    pin: "feet",
  },
  sit: {
    label: "坐",
    joints: J({ torso: 4, neck: 2, shL: 22, elL: 58, wrL: 0, shR: 18, elR: 62, hipL: 92, knL: 88, anL: 2, hipR: 86, knR: 92, anR: 4 }),
    face: face(),
    pin: "root",
  },
  lookUp: {
    label: "抬头",
    joints: J({ torso: -6, neck: -32, shL: 2, elL: 10, shR: -8, elR: 12 }),
    face: face("o", "up", "wide"),
    pin: "feet",
  },
  lookDown: {
    label: "低头",
    joints: J({ torso: 9, neck: 38, shL: 12, elL: 20, shR: 0, elR: 22 }),
    face: face("frown", "sad"),
    pin: "feet",
  },
  reach: {
    label: "伸手",
    joints: J({ torso: 12, neck: -8, shL: 92, elL: 12, wrL: -6, shR: -12, elR: 22, hipL: 22, knL: 14, hipR: -6, knR: 4 }),
    face: face("open", "up"),
    pin: "feet",
  },
  point: {
    label: "指向",
    joints: J({ torso: 3, neck: -6, shL: 90, elL: 3, wrL: 0, shR: -6, elR: 16 }),
    face: face("open", "up"),
    pin: "feet",
  },
  fall: {
    label: "跌倒",
    joints: J({ torso: -92, neck: 18, shL: 128, elL: 30, wrL: 10, shR: 66, elR: 40, hipL: 30, knL: 42, anL: 10, hipR: 14, knR: 24, anR: 6 }),
    face: face("o", "knit", "closed"),
    pin: "lowest",
  },
  getUp: {
    label: "爬起",
    joints: J({ torso: 34, neck: -4, shL: 38, elL: 30, wrL: -40, shR: 20, elR: 24, hipL: 118, knL: 112, anL: 0, hipR: 52, knR: 128, anR: 30 }),
    face: face("tight", "knit"),
    pin: "lowest",
  },
  turn: {
    label: "转身",
    joints: J({ torso: 5, neck: 4, shL: 14, elL: 30, shR: 4, elR: 30, hipL: 8, knL: 10, hipR: -6, knR: 12 }),
    face: face(),
    pin: "feet",
  },
  raiseHand: {
    label: "举手",
    joints: J({ torso: -3, neck: -10, shL: 172, elL: 8, wrL: 0, shR: -8, elR: 16 }),
    face: face("open", "up"),
    pin: "feet",
  },
  holdHead: {
    label: "抱头",
    joints: J({ torso: 18, neck: 24, shL: 150, elL: 120, wrL: 20, shR: 146, elR: 124, wrR: 20, hipL: 20, knL: 18, hipR: 12, knR: 16 }),
    face: face("frown", "knit", "closed"),
    pin: "feet",
    reach: { L: "headL", R: "headR" },
  },

  // —— 片中用到的动作 ——
  crouch: {
    label: "蹲下",
    joints: J({ torso: 34, neck: 6, shL: 46, elL: 30, wrL: -10, shR: 36, elR: 36, hipL: 116, knL: 128, anL: 0, hipR: 106, knR: 132, anR: 0 }),
    face: face(),
    pin: "feet",
  },
  bendOver: {
    label: "俯身",
    joints: J({ torso: 52, neck: 4, shL: 46, elL: 24, wrL: 0, shR: 30, elR: 30, hipL: 54, knL: 10, hipR: 48, knR: 8 }),
    face: face(),
    pin: "feet",
  },
  cupEar: {
    label: "侧耳",
    joints: J({ torso: 46, neck: 14, shL: 120, elL: 130, wrL: 10, shR: 24, elR: 30, hipL: 50, knL: 12, hipR: 44, knR: 8 }),
    face: face("neutral", "up"),
    pin: "feet",
    reach: { L: "ear" },
  },
  coverMouth: {
    label: "捂嘴",
    joints: J({ torso: 6, neck: 6, shL: 50, elL: 130, wrL: 0, shR: 4, elR: 22 }),
    face: face("tight", "sad", "wide"),
    pin: "feet",
    reach: { L: "mouth" },
  },
  lean: {
    label: "倚身看",
    joints: J({ torso: 18, neck: 10, shL: 44, elL: 40, wrL: 0, shR: 20, elR: 34, hipL: 20, knL: 10, hipR: 14, knR: 6 }),
    face: face("smile"),
    pin: "feet",
  },
  carry: {
    label: "托抱",
    joints: J({ torso: 10, neck: 18, shL: 58, elL: 74, wrL: -10, shR: 50, elR: 82, wrR: -10, hipL: 14, knL: 10, hipR: 6, knR: 8 }),
    face: face("tight"),
    pin: "feet",
  },
  feed: {
    label: "喂奶",
    joints: J({ torso: 30, neck: 16, shL: 74, elL: 42, wrL: -20, shR: 40, elR: 86, wrR: 0, hipL: 36, knL: 18, hipR: 26, knR: 12 }),
    face: face("tight"),
    pin: "feet",
  },
  standBack: {
    label: "背手站",
    joints: J({ torso: -2, neck: 0, shL: -18, elL: 40, wrL: 10, shR: -22, elR: 44, wrR: 10 }),
    face: face(),
    pin: "feet",
  },

  // —— 婴儿（骨盆固定在摇篮里，仰躺，头朝后） ——
  babyLie: {
    label: "婴儿躺",
    joints: J({ torso: -78, neck: -8, shL: 60, elL: 70, wrL: 0, shR: 50, elR: 80, hipL: 70, knL: 74, anL: 10, hipR: 62, knR: 80, anR: 10 }),
    face: face("neutral"),
    pin: "root",
  },
  babyReach: {
    label: "婴儿伸手",
    joints: J({ torso: -72, neck: -14, shL: 104, elL: 14, wrL: -10, shR: 88, elR: 22, wrR: -10, hipL: 76, knL: 54, anL: 12, hipR: 58, knR: 70, anR: 10 }),
    face: face("smile", "up", "happy"),
    pin: "root",
  },
  babyLaugh: {
    label: "婴儿笑",
    joints: J({ torso: -74, neck: -18, shL: 96, elL: 40, wrL: -10, shR: 74, elR: 50, hipL: 92, knL: 40, anL: 20, hipR: 74, knR: 64, anR: 16 }),
    face: face("open", "up", "happy"),
    pin: "root",
  },
  babyCry: {
    label: "婴儿哭",
    joints: J({ torso: -70, neck: -24, shL: 138, elL: 46, wrL: 20, shR: 118, elR: 60, wrR: 20, hipL: 100, knL: 30, anL: 24, hipR: 40, knR: 90, anR: 10 }),
    face: face("cry", "knit", "closed"),
    pin: "root",
  },
  babyPush: {
    label: "婴儿推碗",
    joints: J({ torso: -66, neck: -10, shL: 66, elL: 6, wrL: -40, shR: 120, elR: 50, wrR: 10, hipL: 84, knL: 46, anL: 10, hipR: 54, knR: 84, anR: 10 }),
    face: face("cry", "knit"),
    pin: "root",
  },
  babyLimp: {
    label: "婴儿手放下",
    joints: J({ torso: -80, neck: -2, shL: 42, elL: 40, wrL: 10, shR: 36, elR: 56, hipL: 52, knL: 70, anL: 4, hipR: 50, knR: 74, anR: 4 }),
    face: face("neutral", "sad"),
    pin: "root",
  },
  babySit: {
    label: "婴儿坐",
    joints: J({ torso: -8, neck: -6, shL: 70, elL: 50, wrL: -10, shR: 60, elR: 56, hipL: 86, knL: 36, anL: 10, hipR: 80, knR: 44, anR: 10 }),
    face: face("open", "up", "happy"),
    pin: "root",
  },
} satisfies Record<string, Pose>;

export type PoseName = keyof typeof POSES;
export const POSE_NAMES = Object.keys(POSES) as PoseName[];

// —— 程序化步态：走路循环和奔跑 ——
// 步点落在拍上：每一步的脚跟着地帧 = 起步帧 + k × 步长帧数（默认每拍一步）
export type Gait = {
  kind: "walk" | "run";
  /** 第一步脚跟着地的帧，应当是一个拍点 */
  firstStep: number;
  steps: number;
  /** 每步多少帧，默认 1 拍（走路和跑步的步点都卡在拍上，跑步靠更大的步幅和腾空显得快） */
  stepFrames?: number;
  /** 步长，单位是头高 */
  stride?: number;
  /** 起点（骨盆的世界坐标 x），往 direction 方向走 */
  startX: number;
  direction: 1 | -1;
  /** 不跟着步子摆的手（端着东西） */
  hold?: ("L" | "R")[];
};

export const GAIT_DEFAULTS = {
  walk: { stepFrames: FRAMES_PER_BEAT, stride: 0.95, stance: 0.62, lift: 0.16, bob: 0.04, armSwing: 22, lean: 5, knee: 12, sink: 0.1 },
  run: { stepFrames: FRAMES_PER_BEAT, stride: 1.7, stance: 0.3, lift: 0.5, bob: 0.1, armSwing: 46, lean: 14, knee: 30, sink: 0.16 },
};

/** 某一步脚跟着地的帧号 */
export const stepFrame = (g: Gait, k: number) =>
  Math.round(g.firstStep + k * (g.stepFrames ?? GAIT_DEFAULTS[g.kind].stepFrames));

/** 全部着地帧（给脚步音效用） */
export const footfalls = (g: Gait): number[] => Array.from({ length: g.steps }, (_, k) => stepFrame(g, k));

/** 步态结束帧（最后一步着地后收脚站定） */
export const gaitEnd = (g: Gait) => stepFrame(g, g.steps - 1) + Math.round((g.stepFrames ?? GAIT_DEFAULTS[g.kind].stepFrames) * 0.9);

/** 骨盆在 frame 时的 x（头高 h 像素）。起步前停在 startX，走完停在终点 */
export const gaitX = (g: Gait, frame: number, h: number): number => {
  const d = GAIT_DEFAULTS[g.kind];
  const sf = g.stepFrames ?? d.stepFrames;
  const stride = (g.stride ?? d.stride) * h;
  // 第 0 步着地前半步开始移动，最后一步后半步停下
  const t0 = g.firstStep - sf * 0.5;
  const t1 = stepFrame(g, g.steps - 1) + sf * 0.5;
  const total = (g.steps - 0) * stride;
  const u = Math.min(1, Math.max(0, (frame - t0) / (t1 - t0)));
  // 起步和收步做缓入缓出，中间匀速，保证步频和速度一致
  const ease = (x: number) => {
    const a = 0.5 / g.steps;
    if (x < a) return (x * x) / (2 * a) / (1 - a);
    if (x > 1 - a) return 1 - ((1 - x) * (1 - x)) / (2 * a) / (1 - a);
    return (x - a / 2) / (1 - a);
  };
  return g.startX + g.direction * total * ease(u);
};
