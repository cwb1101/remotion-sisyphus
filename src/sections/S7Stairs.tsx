/**
 * §7 回答 · 旋转楼梯 → 回到开场的石柱大厅
 * 雾旋成螺旋：从楼梯井顶上往下俯拍，台阶一圈圈旋下去像一只眼，最底下是他和一把空椅子 →
 * 镜头沿着楼梯井降到平台：他坐着，身边那把椅子空着；他伸手想扶空椅背，停住，放下 →
 * 仰拍：有人从楼上一级级走下来，光从井口洒下 → 那人走到平台，坐进空椅子 →
 * 两人并肩，这一次有人转过头看他，他慢慢抬头 → 一只手搭到他肩上 →
 * 镜头升回井口俯拍：底下两个人挨着坐，两把椅子都有人 →
 * 叠化回开场的石柱大厅：同一盏灯、同一个人、相近的构图——这次两把椅子都坐着人，他抬着头。
 */
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Chair} from '../components/Chair';
import {Figure, View} from '../components/Figure';
import {CURL, Pose, SIT_DOWN, SIT_REACH, SIT_UP, STAND, addPose, pose, poseAt, walk} from '../components/poses';
import {cueTimes, screen} from '../data/timeline';
import {impactAt} from '../engine/impact';
import {Cam, V3, fogAt, pathOf, project, projectPoly, toCam} from '../engine/projection';
import {DepthLayers, Dust, Item, LightCone, camPath} from '../engine/world';
import {C, mix} from '../theme';

const ids = ['s47', 's48', 's49', 's50', 's51', 's52', 's53', 's54', 's55'] as const;
const S = Object.fromEntries(ids.map((i) => [i, screen(i)])) as Record<(typeof ids)[number], ReturnType<typeof screen>>;
const FOG = '#262626';
const R0 = 1.45; // 楼梯井半径
const R1 = 3.1;
const STEP_A = 14; // 每级转过的角度
const RISE = 0.18;
const N_STEPS = 64;
const HIM: V3 = {x: 0.34, y: 0, z: 0};
const EMPTY: V3 = {x: -0.34, y: 0, z: 0};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
const rad = (d: number) => (d * Math.PI) / 180;
/** 第 i 级台阶中线上的点 */
const stepPoint = (i: number, r = (R0 + R1) / 2): V3 => ({x: Math.cos(rad(i * STEP_A - 90)) * r, y: i * RISE, z: Math.sin(rad(i * STEP_A - 90)) * r});

const aim = (from: V3, to: V3, focal = 1500) => ({
  ...from,
  yaw: (Math.atan2(to.x - from.x, to.z - from.z) * 180) / Math.PI,
  pitch: (Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z)) * 180) / Math.PI,
  focal,
});

// —— 下楼的人：s50 从第 16 级一级级走下来，s51 走到空椅子前坐下
const DESC_A = S.s50.start + 18;
const DESC_B = S.s51.start + 2;
const START_STEP = 16;
const SIT_AT = cueTimes('s51', 'chair-creak')[0] - 6;
const friendPos = (f: number): V3 => {
  if (f <= DESC_B) {
    const t = smooth((f - DESC_A) / (DESC_B - DESC_A));
    const i = START_STEP * (1 - t);
    return stepPoint(i);
  }
  const base = stepPoint(0);
  const t = smooth((f - DESC_B) / (SIT_AT - DESC_B));
  return {x: base.x + (EMPTY.x - base.x) * t, y: 0, z: base.z + (EMPTY.z + 0.02 - base.z) * t};
};
const friendPose = (f: number): Pose =>
  poseAt(f, [
    {from: 0, pose: (ff) => walk(((ff - DESC_A) / 30) % 1 + 1, interpolate(ff, [DESC_A - 6, DESC_A + 4, SIT_AT - 8, SIT_AT], [0, 1, 1, 0], clamp))},
    {from: SIT_AT - 4, pose: SIT_UP, blend: 16},
    {from: S.s52.start + 6, pose: pose({...SIT_UP, turn: 1, neck: 6, lean: 2}), blend: 20},
    {from: S.s53.start + 6, pose: pose({...SIT_UP, turn: 1, rSh: -62, rEl: 24, lean: 4, neck: 8}), blend: 24},
  ]);
