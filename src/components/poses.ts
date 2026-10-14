import {interpolate} from 'remotion';
import {easeOut} from '../theme';

/**
 * 关节角度（度）。侧面视角，"前"= 人物面朝方向。
 * 腿/臂角度以竖直向下为 0，向前为正；knee/elbow 为弯曲量（≥0）。
 * N = 靠近镜头的一侧（near），F = 远侧（far）。
 */
export type Pose = {
  torso: number; // 躯干前倾
  head: number; // 低头为正
  thighN: number;
  kneeN: number;
  thighF: number;
  kneeF: number;
  armN: number;
  elbowN: number;
  armF: number;
  elbowF: number;
  seat: number; // 0 = 双脚着地，1 = 坐在椅面上
  breath: number; // 0..1 吸气时肩上提
};

export const STAND: Pose = {
  torso: 2, head: 2, thighN: 1, kneeN: 3, thighF: -2, kneeF: 2,
  armN: 2, elbowN: 10, armF: -3, elbowF: 8, seat: 0, breath: 0,
};

export const HEAD_DOWN: Pose = {...STAND, torso: 6, head: 30, armN: 4, elbowN: 14, armF: 0, elbowF: 12};

/** 近侧手背擦眼 */
export const WIPE_EYE: Pose = {...HEAD_DOWN, torso: 8, head: 22, armN: 30, elbowN: 142};

export const SIT: Pose = {
  torso: 4, head: 8, thighN: 84, kneeN: 88, thighF: 80, kneeF: 80,
  armN: 8, elbowN: 74, armF: 4, elbowF: 78, seat: 1, breath: 0,
};
export const SIT_INHALE: Pose = {...SIT, torso: 1, head: 2, breath: 1};
/** 坐着，近侧手抬到脸颊 */
export const SIT_TOUCH_CHEEK: Pose = {...SIT, torso: 7, head: 12, armN: 36, elbowN: 138};

const KEYS = Object.keys(STAND) as (keyof Pose)[];

export const mixPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = {} as Pose;
  for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  return out;
};

/** 关键帧姿势序列，姿势之间用统一曲线平滑过渡 */
export const poseTrack = (frame: number, keys: {f: number; pose: Pose; ease?: number}[]): Pose => {
  if (frame <= keys[0].f) return keys[0].pose;
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (frame <= b.f) {
      const t = interpolate(frame, [a.f, b.f], [0, 1], {easing: easeOut});
      return mixPose(a.pose, b.pose, t);
    }
  }
  return keys[keys.length - 1].pose;
};

/** 走路周期。phase∈[0,1)：0.25 近侧脚跟落地，0.75 远侧脚跟落地 */
export const walkPose = (phase: number): Pose => {
  const th = 2 * Math.PI * phase;
  const swing = (t: number) => 4 + 36 * Math.pow(Math.max(0, Math.cos(t + 0.55)), 1.6);
  return {
    torso: 4,
    head: 3,
    thighN: 21 * Math.sin(th),
    kneeN: swing(th),
    thighF: -21 * Math.sin(th),
    kneeF: swing(th + Math.PI),
    armN: -15 * Math.sin(th),
    elbowN: 14 + 8 * Math.max(0, -Math.sin(th)),
    armF: 15 * Math.sin(th),
    elbowF: 14 + 8 * Math.max(0, Math.sin(th)),
    seat: 0,
    breath: 0,
  };
};

/** 身体比例（以身高 H 为单位） */
export const BODY = {
  thigh: 0.245,
  shin: 0.245,
  ankle: 0.035,
  torso: 0.29,
  neck: 0.045,
  upper: 0.175,
  fore: 0.15,
};

const rad = (d: number) => (d * Math.PI) / 180;

/** 脚踝相对髋部的位置（单位：H） */
export const ankleOffset = (thigh: number, knee: number) => {
  const shin = thigh - knee;
  return {
    x: BODY.thigh * Math.sin(rad(thigh)) + BODY.shin * Math.sin(rad(shin)),
    y: BODY.thigh * Math.cos(rad(thigh)) + BODY.shin * Math.cos(rad(shin)),
  };
};

/**
 * 脚步锁定的行走：站立脚不打滑，髋部位置由站立脚反推。
 * strikes：每一步脚跟落地的帧（来自 cue 表）。走完最后一步后过渡到站姿。
 * 返回 hipX（单位：H，相对 startX）与当前姿势。
 */
export const simulateWalk = (frame: number, strikes: number[], settle = 14) => {
  const stepLen = strikes.length > 1 ? strikes[1] - strikes[0] : 16;
  const period = stepLen * 2;
  const first = strikes[0];
  const last = strikes[strikes.length - 1];
  const start = first - stepLen; // 起步：远侧脚刚落地
  const phaseAt = (f: number) => 0.25 + (f - first) / period;

  if (frame <= start) return {hipX: 0, pose: walkPose(phaseAt(start)), walking: false};

  const end = Math.min(frame, last + settle);
  const dt = 0.25;
  let pose = walkPose(phaseAt(start));
  // 起步时远侧脚是支撑脚
  let stanceNear = false;
  let footX = ankleOffset(pose.thighF, pose.kneeF).x;
  let hipX = 0;
  let prevPhase = phaseAt(start);
  for (let f = start; f <= end + 1e-6; f += dt) {
    const ph = phaseAt(Math.min(f, last + settle));
    const w = f > last ? easeOut(Math.min(1, (f - last) / settle)) : 0;
    pose = mixPose(walkPose(ph), STAND, w);
    // 脚跟落地：切换支撑脚
    const crossed = (target: number) => {
      const a = prevPhase - Math.floor(prevPhase);
      const b = ph - Math.floor(ph);
      return a < target && (b >= target || b < a);
    };
    if (f <= last + 0.01) {
      if (crossed(0.25) && !stanceNear) {
        stanceNear = true;
        footX = hipX + ankleOffset(pose.thighN, pose.kneeN).x;
      } else if (crossed(0.75) && stanceNear) {
        stanceNear = false;
        footX = hipX + ankleOffset(pose.thighF, pose.kneeF).x;
      }
    }
    prevPhase = ph;
    const off = stanceNear ? ankleOffset(pose.thighN, pose.kneeN) : ankleOffset(pose.thighF, pose.kneeF);
    hipX = footX - off.x;
  }
  return {hipX, pose, walking: frame < last + settle};
};
