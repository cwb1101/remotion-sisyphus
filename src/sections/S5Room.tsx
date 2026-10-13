/**
 * §5 说不出口 · 凌晨的空房间
 * §4 尽头那扇拱门亮成窗洞 → 镜头从窗洞前退出来：空房间，窗光斜照，地上一块窗格光斑，
 * 他背对窗坐在唯一的椅子上（逆光剪影）→ 手机亮起，他打字；前景桌沿挡住字幕再露出 →
 * 手机特写：输入框里的字一格格删掉 → 镜头上摇到墙上的钟 3:07，再下摇：他把手机扣在桌上 →
 * 他前倾，手肘撑膝蜷起来，光斑在地上慢慢移走 → 俯角远景，镜头上升，转向那只钟推进去，接 §6 的沙漏。
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Chair} from '../components/Chair';
import {Figure, View, solve} from '../components/Figure';
import {CURL, Pose, SIT, SIT_DOWN, SIT_REACH, addPose, pose, poseAt} from '../components/poses';
import {SubtitleTrack} from '../components/Subtitle';
import {cueTimes, screen, screensOf} from '../data/timeline';
import {impactAt} from '../engine/impact';
import {Cam, V3, boxFaces, camToWorld, fogAt, pathOf, project, projectPoly, toCam} from '../engine/projection';
import {DepthLayers, Dust, Item, camPath} from '../engine/world';
import {C, mix} from '../theme';

const ids = ['s36', 's37', 's38', 's39', 's40', 's41'] as const;
const S = Object.fromEntries(ids.map((i) => [i, screen(i)])) as Record<(typeof ids)[number], ReturnType<typeof screen>>;
const FOG = '#222222';
const HW = 3.0;
const BACK = 8;
const CEIL = 3.2;
// 拱形窗：宽 1m，起拱 2.25m；放在后墙偏左，镜头侧拍时不会落进右上角水印区
const WIN = {x: -2.45, w: 1.0, y0: 0.95, spring: 2.25, r: 0.5};
const MAN: V3 = {x: 0, y: 0, z: 4.6};
const TABLE: V3 = {x: 0.72, y: 0, z: 4.45};
// 钟放在窗右侧偏低处，远离右上角水印区
const CLOCK: V3 = {x: 0.95, y: 2.25, z: BACK - 0.02};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

const PHONE_SIT = pose({...SIT, rSh: 16, rEl: 112, neck: 36, lean: 12});
const putDown = S.s39.start + 58;
const manPose = (f: number): Pose =>
  poseAt(f, [
    {from: 0, pose: (ff) => addPose(SIT, {lean: Math.sin(ff / 44) * 1.2})},
    {from: S.s37.start + 2, pose: PHONE_SIT, blend: 22},
    {from: putDown - 14, pose: SIT_REACH, blend: 16},
    {from: putDown + 12, pose: SIT_DOWN, blend: 18},
    {from: S.s40.start + 6, pose: (ff) => addPose(CURL, {lean: Math.sin(ff / 30) * 1.5}), blend: 40},
  ]);

// 手机在 s37 起亮，放下以后扣在桌上
const PHONE_J = solve(PHONE_SIT, 'side', -1).hand[1];
// 他面朝 -z：手在身前 |x| 米处
const PHONE_W: V3 = {x: MAN.x + 0.05, y: PHONE_J.y, z: MAN.z - Math.abs(PHONE_J.x)};

/** 看向某点的机位 */
const aim = (from: V3, to: V3, focal: number) => ({
  ...from,
  yaw: (Math.atan2(to.x - from.x, to.z - from.z) * 180) / Math.PI,
  pitch: (Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z)) * 180) / Math.PI,
  focal,
});
const winCenter: V3 = {x: WIN.x, y: 1.85, z: BACK};

