/**
 * §6 代价 · 雾里的山脊
 * 钟面推成沙漏的玻璃 → 从失焦的沙漏后面拉出来：他一个人沿着山脊往远处走，远山一层层淡进雾里 →
 * 镜头升高：山坡上成群的小人，六个一组，每组有一个人站开、轮廓光变暗 →
 * 沙漏特写：沙往下流，玻璃弧面上映出远处他的小剪影 → 他越走越小，雾从两边合拢 →
 * 他停下回头，身后山脊边那把空椅子正被雾吞没，前景沙漏快漏完了 → 镜头仰起进雾，雾旋成螺旋，接 §7。
 */
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Chair} from '../components/Chair';
import {Figure, View} from '../components/Figure';
import {LOOK_BACK, Pose, STAND, addPose, poseAt, walk} from '../components/poses';
import {screen} from '../data/timeline';
import {impactAt} from '../engine/impact';
import {Cam, V3, fogAt, pathOf, project, projectPoly, toCam} from '../engine/projection';
import {DepthLayers, Item, camPath} from '../engine/world';
import {C, mix} from '../theme';

const ids = ['s42', 's43', 's44', 's45', 's46'] as const;
const S = Object.fromEntries(ids.map((i) => [i, screen(i)])) as Record<(typeof ids)[number], ReturnType<typeof screen>>;
const FOG = '#4A4946';
const SKY_TOP = '#1A1A1A';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

/** 山脊顶线高度 */
const crest = (z: number) => 0.35 * Math.sin(z * 0.22) + 0.15 * Math.sin(z * 0.61 + 1) + z * 0.015;
const HG = {x: -0.75, z: 3.3, h: 0.72}; // 沙漏
const hgBase = (): V3 => ({x: HG.x, y: crest(HG.z) - 0.05, z: HG.z});

// —— 他：一直往前走，s46 开头停下
const SPEED = 0.85 / 30;
const Z0 = 5.6;
const STOP_F = S.s46.start + 10;
const manZ = (f: number) => Z0 + (Math.min(f, STOP_F) - (S.s42.start - 20)) * SPEED - (f > STOP_F - 20 ? 0 : 0);
const STOP_Z = manZ(STOP_F);
const CHAIR_P: V3 = {x: 0.55, y: crest(STOP_Z - 2.6), z: STOP_Z - 2.6};

const manPose = (f: number): Pose =>
  poseAt(f, [
    {from: 0, pose: (ff) => walk(((ff - S.s42.start) / 36) % 1 + 1, interpolate(ff, [STOP_F - 16, STOP_F], [0.85, 0], clamp))},
    {from: STOP_F, pose: STAND, blend: 10},
    {from: S.s46.start + 26, pose: LOOK_BACK, blend: 22},
  ]);

export const manScreenXS6 = (f: number) => {
  const z = manZ(f);
  return project({x: 0, y: crest(z), z}, cameraS6(f)).x;
};

