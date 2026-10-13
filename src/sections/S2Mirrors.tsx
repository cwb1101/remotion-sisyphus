/**
 * §2 问法变了 · 无限镜面
 * 手机黑屏映出他的脸 → 镜头从镜子里退出来：两面相对的镜子，倒影一层层伸向远处（男女剪影交替，亮度相同）→
 * 最近几层变成少年、青年身形，男生倒影的轮廓光稍暗 → 他面对镜子摇头，倒影越远越慢 →
 * 镜中的他坐到椅子上，远处整排倒影都蜷坐下去，真人还站着（关键句）→ 他转身走开，倒影没跟走 →
 * 走到两面立镜前：左镜里蜷坐的男人、右镜里蜷坐的女人，四周站着人 → 男人那面周围的人转身退开 →
 * 镜头推进那面镜子，镜面上那道横向反光压平，接 §3 的海平线。
 * 倒影的位置按真实的两面镜反射计算：奇数次反射在 2kD − z 处面朝镜头，偶数次在 2kD + z 处背对镜头。
 */
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Chair} from '../components/Chair';
import {Figure, View} from '../components/Figure';
import {CURL, HEAD_DOWN, Pose, SIT_DOWN, STAND, addPose, lerpPose, poseAt, shakeHead, walk} from '../components/poses';
import {cueTimes, screen} from '../data/timeline';
import {impactAt} from '../engine/impact';
import {Cam, V3, fogAt, pathOf, project, projectPoly, toCam} from '../engine/projection';
import {DepthLayers, Dust, Item, LightCone, camPath} from '../engine/world';
import {C, mix} from '../theme';

const ids = ['s12', 's13', 's14', 's15', 's16', 's17', 's18', 's19', 's20'] as const;
const S = Object.fromEntries(ids.map((i) => [i, screen(i)])) as Record<(typeof ids)[number], ReturnType<typeof screen>>;
const FOG = '#262626';
const D = 5; // 两面镜子的间距：镜子 B 在 z=0（镜头背后），镜子 A 在 z=D
const MW = 3.0; // 镜墙半宽
const MH = 3.3;
const N = 7; // 画到第几次反射
const MAN_Z = 3;
const CHAIR_P: V3 = {x: 0.75, y: 0, z: 3.55};
const LAMP: V3 = {x: 0.1, y: 3.3, z: 3.2};
// 两面立镜（左：男人，右：女人）
const MIRROR_M = {x: -7.1, z: 4.3};
const MIRROR_F = {x: -5.5, z: 4.3};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/** 第 r 次反射的 z */
const imgZ = (z: number, r: number) => (r % 2 === 1 ? (r + 1) * D - z : r * D + z);

// —— 他的走位：s18 开始转身往左走，s19 中段停在两面立镜前
const WALK_A = S.s18.start + 6;
const STOP_X = -4.35;
const SPEED = 1.0 / 30;
const WALK_B = WALK_A + Math.round(-STOP_X / SPEED);
const manX = (f: number) => {
  if (f <= WALK_A) return 0;
  if (f >= WALK_B + 16) return STOP_X;
  // 最后 16 帧减速
  const lin = -(Math.min(f, WALK_B) - WALK_A) * SPEED;
  const tail = f > WALK_B ? -SPEED * (f - WALK_B) * (1 - (f - WALK_B) / 32) : 0;
  return Math.max(STOP_X, lin + tail);
};
const shakeA = S.s15.start + 6;
const manPose = (f: number): Pose =>
  poseAt(f, [
    {from: 0, pose: (ff) => addPose(STAND, {lean: Math.sin(ff / 40) * 0.8})},
    {from: shakeA, pose: (ff) => shakeHead(ff - shakeA, 16 * (1 - smooth((ff - shakeA - 30) / 14))), blend: 6},
    {from: S.s16.start, pose: addPose(HEAD_DOWN, {neck: -12}), blend: 24},
    {from: WALK_A, pose: (ff) => walk(((ff - WALK_A) / 30) % 1, interpolate(ff, [WALK_B - 4, WALK_B + 16], [1, 0], clamp)), blend: 12},
    {from: WALK_B + 16, pose: STAND, blend: 12},
  ]);
const manView = (f: number): View => (f < WALK_A - 2 ? 'back' : 'side');