const himPose = (f: number): Pose =>
  poseAt(f, [
    {from: 0, pose: (ff) => addPose(CURL, {lean: Math.sin(ff / 36) * 1.5})},
    {from: S.s49.start + 6, pose: SIT_REACH, blend: 22},
    {from: S.s49.start + 40, pose: SIT_DOWN, blend: 18},
    {from: S.s50.start + 40, pose: addPose(SIT_DOWN, {neck: -10}), blend: 30},
    {from: S.s52.start + 20, pose: SIT_UP, blend: 34},
    {from: S.s54.start, pose: addPose(SIT_UP, {lean: -2, neck: -4}), blend: 30},
  ]);

export const cameraS7 = (frame: number): Cam =>
  camPath(frame, [
    {f: S.s47.start - 14, x: 0.01, y: 17, z: 0, yaw: 0, pitch: -89, focal: 1500},
    {f: S.s47.end - 22, x: 0.01, y: 10.5, z: 0, yaw: 70, pitch: -89, focal: 1500},
    {f: S.s48.start + 18, ...aim({x: 0.25, y: 2.8, z: -0.7}, {x: 0, y: 0.5, z: 0}, 1500)},
    {f: S.s48.start + 56, ...aim({x: 1.95, y: 1.2, z: -1.7}, {x: 0, y: 0.7, z: 0}, 1500)},
    {f: S.s49.end - 6, ...aim({x: 1.75, y: 1.15, z: -1.55}, {x: -0.05, y: 0.75, z: 0}, 1550)},
    {f: S.s50.start + 30, ...aim({x: -0.55, y: 0.75, z: -0.85}, {...friendPos(S.s50.start + 30), y: friendPos(S.s50.start + 30).y + 1.0}, 1300)},
    {f: S.s50.end - 6, ...aim({x: -0.4, y: 0.8, z: -0.95}, {...friendPos(S.s50.end - 6), y: friendPos(S.s50.end - 6).y + 0.9}, 1300)},
    {f: S.s51.start + 30, ...aim({x: 1.95, y: 1.2, z: -1.75}, {x: -0.1, y: 0.7, z: 0}, 1500)},
    {f: S.s51.end - 6, ...aim({x: 1.85, y: 1.15, z: -1.65}, {x: -0.05, y: 0.75, z: 0}, 1500)},
    {f: S.s52.start + 40, ...aim({x: 1.2, y: 1.05, z: -1.15}, {x: 0, y: 0.95, z: 0}, 1600)},
    {f: S.s52.end - 6, ...aim({x: 1.1, y: 1.05, z: -1.1}, {x: 0.02, y: 1.0, z: 0}, 1650)},
    {f: S.s53.start + 36, ...aim({x: 1.35, y: 1.25, z: -1.35}, {x: 0.08, y: 1.05, z: 0}, 2900)},
    {f: S.s53.end - 6, ...aim({x: 1.3, y: 1.25, z: -1.3}, {x: 0.1, y: 1.08, z: 0}, 3100)},
    {f: S.s54.start + 50, x: 0.02, y: 5.5, z: -0.01, yaw: 90, pitch: -89, focal: 1500},
    {f: S.s55.start + 20, x: 0.02, y: 11, z: -0.01, yaw: 130, pitch: -89, focal: 1500},
  ]);

export const friendScreenX = (f: number) => project(friendPos(f), cameraS7(f)).x;

/** 坐在椅子上的人：视角由镜头方位决定 */
const seated = (p: V3, faceYaw: number, cam: Cam) => {
  const toCamA = (Math.atan2(cam.x - p.x, cam.z - p.z) * 180) / Math.PI;
  const rel = Math.abs((((toCamA - faceYaw) % 360) + 540) % 360 - 180);
  const view: View = rel > 150 ? 'back' : rel < 32 ? 'front' : 'side';
  const a = project(p, cam);
  const b = project({x: p.x + Math.sin(rad(faceYaw)) * 0.5, y: p.y, z: p.z + Math.cos(rad(faceYaw)) * 0.5}, cam);
  return {view, facing: (b.x >= a.x ? 1 : -1) as 1 | -1};
};

