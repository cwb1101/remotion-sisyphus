import React from 'react';
import {C} from '../theme';
import {lerp} from '../lib/anim';

// 可复用的 SVG 色块小人：圆头、圆角矩形身体、粗线四肢；两点眼睛一笔眉毛做表情。
// 坐标以脚底为原点，面朝右绘制；facing=-1 时整体镜像。角度单位为度：
// 0 表示肢体竖直向下，正值表示朝面向方向摆。

export type Expression =
  | 'neutral'
  | 'happy'
  | 'sour'
  | 'annoyed'
  | 'angry'
  | 'confused'
  | 'sad'
  | 'sleepy'
  | 'smug'
  | 'surprised'
  | 'focused';

export type Pose = {
  lean: number;
  headTilt: number;
  /** 远侧手臂 [肩, 肘] */
  armBack: [number, number];
  /** 近侧手臂 [肩, 肘] */
  armFront: [number, number];
  legBack: [number, number];
  legFront: [number, number];
  /** 身体上下起伏（像素） */
  bob: number;
};

const L = {upperArm: 34, foreArm: 32, thigh: 36, shin: 34, hipY: -70, shoulderY: -134, headY: -184, headR: 34};

const rad = (d: number) => (d * Math.PI) / 180;
const limb = (x: number, y: number, a: number, len: number) => ({
  x: x + Math.sin(rad(a)) * len,
  y: y + Math.cos(rad(a)) * len,
});

// ── 动作库 ──────────────────────────────────────

const base: Pose = {
  lean: 0,
  headTilt: 0,
  armBack: [-6, 10],
  armFront: [6, 10],
  legBack: [-2, 0],
  legFront: [2, 0],
  bob: 0,
};

export const POSES = {
  stand: (t: number): Pose => ({...base, bob: Math.sin(t * 0.12) * 1.5}),
  walk: (t: number, speed = 0.32): Pose => {
    const p = t * speed;
    const s = Math.sin(p);
    return {
      ...base,
      lean: 4,
      armBack: [-22 * s, 18],
      armFront: [22 * s, 18],
      legBack: [-26 * s, Math.max(0, -s) * -38],
      legFront: [26 * s, Math.max(0, s) * -38],
      bob: Math.abs(Math.cos(p)) * -4,
    };
  },
  run: (t: number, speed = 0.45): Pose => {
    const p = t * speed;
    const s = Math.sin(p);
    return {
      ...base,
      lean: 14,
      headTilt: -4,
      armBack: [-48 * s, 80],
      armFront: [48 * s, 80],
      legBack: [-42 * s + 6, Math.max(0, -s) * -80 - 10],
      legFront: [42 * s + 6, Math.max(0, s) * -80 - 10],
      bob: Math.abs(Math.cos(p)) * -9,
    };
  },
  sit: (t: number): Pose => ({
    ...base,
    lean: -4,
    legBack: [86, -88],
    legFront: [92, -92],
    armBack: [30, 60],
    armFront: [40, 70],
    bob: Math.sin(t * 0.1) * 1,
  }),
  /** 双手捧手机看 */
  phone: (t: number): Pose => ({
    ...base,
    lean: 6,
    headTilt: 10,
    armBack: [34, 96],
    armFront: [40, 92],
    bob: Math.sin(t * 0.1) * 1,
  }),
  peek: (t: number): Pose => ({
    ...base,
    lean: 12,
    headTilt: -8,
    armFront: [30, 40],
    armBack: [10, 30],
    bob: Math.sin(t * 0.15) * 1.5,
  }),
  lookUp: (t: number): Pose => ({
    ...base,
    lean: -6,
    headTilt: -16,
    armBack: [-10, 8],
    armFront: [-4, 8],
    bob: Math.sin(t * 0.1) * 1,
  }),
  /** 挠头 */
  scratch: (t: number): Pose => ({
    ...base,
    lean: -4,
    headTilt: -12,
    armFront: [168 + Math.sin(t * 0.9) * 8, 70],
    armBack: [-8, 10],
    bob: Math.sin(t * 0.1) * 1,
  }),
  /** 举手电/放大镜往前照 */
  hold: (t: number, raise = 0): Pose => ({
    ...base,
    lean: 6,
    headTilt: -4 - raise * 10,
    armFront: [96 + raise * 30, -6 - raise * 10],
    armBack: [-6, 14],
    bob: Math.sin(t * 0.12) * 1.2,
  }),
  /** 被关在门外：身体前冲后急停 */
  stopShort: (t: number): Pose => ({
    ...base,
    lean: -8,
    headTilt: -6,
    armBack: [-40, 30],
    armFront: [50, 40],
    legBack: [-20, -10],
    legFront: [24, 0],
    bob: Math.sin(t * 0.3) * 1,
  }),
};

