/**
 * §4 只有一扇门 · 一串拱门
 * 海雾里浮出一串拱门，只有最远一扇亮着暖光 → 他牵着一根绳往前走，绳通向那扇亮门 →
 * 镜头转到他手边，沿绳的方向推长焦：亮门下椅子上坐着一个人（伴侣）→ 侧面中景横移：他身后的拱门全暗，
 * 地上散着几段早就断掉的旧绳 → 亮门暗下去，人起身离开，椅子隐进黑暗 → 绳子松下来落地（关键句）→
 * 他回头，身后一串黑拱门，蹲下捡起绳头 → 俯拍：五扇拱门下各站一个人，四个人手里有线通向别处，他两手空空 →
 * 镜头抬起，尽头一扇拱门亮成窗洞，接 §5 的房间。
 */
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Chair} from '../components/Chair';
import {Figure, View, solve} from '../components/Figure';
import {LOOK_BACK, Pose, REACH, SIT_UP, SQUAT, STAND, addPose, pose, poseAt, walk} from '../components/poses';
import {cueTimes, screen, slamFrame} from '../data/timeline';
import {impactAt} from '../engine/impact';
import {Cam, V3, boxFaces, fogAt, pathOf, project, projectPoly, toCam} from '../engine/projection';
import {DepthLayers, Dust, Item, camPath} from '../engine/world';
import {C, mix} from '../theme';

const ids = ['s28', 's29', 's30', 's31', 's32', 's33', 's34', 's35'] as const;
const S = Object.fromEntries(ids.map((i) => [i, screen(i)])) as Record<(typeof ids)[number], ReturnType<typeof screen>>;
const FOG = '#2C2C2C';
const SPACING = 2.6;
const ARCH_Z0 = 1.2;
const N_ARCH = 14;
const FAR_Z = ARCH_Z0 + SPACING * (N_ARCH - 1); // 亮着的那扇
const R = 1.7; // 拱的内半径
const SPRING = 3.0; // 起拱高度
const PARTNER: V3 = {x: 0, y: 0, z: FAR_Z + 0.6};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

// —— 他：s28–s31 慢慢往前走，s32 前停下
const WALK_END = S.s32.start - 6;
// 停在两扇拱门之间（侧面拍时身后不会正好挡一根墩柱）
const SPEED = (7.7 - 1.6) / (screen('s32').start - 6 - screen('s28').start);
const Z0 = 1.6;
const manZ = (f: number) => {
  const t = Math.max(0, Math.min(f, WALK_END) - S.s28.start);
  const decel = f > WALK_END - 30 ? 0 : 0;
  return Z0 + t * SPEED + decel;
};
const STOP_Z = manZ(WALK_END);
const darkAt = cueTimes('s32', 'hush')[0]; // 亮门开始暗下去
const dropAt = slamFrame(S.s33); // 绳子落地
const squatAt = S.s34.start + 40;

const manPose = (f: number): Pose => {
  const holding = (p: Pose): Pose => ({...p, rSh: 62, rEl: 12});
  return poseAt(f, [
    {from: 0, pose: (ff) => holding(walk(((ff - S.s28.start) / 36) % 1 + 1, 0.8))},
    {from: WALK_END - 10, pose: holding(STAND), blend: 16},
    {from: S.s32.start + 30, pose: addPose(REACH, {rSh: -10}), blend: 20},
    {from: dropAt, pose: pose({...STAND, rSh: 50, rEl: 20, neck: 12}), blend: 8},
    {from: S.s34.start + 4, pose: pose({...LOOK_BACK, rSh: 30, rEl: 20}), blend: 18},
    {from: squatAt, pose: SQUAT, blend: 20},
    {from: S.s35.start + 10, pose: addPose(STAND, {neck: 18}), blend: 26},
  ]);
};

export const manScreenXS4 = (f: number) => project({x: 0, y: 0, z: manZ(f)}, cameraS4(f)).x;

