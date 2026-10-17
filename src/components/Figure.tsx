import React from 'react';
import { clamp, lerp } from '../lib/anim';

/**
 * 扁平几何人形。所有角度单位为度：
 * - 四肢的 Sh/Hip 是绝对角度：0 = 垂直向下，正值 = 朝面向的方向往前摆
 * - El/Kn 是相对上一节的弯曲：手肘正值往前弯，膝盖负值往后弯
 * - torso：0 = 直立，正值 = 前倾；head：正值 = 抬头（头往后仰）
 * - lift：髋部相对站立高度的抬升（px，未缩放），坐下为负
 * l = 远侧肢体（画在身体后面，颜色略深），r = 近侧肢体
 */
export type Pose = {
  torso: number;
  head: number;
  lSh: number;
  lEl: number;
  rSh: number;
  rEl: number;
  lHip: number;
  lKn: number;
  rHip: number;
  rKn: number;
  lift: number;
};

export const BONES = { torso: 58, neck: 8, headR: 17, upperArm: 30, foreArm: 28, thigh: 36, shin: 36 };
export const LEG = BONES.thigh + BONES.shin;
export const HEIGHT = LEG + BONES.torso + BONES.neck + BONES.headR * 2;

export const POSES: Record<string, Pose> = {
  stand: { torso: 0, head: 0, lSh: -6, lEl: 8, rSh: 6, rEl: 8, lHip: -2, lKn: 0, rHip: 2, rKn: 0, lift: 0 },
  lookUp: { torso: -4, head: 38, lSh: -10, lEl: 10, rSh: 8, rEl: 10, lHip: -2, lKn: 0, rHip: 2, rKn: 0, lift: 0 },
  // 坐在地上、膝盖立起，近侧手搭在膝上
  sit: { torso: 8, head: -4, lSh: 40, lEl: 40, rSh: 55, rEl: 30, lHip: 112, lKn: -128, rHip: 118, rKn: -124, lift: -52 },
  // 近侧手举到头的前上方握住气球绳（不能从头上穿过去）
  holdUp: { torso: -2, head: 34, lSh: -12, lEl: 10, rSh: 126, rEl: 30, lHip: -2, lKn: 0, rHip: 2, rKn: 0, lift: 0 },
  // 被拽离地面：脚尖下垂、膝盖微弯
  dangle: { torso: -3, head: 30, lSh: -18, lEl: 14, rSh: 130, rEl: 26, lHip: -8, lKn: -14, rHip: 6, rKn: -8, lift: 0 },
  // 伸脚去够地面
  reachDown: { torso: 6, head: -26, lSh: -20, lEl: 12, rSh: 132, rEl: 24, lHip: -14, lKn: -20, rHip: 14, rKn: 0, lift: 0 },
  // 大人：点头、拍手的两帧
  clapOpen: { torso: 2, head: -6, lSh: 52, lEl: 70, rSh: 46, rEl: 64, lHip: -2, lKn: 0, rHip: 2, rKn: 0, lift: 0 },
  clapShut: { torso: 4, head: -14, lSh: 62, lEl: 56, rSh: 60, rEl: 54, lHip: -2, lKn: 0, rHip: 2, rKn: 0, lift: 0 },
  // 挺直腰、昂头看气球
  proud: { torso: -6, head: 30, lSh: -14, lEl: 6, rSh: 128, rEl: 28, lHip: -3, lKn: 0, rHip: 3, rKn: 0, lift: 0 },
};

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = {} as Pose;
  (Object.keys(a) as (keyof Pose)[]).forEach((k) => {
    out[k] = lerp(a[k], b[k], t);
  });
  return out;
};

/** 关键帧姿态轨道：[[frame, pose], ...]，相邻关键帧之间做关节角度插值。 */
export const poseTrack = (frame: number, keys: [number, Pose][], e: (t: number) => number) => {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (frame <= keys[i][0]) {
      const t = clamp((frame - keys[i - 1][0]) / Math.max(1e-6, keys[i][0] - keys[i - 1][0]));
      return lerpPose(keys[i - 1][1], keys[i][1], e(t));
    }
  }
  return keys[keys.length - 1][1];
};

/** 步行循环：phase 以“步”为单位，每 1.0 迈一步。amp 控制步幅。 */
export const walkPose = (phase: number, amp = 1, base: Pose = POSES.stand): Pose => {
  const s = Math.sin(phase * Math.PI);
  const c = Math.cos(phase * Math.PI);
  const swing = 30 * amp;
  return {
    ...base,
    torso: base.torso + 4 * amp,
    lHip: swing * s,
    rHip: -swing * s,
    // 摆动腿抬膝：哪条腿往前摆就弯哪条
    lKn: -Math.max(0, c) * 34 * amp,
    rKn: -Math.max(0, -c) * 34 * amp,
    lSh: base.lSh - 22 * amp * s,
    rSh: base.rSh + 22 * amp * s,
    lEl: 18,
    rEl: 18,
    lift: base.lift - Math.abs(c) * 3 * amp,
  };
};

const rad = (d: number) => (d * Math.PI) / 180;
const limbDir = (deg: number) => ({ x: Math.sin(rad(deg)), y: Math.cos(rad(deg)) });

export type FigureProps = {
  /** 脚底所在地面的世界坐标（站立时脚踩在这里） */
  x: number;
  groundY: number;
  scale?: number;
  /** 1 = 面朝右，-1 = 面朝左；中间值用于转身（横向压扁） */
  facing?: number;
  color: string;
  pose: Pose;
  opacity?: number;
  /** 离地高度（px，已缩放）——被气球拽起来时用 */
  hover?: number;
};

