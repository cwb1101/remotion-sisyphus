import React from 'react';
import {interpolate} from 'remotion';
import {ease} from '../lib/anim';
import {HelmetShape, HelmetState} from './Helmet';

/**
 * 关节角度（度）。人物默认面朝 +x（右）。
 * 正值含义：torso 前倾；neck 低头；turn 1=朝前、-1=回头；
 * sh 手臂前抬（180=举过头顶）；el 肘部前屈；
 * hip 大腿前抬；kn 膝盖后屈；an 脚尖上翘；rootRot 整体绕骨盆顺时针转（90=向前扑倒、-90=仰面）。
 * F = 靠近镜头的一侧肢体，B = 远侧。
 */
export interface Pose {
  rootRot: number;
  torso: number;
  neck: number;
  turn: number;
  shF: number;
  elF: number;
  shB: number;
  elB: number;
  hipF: number;
  knF: number;
  anF: number;
  hipB: number;
  knB: number;
  anB: number;
}

export const POSE_KEYS: Array<keyof Pose> = [
  'rootRot', 'torso', 'neck', 'turn', 'shF', 'elF', 'shB', 'elB',
  'hipF', 'knF', 'anF', 'hipB', 'knB', 'anB',
];

export const STAND: Pose = {
  rootRot: 0, torso: 4, neck: 4, turn: 1,
  shF: 6, elF: 10, shB: -4, elB: 8,
  hipF: 2, knF: 2, anF: 0, hipB: -3, knB: 3, anB: 0,
};

export const pose = (p: Partial<Pose>, base: Pose = STAND): Pose => ({...base, ...p});

export const lerpPose = (a: Pose, b: Pose, t: number): Pose => {
  const out = {...a};
  for (const k of POSE_KEYS) {
    out[k] = a[k] + (b[k] - a[k]) * t;
  }
  return out;
};

/** 姿势关键帧：[帧, 姿势]，相邻姿势之间慢进慢出过渡 */
export const poseAt = (frame: number, keys: Array<[number, Pose]>): Pose => {
  if (frame <= keys[0][0]) {
    return keys[0][1];
  }
  for (let i = 0; i < keys.length - 1; i++) {
    const [f0, p0] = keys[i];
    const [f1, p1] = keys[i + 1];
    if (frame <= f1) {
      const t = interpolate(frame, [f0, f1], [0, 1], {easing: ease});
      return lerpPose(p0, p1, t);
    }
  }
  return keys[keys.length - 1][1];
};

/** 两头圆、略带肌肉弧度的肢体，沿 +y 方向延伸 */
const limb = (L: number, w1: number, w2: number) => {
  const a = w1 / 2;
  const b = w2 / 2;
  return `M ${-a} 0 C ${-a * 1.12} ${L * 0.33} ${-b * 1.08} ${L * 0.72} ${-b} ${L} A ${b} ${b} 0 0 0 ${b} ${L} C ${b * 1.06} ${L * 0.7} ${a * 1.1} ${L * 0.3} ${a} 0 A ${a} ${a} 0 0 0 ${-a} 0 Z`;
};

export type Build = 'quixote' | 'sancho' | 'plain';

const BUILD = {
  quixote: {
    torso: 'M -10 7 C -14 -12 -15 -33 -10 -47 C -6 -56 4 -57 9 -52 C 14 -44 14 -30 12 -18 C 11 -8 10 1 9 7 Z',
    pelvis: {rx: 10.5, ry: 8},
    thigh: [46, 11, 7.5], shin: [45, 7.2, 5], upper: [31, 7.4, 5.8], fore: [28, 5.8, 4.4],
    neckW: 6.5, skull: {rx: 8.6, ry: 11.6}, beard: true,
  },
  sancho: {
    torso: 'M -13 8 C -18 -10 -17 -34 -11 -46 C -6 -55 5 -56 10 -50 C 19 -40 23 -22 21 -8 C 20 2 15 9 10 10 Z',
    pelvis: {rx: 13, ry: 9},
    thigh: [40, 13, 9], shin: [38, 9, 6.5], upper: [28, 9, 7], fore: [25, 7, 5.5],
    neckW: 8.5, skull: {rx: 9.8, ry: 11}, beard: false,
  },
  plain: {
    torso: 'M -11 7 C -14 -12 -14 -33 -10 -47 C -6 -56 4 -57 9 -52 C 14 -44 14 -30 12 -18 C 11 -8 10 1 9 7 Z',
    pelvis: {rx: 11, ry: 8},
    thigh: [45, 12, 8], shin: [44, 7.6, 5.4], upper: [30, 7.8, 6], fore: [27, 6, 4.6],
    neckW: 7, skull: {rx: 9, ry: 11.4}, beard: false,
  },
} as const;

