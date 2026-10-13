/**
 * 逆光剪影人物：头、颈、躯干（长大衣）、上臂、前臂、手、大腿、小腿、脚分段绘制，
 * 用 poses.ts 里的关节角度做正向运动学摆姿势。
 *
 * 绘制两遍：第一遍整个人物涂成轮廓光颜色并朝光源方向偏移 1–2px，
 * 第二遍黑色剪影盖在上面 —— 只在迎光一侧留下一道细轮廓光。
 * 所有尺寸单位是米，身高约 1.78m，脚底在 (0,0)。
 */
import React from 'react';
import {C, mix} from '../theme';
import {Pose} from './poses';

export type View = 'side' | 'front' | 'back';

type Pt = {x: number; y: number};
const rad = (d: number) => (d * Math.PI) / 180;
const add = (a: Pt, b: Pt): Pt => ({x: a.x + b.x, y: a.y + b.y});
const mul = (a: Pt, k: number): Pt => ({x: a.x * k, y: a.y * k});

/** 骨长（米） */
const B = {
  torso: 0.52,
  shoulder: 0.47,
  upperArm: 0.3,
  foreArm: 0.27,
  hand: 0.17,
  thigh: 0.45,
  shin: 0.45,
  ankle: 0.075,
};

export type Joints = {
  hip: Pt;
  neck: Pt;
  head: Pt;
  headAngle: number;
  sh: [Pt, Pt];
  el: [Pt, Pt];
  wr: [Pt, Pt];
  hand: [Pt, Pt];
  hipJ: [Pt, Pt];
  kn: [Pt, Pt];
  an: [Pt, Pt];
  forearmAngle: [number, number];
};

/** 正向运动学：返回各关节位置（米，y 朝上，脚底 y=0） */
export const solve = (p: Pose, view: View, facing: 1 | -1 = 1): Joints => {
  const f = view === 'side' ? facing : 1;
  const side = view === 'side';
  const dir = (a: number): Pt => ({x: Math.sin(rad(a)) * f, y: -Math.cos(rad(a))});
  const build = (hipY: number): Joints => {
    const hip = {x: 0, y: hipY};
    const u = {x: Math.sin(rad(p.lean)) * f, y: Math.cos(rad(p.lean))};
    const neck = add(hip, mul(u, B.torso));
    const ha = p.lean + p.neck;
    const head = add(neck, mul({x: Math.sin(rad(ha)) * f * (side ? 1 : 0), y: Math.cos(rad(ha))}, side ? 0.155 : 0.15 * Math.cos(rad(p.neck)) + 0.01));
    const shBase = add(hip, mul(u, B.shoulder));
    const sw = side ? 0 : 0.19;
    const hw = side ? 0 : 0.095;
    const shL = add(shBase, {x: side ? -0.015 * f : -sw, y: 0});
    const shR = add(shBase, {x: side ? 0.01 * f : sw, y: 0});
    const hipL = add(hip, {x: side ? -0.01 * f : -hw, y: 0});
    const hipR = add(hip, {x: side ? 0.01 * f : hw, y: 0});

    // 侧面：在平面内转角；正面/背面：前后摆动表现为长度透视缩短
    const limb = (o: Pt, a1: number, a2: number, l1: number, l2: number, lat: number) => {
      if (side) {
        const m = add(o, mul(dir(a1), l1));
        return [m, add(m, mul(dir(a2), l2))];
      }
      const m = add(o, {x: Math.sin(rad(lat)) * l1, y: -Math.cos(rad(a1)) * l1});
      return [m, add(m, {x: Math.sin(rad(lat)) * l2 * 0.6, y: -Math.cos(rad(a2)) * l2})];
    };
    const [elL, wrL] = limb(shL, p.lSh, p.lSh + p.lEl, B.upperArm, B.foreArm, -p.armOut);
    const [elR, wrR] = limb(shR, p.rSh, p.rSh + p.rEl, B.upperArm, B.foreArm, p.armOut);
    const [hdL] = [add(wrL, side ? mul(dir(p.lSh + p.lEl + 8), B.hand) : {x: 0, y: -B.hand * Math.cos(rad(p.lSh + p.lEl))})];
    const [hdR] = [add(wrR, side ? mul(dir(p.rSh + p.rEl + 8), B.hand) : {x: 0, y: -B.hand * Math.cos(rad(p.rSh + p.rEl))})];
    const [knL, anL] = limb(hipL, p.lHip, p.lHip - p.lKn, B.thigh, B.shin, -2);
    const [knR, anR] = limb(hipR, p.rHip, p.rHip - p.rKn, B.thigh, B.shin, 2);
    return {
      hip,
      neck,
      head,
      headAngle: ha,
      sh: [shL, shR],
      el: [elL, elR],
      wr: [wrL, wrR],
      hand: [hdL, hdR],
      hipJ: [hipL, hipR],
      kn: [knL, knR],
      an: [anL, anR],
      forearmAngle: [p.lSh + p.lEl, p.rSh + p.rEl],
    };
  };
  // 先按 hip=0 求解，再把最低的脚踝放到地面
  const j0 = build(0);
  const groundY = -Math.min(j0.an[0].y, j0.an[1].y) + B.ankle;
  const hipY = groundY + (p.seatY - groundY) * p.seat;
  return build(hipY);
};