export const cameraS4 = (frame: number): Cam => {
  const m = (f: number) => manZ(f);
  return camPath(frame, [
    {f: S.s28.start - 14, x: 0.3, y: 1.6, z: m(S.s28.start) - 4.2, yaw: 0, pitch: 1},
    {f: S.s28.end - 10, x: 0.45, y: 1.5, z: m(S.s28.end) - 2.6, yaw: -2, pitch: 0},
    {f: S.s29.start + 26, x: 1.02, y: 1.3, z: m(S.s29.start + 26) - 0.85, yaw: -35, pitch: -4, focal: 2200},
    {f: S.s29.end - 16, x: 0.45, y: 1.2, z: m(S.s29.end) - 0.6, yaw: -1, pitch: -1, focal: 4000},
    {f: S.s30.start + 34, x: 1.4, y: 1.3, z: m(S.s30.start) - 1.9, yaw: -20, pitch: -1, focal: 1500},
    {f: S.s31.end - 10, x: 1.35, y: 1.3, z: m(S.s31.end) - 1.6, yaw: -18, pitch: -1, focal: 1500},
    {f: S.s32.start + 30, x: 0.5, y: 1.45, z: STOP_Z - 3.0, yaw: -1.5, pitch: 1, focal: 2300},
    {f: S.s32.end - 6, x: 0.45, y: 1.45, z: STOP_Z - 2.7, yaw: -1.5, pitch: 1, focal: 2300},
    {f: S.s33.start + 12, x: 1.45, y: 1.05, z: STOP_Z - 1.9, yaw: -32, pitch: -9, focal: 1150},
    {f: S.s33.end - 4, x: 1.4, y: 1.0, z: STOP_Z - 1.8, yaw: -30, pitch: -10, focal: 1150},
    {f: S.s34.start + 40, x: 1.5, y: 1.3, z: STOP_Z + 1.9, yaw: -142, pitch: -6, focal: 1500},
    {f: S.s34.end - 6, x: 1.45, y: 1.25, z: STOP_Z + 1.8, yaw: -140, pitch: -10, focal: 1500},
    {f: S.s35.start + 50, x: 0.3, y: 6.8, z: STOP_Z - 5.2, yaw: 0, pitch: -38, focal: 1500},
    {f: S.s35.end - 46, x: 0.3, y: 7.0, z: STOP_Z - 4.6, yaw: 0, pitch: -34, focal: 1500},
    {f: S.s35.end + 14, x: 0.15, y: 3.4, z: STOP_Z + 9, yaw: 0, pitch: -4, focal: 2000},
  ]);
};

/** 拱门：两根墩柱 + 半圆拱（正面一圈） */
const archFace = (z: number, cam: Cam, t = 0.45) => {
  const pts: V3[] = [];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push({x: Math.cos(a) * (R + t), y: SPRING + Math.sin(a) * (R + t), z});
  }
  for (let i = n; i >= 0; i--) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push({x: Math.cos(a) * R, y: SPRING + Math.sin(a) * R, z});
  }
  return projectPoly(pts, cam);
};
const openingPath = (z: number, cam: Cam) => {
  const pts: V3[] = [{x: -R, y: 0, z}];
  for (let i = 0; i <= 24; i++) {
    const a = Math.PI - (i / 24) * Math.PI;
    pts.push({x: Math.cos(a) * R, y: SPRING + Math.sin(a) * R, z});
  }
  pts.push({x: R, y: 0, z});
  return projectPoly(pts, cam);
};

/** 绳：从手到远处，松紧可调；slack = 1 时整根落在地上 */
const ropePoints = (hand: V3, end: V3, slack: number, f: number): V3[] => {
  const pts: V3[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sag = 0.25 * Math.sin(Math.PI * t) * (1 - slack);
    const taut: V3 = {x: hand.x + (end.x - hand.x) * t, y: hand.y + (end.y - hand.y) * t - sag + Math.sin(f / 8 + t * 9) * 0.01 * (1 - slack), z: hand.z + (end.z - hand.z) * t};
    // 落地：越靠近手的那段越晚落，近手处盘成几圈
    const fall = Math.min(1, slack * (1.4 - t * 0.4));
    const floor: V3 = {x: hand.x + Math.sin(t * 22) * 0.18 * (1 - t), y: 0.015, z: taut.z};
    pts.push({x: taut.x + (floor.x - taut.x) * fall, y: taut.y + (floor.y - taut.y) * fall, z: taut.z});
  }
  return pts;
};