const HAND = 'M -3 0 C -4.2 4 -3.8 9 -0.5 10.5 C 3 10 4.2 5.5 3.2 0 Z';
const FOOT = 'M -4.5 -3 L 14 0.5 C 17.5 1.5 18 5 15 5.6 L -5.5 5.6 C -6.5 3 -6.5 -0.5 -4.5 -3 Z';

export interface BodyProps {
  pose: Pose;
  build?: Build;
  fill: string;
  /** 远侧肢体颜色（略浅，增加纵深） */
  farFill?: string;
  /** 戴在头上的头盔；rim 通道里也会画成剪影 */
  helmet?: HelmetState | null;
  /** 渲染通道：rim 时头盔画成纯色 */
  pass: 'rim' | 'body';
  /** 近侧手里拿的东西（在手掌坐标系里画） */
  propF?: (pass: 'rim' | 'body', fill: string) => React.ReactNode;
  propB?: (pass: 'rim' | 'body', fill: string) => React.ReactNode;
}

/** 人物主体：头、躯干、上臂、前臂、手、大腿、小腿、脚分段，骨盆为原点，y 向下 */
export const FigureBody: React.FC<BodyProps> = ({
  pose: p, build = 'quixote', fill, farFill, helmet, pass, propF, propB,
}) => {
  const b = BUILD[build];
  const far = farFill ?? fill;
  const leg = (hip: number, kn: number, an: number, color: string) => (
    <g transform={`rotate(${-hip})`}>
      <path d={limb(b.thigh[0], b.thigh[1], b.thigh[2])} fill={color} />
      <g transform={`translate(0 ${b.thigh[0]}) rotate(${kn})`}>
        <path d={limb(b.shin[0], b.shin[1], b.shin[2])} fill={color} />
        <g transform={`translate(0 ${b.shin[0]}) rotate(${-an - kn + hip})`}>
          <path d={FOOT} fill={color} />
        </g>
      </g>
    </g>
  );
  const arm = (
    sh: number,
    el: number,
    color: string,
    prop?: (pass: 'rim' | 'body', fill: string) => React.ReactNode,
  ) => (
    <g transform={`translate(2 -48) rotate(${-sh})`}>
      <path d={limb(b.upper[0], b.upper[1], b.upper[2])} fill={color} />
      <g transform={`translate(0 ${b.upper[0]}) rotate(${-el})`}>
        <path d={limb(b.fore[0], b.fore[1], b.fore[2])} fill={color} />
        <g transform={`translate(0 ${b.fore[0] - 1})`}>
          <path d={HAND} fill={color} />
          {prop ? <g transform="translate(0 6)">{prop(pass, color)}</g> : null}
        </g>
      </g>
    </g>
  );
  const turn = Math.abs(p.turn) < 0.08 ? 0.08 * Math.sign(p.turn || 1) : p.turn;
  return (
    <g transform={`rotate(${p.rootRot})`}>
      {leg(p.hipB, p.knB, p.anB, far)}
      <g transform={`rotate(${p.torso})`}>{arm(p.shB, p.elB, far, propB)}</g>
      <ellipse cx={0} cy={3} rx={b.pelvis.rx} ry={b.pelvis.ry} fill={fill} />
      <g transform={`rotate(${p.torso})`}>
        <path d={b.torso} fill={fill} />
        <g transform={`translate(1 -54) rotate(${p.neck})`}>
          <rect x={-b.neckW / 2} y={-10} width={b.neckW} height={13} rx={2} fill={fill} />
          <g transform="translate(0 -8)">
            <ellipse cx={0} cy={-11} rx={b.skull.rx} ry={b.skull.ry} fill={fill} />
            {/* 面部轮廓随回头在水平方向压缩、翻转 */}
            <g transform={`scale(${turn} 1)`}>
              <path d="M 6.5 -15 L 12 -8.6 L 7.8 -7.4 Z" fill={fill} />
              <path d="M 3 -6 C 7.5 -6 9 -3 8 0 C 7 2 4 2.5 0 2 C -3 1 -5 -2 -6 -5 Z" fill={fill} />
              {b.beard ? (
                <path d="M 2.5 -1 C 6 0 8 2 6.5 9 C 4.5 5 1 2.5 -2.5 1 Z" fill={fill} />
              ) : null}
              {build === 'sancho' ? (
                <path d="M -13 -17 C -12 -26 10 -27 12 -18 L 15 -16 L -15 -15 Z" fill={fill} />
              ) : null}
            </g>
            {helmet ? (
              <g transform={`translate(${0.5 * turn} -15) scale(${0.3 * Math.sign(turn)} 0.3)`}>
                <HelmetShape state={helmet} flat={pass === 'rim' ? fill : null} />
              </g>
            ) : null}
          </g>
        </g>
      </g>
      {leg(p.hipF, p.knF, p.anF, fill)}
      <g transform={`rotate(${p.torso})`}>{arm(p.shF, p.elF, fill, propF)}</g>
    </g>
  );
};