export const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  lean: lerp(a.lean, b.lean, t),
  headTilt: lerp(a.headTilt, b.headTilt, t),
  armBack: [lerp(a.armBack[0], b.armBack[0], t), lerp(a.armBack[1], b.armBack[1], t)],
  armFront: [lerp(a.armFront[0], b.armFront[0], t), lerp(a.armFront[1], b.armFront[1], t)],
  legBack: [lerp(a.legBack[0], b.legBack[0], t), lerp(a.legBack[1], b.legBack[1], t)],
  legFront: [lerp(a.legFront[0], b.legFront[0], t), lerp(a.legFront[1], b.legFront[1], t)],
  bob: lerp(a.bob, b.bob, t),
});

// ── 正向运动学：给道具找手的位置 ─────────────────

const shoulderOf = (pose: Pose) => {
  const hip = {x: 0, y: L.hipY + pose.bob};
  const torsoLen = L.hipY - L.shoulderY;
  return {x: hip.x + Math.sin(rad(pose.lean)) * torsoLen, y: hip.y - Math.cos(rad(pose.lean)) * torsoLen};
};

export const handLocal = (pose: Pose, arm: 'front' | 'back' = 'front') => {
  const sh = shoulderOf(pose);
  const [a1, a2] = arm === 'front' ? pose.armFront : pose.armBack;
  const el = limb(sh.x, sh.y, a1, L.upperArm);
  const hd = limb(el.x, el.y, a1 + a2, L.foreArm);
  return {x: hd.x, y: hd.y, angle: a1 + a2};
};

/** 手在世界里的位置（与 <Person> 相同的 x/y/scale/facing） */
export const handWorld = (
  pose: Pose,
  p: {x: number; y: number; scale?: number; facing?: 1 | -1; rotate?: number},
  arm: 'front' | 'back' = 'front',
) => {
  const h = handLocal(pose, arm);
  const s = p.scale ?? 1;
  const f = p.facing ?? 1;
  const r = rad(p.rotate ?? 0);
  const lx = h.x * f * s;
  const ly = h.y * s;
  return {
    x: p.x + lx * Math.cos(r) - ly * Math.sin(r),
    y: p.y + lx * Math.sin(r) + ly * Math.cos(r),
    angle: h.angle,
  };
};

// ── 表情 ──────────────────────────────────────────