const StairWorld: React.FC<{frame: number}> = ({frame}) => {
  const cam = cameraS7(frame);
  const items: Item[] = [];
  const fogD = 0.05;
  const depthOf = (p: V3) => toCam(p, cam).z;
  const top = cam.pitch < -70;

  // —— 平台
  {
    const pts: V3[] = Array.from({length: 36}, (_, i) => ({x: Math.cos((i / 36) * Math.PI * 2) * R1, y: 0, z: Math.sin((i / 36) * Math.PI * 2) * R1}));
    const pp = projectPoly(pts, cam);
    if (pp) items.push({key: 'landing', z: 2000, node: <path d={pathOf(pp)} fill="#1C1C1C" />});
  }
  // —— 台阶：顶面 + 踢面 + 外墙
  for (let i = 0; i < N_STEPS; i++) {
    const a0 = rad(i * STEP_A - 90);
    const a1 = rad((i + 1) * STEP_A - 90);
    const y = (i + 1) * RISE;
    const P = (r: number, a: number, yy: number): V3 => ({x: Math.cos(a) * r, y: yy, z: Math.sin(a) * r});
    const c = P((R0 + R1) / 2, (a0 + a1) / 2, y);
    const dep = depthOf(c);
    if (dep < 0.25) continue;
    const fog = fogAt(dep, fogD, 2);
    // 越高越亮（光从井口照下来）
    const lightK = 0.35 + 0.65 * (i / N_STEPS);
    const topC = mix(mix('#101010', '#5A5955', lightK * 0.6), FOG, fog);
    const nodes: React.ReactNode[] = [];
    const tp = projectPoly([P(R0, a0, y), P(R1, a0, y), P(R1, a1, y), P(R0, a1, y)], cam);
    const rp = projectPoly([P(R0, a0, y - RISE), P(R1, a0, y - RISE), P(R1, a0, y), P(R0, a0, y)], cam);
    const under = projectPoly([P(R0, a0, y - 0.12), P(R0, a1, y - 0.12), P(R0, a1, y), P(R0, a0, y)], cam);
    // 台阶底面（从下往上看时可见）
    const bottom = cam.y < y - 0.12 ? projectPoly([P(R0, a0, y - 0.12), P(R1, a0, y - 0.12), P(R1, a1, y - 0.12), P(R0, a1, y - 0.12)], cam) : null;
    if (bottom) nodes.push(<path key="b" d={pathOf(bottom)} fill={mix('#141414', FOG, fog)} stroke={mix('#0A0A0A', FOG, fog)} strokeWidth={0.8} />);
    const wall = projectPoly([P(R1, a0, y - 2.2), P(R1, a1, y - 2.2), P(R1, a1, y + 2.4), P(R1, a0, y + 2.4)], cam);
    if (wall) nodes.push(<path key="w" d={pathOf(wall)} fill={mix('#0E0E0E', FOG, fog * 0.9)} />);
    if (rp) nodes.push(<path key="r" d={pathOf(rp)} fill={mix('#0B0B0B', FOG, fog)} />);
    if (under) nodes.push(<path key="u" d={pathOf(under)} fill={mix('#151515', FOG, fog)} />);
    if (tp) nodes.push(<path key="t" d={pathOf(tp)} fill={topC} stroke={mix('#0A0A0A', FOG, fog)} strokeWidth={0.8} />);
    items.push({key: `st${i}`, z: dep + (top ? 0 : 0.0), node: <g>{nodes}</g>});
  }
  // —— 扶手：沿井口内沿的一条细线（陪衬）
  {
    const pts: React.ReactNode[] = [];
    for (let i = 0; i < N_STEPS * 2; i++) {
      const a = stepPoint(i / 2, R0 + 0.05);
      const b = stepPoint((i + 1) / 2, R0 + 0.05);
      const qa = project({...a, y: a.y + 0.95}, cam);
      const qb = project({...b, y: b.y + 0.95}, cam);
      if (qa.z < 0.3 || qb.z < 0.3) continue;
      pts.push(<line key={i} x1={qa.x} y1={qa.y} x2={qb.x} y2={qb.y} stroke={C.mid} strokeWidth={Math.max(0.8, qa.s * 0.012)} opacity={0.5} />);
    }
    items.push({key: 'rail', z: 1, node: <g>{pts}</g>});
  }
  // —— 两把椅子 + 他 + 下楼的人
  const chairAt = (p: V3, k: string) => {
    const q = project(p, cam);
    if (q.z < 0.3) return null;
    const dx = p.x - cam.x;
    const dz = p.z - cam.z;
    const view = top ? 0 : (Math.atan2(dx, dz) * 180) / Math.PI;
    const tilt = top ? 70 : (Math.atan2(cam.y - 0.5, Math.hypot(dx, dz)) * 180) / Math.PI;
    return {q, node: <Chair key={k} x={q.x} y={q.y} scale={q.s} yaw={180 - (top ? 0 : cam.yaw) - view} tilt={tilt} lit={0.75} light={1} fog={fogAt(q.z, fogD, 2) * 0.5} fogColor={FOG} />};
  };
  for (const [p, k] of [
    [HIM, 'cH'],
    [EMPTY, 'cE'],
  ] as const) {
    const c = chairAt(p, k);
    const isHim = k === 'cH';
    const nodes: React.ReactNode[] = [];
    let figNode: React.ReactNode = null;
    let view: View = 'front';
    if (isHim) {
      const v = seated(p, 180, cam);
      view = v.view;
      const q = project(p, cam);
      if (q.z > 0.3) figNode = <Figure key="him" pose={himPose(frame)} view={top ? 'front' : v.view} facing={v.facing} x={q.x} y={q.y} scale={q.s} rim={1} light={top ? 0 : 1} fog={fogAt(q.z, fogD, 2) * 0.3} fogColor={FOG} />;
    } else if (frame >= SIT_AT - 4) {
      const v = seated(EMPTY, 180, cam);
      view = v.view;
      const q = project(EMPTY, cam);
      if (q.z > 0.3) figNode = <Figure key="fr" pose={friendPose(frame)} view={top ? 'front' : v.view} facing={v.facing} x={q.x} y={q.y} scale={q.s} rim={1} light={top ? 0 : -1} fog={fogAt(q.z, fogD, 2) * 0.3} fogColor={FOG} />;
    }
    const order = view === 'back' ? [figNode, c?.node] : [c?.node, figNode];
    nodes.push(...order);
    items.push({key: `seat${k}`, z: c ? c.q.z : depthOf(p), node: <g>{nodes}</g>});
  }
  if (frame < SIT_AT - 4 && frame >= DESC_A - 30) {
    const p = friendPos(frame);
    const q = project(p, cam);
    if (q.z > 0.3) {
      // 走的方向：下楼时沿螺旋往回，到平台后朝椅子
      const p2 = friendPos(frame + 2);
      const fy = (Math.atan2(p2.x - p.x, p2.z - p.z) * 180) / Math.PI || 180;
      const {view, facing} = seated(p, fy, cam);
      items.push({key: 'friend', z: q.z, node: <Figure pose={friendPose(frame)} view={view} facing={facing} x={q.x} y={q.y} scale={q.s} rim={1} light={-1} fog={fogAt(q.z, fogD, 2) * 0.4} fogColor={FOG} opacity={interpolate(frame, [DESC_A - 30, DESC_A - 10], [0, 1], clamp)} />});
    }
  }
  // 轮廓光在两人接触处连成一线（s53）
  const lightBeam = 0.55 + 0.35 * interpolate(frame, [S.s50.start, S.s50.start + 30], [0, 1], clamp);
  return (
    <>
      <DepthLayers items={items} far={30} near={0.5} farBlur={1.5} nearBlur={12}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: 'blur(12px)'}}>
          <LightCone id="s7cone" src={{x: 0, y: N_STEPS * RISE + 1, z: 0}} floor={{x: 0, y: 0, z: 0}} radius={1.3} cam={cam} intensity={lightBeam} />
        </svg>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Dust seed="s7dust" n={70} box={{x0: -1.3, x1: 1.3, y0: 0.2, y1: 6, z0: -1.3, z1: 1.3}} cam={cam} frame={frame} bright={(p) => Math.max(0, 1 - Math.hypot(p.x, p.z) / 1.3) * 0.6} />
        </svg>
      </DepthLayers>
    </>
  );
};