/** 倒影 r 的姿势：先是慢 r×5 帧的复制品，s16 起坐下、蜷起来，并且不再跟着真人走 */
const reflPose = (f: number, r: number): {pose: Pose; sit: number} => {
  const lag = r * 5;
  const base = manPose(Math.min(f, WALK_A - 1) - lag);
  const sitStart = r === 1 ? S.s16.start + 14 : S.s17.start - 6 + r * 7;
  const sit = smooth((f - sitStart) / 22);
  const curl = smooth((f - (S.s17.start + r * 7)) / 26);
  if (sit <= 0) return {pose: base, sit: 0};
  const seated = lerpPose(SIT_DOWN, CURL, curl);
  return {pose: lerpPose(base, seated, sit), sit};
};

export const cameraS2 = (frame: number): Cam =>
  camPath(frame, [
    {f: S.s12.start - 14, x: 0.05, y: 1.62, z: 4.55, yaw: 0, pitch: 0, focal: 3000},
    {f: S.s12.start + 64, x: 0.85, y: 1.56, z: 1.4, yaw: -3, pitch: 0, focal: 1500},
    {f: S.s13.start + 10, x: -0.45, y: 1.5, z: 0.75, yaw: 3, pitch: 0, focal: 1500},
    {f: S.s13.end - 8, x: 0.4, y: 1.45, z: 0.85, yaw: -2, pitch: 0, focal: 1500},
    {f: S.s14.start + 40, x: 1.3, y: 1.5, z: 1.55, yaw: -20, pitch: 0, focal: 1450},
    {f: S.s15.end - 10, x: 1.0, y: 1.56, z: 1.9, yaw: -14, pitch: 0, focal: 1500},
    {f: S.s16.start + 50, x: 0.42, y: 1.32, z: 2.2, yaw: 3, pitch: -4, focal: 2600},
    {f: S.s17.start + 16, x: 0.42, y: 1.34, z: 2.15, yaw: 2.5, pitch: -3, focal: 2450},
    {f: S.s17.end - 12, x: 0.3, y: 1.5, z: 0.5, yaw: 0, pitch: 0, focal: 1500},
    {f: S.s18.end - 6, x: -2.4, y: 1.5, z: 0.2, yaw: -6, pitch: 0, focal: 1500},
    {f: S.s19.end - 20, x: -5.4, y: 1.42, z: 0.4, yaw: -7, pitch: 0, focal: 1500},
    {f: S.s20.start + 56, x: -6.6, y: 1.32, z: 2.0, yaw: -5, pitch: 0, focal: 1500},
    {f: S.s20.end + 14, x: -7.08, y: 1.28, z: 3.9, yaw: -1, pitch: 0, focal: 1700},
  ]);

export const manScreenXS2 = (f: number) => project({x: manX(f), y: 0, z: MAN_Z}, cameraS2(f)).x;