/** 锥形胶囊：两端半径不同的圆角段 */
const capsule = (a: Pt, b: Pt, r1: number, r2: number) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1e-6;
  const nx = -dy / len;
  const ny = dx / len;
  const p = (q: Pt, r: number, s: number) => `${(q.x + nx * r * s).toFixed(4)},${(q.y + ny * r * s).toFixed(4)}`;
  return `M${p(a, r1, 1)}L${p(b, r2, 1)}A${r2},${r2} 0 0 0 ${p(b, r2, -1)}L${p(a, r1, -1)}A${r1},${r1} 0 0 0 ${p(a, r1, 1)}Z`;
};

/** 闭合 Catmull-Rom 平滑曲线 */
const smoothPath = (pts: Pt[]) => {
  const n = pts.length;
  let d = `M${pts[0].x.toFixed(4)},${pts[0].y.toFixed(4)}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = {x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6};
    const c2 = {x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6};
    d += `C${c1.x.toFixed(4)},${c1.y.toFixed(4)} ${c2.x.toFixed(4)},${c2.y.toFixed(4)} ${p2.x.toFixed(4)},${p2.y.toFixed(4)}`;
  }
  return d + 'Z';
};

/** 在局部坐标系（原点 o，向上轴 u，向前轴 fw）里放一组点 */
const frame = (o: Pt, upAngle: number, f: number, pts: [number, number][]) => {
  const u = {x: Math.sin(rad(upAngle)) * f, y: Math.cos(rad(upAngle))};
  const fw = {x: u.y * f, y: -u.x * f};
  return pts.map(([a, b]) => add(o, add(mul(fw, a), mul(u, b))));
};

export type FigureProps = {
  pose: Pose;
  view: View;
  facing?: 1 | -1;
  /** 屏幕上脚底中心的位置（px） */
  x: number;
  y: number;
  /** 每米多少像素 */
  scale: number;
  /** 轮廓光强度 0..1 */
  rim?: number;
  /** 轮廓光朝向：-1 光从左来，1 光从右来，0 顶光 */
  light?: number;
  /** 雾 0..1：剪影颜色往雾色混 */
  fog?: number;
  fogColor?: string;
  opacity?: number;
  /** 身高缩放（成群小人用来做个体差异） */
  height?: number;
  /** 手里拿着手机：发光强度 0..1 */
  phone?: number;
  /** 是否由人物组件画出机身（特写时由场景另画带界面的屏幕） */
  phoneDevice?: boolean;
  coatSway?: number;
  /** 体型：man（长大衣）/ woman（肩更窄，长发） */
  variant?: 'man' | 'woman';
};

export const Figure: React.FC<FigureProps> = ({
  pose: p,
  view,
  facing = 1,
  x,
  y,
  scale,
  rim = 1,
  light = -1,
  fog = 0,
  fogColor = C.dark,
  opacity = 1,
  height = 1,
  phone = 0,
  phoneDevice = true,
  coatSway = 0,
  variant = 'man',
}) => {
  const woman = variant === 'woman';
  // 女性体型：肩、腰略窄（男性 bw = 1，与预览完全一致）
  const bw = woman ? 0.86 : 1;
  const j = solve(p, view, facing);
  const side = view === 'side';
  const f = side ? facing : 1;
  const parts: string[] = [];

  // —— 四肢（远侧先画）
  const arm = (i: 0 | 1) => {
    parts.push(capsule(j.sh[i], j.el[i], 0.05, 0.043));
    parts.push(capsule(j.el[i], j.wr[i], 0.043, 0.032));
    parts.push(capsule(j.wr[i], j.hand[i], 0.034, 0.026));
  };
  const leg = (i: 0 | 1) => {
    parts.push(capsule(j.hipJ[i], j.kn[i], 0.082, 0.06));
    parts.push(capsule(j.kn[i], j.an[i], 0.058, 0.04));
    const a = j.an[i];
    if (side) {
      parts.push(
        smoothPath([
          {x: a.x - 0.045 * f, y: a.y + 0.03},
          {x: a.x + 0.05 * f, y: a.y + 0.01},
          {x: a.x + 0.2 * f, y: a.y - 0.055},
          {x: a.x + 0.19 * f, y: a.y - 0.075},
          {x: a.x - 0.06 * f, y: a.y - 0.075},
        ]),
      );
    } else {
      parts.push(capsule({x: a.x, y: a.y + 0.02}, {x: a.x + (i ? 0.01 : -0.01), y: a.y - 0.06}, 0.05, 0.052));
    }
  };
  if (side) {
    arm(0);
    leg(0);
    leg(1);
  } else {
    leg(0);
    leg(1);
  }

  // —— 躯干 + 长大衣
  const sway = coatSway;
  if (side) {
    const front = Math.max(j.kn[0].x, j.kn[1].x) * f;
    const back = Math.min(j.kn[0].x, j.kn[1].x) * f;
    parts.push(
      smoothPath(
        frame(j.hip, p.lean, f, ([
          [0.045, 0.545],
          [0.125, 0.43],
          [0.105, 0.22],
          [0.11, 0.02],
          [Math.max(0.12, front * 0.55 + 0.06) + sway * 0.03, -0.36],
          [Math.min(-0.13, back * 0.5 - 0.06) + sway * 0.04, -0.34],
          [-0.12, 0.0],
          [-0.105, 0.22],
          [-0.12, 0.43],
          [-0.065, 0.53],
        ] as [number, number][]).map(([a, b]) => [a * bw, b] as [number, number])),
      ),
    );
  } else {
    const spread = Math.abs(j.kn[0].x - j.kn[1].x) * 0.5;
    parts.push(
      smoothPath(
        frame(j.hip, p.lean * 0.15, 1, ([
          [0.06, 0.565],
          [0.2, 0.505],
          [0.215, 0.43],
          [0.175, 0.3],
          [0.16, 0.12],
          [0.18, 0.0],
          [0.2 + spread * 0.3 + sway * 0.02, -0.34],
          [0.0, -0.31],
          [-0.2 - spread * 0.3 + sway * 0.02, -0.34],
          [-0.18, 0.0],
          [-0.16, 0.12],
          [-0.175, 0.3],
          [-0.215, 0.43],
          [-0.2, 0.505],
          [-0.06, 0.565],
        ] as [number, number][]).map(([a, b]) => [a * bw, b] as [number, number])),
      ),
    );
  }

  // —— 颈
  parts.push(capsule(j.neck, add(j.neck, {x: (j.head.x - j.neck.x) * 0.6, y: (j.head.y - j.neck.y) * 0.6}), 0.05, 0.048));

  // —— 头：侧面是有鼻梁下巴的轮廓；转头时横向压扁再翻转
  if (side) {
    const turnF = Math.cos(p.turn * Math.PI); // 1 → -1
    const hf = (turnF >= 0 ? 1 : -1) * f;
    const squash = Math.max(0.55, Math.abs(turnF));
    const prof: [number, number][] = [
      [-0.105, 0.02],
      [-0.07, 0.1],
      [0.0, 0.125],
      [0.07, 0.085],
      [0.093, 0.035],
      [0.098, 0.012],
      [0.122, -0.018],
      [0.098, -0.034],
      [0.1, -0.055],
      [0.09, -0.082],
      [0.075, -0.105],
      [0.03, -0.118],
      [-0.04, -0.1],
      [-0.1, -0.05],
    ];
    const pts = frame(j.head, p.lean + p.neck * 0.7, hf, prof.map(([a, b]) => [a * squash, b]));
    parts.push(smoothPath(pts));
    if (woman) {
      // 长发：从头顶沿后脑垂到肩
      const hair: [number, number][] = [
        [0.02, 0.135],
        [0.075, 0.09],
        [0.05, 0.02],
        [-0.02, -0.06],
        [-0.03, -0.24],
        [-0.12, -0.26],
        [-0.135, -0.05],
        [-0.12, 0.07],
      ];
      parts.push(smoothPath(frame(j.head, p.lean + p.neck * 0.7, hf, hair.map(([a, b]) => [a * squash, b]))));
    }
  } else {
    // shake：正面 / 背面摇头时头部左右偏移（预览里恒为 0）
    const h = {x: j.head.x + Math.sin(rad(p.shake)) * 0.035, y: j.head.y};
    const yk = Math.cos(rad(Math.min(60, Math.abs(p.neck)))) * 0.15 + 0.85;
    parts.push(
      smoothPath(
        [
          [0, 0.125],
          [0.07, 0.1],
          [0.09, 0.03],
          [0.094, -0.005],
          [0.08, -0.06],
          [0.045, -0.105],
          [0, -0.118],
          [-0.045, -0.105],
          [-0.08, -0.06],
          [-0.094, -0.005],
          [-0.09, 0.03],
          [-0.07, 0.1],
        ].map(([a, b]) => ({x: h.x + a, y: h.y + b * yk})),
      ),
    );
    if (woman) {
      parts.push(
        smoothPath(
          [
            [0, 0.14],
            [0.1, 0.09],
            [0.115, -0.05],
            [0.13, -0.24],
            [0.06, -0.22],
            [0.0, -0.1],
            [-0.06, -0.22],
            [-0.13, -0.24],
            [-0.115, -0.05],
            [-0.1, 0.09],
          ].map(([a, b]) => ({x: h.x + a, y: h.y + b * yk})),
        ),
      );
    }
  }

  // —— 近侧手臂、正面双臂（画在躯干前面）
  if (side) arm(1);
  else {
    arm(0);
    arm(1);
  }

  // —— 手机
  let phoneEl: React.ReactNode = null;
  if (phone > 0) {
    const w = j.hand[1];
    const ang = j.forearmAngle[1];
    const pts = frame(w, ang + 180 - 70, f, [
      [-0.035, -0.07],
      [0.035, -0.07],
      [0.035, 0.07],
      [-0.035, 0.07],
    ]);
    const d = 'M' + pts.map((q) => `${q.x},${q.y}`).join('L') + 'Z';
    phoneEl = (
      <g>
        <circle cx={w.x} cy={w.y} r={0.12} fill="url(#phoneGlow)" opacity={phone * 0.6} />
        {phoneDevice ? <path d={d} fill={mix(C.paper, C.accent, 0.45)} opacity={0.35 + 0.65 * phone} /> : null}
      </g>
    );
  }

  const fill = mix(C.black, fogColor, fog);
  const rimCol = mix(C.paper, fogColor, fog * 0.8);
  const rimPx = Math.max(1.1, Math.min(3.2, scale * 0.004));
  const off = rimPx / (scale * height);
  const ox = light * off;
  const oy = light === 0 ? off : off * 0.35;
  return (
    <g transform={`translate(${x},${y}) scale(${scale * height},${-scale * height})`} opacity={opacity}>
      {phone > 0 ? (
        <defs>
          <radialGradient id="phoneGlow">
            <stop offset="0" stopColor={C.accent} stopOpacity={0.55} />
            <stop offset="1" stopColor={C.accent} stopOpacity={0} />
          </radialGradient>
        </defs>
      ) : null}
      {/* 每段单独一个 path：避免不同绕向的子路径互相抵消出洞 */}
      {rim > 0.01 ? (
        <g fill={rimCol} opacity={rim} transform={`translate(${ox},${oy})`}>
          {parts.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      ) : null}
      <g fill={fill}>
        {parts.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>
      {phoneEl}
    </g>
  );
};
