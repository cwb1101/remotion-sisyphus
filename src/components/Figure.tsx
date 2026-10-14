import React, {useId} from 'react';
import {BODY, Pose, ankleOffset} from './poses';
import {C} from '../theme';

type Pt = [number, number];
const rad = (d: number) => (d * Math.PI) / 180;
const rot = ([x, y]: Pt, a: number): Pt => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];
const mul = (a: Pt, k: number): Pt => [a[0] * k, a[1] * k];
const dir = (deg: number): Pt => [Math.sin(rad(deg)), Math.cos(rad(deg))]; // 0° = 竖直向下

/** 闭合平滑曲线（Catmull-Rom → 三次贝塞尔） */
const smooth = (pts: Pt[]) => {
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + 'Z';
};

/** 两端半径不同的胶囊（用于四肢），由多边形 + 两个圆拼成 */
const Limb: React.FC<{a: Pt; ra: number; b: Pt; rb: number}> = ({a, ra, b, rb}) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / len;
  const ny = dx / len;
  const poly = [
    [a[0] + nx * ra, a[1] + ny * ra],
    [b[0] + nx * rb, b[1] + ny * rb],
    [b[0] - nx * rb, b[1] - ny * rb],
    [a[0] - nx * ra, a[1] - ny * ra],
  ]
    .map((p) => p.map((v) => v.toFixed(2)).join(','))
    .join(' ');
  return (
    <>
      <polygon points={poly} />
      <circle cx={a[0]} cy={a[1]} r={ra} />
      <circle cx={b[0]} cy={b[1]} r={rb} />
    </>
  );
};

export type Rim = {dx: number; dy: number; opacity?: number; blur?: number; color?: string};

/**
 * 逆光剪影人物：头、颈、躯干（含长外套）、上臂/前臂/手、大腿/小腿/脚分段，
 * 关节角度来自 Pose。边缘一道细轮廓光（朝光源方向偏移的亮色投影）。
 * x：髋部横坐标；groundY：地面；seatY：坐姿时椅面高度；H：身高；facing：1 朝右，-1 朝左。
 */