export const cameraS6 = (frame: number): Cam => {
  const hb = hgBase();
  const hc: V3 = {x: hb.x, y: hb.y + HG.h * 0.5, z: hb.z};
  const aim = (from: V3, to: V3, focal = 1500) => ({
    ...from,
    yaw: (Math.atan2(to.x - from.x, to.z - from.z) * 180) / Math.PI,
    pitch: (Math.atan2(to.y - from.y, Math.hypot(to.x - from.x, to.z - from.z)) * 180) / Math.PI,
    focal,
  });
  const m = (f: number): V3 => ({x: 0, y: crest(manZ(f)) + 1.0, z: manZ(f)});
  return camPath(frame, [
    {f: S.s42.start - 14, ...aim({x: hc.x + 0.02, y: hc.y, z: hc.z - 0.42}, hc)},
    {f: S.s42.end - 4, ...aim({x: 0.45, y: crest(0) + 1.75, z: -1.4}, m(S.s42.end + 20))},
    {f: S.s43.start + 60, ...aim({x: 2.2, y: crest(0) + 4.2, z: -0.5}, {x: -1, y: 0, z: 22}, 1400)},
    {f: S.s43.end - 10, ...aim({x: 1.4, y: crest(0) + 4.6, z: 0.4}, {x: -2, y: 0, z: 24}, 1400)},
    {f: S.s44.start + 30, ...aim({x: hc.x + 0.45, y: hc.y + 0.05, z: hc.z - 0.75}, hc, 1900)},
    {f: S.s44.end - 8, ...aim({x: hc.x + 0.4, y: hc.y + 0.02, z: hc.z - 0.66}, hc, 2000)},
    {f: S.s45.start + 40, ...aim({x: 0.5, y: crest(6) + 1.7, z: manZ(S.s45.start + 40) - 5}, m(S.s45.start + 40))},
    {f: S.s45.end - 6, ...aim({x: 0.4, y: crest(9) + 1.6, z: manZ(S.s45.start + 40) - 3.6}, m(S.s45.end))},
    {f: S.s46.start + 4, ...aim({x: 1.1, y: crest(STOP_Z) + 1.55, z: STOP_Z - 1.6}, {x: 0, y: crest(STOP_Z) + 1.2, z: STOP_Z})},
    {f: S.s46.start + 34, ...aim({x: 1.55, y: crest(STOP_Z) + 1.45, z: STOP_Z + 0.4}, {x: 0, y: crest(STOP_Z) + 1.1, z: STOP_Z - 0.6})},
    {f: S.s46.end - 26, ...aim({x: 1.5, y: crest(STOP_Z) + 1.5, z: STOP_Z + 0.5}, {x: 0, y: crest(STOP_Z) + 1.2, z: STOP_Z - 0.8})},
    {f: S.s46.end + 14, x: 1.3, y: crest(STOP_Z) + 2.4, z: STOP_Z + 0.2, yaw: -120, pitch: 48, focal: 1500},
  ]);
};