export const cameraS5 = (frame: number): Cam =>
  camPath(frame, [
    {f: S.s36.start - 14, ...aim({x: WIN.x, y: 1.9, z: 6.3}, winCenter, 1500)},
    {f: S.s36.end - 10, ...aim({x: 0.35, y: 1.45, z: 0.4}, {x: -0.1, y: 1.3, z: 6}, 1500)},
    {f: S.s37.start + 40, ...aim({x: 1.55, y: 1.2, z: 3.25}, {x: 0.05, y: 1.0, z: 4.55}, 1500)},
    {f: S.s37.end - 6, ...aim({x: 1.2, y: 1.15, z: 3.55}, {x: 0.05, y: 1.0, z: 4.55}, 1650)},
    {f: S.s38.start + 24, ...aim({x: 1.0, y: 1.15, z: 3.7}, PHONE_W, 3600)},
    {f: S.s38.end - 4, ...aim({x: 0.95, y: 1.15, z: 3.75}, PHONE_W, 3800)},
    {f: S.s39.start + 26, ...aim({x: 1.1, y: 1.4, z: 3.8}, CLOCK, 6200)},
    {f: S.s39.start + 46, ...aim({x: 1.12, y: 1.4, z: 3.82}, CLOCK, 6000)},
    {f: S.s39.end - 12, ...aim({x: 2.1, y: 1.3, z: 2.7}, {x: 0.3, y: 0.75, z: 4.6}, 1500)},
    {f: S.s40.start + 40, ...aim({x: 0.55, y: 1.05, z: 2.35}, {x: 0.05, y: 0.9, z: 4.6}, 1500)},
    {f: S.s40.end - 6, ...aim({x: 0.5, y: 1.0, z: 2.5}, {x: 0.05, y: 0.85, z: 4.6}, 1500)},
    {f: S.s41.start + 46, ...aim({x: 0.9, y: 2.75, z: 1.0}, {x: 0, y: 0.3, z: 4.8}, 1300)},
    {f: S.s41.end - 30, ...aim({x: 1.0, y: 2.95, z: 1.6}, {x: 0, y: 0.4, z: 5}, 1300)},
    {f: S.s41.end + 14, ...aim({x: CLOCK.x - 0.03, y: CLOCK.y - 0.02, z: CLOCK.z - 0.42}, CLOCK, 1500)},
  ]);

/** 凸包（屏幕空间），用来画窗到地面的光柱 */
const hull = (pts: {x: number; y: number}[]) => {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: {x: number; y: number}, a: {x: number; y: number}, b: {x: number; y: number}) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: typeof p = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: typeof p = [];
  for (const q of [...p].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
};

/** 拱形窗轮廓（世界坐标） */
const windowOutline = (inset = 0): V3[] => {
  const pts: V3[] = [{x: WIN.x - WIN.w / 2 + inset, y: WIN.y0 + inset, z: BACK}];
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI - (i / 16) * Math.PI;
    pts.push({x: WIN.x + Math.cos(a) * (WIN.r - inset), y: WIN.spring + Math.sin(a) * (WIN.r - inset), z: BACK});
  }
  pts.push({x: WIN.x + WIN.w / 2 - inset, y: WIN.y0 + inset, z: BACK});
  return pts;
};