export const Figure: React.FC<{
  pose: Pose;
  x: number;
  groundY: number;
  seatY?: number;
  H: number;
  facing?: 1 | -1;
  fill?: string;
  rim?: Rim;
}> = ({pose, x, groundY, seatY = groundY, H, facing = 1, fill = C.dark, rim}) => {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = rad(pose.torso);

  // 髋部高度：站立时由较长的那条腿撑地；坐姿时落在椅面上
  const extent = Math.max(
    ankleOffset(pose.thighN, pose.kneeN).y,
    ankleOffset(pose.thighF, pose.kneeF).y,
  ) + BODY.ankle;
  const hipY = (groundY - extent * H) * (1 - pose.seat) + (seatY - 0.02 * H) * pose.seat;

  const P = (p: Pt): Pt => mul(p, H);
  const torsoPt = (p: Pt): Pt => rot(P(p), t);
  const b = pose.breath;

  // 躯干轮廓（躯干局部坐标，x 向前，y 向上为负）
  const shoulderBack = torsoPt([-0.05, -0.27 - 0.008 * b]);
  const shoulderTop = torsoPt([-0.008, -0.296 - 0.009 * b]);
  const shoulderFront = torsoPt([0.044, -0.274 - 0.008 * b]);
  const chest = torsoPt([0.068 + 0.006 * b, -0.205]);
  const belly = torsoPt([0.054, -0.1]);
  const frontHip = torsoPt([0.06, 0]);
  const midBack = torsoPt([-0.062, -0.18]);
  const lowerBack = torsoPt([-0.058, -0.08]);
  const backHip = torsoPt([-0.068, 0]);

  // 腿
  const leg = (thigh: number, knee: number) => {
    const hip: Pt = [0, 0];
    const k = add(hip, mul(dir(thigh), BODY.thigh * H));
    const shinA = thigh - knee;
    const ankle = add(k, mul(dir(shinA), BODY.shin * H));
    const fa = rad(Math.max(-28, Math.min(22, shinA * 0.35)));
    const foot = [
      [-0.035, 0.012],
      [0.02, -0.012],
      [0.118, 0.026],
      [0.12, BODY.ankle + 0.004],
      [-0.04, BODY.ankle + 0.004],
    ].map((p) => add(ankle, rot(P(p as Pt), fa)));
    return {hip, k, ankle, foot, thigh};
  };
  const legN = leg(pose.thighN, pose.kneeN);
  const legF = leg(pose.thighF, pose.kneeF);

  // 长外套下摆跟随两条大腿
  const hemAt = (thigh: number) => mul(dir(thigh), 0.8 * BODY.thigh * H);
  const normalFwd = (thigh: number): Pt => [Math.cos(rad(thigh)), -Math.sin(rad(thigh))];
  const front = pose.thighN >= pose.thighF ? pose.thighN : pose.thighF;
  const back = pose.thighN >= pose.thighF ? pose.thighF : pose.thighN;
  const hemFront = add(hemAt(front), mul(normalFwd(front), 0.066 * H));
  const hemBack = add(hemAt(back), mul(normalFwd(back), -0.074 * H));
  const coat = smooth([shoulderTop, shoulderBack, midBack, lowerBack, backHip, hemBack, hemFront, frontHip, belly, chest, shoulderFront]);

  // 头与颈
  const shoulder = torsoPt([0, -0.272 - 0.008 * b]);
  const neckA = t + rad(pose.head) * 0.4;
  const neckTop = add(shoulder, rot([0, -BODY.neck * H], neckA));
  const headA = t + rad(pose.head);
  const headC = add(neckTop, rot(P([0.012, -0.058]), headA));
  const headPts = ([
    [0.0, -0.068],
    [0.036, -0.058],
    [0.052, -0.026],
    [0.054, 0.0],
    [0.066, 0.016], // 鼻
    [0.052, 0.026],
    [0.05, 0.044], // 下巴
    [0.026, 0.062],
    [-0.012, 0.05],
    [-0.04, 0.052], // 发尾
    [-0.062, 0.02],
    [-0.06, -0.03],
    [-0.036, -0.062],
  ] as Pt[]).map((p) => add(headC, rot(P(p), headA)));

  // 手臂
  const shoulderJoint = torsoPt([0.004, -0.255 - 0.008 * b]);
  const arm = (a: number, e: number) => {
    const ua = a + pose.torso;
    const el = add(shoulderJoint, mul(dir(ua), BODY.upper * H));
    const fa = ua + e;
    const wr = add(el, mul(dir(fa), BODY.fore * H));
    const hand = add(wr, mul(dir(fa), 0.042 * H));
    return {el, wr, hand, fa};
  };
  const armN = arm(pose.armN, pose.elbowN);
  const armF = arm(pose.armF, pose.elbowF);

  const legShape = (l: ReturnType<typeof leg>) => (
    <>
      <Limb a={l.hip} ra={0.062 * H} b={l.k} rb={0.044 * H} />
      <Limb a={l.k} ra={0.042 * H} b={l.ankle} rb={0.027 * H} />
      <polygon points={l.foot.map((p) => p.join(',')).join(' ')} />
    </>
  );
  const armShape = (a: ReturnType<typeof arm>) => (
    <>
      <Limb a={shoulderJoint} ra={0.033 * H} b={a.el} rb={0.026 * H} />
      <Limb a={a.el} ra={0.025 * H} b={a.wr} rb={0.019 * H} />
      <ellipse
        cx={a.hand[0]}
        cy={a.hand[1]}
        rx={0.021 * H}
        ry={0.044 * H}
        transform={`rotate(${-a.fa} ${a.hand[0]} ${a.hand[1]})`}
      />
    </>
  );

  const r = rim ?? {dx: -2, dy: -1};
  return (
    <g>
      <defs>
        <filter id={`rim${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow
            dx={r.dx}
            dy={r.dy}
            stdDeviation={r.blur ?? 0.6}
            floodColor={r.color ?? C.paper}
            floodOpacity={r.opacity ?? 0.85}
          />
        </filter>
      </defs>
      <g filter={`url(#rim${id})`}>
        <g transform={`translate(${x} ${hipY}) scale(${facing} 1)`} fill={fill}>
          {armShape(armF)}
          {legShape(legF)}
          {legShape(legN)}
          <Limb a={shoulder} ra={0.03 * H} b={neckTop} rb={0.024 * H} />
          <path d={smooth(headPts)} />
          <path d={coat} />
          {armShape(armN)}
        </g>
      </g>
    </g>
  );
};
