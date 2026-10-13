/**
 * §3 肩并肩的友谊 · 海平线
 * 镜面上的反光压平成海平线 → 大远景：堤岸上两把椅子并排对着海，两个男人背对镜头坐着 →
 * 镜头绕到侧后方：一人把酒瓶递过去，谁都没转头 → 焦点拉到远处栈桥尽头：两个女人面对面说话 →
 * 低机位近景：两把椅子之间一只篮球 → 朋友起身，拍拍他的肩走出画面，前景石块横移挡住字幕再露出 →
 * 只剩他一个人，空出来的椅子，篮球滚落（关键句）→ 镜头升高后拉，空椅子上落着一小块光，海雾漫上来，接 §4。
 */
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Chair} from '../components/Chair';
import {Figure, View, solve} from '../components/Figure';
import {Pose, REACH_HALF, SIT, SIT_UP, STAND, addPose, lerpPose, pose, poseAt, walk} from '../components/poses';
import {SubtitleTrack} from '../components/Subtitle';
import {cueTimes, screen, screensOf, slamFrame} from '../data/timeline';
import {impactAt} from '../engine/impact';
import {Cam, V3, boxFaces, camToWorld, fogAt, pathOf, project, projectPoly} from '../engine/projection';
import {DepthLayers, Item, camPath} from '../engine/world';
import {C, mix} from '../theme';

const ids = ['s21', 's22', 's23', 's24', 's25', 's26', 's27'] as const;
const S = Object.fromEntries(ids.map((i) => [i, screen(i)])) as Record<(typeof ids)[number], ReturnType<typeof screen>>;
const FOG = '#3A3A39';
const EDGE_Z = 8; // 堤岸边缘
const SEA_Y = -1.1;
const CH_Z = 6.5;
const A: V3 = {x: -0.33, y: 0, z: CH_Z}; // 他
const B: V3 = {x: 0.33, y: 0, z: CH_Z}; // 朋友
const BALL0: V3 = {x: 0, y: 0.12, z: CH_Z - 0.05};
const PIER = {x0: -8.2, x1: -6.4, z0: EDGE_Z, z1: 27};
const WOMEN_Z = 25.2;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

const clink = cueTimes('s22', 'clink')[0];
const standUp = S.s25.start + 4;
const leaveAt = S.s25.start + 30;
const slam26 = slamFrame(S.s26);

export const cameraS3 = (frame: number): Cam =>
  camPath(frame, [
    {f: S.s21.start - 14, x: -0.7, y: 1.6, z: -2.2, yaw: 4, pitch: -3.8},
    {f: S.s21.end - 10, x: 0.7, y: 1.5, z: -1.0, yaw: -3, pitch: -2.5},
    {f: S.s22.start + 50, x: 2.6, y: 0.98, z: 4.55, yaw: -54, pitch: -2},
    {f: S.s22.end - 6, x: 2.4, y: 0.98, z: 4.75, yaw: -49, pitch: -2},
    {f: S.s23.start + 50, x: 2.25, y: 1.02, z: 4.85, yaw: -36, pitch: -1.5},
    {f: S.s23.end, x: 1.9, y: 0.7, z: 5.0, yaw: -34, pitch: 0},
    {f: S.s24.start + 40, x: 0.92, y: 0.36, z: 5.2, yaw: -35, pitch: 0},
    {f: S.s24.end - 8, x: 0.82, y: 0.38, z: 5.3, yaw: -32, pitch: 0},
    {f: S.s25.start + 12, x: 1.25, y: 1.0, z: 3.4, yaw: -20, pitch: -2},
    {f: S.s25.start + 34, x: 2.0, y: 1.01, z: 3.5, yaw: -16.5, pitch: -2},
    {f: S.s25.end - 4, x: 2.3, y: 1.02, z: 3.55, yaw: -15, pitch: -2},
    {f: S.s26.start + 30, x: 1.95, y: 1.05, z: 3.9, yaw: -18, pitch: -3},
    {f: S.s26.end, x: 1.7, y: 1.3, z: 3.5, yaw: -14, pitch: -6},
    {f: S.s27.end - 30, x: 0.6, y: 3.2, z: 1.6, yaw: -2, pitch: -24},
    {f: S.s27.end + 14, x: 0.36, y: 4.2, z: 1.0, yaw: 0, pitch: -30},
  ]);