/** 立镜：镜框 + 镜面渐变 + 横向反光带 + 镜中蜷坐的人（裁在镜面里） */
const StandMirror: React.FC<{cx: number; cz: number; cam: Cam; woman: boolean; frame: number; id: string}> = ({cx, cz, cam, woman, frame, id}) => {
  const hw = 0.55;
  const glass = projectPoly([{x: cx - hw, y: 0.12, z: cz}, {x: cx + hw, y: 0.12, z: cz}, {x: cx + hw, y: 2.2, z: cz}, {x: cx - hw, y: 2.2, z: cz}], cam);
  const outer = projectPoly([{x: cx - hw - 0.07, y: 0.05, z: cz}, {x: cx + hw + 0.07, y: 0.05, z: cz}, {x: cx + hw + 0.07, y: 2.27, z: cz}, {x: cx - hw - 0.07, y: 2.27, z: cz}], cam);
  if (!glass || !outer) return null;
  const top = Math.min(...glass.map((p) => p.y));
  const bot = Math.max(...glass.map((p) => p.y));
  // 镜中人：放在镜面后 1.6m 处，按透视缩放，再用 clipPath 裁进镜面
  const vz = cz + 1.6;
  const q = project({x: cx, y: 0, z: vz}, cam);
  const vchair = project({x: cx, y: 0, z: vz + 0.05}, cam);
  const breathe = Math.sin(frame / 26 + (woman ? 1 : 0)) * 1.2;
  return (
    <g>
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={pathOf(glass)} />
        </clipPath>
        <linearGradient id={`${id}-g`} x1="0" y1={top} x2="0" y2={bot} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2E2E2E" />
          <stop offset="0.4" stopColor="#3A3A39" />
          <stop offset="0.44" stopColor={C.light} />
          <stop offset="0.48" stopColor="#3A3A39" />
          <stop offset="1" stopColor="#161616" />
        </linearGradient>
      </defs>
      <path d={pathOf(outer)} fill="#101010" stroke={mix(C.mid, FOG, 0.3)} strokeWidth={1.2} strokeOpacity={0.6} />
      <path d={pathOf(glass)} fill={`url(#${id}-g)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {vchair.z > 0.3 ? <Chair x={vchair.x} y={vchair.y} scale={vchair.s} yaw={8} tilt={4} lit={0.35} light={-1} fog={0.4} fogColor={FOG} /> : null}
        {q.z > 0.3 ? (
          <Figure pose={addPose(CURL, {lean: breathe})} view="front" x={q.x} y={q.y} scale={q.s} rim={0.9} light={0} fog={0.15} fogColor={FOG} variant={woman ? 'woman' : 'man'} />
        ) : null}
        <rect x={0} y={0} width={1920} height={1080} fill="#000" opacity={0.25} />
      </g>
      {/* 支架 */}
      {(() => {
        const a = project({x: cx - hw * 0.8, y: 0, z: cz + 0.35}, cam);
        const b = project({x: cx - hw * 0.8, y: 1.2, z: cz}, cam);
        const c2 = project({x: cx + hw * 0.8, y: 0, z: cz + 0.35}, cam);
        const d2 = project({x: cx + hw * 0.8, y: 1.2, z: cz}, cam);
        return (
          <g stroke="#0E0E0E" strokeWidth={Math.max(2, a.s * 0.03)}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
            <line x1={c2.x} y1={c2.y} x2={d2.x} y2={d2.y} />
          </g>
        );
      })()}
    </g>
  );
};

export const S2Mirrors: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const frame = useCurrentFrame();
  const cam = cameraS2(frame);
  const hit = impactAt(frame);
  const items: Item[] = [];
  const fogD = 0.035;
  const depthOf = (p: V3) => toCam(p, cam).z;

  // —— 地面、天花、两侧墙（真实房间 + 镜中延伸）
  for (let z = -2; z < (N + 1) * D; z += 2) {
    const dep = Math.max(0.1, z + 1 - cam.z);
    const fog = fogAt(dep, fogD, 1);
    const quad = (pts: V3[], fill: string, k: string) => {
      const pp = projectPoly(pts, cam);
      if (pp) items.push({key: k, z: 500 + dep, node: <path d={pathOf(pp)} fill={fill} stroke={fill} strokeWidth={1} />});
    };
    quad([{x: -12, y: 0, z}, {x: 12, y: 0, z}, {x: 12, y: 0, z: z + 2}, {x: -12, y: 0, z: z + 2}], mix('#121212', FOG, fog * 0.8), `fl${z}`);
    quad([{x: -12, y: MH, z}, {x: 12, y: MH, z}, {x: 12, y: MH, z: z + 2}, {x: -12, y: MH, z: z + 2}], mix('#0B0B0B', FOG, fog * 0.6), `cl${z}`);
  }
  // 镜墙两侧的实墙（z = D，x 超出镜面的部分）
  for (const [x0, x1] of [
    [-12, -MW],
    [MW, 12],
  ]) {
    const pp = projectPoly([{x: x0, y: 0, z: D}, {x: x1, y: 0, z: D}, {x: x1, y: MH, z: D}, {x: x0, y: MH, z: D}], cam);
    if (pp) items.push({key: `wall${x0}`, z: 480 + Math.max(0, D - cam.z), node: <path d={pathOf(pp)} fill="#151515" />});
  }

  // —— 镜框：z = mD 处一层层嵌套的框；每一层之后整体压暗（镜面每反射一次损失一点光）
  for (let m = 1; m <= N + 1; m++) {
    const z = m * D;
    const inner = projectPoly([{x: -MW, y: 0, z}, {x: MW, y: 0, z}, {x: MW, y: MH, z}, {x: -MW, y: MH, z}], cam);
    if (!inner) continue;
    const dep = depthOf({x: 0, y: 1.5, z});
    const fog = fogAt(dep, fogD, 1);
    const edge = mix('#5A5955', FOG, fog);
    items.push({
      key: `frame${m}`,
      z: dep - 0.001,
      node: (
        <g>
          <path d={pathOf(inner)} fill="#000" opacity={0.15} />
          <path d={pathOf(inner)} fill="none" stroke={edge} strokeWidth={Math.max(0.8, 3.5 - m * 0.4)} opacity={0.55 - m * 0.04} />
        </g>
      ),
    });
  }

  // —— 光：真人头顶一盏 + 它在镜中的像
  const cones: React.ReactNode[] = [];
  for (let r = 0; r <= 3; r++) {
    const lz = r === 0 ? LAMP.z : imgZ(LAMP.z, r);
    cones.push(<LightCone key={r} id={`s2c${r}`} src={{...LAMP, z: lz}} floor={{x: LAMP.x, y: 0, z: lz}} radius={0.95} cam={cam} intensity={0.42 * Math.pow(0.62, r)} />);
  }

  // —— 椅子（真实的一把背对镜头，镜中的像交替朝向）
  for (let r = 0; r <= N; r++) {
    const z = r === 0 ? CHAIR_P.z : imgZ(CHAIR_P.z, r);
    const p = {x: CHAIR_P.x, y: 0, z};
    const q = project(p, cam);
    if (q.z < 0.3) continue;
    const dx = p.x - cam.x;
    const dz = p.z - cam.z;
    const view = (Math.atan2(dx, dz) * 180) / Math.PI;
    const tilt = (Math.atan2(cam.y - 0.5, Math.hypot(dx, dz)) * 180) / Math.PI;
    const facing = r % 2 === 1 ? 10 : 190; // 奇数次反射朝向镜头
    items.push({
      key: `chair${r}`,
      z: q.z,
      node: <Chair x={q.x} y={q.y} scale={q.s} yaw={facing - cam.yaw - view} tilt={tilt} lit={0.7} light={-1} fog={fogAt(q.z, fogD, 1)} fogColor={FOG} />,
    });
  }

  // —— 真人
  {
    const p: V3 = {x: manX(frame), y: 0, z: MAN_Z};
    const q = project(p, cam);
    if (q.z > 0.35) {
      const view = manView(frame);
      items.push({
        key: 'man',
        z: q.z,
        node: <Figure pose={manPose(frame)} view={view} facing={-1} x={q.x} y={q.y} scale={q.s} rim={1} light={view === 'side' ? 1 : 0} fog={fogAt(q.z, fogD, 2) * 0.6} fogColor={FOG} />,
      });
    }
  }

  // —— 倒影
  const genderMix = interpolate(frame, [S.s14.start - 12, S.s14.start + 8], [1, 0], clamp); // s12–s13 男女交替
  const youth = interpolate(frame, [S.s13.start, S.s13.start + 20, S.s14.start - 10, S.s14.start + 6], [0, 1, 1, 0], clamp);
  for (let r = 1; r <= N; r++) {
    const {pose, sit} = reflPose(frame, r);
    const zMan = imgZ(MAN_Z, r);
    const zChair = imgZ(CHAIR_P.z, r);
    // 坐下时挪到椅子的像上
    const p: V3 = {x: interpolate(sit, [0, 1], [0, CHAIR_P.x]), y: 0, z: interpolate(sit, [0, 1], [zMan, zChair + (r % 2 === 1 ? 0.12 : -0.12)])};
    const q = project(p, cam);
    if (q.z < 0.3) continue;
    const view: View = r % 2 === 1 ? 'front' : 'back';
    const fog = fogAt(q.z, fogD, 2) * 0.6;
    const young = r <= 3 ? youth : 0;
    const h = 1 - 0.2 * young;
    const woman = r % 2 === 0 ? genderMix : 0;
    // s13：男生倒影的轮廓光略暗
    const rimM = 1 - 0.45 * young;
    const nodes: React.ReactNode[] = [];
    if (woman < 1) nodes.push(<Figure key="m" pose={pose} view={view} x={q.x} y={q.y} scale={q.s} height={h} rim={rimM} light={0} fog={fog} fogColor={FOG} opacity={1 - woman} />);
    if (woman > 0) nodes.push(<Figure key="w" pose={pose} view={view} x={q.x} y={q.y} scale={q.s} height={h * 0.97} rim={1} light={0} fog={fog} fogColor={FOG} opacity={woman} variant="woman" />);
    items.push({key: `refl${r}`, z: q.z + (sit > 0 ? -0.05 : 0.02), node: <g>{nodes}</g>});
  }

  // —— 立镜和镜子周围的人
  items.push({key: 'mirrorM', z: depthOf({x: MIRROR_M.x, y: 1, z: MIRROR_M.z}), node: <StandMirror cx={MIRROR_M.x} cz={MIRROR_M.z} cam={cam} woman={false} frame={frame} id="smM" />});
  items.push({key: 'mirrorF', z: depthOf({x: MIRROR_F.x, y: 1, z: MIRROR_F.z}), node: <StandMirror cx={MIRROR_F.x} cz={MIRROR_F.z} cam={cam} woman frame={frame} id="smF" />});
  const leaveAt = cueTimes('s20', 'murmur-out')[0];
  for (const [mi, mc] of [
    [0, MIRROR_M],
    [1, MIRROR_F],
  ] as const) {
    for (let k = 0; k < 9; k++) {
      const a = -1.1 + (k / 8) * 2.2 + (random(`cr${mi}${k}`) - 0.5) * 0.18;
      let p: V3 = {x: mc.x + Math.sin(a) * 1.05, y: 0, z: mc.z + 0.5 + Math.cos(a) * 0.9 + random(`crz${mi}${k}`) * 0.4};
      let view: View = 'front';
      let pose = addPose(STAND, {neck: 8 + random(`crn${mi}${k}`) * 10, lean: Math.sin(frame / 37 + k) * 0.8});
      let op = interpolate(frame, [S.s18.end - 20, S.s19.start + 10], [0, 1], clamp);
      if (mi === 0) {
        // 男人那面镜子周围的人：一个接一个转身、走开
        const t = frame - (leaveAt + k * 4);
        if (t > 0) {
          view = 'back';
          pose = walk((t / 32) % 1, Math.min(1, t / 8));
          p = {...p, z: p.z + t * 0.03, x: p.x + Math.sin(a) * t * 0.012};
          op *= interpolate(t, [10, 60], [1, 0], clamp);
        }
      }
      if (op <= 0.01) continue;
      const q = project(p, cam);
      if (q.z < 0.4) continue;
      items.push({
        key: `crowd${mi}${k}`,
        z: q.z,
        node: <Figure pose={pose} view={view} x={q.x} y={q.y} scale={q.s} height={0.94 + random(`crh${mi}${k}`) * 0.1} rim={0.8} light={0} fog={fogAt(q.z, fogD, 2) + 0.15} fogColor={FOG} opacity={op} variant={random(`crv${mi}${k}`) > 0.5 ? 'woman' : 'man'} />,
      });
    }
  }

  const horizon = project({x: cam.x, y: cam.y, z: cam.z + 300}, cam).y;
  return (
    <AbsoluteFill style={{opacity, transform: `translate(${hit.x}px, ${hit.y}px) scale(1.02)`, background: C.black}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 40% at 50% ${(horizon / 1080) * 100}%, #2B2B2A, ${C.black} 75%)`}} />
      <DepthLayers items={items} far={18} near={0.9} farBlur={2.2} nearBlur={12}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: 'blur(9px)'}}>
          {cones}
        </svg>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Dust seed="s2dust" n={70} box={{x0: -2, x1: 2, y0: 0.2, y1: 3.2, z0: 1.5, z1: 4.8}} cam={cam} frame={frame} bright={(p) => Math.max(0, 1 - Math.hypot(p.x - LAMP.x, p.z - LAMP.z) / 1.2) * 0.6 + 0.04} />
        </svg>
      </DepthLayers>
      {/* 进场时还在黑屏里：前 20 帧整体压暗，像从手机黑屏里穿出来 */}
      <AbsoluteFill style={{background: '#000', opacity: interpolate(frame, [S.s12.start - 14, S.s12.start + 26], [0.7, 0], clamp)}} />
    </AbsoluteFill>
  );
};
