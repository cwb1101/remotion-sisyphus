/**
 * 人物姿势：全部用关节角度描述（单位：度）。
 *
 *  - 四肢角度 0 = 竖直向下，正值 = 朝人物面向的方向抬起
 *  - lKn / rKn 膝盖弯曲，lEl / rEl 手肘弯曲（正值）
 *  - l = 远侧（侧面视角时被身体挡住的一侧），r = 近侧
 *  - turn：头转向身后（0 = 朝前，1 = 回头）
 *  - seat：0 = 脚踩地，1 = 坐在 seatY 高度上
 *  - shake：正面 / 背面视角下头部左右偏转（度），用来摇头
 */
export type Pose = {
  lean: number;
  neck: number;
  turn: number;
  lSh: number;
  lEl: number;
  rSh: number;
  rEl: number;
  lHip: number;
  lKn: number;
  rHip: number;
  rKn: number;
  armOut: number;
  seat: number;
  seatY: number;
  shake: number;
};

export const STAND: Pose = {
  lean: 2,
  neck: 4,
  turn: 0,
  lSh: 4,
  lEl: 8,
  rSh: -3,
  rEl: 10,
  lHip: 2,
  lKn: 3,
  rHip: -2,
  rKn: 2,
  armOut: 5,
  seat: 0,
  seatY: 0.46,
  shake: 0,
};

export const pose = (p: Partial<Pose>): Pose => ({...STAND, ...p});

export const HEAD_DOWN = pose({neck: 30, lean: 7, lSh: 2, rSh: 0});
export const LOOK_UP = pose({neck: -30, lean: -5});
export const LOOK_BACK = pose({turn: 1, neck: 6, lean: 1, rSh: -6, lSh: 6});
/** 近侧手拿手机举到胸前，低头看 */
export const PHONE = pose({rSh: 16, rEl: 112, neck: 36, lean: 7, lSh: 2, lEl: 12});
export const PHONE_HAND_DOWN = pose({rSh: 10, rEl: 30, neck: 18, lean: 4});

/** 坐在椅子上（椅面 0.475m），seatY 是髋关节高度 */
export const SIT = pose({seat: 1, seatY: 0.56, lean: 4, neck: 6, lHip: 86, lKn: 88, rHip: 84, rKn: 86, lSh: 8, lEl: 40, rSh: 10, rEl: 44});
/** 坐着往前看（海边、楼梯） */
export const SIT_UP = pose({seat: 1, seatY: 0.56, lean: 0, neck: -2, lHip: 86, lKn: 86, rHip: 84, rKn: 84, lSh: 12, lEl: 46, rSh: 14, rEl: 48});
/** 坐着蜷起来：上身前倾，手肘撑膝 */
export const CURL = pose({seat: 1, seatY: 0.56, lean: 38, neck: 34, lHip: 92, lKn: 96, rHip: 90, rKn: 94, lSh: 48, lEl: 58, rSh: 52, rEl: 62});
/** 坐着低头（还没完全蜷起来） */
export const SIT_DOWN = pose({seat: 1, seatY: 0.56, lean: 18, neck: 30, lHip: 88, lKn: 90, rHip: 86, rKn: 88, lSh: 30, lEl: 50, rSh: 32, rEl: 54});
/** 坐在台阶上（台阶比椅子低） */
export const SIT_STEP = pose({seat: 1, seatY: 0.34, lean: 30, neck: 30, lHip: 100, lKn: 120, rHip: 98, rKn: 118, lSh: 50, lEl: 50, rSh: 52, rEl: 54});
/** 蹲下捡东西 */
export const SQUAT = pose({seat: 1, seatY: 0.42, lean: 30, neck: 20, lHip: 100, lKn: 130, rHip: 70, rKn: 110, lSh: 30, lEl: 10, rSh: 60, rEl: 10});
/** 近侧手向前平伸（握绳、伸手） */
export const REACH = pose({rSh: 78, rEl: 6, lean: 3, neck: 2});
/** 近侧手往前伸到一半停住 */
export const REACH_HALF = pose({rSh: 52, rEl: 18, lean: 4, neck: 8});
/** 坐着把手伸向身边 */
export const SIT_REACH = pose({seat: 1, seatY: 0.56, lean: 10, neck: 14, lHip: 86, lKn: 88, rHip: 84, rKn: 86, lSh: 8, lEl: 40, rSh: 70, rEl: 10});
/** 镜头前摇头时用：正面 / 背面视角 */
export const shakeHead = (f: number, amp = 14) => pose({shake: Math.sin(f / 3.2) * amp, neck: 4});

/** 走路循环：phase 0..1 一个完整步态（两步），amp 调幅度（0 = 原地站） */
export const walk = (phase: number, amp = 1): Pose => {
  const a = phase * Math.PI * 2;
  const leg = (ph: number) => {
    const hip = 24 * Math.sin(ph) * amp;
    const kn = (6 + 52 * Math.pow(Math.max(0, Math.cos(ph + 0.35)), 2)) * amp + 3 * (1 - amp);
    return {hip, kn};
  };
  const L = leg(a);
  const R = leg(a + Math.PI);
  return {
    ...STAND,
    lean: 4 * amp + 2,
    neck: 5,
    lHip: L.hip,
    lKn: L.kn,
    rHip: R.hip,
    rKn: R.kn,
    // 手臂与同侧腿反向摆动
    lSh: -18 * Math.sin(a) * amp + 3,
    lEl: 14 + 10 * Math.max(0, Math.sin(a)) * amp,
    rSh: -18 * Math.sin(a + Math.PI) * amp + 3,
    rEl: 14 + 10 * Math.max(0, Math.sin(a + Math.PI)) * amp,
  };
};

const KEYS: (keyof Pose)[] = [
  'lean',
  'neck',
  'turn',
  'lSh',
  'lEl',
  'rSh',
  'rEl',
  'lHip',
  'lKn',
  'rHip',
  'rKn',
  'armOut',
  'seat',
  'seatY',
  'shake',
];

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const o = {...a};
  for (const k of KEYS) o[k] = a[k] + (b[k] - a[k]) * t;
  return o;
};

/** 叠加：在 base 上加一个偏移姿势（例如呼吸、轻微晃动） */
export const addPose = (base: Pose, d: Partial<Pose>): Pose => {
  const o = {...base};
  for (const k of KEYS) if (d[k] !== undefined) o[k] = base[k] + (d[k] as number);
  return o;
};

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * 姿势时间线：每段从 from 帧开始使用 pose（可以是随帧变化的函数，比如走路），
 * 段与段之间用 blend 帧慢进慢出过渡。
 */
export type PoseSeg = {from: number; pose: Pose | ((f: number) => Pose); blend?: number};

export const poseAt = (frame: number, segs: PoseSeg[]): Pose => {
  const get = (s: PoseSeg) => (typeof s.pose === 'function' ? s.pose(frame) : s.pose);
  let i = 0;
  for (let k = 0; k < segs.length; k++) if (frame >= segs[k].from) i = k;
  const cur = get(segs[i]);
  if (i === 0) return cur;
  const blend = segs[i].blend ?? 14;
  const t = (frame - segs[i].from) / blend;
  if (t >= 1) return cur;
  return lerpPose(get(segs[i - 1]), cur, smooth(Math.max(0, t)));
};