const Face: React.FC<{expr: Expression; blink: boolean}> = ({expr, blink}) => {
  const ink = C.line;
  const ex = [6, 22];
  const ey = -4;
  const sw = 3.2;
  // 眉毛：[左右偏移y, 角度]（角度正值 = 内侧压低 = 凶）
  const brows: Record<Expression, [number, number, number, number]> = {
    neutral: [0, 0, 0, 0],
    happy: [-2, -6, -2, -6],
    sour: [-5, -14, 1, 16],
    annoyed: [1, 14, 1, 14],
    angry: [3, 26, 3, 26],
    confused: [-6, -16, 1, 6],
    sad: [-1, -20, -1, -20],
    sleepy: [2, -4, 2, -4],
    smug: [-3, -6, -3, -6],
    surprised: [-7, -4, -7, -4],
    focused: [1, 8, 1, 8],
  };
  const [o1, a1, o2, a2] = brows[expr];
  const brow = (x: number, off: number, a: number, inner: 1 | -1) => (
    <line
      x1={x - 6}
      y1={ey - 13 + off}
      x2={x + 6}
      y2={ey - 13 + off}
      stroke={ink}
      strokeWidth={sw}
      strokeLinecap="round"
      transform={`rotate(${a * inner} ${x} ${ey - 13 + off})`}
    />
  );
  const eye = (x: number) => {
    if (blink || expr === 'sleepy') return <line x1={x - 4.5} y1={ey} x2={x + 4.5} y2={ey} stroke={ink} strokeWidth={sw} strokeLinecap="round" />;
    if (expr === 'happy') return <path d={`M${x - 5} ${ey + 1} Q${x} ${ey - 6} ${x + 5} ${ey + 1}`} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" />;
    if (expr === 'angry') return <line x1={x - 5} y1={ey} x2={x + 5} y2={ey} stroke={ink} strokeWidth={sw + 0.6} strokeLinecap="round" />;
    if (expr === 'smug') return <path d={`M${x - 5} ${ey} Q${x} ${ey + 4} ${x + 5} ${ey}`} stroke={ink} strokeWidth={sw} fill="none" strokeLinecap="round" />;
    return <circle cx={x} cy={ey} r={expr === 'surprised' ? 5.4 : 4.2} fill={ink} />;
  };
  const mouths: Partial<Record<Expression, string>> = {
    happy: 'M8 14 Q15 21 22 14',
    sour: 'M9 16 L21 13',
    annoyed: 'M9 16 L21 16',
    angry: 'M9 17 Q15 14 21 17',
    sad: 'M9 18 Q15 13 21 18',
    smug: 'M9 15 Q17 19 22 12',
    focused: 'M11 16 L19 16',
  };
  return (
    <g>
      {brow(ex[0], o1, a1, -1)}
      {brow(ex[1], o2, a2, 1)}
      {eye(ex[0])}
      {eye(ex[1])}
      {expr === 'surprised' ? <ellipse cx={15} cy={16} rx={3.5} ry={4.5} fill={ink} /> : null}
      {expr === 'confused' ? <path d="M9 16 Q12 13 15 16 T21 16" stroke={ink} strokeWidth={2.6} fill="none" strokeLinecap="round" /> : null}
      {mouths[expr] ? <path d={mouths[expr]} stroke={ink} strokeWidth={2.8} fill="none" strokeLinecap="round" /> : null}
    </g>
  );
};

// ── 人物 ──────────────────────────────────────────

export type PersonProps = {
  x: number;
  y: number;
  pose: Pose;
  expr?: Expression;
  frame: number;
  scale?: number;
  facing?: 1 | -1;
  rotate?: number;
  body?: string;
  limbColor?: string;
  head?: string;
  opacity?: number;
  /** 拿在近侧手里的道具：以手为原点，道具的"上方"（-y）沿前臂延长线 */
  holding?: React.ReactNode;
  /** 为 true 时道具不随前臂旋转，保持竖直（比如正对镜头的手机屏） */
  holdUpright?: boolean;
  /** 头顶上的东西（比如冒汽的水壶） */
  onHead?: React.ReactNode;
  /** 画面滤镜（定格去色等） */
  filter?: string;
  shadow?: boolean;
};