const Clock: React.FC<{cam: Cam; frame: number}> = ({cam, frame}) => {
  const c = project(CLOCK, cam);
  if (c.z < 0.15) return null;
  const r = 0.22 * c.s;
  const sec = (frame / 30) % 60;
  const minute = 7 + sec / 60;
  const hour = 3 + minute / 60;
  const hand = (ang: number, len: number, w: number, col: string) => (
    <line x1={c.x} y1={c.y} x2={c.x + Math.sin(ang) * len} y2={c.y - Math.cos(ang) * len} stroke={col} strokeWidth={w} strokeLinecap="round" />
  );
  return (
    <g>
      <circle cx={c.x} cy={c.y} r={r * 1.08} fill="#0E0E0E" />
      <circle cx={c.x} cy={c.y} r={r} fill={mix('#2E2D2B', C.light, 0.25)} />
      {Array.from({length: 12}, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return <line key={i} x1={c.x + Math.sin(a) * r * 0.82} y1={c.y - Math.cos(a) * r * 0.82} x2={c.x + Math.sin(a) * r * 0.93} y2={c.y - Math.cos(a) * r * 0.93} stroke="#111" strokeWidth={Math.max(1, r * 0.035)} />;
      })}
      {hand((hour / 12) * Math.PI * 2, r * 0.5, Math.max(1.5, r * 0.06), '#0D0D0D')}
      {hand((minute / 60) * Math.PI * 2, r * 0.75, Math.max(1.2, r * 0.04), '#0D0D0D')}
      {hand((Math.floor(sec) / 60) * Math.PI * 2, r * 0.82, Math.max(1, r * 0.015), C.paper)}
      <circle cx={c.x} cy={c.y} r={Math.max(1.5, r * 0.04)} fill="#0D0D0D" />
    </g>
  );
};