export type Joints = {
  hip: { x: number; y: number };
  neck: { x: number; y: number };
  head: { x: number; y: number };
  nearHand: { x: number; y: number };
  farHand: { x: number; y: number };
  nearFoot: { x: number; y: number };
  farFoot: { x: number; y: number };
  lowestY: number;
};

type Pt = { x: number; y: number };

const solve = (p: FigureProps) => {
  const s = p.scale ?? 1;
  const f = p.facing ?? 1;
  const sx = Math.sign(f || 1) * Math.max(0.18, Math.abs(f));
  const { pose } = p;
  // 局部坐标：髋部在原点，面朝 +x
  const hip: Pt = { x: 0, y: 0 };
  const tdir = { x: Math.sin(rad(pose.torso)), y: -Math.cos(rad(pose.torso)) };
  const neck: Pt = { x: tdir.x * BONES.torso, y: tdir.y * BONES.torso };
  const shoulder: Pt = { x: neck.x - tdir.x * 6, y: neck.y - tdir.y * 6 };
  const headAng = pose.torso - pose.head * 0.35;
  const hdir = { x: Math.sin(rad(headAng)), y: -Math.cos(rad(headAng)) };
  const head: Pt = { x: neck.x + hdir.x * (BONES.neck + BONES.headR), y: neck.y + hdir.y * (BONES.neck + BONES.headR) };
  const arm = (sh: number, el: number) => {
    const a = limbDir(sh);
    const elbow = { x: shoulder.x + a.x * BONES.upperArm, y: shoulder.y + a.y * BONES.upperArm };
    const b = limbDir(sh + el);
    const hand = { x: elbow.x + b.x * BONES.foreArm, y: elbow.y + b.y * BONES.foreArm };
    return { elbow, hand };
  };
  const leg = (hp: number, kn: number) => {
    const a = limbDir(hp);
    const knee = { x: hip.x + a.x * BONES.thigh, y: hip.y + a.y * BONES.thigh };
    const b = limbDir(hp + kn);
    const foot = { x: knee.x + b.x * BONES.shin, y: knee.y + b.y * BONES.shin };
    return { knee, foot };
  };
  const lArm = arm(pose.lSh, pose.lEl);
  const rArm = arm(pose.rSh, pose.rEl);
  const lLeg = leg(pose.lHip, pose.lKn);
  const rLeg = leg(pose.rHip, pose.rKn);

  const hipWorld = { x: p.x, y: p.groundY - (LEG + pose.lift) * s - (p.hover ?? 0) };
  const W = (q: Pt): Pt => ({ x: hipWorld.x + q.x * s * sx, y: hipWorld.y + q.y * s });
  return { s, sx, local: { hip, neck, shoulder, head, lArm, rArm, lLeg, rLeg }, W, hipWorld, headAng };
};

export const figureJoints = (p: FigureProps): Joints => {
  const { local: L, W } = solve(p);
  const nearFoot = W(L.rLeg.foot);
  const farFoot = W(L.lLeg.foot);
  return {
    hip: W(L.hip),
    neck: W(L.neck),
    head: W(L.head),
    nearHand: W(L.rArm.hand),
    farHand: W(L.lArm.hand),
    nearFoot,
    farFoot,
    lowestY: Math.max(nearFoot.y, farFoot.y),
  };
};

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(clamp(v * k, 0, 255));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
};

export const Figure: React.FC<FigureProps> = (p) => {
  const { s, local: L, W, headAng, sx } = solve(p);
  const limbW = 12 * s;
  const far = shade(p.color, 0.78);
  const seg = (a: Pt, b: Pt, c: Pt, color: string, w: number) => {
    const A = W(a);
    const B = W(b);
    const Cc = W(c);
    return (
      <polyline
        points={`${A.x},${A.y} ${B.x},${B.y} ${Cc.x},${Cc.y}`}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  };
  const neck = W(L.neck);
  const hip = W(L.hip);
  const head = W(L.head);
  const hr = BONES.headR * s;
  // 头顶一小片“发帽”放在后脑一侧，用来读出朝向和抬头角度（不画五官）
  const capAng = headAng - 40;
  const capDir = { x: Math.sin(rad(capAng)) * Math.sign(sx), y: -Math.cos(rad(capAng)) };
  return (
    <g opacity={p.opacity ?? 1}>
      {seg(L.shoulder, L.lArm.elbow, L.lArm.hand, far, limbW)}
      {seg(L.hip, L.lLeg.knee, L.lLeg.foot, far, limbW * 1.1)}
      <line x1={hip.x} y1={hip.y} x2={neck.x} y2={neck.y} stroke={p.color} strokeWidth={26 * s} strokeLinecap="round" />
      {seg(L.hip, L.rLeg.knee, L.rLeg.foot, p.color, limbW * 1.1)}
      <circle cx={head.x} cy={head.y} r={hr} fill={p.color} />
      <path
        d={describeCap(head.x, head.y, hr, capDir)}
        fill={shade(p.color, 0.62)}
      />
      {seg(L.shoulder, L.rArm.elbow, L.rArm.hand, p.color, limbW)}
    </g>
  );
};

/** 后脑勺的一片月牙形“头发”，方向由 dir 决定 */
const describeCap = (cx: number, cy: number, r: number, dir: { x: number; y: number }) => {
  const ang = Math.atan2(dir.y, dir.x);
  const a0 = ang - 1.25;
  const a1 = ang + 1.25;
  const p0 = { x: cx + Math.cos(a0) * r, y: cy + Math.sin(a0) * r };
  const p1 = { x: cx + Math.cos(a1) * r, y: cy + Math.sin(a1) * r };
  const inner = { x: cx + Math.cos(ang) * r * 0.25, y: cy + Math.sin(ang) * r * 0.25 };
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${p1.x} ${p1.y} Q ${inner.x} ${inner.y} ${p0.x} ${p0.y} Z`;
};