/** 沙漏：上下两只玻璃泡、木框、沙（上面越来越少，下面越堆越高） */
const Hourglass: React.FC<{cam: Cam; frame: number; reflect: React.ReactNode}> = ({cam, frame, reflect}) => {
  const b = hgBase();
  const q = project(b, cam);
  if (q.z < 0.12) return null;
  const s = q.s;
  const H = HG.h * s;
  const W = 0.24 * s;
  const left = interpolate(frame, [S.s42.start - 20, S.s46.end], [0.92, 0.04], clamp); // 上泡里剩多少沙
  const x0 = q.x;
  const yb = q.y;
  const yc = yb - H / 2; // 腰
  const bulb = (dir: -1 | 1) => {
    const y1 = dir < 0 ? yb - H * 0.92 : yb - H * 0.08;
    return `M${x0 - W * 0.06},${yc} C${x0 - W * 0.06},${yc + dir * H * 0.06} ${x0 - W * 0.5},${yc + dir * H * 0.12} ${x0 - W * 0.5},${(yc + y1) / 2} C${x0 - W * 0.5},${y1 - dir * H * 0.08} ${x0 - W * 0.42},${y1} ${x0},${y1} C${x0 + W * 0.42},${y1} ${x0 + W * 0.5},${y1 - dir * H * 0.08} ${x0 + W * 0.5},${(yc + y1) / 2} C${x0 + W * 0.5},${yc + dir * H * 0.12} ${x0 + W * 0.06},${yc + dir * H * 0.06} ${x0 + W * 0.06},${yc} Z`;
  };
  const topSandY = yc - H * 0.38 * left;
  const botH = H * 0.36 * (1 - left);
  const id = `hg`;
  return (
    <g>
      <defs>
        <clipPath id={`${id}t`}>
          <path d={bulb(-1)} />
        </clipPath>
        <clipPath id={`${id}b`}>
          <path d={bulb(1)} />
        </clipPath>
        <linearGradient id={`${id}g`} x1={x0 - W / 2} y1="0" x2={x0 + W / 2} y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={C.paper} stopOpacity={0.05} />
          <stop offset="0.25" stopColor={C.paper} stopOpacity={0.28} />
          <stop offset="0.5" stopColor={C.paper} stopOpacity={0.06} />
          <stop offset="1" stopColor={C.paper} stopOpacity={0.14} />
        </linearGradient>
      </defs>
      {/* 玻璃内：沙 + 映在弧面上的远处的他 */}
      <g clipPath={`url(#${id}t)`}>
        <rect x={x0 - W} y={topSandY} width={W * 2} height={yc - topSandY} fill="#8C8984" />
        <path d={`M${x0 - W},${topSandY} Q${x0},${topSandY + H * 0.05} ${x0 + W},${topSandY}`} fill="#8C8984" />
        {reflect}
      </g>
      <g clipPath={`url(#${id}b)`}>
        <path d={`M${x0 - W},${yb - H * 0.08} L${x0 - W},${yb - H * 0.08 - botH * 0.4} Q${x0},${yb - H * 0.08 - botH * 1.6} ${x0 + W},${yb - H * 0.08 - botH * 0.4} L${x0 + W},${yb - H * 0.08}Z`} fill="#8C8984" />
        {/* 流下来的细沙 */}
        {left > 0.05 ? <rect x={x0 - Math.max(0.6, W * 0.012)} y={yc} width={Math.max(1.2, W * 0.024)} height={H * 0.42} fill="#A9A59D" opacity={0.85} /> : null}
      </g>
      <path d={bulb(-1)} fill={`url(#${id}g)`} stroke={C.paper} strokeOpacity={0.35} strokeWidth={Math.max(1, s * 0.004)} />
      <path d={bulb(1)} fill={`url(#${id}g)`} stroke={C.paper} strokeOpacity={0.35} strokeWidth={Math.max(1, s * 0.004)} />
      {/* 木框 */}
      <rect x={x0 - W * 0.62} y={yb - H} width={W * 1.24} height={H * 0.07} fill="#141414" />
      <rect x={x0 - W * 0.62} y={yb - H * 0.07} width={W * 1.24} height={H * 0.07} fill="#141414" />
      <rect x={x0 - W * 0.58} y={yb - H} width={W * 0.06} height={H} fill="#141414" />
      <rect x={x0 + W * 0.52} y={yb - H} width={W * 0.06} height={H} fill="#141414" />
      {/* 玻璃上一点琥珀色反光（强调色，面积很小） */}
      <circle cx={x0 + W * 0.3} cy={yb - H * 0.78} r={Math.max(1.5, W * 0.018)} fill={C.accent} opacity={0.7} />
    </g>
  );
};