/** 手机屏幕：输入框里的字（灰条）被一格格删掉 */
const PhoneUI: React.FC<{x: number; y: number; s: number; frame: number; on: number}> = ({x, y, s, frame, on}) => {
  const w = 0.072 * s;
  const h = 0.15 * s;
  const typed = cueTimes('s37', 'type');
  const del = cueTimes('s38', 'delete');
  const nType = typed.filter((t) => frame >= t).length;
  const nDel = del.filter((t) => frame >= t).length;
  const chars = Math.max(0, nType - nDel);
  const id = `p5${Math.round(x)}`;
  return (
    <g transform={`translate(${x - w * 0.5},${y - h * 0.62}) rotate(4 ${w / 2} ${h / 2})`} opacity={on > 0 ? 1 : 0}>
      <defs>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={C.accent} stopOpacity={0.14 * on} />
          <stop offset="1" stopColor={C.accent} stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${id}c`}>
          <rect width={w} height={h} rx={w * 0.12} />
        </clipPath>
      </defs>
      <ellipse cx={w / 2} cy={h / 2} rx={w * 0.85} ry={h * 0.62} fill={`url(#${id}g)`} style={{mixBlendMode: 'screen'}} />
      <rect x={-w * 0.04} y={-w * 0.04} width={w * 1.08} height={h + w * 0.08} rx={w * 0.15} fill={C.black} />
      <g clipPath={`url(#${id}c)`}>
        <rect width={w} height={h} fill={mix('#1A1814', C.accent, 0.07 * on)} />
        {/* 输入框 */}
        <rect x={w * 0.08} y={h * 0.7} width={w * 0.84} height={h * 0.1} rx={h * 0.03} fill="none" stroke={C.mid} strokeWidth={Math.max(1, w * 0.012)} opacity={on} />
        {Array.from({length: chars}, (_, i) => (
          <rect key={i} x={w * (0.12 + (i % 8) * 0.095)} y={h * (0.725 + Math.floor(i / 8) * 0.0)} width={w * 0.07} height={h * 0.05} fill={mix(C.light, C.accent, 0.2)} opacity={on} />
        ))}
        {/* 光标 */}
        {Math.floor(frame / 15) % 2 === 0 ? <rect x={w * (0.12 + Math.min(7, chars) * 0.095)} y={h * 0.72} width={Math.max(1, w * 0.012)} height={h * 0.06} fill={C.paper} opacity={on} /> : null}
        {/* 上面是一条很久以前的聊天记录 */}
        <rect x={w * 0.1} y={h * 0.2} width={w * 0.45} height={h * 0.05} rx={h * 0.02} fill={C.mid} opacity={0.6 * on} />
        <rect x={w * 0.1} y={h * 0.28} width={w * 0.3} height={h * 0.05} rx={h * 0.02} fill={C.mid} opacity={0.45 * on} />
      </g>
    </g>
  );
};

export const S5Room: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const frame = useCurrentFrame();
  const cam = cameraS5(frame);
  const hit = impactAt(frame);
  const items: Item[] = [];
  const fogD = 0.04;
  const depthOf = (p: V3) => toCam(p, cam).z;
  // 光的方向：随时间慢慢偏移（s40 光斑在地上移走）
  const drift = interpolate(frame, [S.s36.start, S.s41.end], [0, 1], clamp) + interpolate(frame, [S.s40.start, S.s41.start], [0, 0.6], clamp);
  const L = {x: 0.18 + drift * 0.32, y: -0.52, z: -1};
  const toFloor = (p: V3): V3 => {
    const t = -p.y / L.y;
    return {x: p.x + L.x * t, y: 0.002, z: p.z + L.z * t};
  };

  // —— 墙、地、天花
  const wall = (pts: V3[], fill: string, k: string, z: number) => {
    const pp = projectPoly(pts, cam);
    if (pp) items.push({key: k, z, node: <path d={pathOf(pp)} fill={fill} />});
  };
  wall([{x: -HW, y: 0, z: -2}, {x: HW, y: 0, z: -2}, {x: HW, y: 0, z: BACK}, {x: -HW, y: 0, z: BACK}], '#151515', 'floor', 900);
  wall([{x: -HW, y: CEIL, z: -2}, {x: HW, y: CEIL, z: -2}, {x: HW, y: CEIL, z: BACK}, {x: -HW, y: CEIL, z: BACK}], '#0C0C0C', 'ceil', 899);
  wall([{x: -HW, y: 0, z: -2}, {x: -HW, y: CEIL, z: -2}, {x: -HW, y: CEIL, z: BACK}, {x: -HW, y: 0, z: BACK}], '#121212', 'wl', 898);
  wall([{x: HW, y: 0, z: -2}, {x: HW, y: CEIL, z: -2}, {x: HW, y: CEIL, z: BACK}, {x: HW, y: 0, z: BACK}], '#131313', 'wr', 898);
  wall([{x: -HW, y: 0, z: BACK}, {x: HW, y: 0, z: BACK}, {x: HW, y: CEIL, z: BACK}, {x: -HW, y: CEIL, z: BACK}], '#1A1A1A', 'back', 897);
  // 踢脚线
  wall([{x: -HW, y: 0, z: BACK - 0.01}, {x: HW, y: 0, z: BACK - 0.01}, {x: HW, y: 0.1, z: BACK - 0.01}, {x: -HW, y: 0.1, z: BACK - 0.01}], '#0F0F0F', 'base', 896);

  // —— 窗：亮的拱形窗洞 + 十字窗棂
  const winPts = projectPoly(windowOutline(), cam);
  const winGlow = 1;
  if (winPts) {
    const bars: React.ReactNode[] = [];
    const vb = projectPoly([{x: WIN.x - 0.02, y: WIN.y0, z: BACK - 0.005}, {x: WIN.x + 0.02, y: WIN.y0, z: BACK - 0.005}, {x: WIN.x + 0.02, y: WIN.spring + WIN.r, z: BACK - 0.005}, {x: WIN.x - 0.02, y: WIN.spring + WIN.r, z: BACK - 0.005}], cam);
    const hb = projectPoly([{x: WIN.x - WIN.w / 2, y: 1.85, z: BACK - 0.005}, {x: WIN.x + WIN.w / 2, y: 1.85, z: BACK - 0.005}, {x: WIN.x + WIN.w / 2, y: 1.89, z: BACK - 0.005}, {x: WIN.x - WIN.w / 2, y: 1.89, z: BACK - 0.005}], cam);
    if (vb) bars.push(<path key="v" d={pathOf(vb)} fill="#121212" />);
    if (hb) bars.push(<path key="h" d={pathOf(hb)} fill="#121212" />);
    items.push({key: 'win', z: 896.5, node: <g><path d={pathOf(winPts)} fill={C.paper} opacity={0.82 * winGlow} />{bars}</g>});
  }
  // —— 地上的窗格光斑
  {
    const fp = projectPoly(windowOutline(0.02).map(toFloor), cam);
    const mull = projectPoly([toFloor({x: WIN.x - 0.025, y: WIN.y0, z: BACK}), toFloor({x: WIN.x + 0.025, y: WIN.y0, z: BACK}), toFloor({x: WIN.x + 0.025, y: WIN.spring + WIN.r, z: BACK}), toFloor({x: WIN.x - 0.025, y: WIN.spring + WIN.r, z: BACK})], cam);
    const hm = projectPoly([toFloor({x: WIN.x - 0.5, y: 1.85, z: BACK}), toFloor({x: WIN.x + 0.5, y: 1.85, z: BACK}), toFloor({x: WIN.x + 0.5, y: 1.9, z: BACK}), toFloor({x: WIN.x - 0.5, y: 1.9, z: BACK})], cam);
    if (fp) items.push({key: 'patch', z: 895, node: <g><path d={pathOf(fp)} fill={C.paper} opacity={0.2} />{mull ? <path d={pathOf(mull)} fill="#151515" /> : null}{hm ? <path d={pathOf(hm)} fill="#151515" /> : null}</g>});
  }
  // —— 钟
  items.push({key: 'clock', z: Math.max(0.2, depthOf(CLOCK)) + 0.1, node: <Clock cam={cam} frame={frame} />});

  // —— 椅子（全片唯一亮着的场景里唯一一把）和他
  {
    const q = project(MAN, cam);
    const dx = MAN.x - cam.x;
    const dz = MAN.z - cam.z;
    const view = (Math.atan2(dx, dz) * 180) / Math.PI;
    const tilt = (Math.atan2(cam.y - 0.5, Math.hypot(dx, dz)) * 180) / Math.PI;
    const toCamA = (Math.atan2(cam.x - MAN.x, cam.z - MAN.z) * 180) / Math.PI; // 他面朝 -z（180°）
    const rel = Math.abs((((toCamA - 180) % 360) + 540) % 360 - 180);
    const v: View = rel > 150 ? 'back' : rel < 35 ? 'front' : 'side';
    const a = project(MAN, cam);
    const b = project({x: MAN.x, y: 0, z: MAN.z - 0.5}, cam);
    const facing: 1 | -1 = b.x >= a.x ? 1 : -1;
    const mp = manPose(frame);
    if (q.z > 0.3) {
      const chair = <Chair key="c" x={q.x} y={q.y} scale={q.s} yaw={0 - cam.yaw - view} tilt={tilt} lit={0.55} light={-1} fog={fogAt(q.z, fogD, 2)} fogColor={FOG} />;
      const fig = <Figure key="m" pose={mp} view={v} facing={facing} x={q.x} y={q.y} scale={q.s} rim={1} light={v === 'side' ? -facing : 0} fog={fogAt(q.z, fogD, 2) * 0.3} fogColor={FOG} phone={v === 'side' && frame > S.s37.start && frame < putDown ? 0.35 : 0} phoneDevice={false} />;
      items.push({key: 'man', z: q.z, node: <g>{v === 'back' ? [fig, chair] : [chair, fig]}</g>});
      // 手机（手上 → 扣在桌上）
      const on = interpolate(frame, [S.s37.start + 8, S.s37.start + 20, putDown - 8, putDown], [0, 1, 1, 0], clamp);
      if (v === 'side' && frame > S.s37.start && frame < putDown + 2) {
        const j = solve(mp, 'side', facing).hand[1];
        items.push({key: 'phone', z: q.z - 0.05, node: <PhoneUI x={q.x + j.x * q.s} y={q.y - j.y * q.s} s={q.s} frame={frame} on={on} />});
      }
    }
  }
  // —— 小桌 + 扣着的手机
  {
    const top: V3 = {x: TABLE.x, y: 0.62, z: TABLE.z};
    const parts: {c: V3; s: V3}[] = [
      {c: top, s: {x: 0.42, y: 0.03, z: 0.42}},
      {c: {x: TABLE.x, y: 0.31, z: TABLE.z}, s: {x: 0.05, y: 0.62, z: 0.05}},
      {c: {x: TABLE.x, y: 0.01, z: TABLE.z}, s: {x: 0.3, y: 0.02, z: 0.3}},
    ];
    const nodes: React.ReactNode[] = [];
    for (const [i, pt] of parts.entries()) {
      const {faces} = boxFaces(pt.c, pt.s, cam, '#151515');
      faces.forEach((f, k) => nodes.push(<path key={`${i}${k}`} d={f.d} fill={mix('#0C0C0C', C.light, f.shade * 0.4)} />));
    }
    if (frame >= putDown) {
      const {faces} = boxFaces({x: TABLE.x - 0.05, y: 0.64, z: TABLE.z - 0.04}, {x: 0.075, y: 0.01, z: 0.15}, cam, '#000');
      faces.forEach((f, k) => nodes.push(<path key={`ph${k}`} d={f.d} fill="#050505" stroke={C.mid} strokeOpacity={0.3} strokeWidth={0.8} />));
    }
    items.push({key: 'table', z: depthOf(top), node: <g>{nodes}</g>});
  }
  // —— s37 前景桌沿：钉在 s37 开头镜头的左下，推镜时滑开（字被挡住再露出）
  const occlOp = interpolate(frame, [S.s37.start - 8, S.s37.start, S.s37.end - 20, S.s37.end], [0, 1, 1, 0], clamp);
  if (occlOp > 0.01) {
    const c0 = camToWorld({x: -0.42, y: -0.36, z: 0.85}, cameraS5(S.s37.start + 14));
    const {faces} = boxFaces(c0, {x: 0.9, y: 0.05, z: 0.5}, cam, '#000');
    const fz = depthOf(c0);
    if (fz > 0.15) items.push({key: 'edge', z: fz, node: <g opacity={occlOp}>{faces.map((f, k) => <path key={k} d={f.d} fill={mix('#080808', C.mid, f.shade * 0.25)} />)}</g>});
  }

  // —— 光柱：窗 → 地面光斑
  const beam = (() => {
    const w = windowOutline().filter((_, i) => i % 3 === 0).map((p) => project(p, cam));
    const fl = windowOutline().filter((_, i) => i % 3 === 0).map((p) => project(toFloor(p), cam));
    if ([...w, ...fl].some((p) => p.z < 0.2)) return null;
    return hull([...w, ...fl]);
  })();

  return (
    <AbsoluteFill style={{opacity, transform: `translate(${hit.x}px, ${hit.y}px) scale(1.02)`, background: C.black}}>
      <DepthLayers items={items} far={30} near={0.55} farBlur={0} nearBlur={14}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: 'blur(14px)', mixBlendMode: 'screen'}}>
          {beam ? <path d={pathOf(beam)} fill={C.paper} opacity={0.1} /> : null}
        </svg>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Dust
            seed="s5dust"
            n={90}
            box={{x0: -2, x1: 1.2, y0: 0.1, y1: 2.8, z0: 3, z1: 7.9}}
            cam={cam}
            frame={frame}
            bright={(p) => {
              // 只在光柱里发亮
              const t = (BACK - p.z) / -L.z;
              const wy = p.y - L.y * t;
              const wx = p.x - L.x * t;
              return Math.abs(wx - WIN.x) < WIN.w / 2 && wy > WIN.y0 && wy < WIN.spring + WIN.r ? 0.75 : 0.03;
            }}
          />
        </svg>
        <SubtitleTrack screens={screensOf('room')} layer="under" />
      </DepthLayers>
      {/* 进场：从 §4 的窗洞亮光里退出来 */}
      <AbsoluteFill style={{background: C.paper, opacity: interpolate(frame, [S.s36.start - 14, S.s36.start + 20], [0.25, 0], clamp)}} />
    </AbsoluteFill>
  );
};