// —— 片尾：回到开场的石柱大厅
const LAMP: V3 = {x: -0.35, y: 4.3, z: 9.05};
const F_HERO: V3 = {x: -0.5, y: 0, z: 9}; // 他在开场站的位置
const F_FRIEND: V3 = {x: 0.32, y: 0, z: 9.2}; // 开场那把空椅子的位置
const finaleCam = (frame: number): Cam =>
  camPath(frame, [
    {f: S.s55.start - 20, x: -0.35, y: 1.8, z: 6.1, yaw: 2.5, pitch: 0.5, focal: 1500},
    {f: S.s55.start + 70, x: -0.1, y: 1.74, z: 6.45, yaw: 0, pitch: 0, focal: 1500},
    {f: S.s55.end + 40, x: 0.25, y: 1.7, z: 6.9, yaw: -2, pitch: 0, focal: 1500},
  ]);

const Finale: React.FC<{frame: number}> = ({frame}) => {
  const cam = finaleCam(frame);
  const items: Item[] = [];
  const FOGH = '#2A2A2C';
  const clear = interpolate(frame, [S.s55.start, S.s55.end], [0, 1], clamp);
  const fogD = 0.09 - clear * 0.04;
  for (let z = 3; z <= 44; z += 4.2) {
    for (const x of [-6.2, 6.2]) {
      const b = project({x, y: 0, z}, cam);
      const t = project({x, y: 40, z}, cam);
      if (b.z < 0.4) continue;
      const fog = fogAt(b.z, fogD, 2);
      const wb = 0.5 * b.s;
      const wt = 0.5 * t.s;
      items.push({key: `p${x}${z}`, z: b.z, node: <path d={`M${b.x - wb},${b.y}L${b.x + wb},${b.y}L${t.x + wt},${t.y}L${t.x - wt},${t.y}Z`} fill={mix(C.dark, FOGH, fog)} />});
    }
  }
  for (let x = -9; x <= 9; x += 3) {
    const b = project({x, y: 0, z: 27}, cam);
    const t = project({x, y: 40, z: 27}, cam);
    if (b.z < 0.4) continue;
    items.push({key: `pb${x}`, z: b.z, node: <path d={`M${b.x - 0.55 * b.s},${b.y}L${b.x + 0.55 * b.s},${b.y}L${t.x + 0.55 * t.s},${t.y}L${t.x - 0.55 * t.s},${t.y}Z`} fill={mix(C.dark, FOGH, fogAt(b.z, fogD, 2))} />});
  }
  // 远处雾里，零零星星又站回来几个人
  for (let k = 0; k < 14; k++) {
    const p: V3 = {x: (random(`fx${k}`) - 0.5) * 9, y: 0, z: 13 + random(`fz${k}`) * 9};
    const q = project(p, cam);
    if (q.z < 1) continue;
    const op = interpolate(frame, [S.s55.start + 20 + k * 5, S.s55.start + 60 + k * 5], [0, 0.85], clamp);
    items.push({key: `cr${k}`, z: q.z, node: <Figure pose={addPose(STAND, {neck: 6, lean: Math.sin(frame / 40 + k)})} view="front" x={q.x} y={q.y} scale={q.s} height={0.95 + random(`fh${k}`) * 0.1} rim={0.8} light={0} fog={fogAt(q.z, fogD, 3)} fogColor={FOGH} opacity={op} />});
  }
  // 两把椅子，两个人侧身相对；他抬着头
  // 他先抬头看灯，再转向身边的人；对面的人在说话（身体和手有起伏）
  const heroPose = poseAt(frame, [
    {from: 0, pose: pose({...SIT_UP, neck: -18, lean: -2})},
    {from: S.s55.start + 60, pose: (ff) => pose({...SIT_UP, neck: -2 + Math.sin(ff / 17) * 3, lean: 5 + Math.sin(ff / 23) * 2}), blend: 40},
  ]);
  const talk = Math.sin(frame / 7) * Math.max(0, Math.sin(frame / 31));
  const friendP = pose({...SIT_UP, lean: 9 + talk * 4, neck: 8 + talk * 5, rSh: 34 + talk * 18, rEl: 52 + talk * 20});
  for (const [p, pz, face, k, chairYaw] of [
    [F_HERO, heroPose, 1, 'h', 90],
    [F_FRIEND, friendP, -1, 'f', -90],
  ] as const) {
    const q = project(p, cam);
    const dx = p.x - cam.x;
    const dz = p.z - cam.z;
    const view = (Math.atan2(dx, dz) * 180) / Math.PI;
    items.push({
      key: k,
      z: q.z,
      node: (
        <g>
          <Chair x={q.x} y={q.y} scale={q.s} yaw={chairYaw - cam.yaw - view} tilt={3} lit={0.85} light={-1} fog={fogAt(q.z, fogD, 3) * 0.4} fogColor={FOGH} />
          <Figure pose={pz} view="side" facing={face} x={q.x} y={q.y} scale={q.s} rim={1} light={face} fog={fogAt(q.z, fogD, 3) * 0.3} fogColor={FOGH} />
        </g>
      ),
    });
  }
  const lampP = project(LAMP, cam);
  const floor = projectPoly([{x: -40, y: 0, z: 0.5}, {x: 40, y: 0, z: 0.5}, {x: 40, y: 0, z: 60}, {x: -40, y: 0, z: 60}], cam);
  const horizon = project({x: cam.x, y: cam.y, z: cam.z + 200}, cam).y;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.black} 0%, ${C.deep} 30%, ${FOGH} ${(horizon / 1080) * 100}%, ${C.deep} 80%, ${C.black} 100%)`}} />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <path d={pathOf(floor)} fill={C.deep} />
      </svg>
      <DepthLayers items={items} far={17} near={1.5} farBlur={2.6} nearBlur={12}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: 'blur(10px)'}}>
          <LightCone id="s7fin" src={LAMP} floor={{x: -0.1, y: 0, z: 9.1}} radius={1.9} cam={cam} intensity={0.9 + 0.08 * Math.sin(frame / 9)} />
        </svg>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id="s7bulb">
              <stop offset="0" stopColor={C.accent} stopOpacity={0.95} />
              <stop offset="0.3" stopColor={C.accent} stopOpacity={0.3} />
              <stop offset="1" stopColor={C.accent} stopOpacity={0} />
            </radialGradient>
          </defs>
          {lampP.z > 0.3 ? <circle cx={lampP.x} cy={lampP.y} r={lampP.s * (0.15 + 0.012 * Math.sin(frame / 5))} fill="url(#s7bulb)" /> : null}
          <Dust seed="s7fdust" n={70} box={{x0: LAMP.x - 2, x1: LAMP.x + 2, y0: 0.2, y1: 4, z0: LAMP.z - 2.5, z1: LAMP.z + 2}} cam={cam} frame={frame} bright={(p) => Math.max(0, 1 - Math.hypot(p.x - LAMP.x, p.z - LAMP.z) / (0.5 + (LAMP.y - p.y) * 0.32)) * 0.8} />
        </svg>
      </DepthLayers>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 70% 20% at 50% ${(horizon / 1080) * 100 + 4}%, rgba(58,57,55,${0.5 - clear * 0.3}), rgba(58,57,55,0) 70%)`}} />
    </AbsoluteFill>
  );
};

export const S7Stairs: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const frame = useCurrentFrame();
  const hit = impactAt(frame);
  // s55：井口的光叠化成开场那盏灯
  const fin = interpolate(frame, [S.s55.start - 10, S.s55.start + 30], [0, 1], clamp);
  return (
    <AbsoluteFill style={{opacity, transform: `translate(${hit.x}px, ${hit.y}px) scale(1.02)`, background: C.black}}>
      {fin < 1 ? (
        <AbsoluteFill style={{opacity: 1 - fin}}>
          <StairWorld frame={frame} />
          {/* 进场：雾还在旋 */}
          <AbsoluteFill style={{background: '#4A4946', opacity: interpolate(frame, [S.s47.start - 14, S.s47.start + 40], [0.6, 0], clamp)}} />
        </AbsoluteFill>
      ) : null}
      {fin > 0 ? (
        <AbsoluteFill style={{opacity: fin}}>
          <Finale frame={frame} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

