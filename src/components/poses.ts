/**
 * 人物姿势：全部用关节角度描述（单位：度）。
 *
 *  - 四肢角度 0 = 竖直向下，正值 = 朝人物面向的方向抬起
 *  - lKn / rKn 膝盖弯曲，lEl / rEl 手肘弯曲（正值）
 *  - l = 远侧（侧面视角时被身体挡住的一侧），r = 近侧
 *  - turn：头转向身后（0 = 朝前，1 = 回头）
 *  - seat：0 = 脚踩地，1 = 坐在 seatY 高度上
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
};

export const pose = (p: Partial<Pose>): Pose => ({...STAND, ...p});

export const HEAD_DOWN = pose({neck: 30, lean: 7, lSh: 2, rSh: 0});
export const LOOK_UP = pose({neck: -30, lean: -5});
export const LOOK_BACK = pose({turn: 1, neck: 6, lean: 1, rSh: -6, lSh: 6});
/** 近侧手拿手机举到胸前，低头看 */
export const PHONE = pose({rSh: 16, rEl: 112, neck: 36, lean: 7, lSh: 2, lEl: 12});
export const PHONE_HAND_DOWN = pose({rSh: 10, rEl: 30, neck: 18, lean: 4});

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