export const Person: React.FC<PersonProps> = ({
  x,
  y,
  pose,
  expr = 'neutral',
  frame,
  scale = 1,
  facing = 1,
  rotate = 0,
  body = C.mist,
  limbColor = C.mistDark,
  head = '#F3EDE2',
  opacity = 1,
  holding,
  holdUpright = false,
  onHead,
  filter,
  shadow = true,
}) => {
  const hip = {x: 0, y: L.hipY + pose.bob};
  const sh = shoulderOf(pose);
  const neck = {x: sh.x + Math.sin(rad(pose.lean)) * 8, y: sh.y - Math.cos(rad(pose.lean)) * 8};
  const headC = {x: neck.x + Math.sin(rad(pose.lean)) * 36, y: neck.y - Math.cos(rad(pose.lean)) * 36};

  const leg = ([a1, a2]: [number, number]) => {
    const k = limb(hip.x, hip.y, a1, L.thigh);
    const f = limb(k.x, k.y, a1 + a2, L.shin);
    return {k, f, a: a1 + a2};
  };
  const arm = ([a1, a2]: [number, number]) => {
    const e = limb(sh.x, sh.y, a1, L.upperArm);
    const h = limb(e.x, e.y, a1 + a2, L.foreArm);
    return {e, h, a: a1 + a2};
  };
  const lb = leg(pose.legBack);
  const lf = leg(pose.legFront);
  const ab = arm(pose.armBack);
  const af = arm(pose.armFront);

  const blink = frame % 97 < 3;
  const limbPath = (a: {x: number; y: number}, b: {x: number; y: number}, c: {x: number; y: number}) =>
    `M${a.x} ${a.y} L${b.x} ${b.y} L${c.x} ${c.y}`;
  const foot = (f: {x: number; y: number}) => <ellipse cx={f.x + 6} cy={f.y - 3} rx={12} ry={6} fill={limbColor} />;

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale * facing} ${scale})`} opacity={opacity} filter={filter}>
      {shadow ? <ellipse cx={0} cy={2} rx={46} ry={8} fill="#000" opacity={0.22} /> : null}
      {/* 远侧肢体 */}
      <path d={limbPath(hip, lb.k, lb.f)} stroke={limbColor} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {foot(lb.f)}
      <path d={limbPath(sh, ab.e, ab.h)} stroke={limbColor} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* 躯干 */}
      <g transform={`rotate(${pose.lean} ${hip.x} ${hip.y})`}>
        <rect x={-30} y={hip.y - 78} width={60} height={86} rx={24} fill={body} />
        <rect x={-30} y={hip.y - 22} width={60} height={30} rx={14} fill={limbColor} opacity={0.35} />
      </g>
      {/* 近侧腿 */}
      <path d={limbPath(hip, lf.k, lf.f)} stroke={limbColor} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {foot(lf.f)}
      {/* 头 */}
      <g transform={`translate(${headC.x} ${headC.y}) rotate(${pose.headTilt})`}>
        <circle r={L.headR} fill={head} />
        <path d={`M${-L.headR} 0 A${L.headR} ${L.headR} 0 0 0 ${-L.headR * 0.2} ${L.headR * 0.98}`} fill="#000" opacity={0.06} />
        <Face expr={expr} blink={blink} />
        {onHead ? <g transform={`translate(0 ${-L.headR})`}>{onHead}</g> : null}
      </g>
      {/* 近侧手臂 + 道具 */}
      <path d={limbPath(sh, af.e, af.h)} stroke={body} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx={af.h.x} cy={af.h.y} r={8} fill={head} />
      {holding ? (
        <g transform={`translate(${af.h.x} ${af.h.y}) rotate(${holdUpright ? -rotate * facing : 180 - af.a})`}>{holding}</g>
      ) : null}
    </g>
  );
};

// ── 道具 ──────────────────────────────────────────

/** 头顶冒汽的小水壶（amount 0–1） */
export const Kettle: React.FC<{amount: number; frame: number}> = ({amount, frame}) => (
  <g transform="translate(0 -14)">
    {Array.from({length: 5}, (_, i) => {
      const t = ((frame * 0.9 + i * 9) % 40) / 40;
      return (
        <circle
          key={i}
          cx={22 + t * 26 + Math.sin(t * 6 + i) * 4}
          cy={-24 - t * 60}
          r={5 + t * 12}
          fill={C.paper}
          opacity={amount * (1 - t) * 0.55}
        />
      );
    })}
    <path d="M-20 0 Q-22 -26 0 -28 Q22 -26 20 0 Z" fill={C.gray} />
    <path d="M18 -16 L32 -26" stroke={C.gray} strokeWidth={7} strokeLinecap="round" />
    <rect x={-6} y={-36} width={12} height={8} rx={3} fill={C.line} />
  </g>
);