export const S6Ridge: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const frame = useCurrentFrame();
  const cam = cameraS6(frame);
  const hit = impactAt(frame);
  const items: Item[] = [];
  const fogD = 0.03 + interpolate(frame, [S.s45.start, S.s46.start], [0, 0.03], clamp);
  const depthOf = (p: V3) => toCam(p, cam).z;

  // —— 远山：四层山脊线，越远越淡
  const far: React.ReactNode[] = [];
  [
    [260, 34, 0.85],
    [150, 22, 0.7],
    [90, 13, 0.55],
    [48, 7, 0.38],
  ].forEach(([z, amp, fogK], li) => {
    const pts: {x: number; y: number}[] = [];
    for (let i = 0; i <= 60; i++) {
      const x = -z * 1.6 + (i / 60) * z * 3.2;
      const y = -amp * 0.6 + amp * (0.5 + 0.5 * Math.sin(x * 0.03 + li * 2)) * (0.6 + 0.4 * Math.sin(x * 0.011 + li));
      const p = project({x, y, z}, cam);
      if (p.z > 1) pts.push(p);
    }
    if (pts.length < 2) return;
    const d = `M${pts[0].x},1400 ` + pts.map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ` L${pts[pts.length - 1].x},1400 Z`;
    far.push(<path key={li} d={d} fill={mix('#151515', FOG, fogK)} />);
  });

  // —— 近处山脊：沿 z 切片，左右两面坡（光从右边来，右坡亮）
  for (let z = -4; z < 70; z += 0.8) {
    const h0 = crest(z);
    const h1 = crest(z + 0.8);
    const dep = Math.max(0.2, z - cam.z);
    const fog = fogAt(dep, fogD, 2);
    const wid = 9;
    const quad = (pts: V3[], fill: string, k: string) => {
      const pp = projectPoly(pts, cam);
      if (pp) items.push({key: k, z: 600 + dep, node: <path d={pathOf(pp)} fill={fill} stroke={fill} strokeWidth={1} />});
    };
    quad([{x: 0, y: h0, z}, {x: 0, y: h1, z: z + 0.8}, {x: -wid, y: h1 - 6, z: z + 0.8}, {x: -wid, y: h0 - 6, z}], mix('#101010', FOG, fog), `l${z}`);
    quad([{x: 0, y: h0, z}, {x: 0, y: h1, z: z + 0.8}, {x: wid, y: h1 - 5, z: z + 0.8}, {x: wid, y: h0 - 5, z}], mix('#1E1E1E', FOG, fog), `r${z}`);
  }

  // —— 坡上成群的小人：六个一组，每组有一个站开、轮廓光暗
  const groupsOp = interpolate(frame, [S.s42.end, S.s43.start + 20, S.s44.start + 10, S.s44.start + 30], [0, 1, 1, 0.6], clamp);
  if (groupsOp > 0.01) {
    const groups = [
      {x: -3.2, z: 15},
      {x: 2.8, z: 19},
      {x: -4.6, z: 24},
      {x: 3.6, z: 28},
      {x: -2.4, z: 33},
    ];
    groups.forEach((g, gi) => {
      for (let k = 0; k < 6; k++) {
        const apart = k === 5;
        const ax = apart ? (g.x > 0 ? 1.6 : -1.6) : (random(`g${gi}${k}`) - 0.5) * 1.6;
        const az = apart ? 0.8 : (random(`gz${gi}${k}`) - 0.5) * 1.2;
        const p: V3 = {x: g.x + ax, y: 0, z: g.z + az};
        // 站在坡面上：坡高 = 顶线 - |x| × 坡度
        p.y = crest(p.z) - Math.abs(p.x) * (p.x < 0 ? 6 / 9 : 5 / 9);
        const q = project(p, cam);
        if (q.z < 1) continue;
        const pose = addPose(STAND, {neck: apart ? 22 : 4 + random(`gn${gi}${k}`) * 8, lean: Math.sin(frame / 33 + k) * 1});
        items.push({
          key: `g${gi}${k}`,
          z: q.z,
          node: <Figure pose={pose} view={random(`gv${gi}${k}`) > 0.5 ? 'front' : 'back'} x={q.x} y={q.y} scale={q.s} height={0.95 + random(`gh${gi}${k}`) * 0.1} rim={apart ? 0.15 : 1} light={0} fog={fogAt(q.z, fogD, 2) * 0.8} fogColor={FOG} opacity={groupsOp} variant={random(`gw${gi}${k}`) > 0.55 ? 'woman' : 'man'} />,
        });
      }
    });
  }

  // —— 被雾吞没的空椅子（他走过的地方）
  {
    const q = project(CHAIR_P, cam);
    if (q.z > 0.4) {
      const dx = CHAIR_P.x - cam.x;
      const dz = CHAIR_P.z - cam.z;
      const view = (Math.atan2(dx, dz) * 180) / Math.PI;
      const swallow = interpolate(frame, [S.s46.start + 20, S.s46.end + 10], [0.25, 0.92], clamp);
      items.push({key: 'chair', z: q.z, node: <Chair x={q.x} y={q.y} scale={q.s} yaw={150 - cam.yaw - view} tilt={6} lit={0.6} light={1} fog={Math.max(fogAt(q.z, fogD, 2), swallow)} fogColor={FOG} />});
    }
  }

  // —— 他
  const mz = manZ(frame);
  const mp: V3 = {x: 0, y: crest(mz), z: mz};
  const mq = project(mp, cam);
  let reflect: React.ReactNode = null;
  if (mq.z > 0.4) {
    const toCamA = (Math.atan2(cam.x - mp.x, cam.z - mp.z) * 180) / Math.PI;
    const rel = Math.abs(((toCamA + 540) % 360) - 180);
    const view: View = rel > 150 ? 'back' : rel < 30 ? 'front' : 'side';
    const a = project(mp, cam);
    const b = project({x: 0, y: mp.y, z: mz + 0.5}, cam);
    const facing: 1 | -1 = b.x >= a.x ? 1 : -1;
    items.push({key: 'man', z: mq.z, node: <Figure pose={manPose(frame)} view={view} facing={facing} x={mq.x} y={mq.y} scale={mq.s} rim={1} light={view === 'side' ? 1 : 0} fog={fogAt(mq.z, fogD, 2) * 0.6} fogColor={FOG} />});
    // 沙漏玻璃上映出的他：缩小、压扁贴在弧面上
    const hb = hgBase();
    const hq = project(hb, cam);
    if (hq.z > 0.12) {
      const rs = hq.s * 0.05;
      reflect = (
        <g opacity={0.55} transform={`translate(${hq.x + hq.s * 0.03},${hq.y - hq.s * HG.h * 0.62})`}>
          <Figure pose={manPose(frame)} view="back" x={0} y={0} scale={rs} rim={0.6} light={0} fog={0.3} fogColor="#2A2A2A" />
        </g>
      );
    }
  }
  items.push({key: 'hourglass', z: Math.max(0.15, depthOf({...hgBase(), y: hgBase().y + 0.3})), node: <Hourglass cam={cam} frame={frame} reflect={reflect} />});

  // —— 雾：两侧合拢（s45 起）+ 结尾仰起时旋成螺旋
  const close = interpolate(frame, [S.s45.start + 20, S.s46.start + 10], [0, 1], clamp);
  const swirl = smooth((frame - (S.s46.end - 36)) / 50);
  const horizon = project({x: cam.x + Math.sin((cam.yaw * Math.PI) / 180) * 500, y: cam.y, z: cam.z + Math.cos((cam.yaw * Math.PI) / 180) * 500}, cam).y;
  return (
    <AbsoluteFill style={{opacity, transform: `translate(${hit.x}px, ${hit.y}px) scale(1.02)`, background: C.black}}>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${SKY_TOP} 0%, #3E3D3A ${Math.max(10, (horizon / 1080) * 100 - 5)}%, ${FOG} ${(horizon / 1080) * 100 + 8}%, #222 100%)`}} />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: 'blur(2.5px)'}}>
        {far}
      </svg>
      <DepthLayers items={items} far={26} near={0.9} farBlur={2.5} nearBlur={14} />
      <AbsoluteFill style={{background: `linear-gradient(90deg, rgba(74,73,70,${0.75 * close}) 0%, rgba(74,73,70,0) 32%, rgba(74,73,70,0) 68%, rgba(74,73,70,${0.75 * close}) 100%)`}} />
      <AbsoluteFill style={{background: `radial-gradient(ellipse 60% 30% at ${50 + Math.sin(frame / 50) * 8}% ${(horizon / 1080) * 100}%, rgba(74,73,70,${0.3 + close * 0.3}), rgba(74,73,70,0) 70%)`}} />
      {swirl > 0.01 ? (
        <AbsoluteFill style={{opacity: swirl}}>
          <AbsoluteFill style={{background: FOG, opacity: 0.6}} />
          <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: 'blur(16px)'}}>
            {Array.from({length: 7}, (_, i) => {
              const r = 120 + i * 120;
              const a = (frame - S.s46.end) * 0.05 + i * 0.7;
              return <ellipse key={i} cx={960 + Math.cos(a) * 40} cy={540 + Math.sin(a) * 30} rx={r} ry={r * 0.92} fill="none" stroke={i % 2 ? '#2B2B2B' : '#6E6C67'} strokeWidth={60} opacity={0.5} transform={`rotate(${a * 57} 960 540)`} />;
            })}
          </svg>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