/** 骨盆到头顶中心的局部偏移（用于字幕跟随、视线等），返回骨盆坐标系里的点 */
export const headOffset = (p: Pose): {x: number; y: number} => {
  const rad = (d: number) => (d * Math.PI) / 180;
  // 颈部根在躯干坐标 (1,-54)，头中心在颈部坐标 (0,-19)
  const t = rad(p.torso + p.rootRot);
  const nx = Math.cos(t) * 1 - Math.sin(t) * -54;
  const ny = Math.sin(t) * 1 + Math.cos(t) * -54;
  const n = rad(p.torso + p.rootRot + p.neck);
  return {
    x: nx - Math.sin(n) * -19,
    y: ny + Math.cos(n) * -19,
  };
};

export interface RimSpec {
  color: string;
  opacity: number;
  /** 轮廓光方向（屏幕像素偏移，指向光源） */
  dx: number;
  dy: number;
}

/**
 * 逆光剪影：先画一层往光源方向偏移的金色副本，再把深色本体盖上去，
 * 只在朝光的一侧留下一道细轮廓光。draw 会被调用两次。
 */
export const RimLit: React.FC<{
  rim: RimSpec;
  fill: string;
  farFill?: string;
  draw: (pass: 'rim' | 'body', fill: string, farFill: string) => React.ReactNode;
}> = ({rim, fill, farFill, draw}) => (
  <g>
    {rim.opacity > 0.01 ? (
      <>
        <g transform={`translate(${rim.dx * 2.2} ${rim.dy * 2.2})`} opacity={rim.opacity * 0.28}>
          {draw('rim', rim.color, rim.color)}
        </g>
        <g transform={`translate(${rim.dx} ${rim.dy})`} opacity={rim.opacity}>
          {draw('rim', rim.color, rim.color)}
        </g>
      </>
    ) : null}
    {draw('body', fill, farFill ?? fill)}
  </g>
);

const LEN = {
  quixote: {upper: 31, fore: 28},
  sancho: {upper: 28, fore: 25},
  plain: {upper: 30, fore: 27},
} as const;

/** 正向运动学：手掌（握持点）相对骨盆的位置，以及手掌坐标系的朝向（SVG 角度） */
export const handOffset = (p: Pose, side: 'F' | 'B' = 'F', build: Build = 'quixote') => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const rot = (x: number, y: number, deg: number) => {
    const t = rad(deg);
    return {x: x * Math.cos(t) - y * Math.sin(t), y: x * Math.sin(t) + y * Math.cos(t)};
  };
  const sh = side === 'F' ? p.shF : p.shB;
  const el = side === 'F' ? p.elF : p.elB;
  const T = p.rootRot + p.torso;
  const s = rot(2, -48, T);
  const a1 = T - sh;
  const e = rot(0, LEN[build].upper, a1);
  const a2 = a1 - el;
  const h = rot(0, LEN[build].fore - 1 + 6, a2);
  return {x: s.x + e.x + h.x, y: s.y + e.y + h.y, angle: a2};
};

/** 走 / 跑的步态：phase 每增加 1 走完一个完整步伐；返回需要覆盖的关节角度 */
export const gait = (phase: number, amp = 1, run = false): Partial<Pose> => {
  const a = phase * Math.PI * 2;
  const s = Math.sin(a);
  const c = Math.cos(a);
  const A = (run ? 40 : 24) * amp;
  const K = (run ? 86 : 42) * amp;
  return {
    hipF: s * A,
    hipB: -s * A,
    knF: Math.max(0, -c) * K + 4,
    knB: Math.max(0, c) * K + 4,
    anF: 0,
    anB: 0,
    shF: -s * (run ? 52 : 22) * amp,
    shB: s * (run ? 52 : 22) * amp,
    elF: run ? 84 : 14,
    elB: run ? 84 : 14,
    torso: run ? 16 : 5,
  };
};

/** 步态里骨盆的上下起伏（世界单位，向上为正的高度修正） */
export const gaitBob = (phase: number, amp = 1, run = false) =>
  -(1 - Math.abs(Math.cos(phase * Math.PI * 2))) * (run ? 6 : 2.5) * amp;