// 前景石块：钉在 s25 开头镜头前左下方，镜头右移时从字幕上滑开
const OCCL = camToWorld({x: -0.6, y: -0.42, z: 1.05}, cameraS3(S.s25.start + 12));

const aPose = (f: number): Pose =>
  poseAt(f, [
    {from: 0, pose: (ff) => addPose(SIT_UP, {lean: Math.sin(ff / 45) * 1})},
    {from: clink - 18, pose: pose({...SIT_UP, rSh: 40, rEl: 40}), blend: 14},
    {from: clink + 20, pose: SIT_UP, blend: 18},
    {from: S.s26.start + 20, pose: addPose(SIT, {lean: 14, neck: 22}), blend: 30},
  ]);
const bPose = (f: number): Pose =>
  poseAt(f, [
    {from: 0, pose: (ff) => addPose(SIT_UP, {lean: Math.sin(ff / 38 + 1) * 1})},
    {from: clink - 30, pose: lerpPose(SIT_UP, pose({...SIT, rSh: 55, rEl: 20}), 1), blend: 14},
    {from: clink + 10, pose: SIT_UP, blend: 18},
    {from: standUp, pose: STAND, blend: 18},
    {from: standUp + 18, pose: REACH_HALF, blend: 8},
    {from: leaveAt - 4, pose: (ff) => walk(((ff - leaveAt) / 32) % 1 + 1, Math.min(1, (ff - leaveAt + 4) / 8)), blend: 8},
  ]);
const bPos = (f: number): V3 => {
  const t = Math.max(0, f - leaveAt);
  return {x: B.x + t * 0.033, y: 0, z: B.z - t * 0.012};
};

const viewOf = (p: V3, faceYaw: number, cam: Cam): {view: View; facing: 1 | -1} => {
  const toCam = (Math.atan2(cam.x - p.x, cam.z - p.z) * 180) / Math.PI;
  const rel = Math.abs((((toCam - faceYaw) % 360) + 540) % 360 - 180);
  const view: View = rel > 150 ? 'back' : rel < 30 ? 'front' : 'side';
  const fx = Math.sin((faceYaw * Math.PI) / 180);
  const fz = Math.cos((faceYaw * Math.PI) / 180);
  const a = project(p, cam);
  const b = project({x: p.x + fx * 0.5, y: p.y, z: p.z + fz * 0.5}, cam);
  return {view, facing: b.x >= a.x ? 1 : -1};
};