export const S4Arches: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const frame = useCurrentFrame();
  const cam = cameraS4(frame);
  const hit = impactAt(frame);
  const items: Item[] = [];
  const fogD = 0.045;
  const lit = 1 - smooth((frame - darkAt) / 40);
  const slack = smooth((frame - (dropAt - 4)) / 14);
  const depthOf = (p: V3) => toCam(p, cam).z;
  // 结尾：尽头拱门亮成窗洞（米白），接 §5
  const windowGlow = smooth((frame - (S.s35.end - 40)) / 50);

  // —— 地面石板
  for (let z = -6; z < FAR_Z + 8; z += 1.3) {
    const dep = Math.max(0.1, z - cam.z);
    const fog = fogAt(Math.abs(dep), fogD, 1);
    const pp = projectPoly([{x: -6, y: 0, z}, {x: 6, y: 0, z}, {x: 6, y: 0, z: z + 1.3}, {x: -6, y: 0, z: z + 1.3}], cam);
    if (pp) items.push({key: `fl${z}`, z: 500 + Math.abs(dep), node: <path d={pathOf(pp)} fill={mix(z % 2.6 < 1.3 ? '#141414' : '#171717', FOG, fog)} stroke={mix('#0C0C0C', FOG, fog)} strokeWidth={1} />});
  }
  // —— 拱门
  for (let k = 0; k < N_ARCH; k++) {
    const z = ARCH_Z0 + k * SPACING;
    const dep = depthOf({x: 0, y: 2, z});
    if (dep < 0.3) continue;
    const fog = fogAt(dep, fogD, 1);
    const isFar = k === N_ARCH - 1;
    const stone = mix('#1E1E1E', FOG, fog);
    const nodes: React.ReactNode[] = [];
    if (isFar) {
      const op = openingPath(z + 0.02, cam);
      const glow = Math.max(lit, windowGlow);
      // 门洞以米白为主，只在中心留一小团强调色光
      if (op) nodes.push(<path key="open" d={pathOf(op)} fill={mix(C.light, C.paper, windowGlow)} opacity={0.06 + 0.42 * glow} />);
      const c = project({x: 0, y: 1.1, z: z + 0.3}, cam);
      if (c.z > 0.3 && lit > 0.01) {
        nodes.push(
          <g key="glow">
            <defs>
              <radialGradient id="s4glow">
                <stop offset="0" stopColor={C.accent} stopOpacity={0.55} />
                <stop offset="1" stopColor={C.accent} stopOpacity={0} />
              </radialGradient>
            </defs>
            <circle cx={c.x} cy={c.y} r={c.s * 0.75} fill="url(#s4glow)" opacity={lit * (1 - windowGlow)} />
          </g>,
        );
      }
    }
    for (const sx of [-1, 1]) {
      const {faces} = boxFaces({x: sx * (R + 0.25), y: SPRING / 2, z}, {x: 0.5, y: SPRING, z: 0.5}, cam, stone);
      faces.forEach((f, i) => nodes.push(<path key={`p${sx}${i}`} d={f.d} fill={mix(mix('#0E0E0E', C.mid, f.shade * 0.5), FOG, fog)} />));
    }
    const af = archFace(z - 0.25, cam);
    if (af) nodes.push(<path key="arch" d={pathOf(af)} fill={mix('#1A1A1A', FOG, fog)} stroke={mix(C.mid, FOG, fog)} strokeOpacity={0.25} strokeWidth={1} />);
    items.push({key: `arch${k}`, z: dep, node: <g>{nodes}</g>});
  }
  // 亮门的光洒在地上（强调色，面积小）
  {
    const pp = projectPoly([{x: -R, y: 0.002, z: FAR_Z}, {x: R, y: 0.002, z: FAR_Z}, {x: R * 1.4, y: 0.002, z: FAR_Z - 5}, {x: -R * 1.4, y: 0.002, z: FAR_Z - 5}], cam);
    if (pp) items.push({key: 'spill', z: depthOf({x: 0, y: 0, z: FAR_Z - 2}), node: <path d={pathOf(pp)} fill={C.accent} opacity={0.07 * lit} style={{mixBlendMode: 'screen'}} />});
  }
  // —— 断掉的旧绳（朋友）：散在暗拱门下
  for (let k = 0; k < 4; k++) {
    const z = ARCH_Z0 + SPACING * (k + 0.3) - 0.4;
    const x0 = (k % 2 ? 1 : -1) * (0.6 + random(`or${k}`) * 0.5);
    const pts: V3[] = Array.from({length: 12}, (_, i) => ({x: x0 + Math.sin(i * 0.9 + k) * 0.2, y: 0.012, z: z + i * 0.09}));
    const pp = pts.map((p) => project(p, cam));
    if (pp.some((p) => p.z < 0.3)) continue;
    items.push({key: `old${k}`, z: depthOf({x: x0, y: 0, z}), node: <polyline points={pp.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={mix(C.mid, FOG, 0.4)} strokeWidth={Math.max(1, pp[0].s * 0.02)} opacity={0.7} />});
  }

  // —— 伴侣和她的椅子（贯穿物件：伴侣的那把椅子，最后隐进黑暗）
  const leaveP = Math.max(0, frame - (darkAt + 6));
  {
    const chairFade = 1 - smooth((frame - (darkAt + 20)) / 40);
    const p = PARTNER;
    const q = project(p, cam);
    if (q.z > 0.5 && chairFade > 0.01) {
      const dx = p.x - cam.x;
      const dz = p.z - cam.z;
      const view = (Math.atan2(dx, dz) * 180) / Math.PI;
      items.push({key: 'pchair', z: q.z + 0.05, node: <Chair x={q.x} y={q.y} scale={q.s} yaw={0 - cam.yaw - view} tilt={4} lit={0.3 + 0.6 * lit} light={1} fog={fogAt(q.z, fogD, 1) * 0.6} fogColor={FOG} opacity={chairFade} />});
    }
    const standing = leaveP > 0;
    const pp: V3 = {x: 0, y: 0, z: PARTNER.z + 0.1 + leaveP * 0.03};
    const pq = project(pp, cam);
    const op = 1 - smooth((leaveP - 20) / 40);
    if (pq.z > 0.5 && op > 0.01) {
      const pz = standing ? (leaveP < 14 ? STAND : walk((leaveP / 32) % 1, 1)) : addPose(SIT_UP, {neck: 8});
      items.push({key: 'partner', z: pq.z, node: <Figure pose={pz} view={standing && leaveP > 12 ? 'back' : 'front'} x={pq.x} y={pq.y} scale={pq.s} rim={0.9} light={0} fog={fogAt(pq.z, fogD, 1) * 0.5} fogColor={FOG} opacity={op} variant="woman" />});
    }
  }

  // —— 他 + 绳
  const z = manZ(frame);
  const p: V3 = {x: 0, y: 0, z};
  const q = project(p, cam);
  const toCamA = (Math.atan2(cam.x - p.x, cam.z - p.z) * 180) / Math.PI;
  const rel = Math.abs(((toCamA + 540) % 360) - 180);
  const view: View = rel > 150 ? 'back' : rel < 30 ? 'front' : 'side';
  const ahead = project({x: 0, y: 0, z: z + 0.5}, cam);
  const facing: 1 | -1 = ahead.x >= q.x ? 1 : -1;
  const mp = manPose(frame);
  const hj = solve(mp, 'side', 1).hand[1];
  const hand: V3 = {x: 0.12, y: hj.y, z: z + hj.x};
  if (q.z > 0.3) {
    items.push({key: 'man', z: q.z, node: <Figure pose={mp} view={view} facing={facing} x={q.x} y={q.y} scale={q.s} rim={1} light={view === 'side' ? facing : 0} fog={fogAt(q.z, fogD, 2) * 0.15} fogColor={FOG} />});
  }
  {
    const end: V3 = {x: 0, y: 0.95, z: PARTNER.z};
    const pts = ropePoints(hand, end, slack, frame);
    // 按深度分两段画，近段与他同层
    // 人物是朝向镜头的平面剪影：把绳头接到剪影的手上（屏幕空间），往后逐渐过渡回 3D 位置
    const jh = solve(mp, view, facing).hand[1];
    const H = {x: q.x + jh.x * q.s, y: q.y - jh.y * q.s};
    const raw = pts.map((pt) => project(pt, cam));
    const p0 = raw[0];
    const pp = raw
      .map((x, i) => {
        const k = Math.pow(1 - i / raw.length, 3) * (1 - slack * 0.7);
        return q.z > 0.3 && p0.z > 0.3 ? {...x, x: x.x + (H.x - p0.x) * k, y: x.y + (H.y - p0.y) * k} : x;
      })
      .filter((x) => x.z > 0.3);
    if (pp.length > 2) {
      const w = (s: number) => Math.max(1, Math.min(6, s * 0.018));
      const segs: React.ReactNode[] = [];
      for (let i = 0; i < pp.length - 1; i++) {
        const a = pp[i];
        const b = pp[i + 1];
        segs.push(<line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={mix(C.paper, FOG, fogAt(a.z, fogD, 2) * 0.7)} strokeWidth={w(a.s)} strokeLinecap="round" opacity={0.85} />);
      }
      items.push({key: 'rope', z: q.z - 0.02, node: <g>{segs}</g>});
    }
  }
  // —— 俯拍：前方四扇拱门下各站一个人，手里的细线通向画外
  const others = interpolate(frame, [S.s34.end - 20, S.s35.start + 20], [0, 1], clamp);
  if (others > 0.01) {
    for (let k = 1; k <= 4; k++) {
      // 站在两扇拱门之间，俯拍时不被拱挡住
      const oz = STOP_Z + k * SPACING;
      const op: V3 = {x: (random(`ox${k}`) - 0.5) * 0.4, y: 0, z: oz};
      const oq = project(op, cam);
      if (oq.z < 0.5) continue;
      const opose = pose({...STAND, rSh: 40 + k * 6, rEl: 14, neck: 6});
      const lines: React.ReactNode[] = [];
      for (let j = 0; j < 2 + (k % 2); j++) {
        const side = (k + j) % 2 ? 1 : -1;
        const a = project({x: op.x + 0.15 * side, y: 1.0, z: oz + 0.2}, cam);
        const b = project({x: side * (14 + j * 4), y: 1.0 + j * 0.4, z: oz + (random(`lz${k}${j}`) - 0.5) * 18}, cam);
        if (b.z < 0.3) continue;
        lines.push(<line key={j} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.paper} strokeWidth={1.2} opacity={0.45 * others} />);
      }
      items.push({
        key: `oth${k}`,
        z: oq.z,
        node: (
          <g opacity={others}>
            {lines}
            <Figure pose={opose} view="back" x={oq.x} y={oq.y} scale={oq.s} rim={0.9} light={0} fog={fogAt(oq.z, fogD, 2) * 0.6} fogColor={FOG} />
          </g>
        ),
      });
    }
  }

  const horizon = project({x: cam.x, y: cam.y, z: cam.z + 300}, cam).y;
  return (
    <AbsoluteFill style={{opacity, transform: `translate(${hit.x}px, ${hit.y}px) scale(1.02)`, background: C.black}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 50% 40% at 50% ${(horizon / 1080) * 100}%, #262626, ${C.black} 80%)`}} />
      <DepthLayers items={items} far={20} near={0.8} farBlur={2.4} nearBlur={12}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Dust seed="s4dust" n={80} box={{x0: -1.6, x1: 1.6, y0: 0.2, y1: 3.8, z0: FAR_Z - 8, z1: FAR_Z}} cam={cam} frame={frame} bright={() => 0.25 * lit + 0.04} />
        </svg>
      </DepthLayers>
      {/* 进场：海雾还没散 */}
      <AbsoluteFill style={{background: FOG, opacity: interpolate(frame, [S.s28.start - 14, S.s28.start + 40], [0.85, 0], clamp)}} />
    </AbsoluteFill>
  );
};