export const S3Seawall: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const frame = useCurrentFrame();
  const cam = cameraS3(frame);
  const hit = impactAt(frame);
  const items: Item[] = [];
  const fogD = 0.018;
  const surge = frame >= slam26 ? Math.exp(-(frame - slam26) / 14) : 0;
  const horizon = project({x: cam.x + Math.sin((cam.yaw * Math.PI) / 180) * 900, y: cam.y, z: cam.z + Math.cos((cam.yaw * Math.PI) / 180) * 900}, cam).y;

  // —— 海面：一层层横向浪线，近处间距大、远处密，缓慢起伏
  const seaQuad = projectPoly([{x: -400, y: SEA_Y, z: EDGE_Z}, {x: 400, y: SEA_Y, z: EDGE_Z}, {x: 400, y: SEA_Y, z: 900}, {x: -400, y: SEA_Y, z: 900}], cam);
  const waves: React.ReactNode[] = [];
  for (let i = 0; i < 46; i++) {
    const z = EDGE_Z + 0.6 * Math.pow(1.14, i) + ((frame * 0.01) % 1) * 0.6 * Math.pow(1.14, i) * 0.14;
    const amp = 0.04 + 0.03 * Math.sin(frame / 30 + i * 1.7);
    const pp = projectPoly([{x: -200, y: SEA_Y, z}, {x: 200, y: SEA_Y, z}, {x: 200, y: SEA_Y + amp, z: z + 0.25}, {x: -200, y: SEA_Y + amp, z: z + 0.25}], cam);
    if (!pp) continue;
    const o = (0.05 + 0.08 * (0.5 + 0.5 * Math.sin(frame / 22 + i * 2.3))) * (1 + surge * 2);
    waves.push(<path key={i} d={pathOf(pp)} fill={C.paper} opacity={Math.min(0.45, o)} />);
  }

  // —— 堤岸：顶面 + 朝海的立面 + 石板缝
  const top = projectPoly([{x: -60, y: 0, z: -20}, {x: 60, y: 0, z: -20}, {x: 60, y: 0, z: EDGE_Z}, {x: -60, y: 0, z: EDGE_Z}], cam);
  if (top) items.push({key: 'top', z: 900, node: <path d={pathOf(top)} fill="#1A1A1A" />});
  const face = projectPoly([{x: -60, y: 0, z: EDGE_Z}, {x: 60, y: 0, z: EDGE_Z}, {x: 60, y: SEA_Y, z: EDGE_Z}, {x: -60, y: SEA_Y, z: EDGE_Z}], cam);
  if (face) items.push({key: 'face', z: 899, node: <path d={pathOf(face)} fill="#111" />});
  for (let z = -6; z < EDGE_Z; z += 1.2) {
    const pp = projectPoly([{x: -60, y: 0.001, z}, {x: 60, y: 0.001, z}, {x: 60, y: 0.001, z: z + 0.02}, {x: -60, y: 0.001, z: z + 0.02}], cam);
    if (pp) items.push({key: `seam${z}`, z: 898, node: <path d={pathOf(pp)} fill={C.mid} opacity={0.12} />});
  }
  // —— 栈桥（远处，女人坐在尽头）
  {
    const pt = projectPoly([{x: PIER.x0, y: 0, z: PIER.z0}, {x: PIER.x1, y: 0, z: PIER.z0}, {x: PIER.x1, y: 0, z: PIER.z1}, {x: PIER.x0, y: 0, z: PIER.z1}], cam);
    const pf = projectPoly([{x: PIER.x1, y: 0, z: PIER.z0}, {x: PIER.x1, y: 0, z: PIER.z1}, {x: PIER.x1, y: SEA_Y, z: PIER.z1}, {x: PIER.x1, y: SEA_Y, z: PIER.z0}], cam);
    const fog = fogAt(18, fogD, 0);
    if (pf) items.push({key: 'pierF', z: 30, node: <path d={pathOf(pf)} fill={mix('#141414', FOG, fog)} />});
    if (pt) items.push({key: 'pierT', z: 29, node: <path d={pathOf(pt)} fill={mix('#1E1E1E', FOG, fog)} />});
  }
  // —— 石块（前景和堤边）
  const blocks: {c: V3; s: V3; k: string}[] = [
    {c: {x: -3.2, y: 0.35, z: 7.4}, s: {x: 1.1, y: 0.7, z: 0.9}, k: 'b1'},
    {c: {x: 3.6, y: 0.3, z: 7.5}, s: {x: 1.3, y: 0.6, z: 0.8}, k: 'b2'},
    {c: {x: 5.3, y: 0.45, z: 6.6}, s: {x: 1.0, y: 0.9, z: 1.0}, k: 'b3'},
    {c: {x: -5.0, y: 0.3, z: 6.0}, s: {x: 1.0, y: 0.6, z: 1.2}, k: 'b4'},
    {c: {x: PIER.x1 - 0.5, y: 0.22, z: WOMEN_Z - 0.55}, s: {x: 0.5, y: 0.44, z: 0.4}, k: 'w1'},
    {c: {x: PIER.x1 - 0.5, y: 0.22, z: WOMEN_Z + 0.55}, s: {x: 0.5, y: 0.44, z: 0.4}, k: 'w2'},
  ];
  // s25 的前景遮挡石块只在这一屏前后出现（别的镜头里它会挡在两人面前）
  const occlOp = interpolate(frame, [S.s24.end - 14, S.s24.end, S.s25.end - 10, S.s25.end + 4], [0, 1, 1, 0], clamp);
  if (occlOp > 0.01) blocks.push({c: {x: OCCL.x, y: OCCL.y, z: OCCL.z}, s: {x: 1.05, y: 0.4, z: 0.5}, k: 'occl'});
  for (const b of blocks) {
    const q = project(b.c, cam);
    if (q.z < 0.2) continue;
    const {faces} = boxFaces(b.c, b.s, cam, '#1B1B1B');
    const fog = fogAt(q.z, fogD, 2);
    items.push({
      key: b.k,
      z: q.z,
      node: (
        <g opacity={b.k === 'occl' ? occlOp : 1}>
          {faces.map((f, i) => (
            <path key={i} d={f.d} fill={mix(mix('#0D0D0D', C.light, f.shade * 0.45), FOG, fog)} />
          ))}
        </g>
      ),
    });
  }

  // —— 两把椅子（贯穿物件），背对镜头朝向大海
  const chairNode = (p: V3, k: string, glow = 0) => {
    const q = project(p, cam);
    if (q.z < 0.25) return null;
    const dx = p.x - cam.x;
    const dz = p.z - cam.z;
    const view = (Math.atan2(dx, dz) * 180) / Math.PI;
    const tilt = (Math.atan2(cam.y - 0.5, Math.hypot(dx, dz)) * 180) / Math.PI;
    const seat = project({x: p.x, y: 0.49, z: p.z}, cam);
    return {
      q,
      node: (
        <g key={k}>
          <Chair x={q.x} y={q.y} scale={q.s} yaw={180 - cam.yaw - view} tilt={tilt} lit={0.75} light={1} fog={fogAt(q.z, fogD, 2)} fogColor={FOG} />
          {glow > 0 ? (
            <ellipse cx={seat.x} cy={seat.y} rx={seat.s * 0.22} ry={seat.s * 0.22 * Math.max(0.25, Math.sin((Math.abs(cam.pitch) * Math.PI) / 180 + 0.25))} fill={C.accent} opacity={0.32 * glow} style={{mixBlendMode: 'screen'}} />
          ) : null}
        </g>
      ),
    };
  };
  const emptyGlow = interpolate(frame, [S.s26.end - 10, S.s27.start + 40], [0, 1], clamp);
  const cA = chairNode(A, 'chairA');
  const cB = chairNode(B, 'chairB', emptyGlow);

  // —— 两个男人
  const man = (p: V3, pz: Pose, k: string, faceYaw: number) => {
    const q = project(p, cam);
    if (q.z < 0.35) return null;
    const {view, facing} = viewOf(p, faceYaw, cam);
    return {q, view, node: <Figure key={k} pose={pz} view={view} facing={facing} x={q.x} y={q.y} scale={q.s} rim={1} light={-1} fog={fogAt(q.z, fogD, 2)} fogColor={FOG} />};
  };
  const mA = man(A, aPose(frame), 'A', 0);
  const bp = bPos(frame);
  const bOp = interpolate(frame, [leaveAt + 40, leaveAt + 70], [1, 0], clamp);
  const mB = bOp > 0.01 ? man(bp, bPose(frame), 'B', frame >= leaveAt - 4 ? 70 : 0) : null;
  // 背面看：椅背在人前面；侧面 / 正面：人在椅子上面
  for (const [m, c, k] of [
    [mA, cA, 'A'],
    [mB, cB, 'B'],
  ] as const) {
    const z = (c ?? m)?.q.z ?? 0;
    if (!c && !m) continue;
    const order = m?.view === 'back' ? [m?.node, c?.node] : [c?.node, m?.node];
    const op = k === 'B' ? 1 : 1;
    items.push({key: `seat${k}`, z, node: <g opacity={op}>{order}</g>});
  }
  if (mB && frame >= leaveAt) {
    // 起身离开以后，他不再在椅子位置上
  }
  // —— 酒瓶：从他手里递到朋友手里
  {
    const t = smooth((frame - (clink - 26)) / 26);
    const ja = solve(aPose(frame), 'side', 1).hand[1];
    const qa = project({x: A.x, y: ja.y, z: A.z + ja.x * 0.4}, cam);
    const qb = project({x: B.x, y: 0.95, z: B.z + 0.25}, cam);
    const vis = frame > clink - 40 && frame < clink + 24;
    if (vis && qa.z > 0.3) {
      const x = qb.x + (qa.x - qb.x) * t;
      const y = qb.y + (qa.y - qb.y) * t;
      const s = qa.s;
      items.push({
        key: 'bottle',
        z: Math.min(qa.z, qb.z) - 0.1,
        node: <path d={`M${x - s * 0.03},${y}L${x + s * 0.03},${y}L${x + s * 0.03},${y - s * 0.16}L${x + s * 0.012},${y - s * 0.22}L${x + s * 0.012},${y - s * 0.27}L${x - s * 0.012},${y - s * 0.27}L${x - s * 0.012},${y - s * 0.22}L${x - s * 0.03},${y - s * 0.16}Z`} fill="#0A0A0A" stroke={C.paper} strokeOpacity={0.45} strokeWidth={1} />,
      });
    }
  }
  // —— 篮球：s26 被风带着滚向堤边，掉下去
  {
    const t = Math.max(0, frame - (slam26 + 8));
    const roll = Math.min(1, t / 50);
    const p: V3 = {x: BALL0.x - roll * 0.6, y: BALL0.y - Math.max(0, t - 48) * 0.05, z: BALL0.z + roll * 1.6};
    const q = project(p, cam);
    if (q.z > 0.2 && p.y > SEA_Y) {
      const r = 0.12 * q.s;
      const rot = roll * 540;
      items.push({
        key: 'ball',
        z: q.z,
        node: (
          <g transform={`translate(${q.x},${q.y - r}) rotate(${rot})`}>
            <circle r={r} fill="#232323" stroke={C.paper} strokeOpacity={0.3} strokeWidth={1} />
            <path d={`M${-r},0 L${r},0 M0,${-r} L0,${r} M${-r * 0.7},${-r * 0.7} Q0,${-r * 0.2} ${r * 0.7},${-r * 0.7} M${-r * 0.7},${r * 0.7} Q0,${r * 0.2} ${r * 0.7},${r * 0.7}`} stroke="#0B0B0B" strokeWidth={Math.max(1, r * 0.06)} fill="none" />
          </g>
        ),
      });
    }
  }
  // —— 栈桥尽头的两个女人：面对面，身体前倾
  {
    for (const [k, dz, yawF] of [
      ['w1', -0.55, 0],
      ['w2', 0.55, 180],
    ] as const) {
      const p: V3 = {x: PIER.x1 - 0.5, y: 0.44, z: WOMEN_Z + dz};
      const q = project(p, cam);
      if (q.z < 1) continue;
      const {view, facing} = viewOf(p, yawF, cam);
      const talk = Math.sin(frame / 9 + (k === 'w1' ? 0 : 2)) * 3;
      const pz = pose({...SIT, seatY: 0.5, lean: 18 + talk, neck: 6, rSh: 30 + talk * 3, rEl: 70});
      items.push({key: k, z: q.z - 0.01, node: <Figure pose={pz} view={view} facing={facing} x={q.x} y={q.y} scale={q.s} rim={1} light={1} fog={fogAt(q.z, fogD, 2) * 0.8} fogColor={FOG} variant="woman" />});
    }
  }
  // —— s26 浪拍上来：堤边飞起的水花（陪衬）
  const spray: React.ReactNode[] = [];
  if (surge > 0.02) {
    for (let i = 0; i < 80; i++) {
      const t = (frame - slam26) / 30;
      const x0 = (random(`sp${i}`) - 0.5) * 9;
      const vy = 2 + random(`spv${i}`) * 3;
      const p: V3 = {x: x0, y: -0.2 + vy * t - 4.9 * t * t, z: EDGE_Z + random(`spz${i}`) * 0.4};
      const q = project(p, cam);
      if (q.z < 0.5 || p.y < -0.3) continue;
      spray.push(<circle key={i} cx={q.x} cy={q.y} r={Math.max(0.8, q.s * 0.012)} fill={C.paper} opacity={0.5 * surge} />);
    }
  }

  // —— 焦点转移（s23）：先清楚近处两个男人，焦点拉到远处女人，再拉回
  const focusFar = interpolate(frame, [S.s23.start, S.s23.start + 24, S.s23.end - 18, S.s23.end + 6], [0, 1, 1, 0], clamp);
  const seaFog = interpolate(frame, [S.s27.end - 46, S.s27.end + 12], [0, 0.88], clamp);
  const sunX = project({x: 40, y: 8, z: 600}, cam);
  return (
    <AbsoluteFill style={{opacity, transform: `translate(${hit.x}px, ${hit.y}px) scale(1.02)`, background: C.black}}>
      {/* 天空：上暗下亮，地平线处一条雾白 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, #0D0D0E 0%, #242424 ${Math.max(5, (horizon / 1080) * 100 - 35)}%, #6A6863 ${(horizon / 1080) * 100}%, #2A2A2A ${(horizon / 1080) * 100 + 0.5}%, #121212 100%)`,
        }}
      />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <radialGradient id="s3sun" cx={sunX.x} cy={horizon - 30} r={520} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={C.paper} stopOpacity={0.35} />
            <stop offset="1" stopColor={C.paper} stopOpacity={0} />
          </radialGradient>
          <linearGradient id="s3sea" x1="0" y1={horizon} x2="0" y2={1080} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4A4946" />
            <stop offset="0.25" stopColor="#202020" />
            <stop offset="1" stopColor="#0E0E0E" />
          </linearGradient>
        </defs>
        <rect width={1920} height={1080} fill="url(#s3sun)" />
        {seaQuad ? <path d={pathOf(seaQuad)} fill="url(#s3sea)" /> : null}
        <g style={{filter: 'blur(0.6px)'}}>{waves}</g>
        {/* 太阳在海面上的倒影 */}
        <rect x={sunX.x - 60} y={horizon} width={120} height={Math.max(0, 1080 - horizon)} fill={C.paper} opacity={0.06 + surge * 0.1} style={{filter: 'blur(18px)'}} />
      </svg>
      <DepthLayers items={items} far={12} near={1.3} farBlur={interpolate(focusFar, [0, 1], [3.5, 0])} midBlur={focusFar * 5} nearBlur={12}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          {spray}
        </svg>
        <SubtitleTrack screens={screensOf('seawall')} layer="under" />
      </DepthLayers>
      {/* 海雾漫上来（接 §4 的拱门） */}
      <AbsoluteFill style={{background: FOG, opacity: seaFog}} />
      {seaFog > 0 && cB ? (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <defs>
            <radialGradient id="s3glow">
              <stop offset="0" stopColor={C.accent} stopOpacity={0.5} />
              <stop offset="1" stopColor={C.accent} stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={cB.q.x} cy={project({x: B.x, y: 0.49, z: B.z}, cam).y} r={60 + seaFog * 40} fill="url(#s3glow)" opacity={seaFog} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};
