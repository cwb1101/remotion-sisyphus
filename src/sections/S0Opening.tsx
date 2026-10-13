/**
 * §0 开头 · 雾中的石柱大厅
 * 100 个剪影站成 10×10 方阵 → 15 个熄掉轮廓光、转身走进雾里 → 镜头侧移 →
 * 人群散进雾，只剩灯下一个人和一把空椅子 → 他抬头（关键句）→ 镜头推进椅背，竖条缝里透出光，接 §1。
 * 所有时间点取自 script.ts：s01–s05 的起止帧和 s02 的 tick 音效。
 */
import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';
import {Chair} from '../components/Chair';
import {Figure} from '../components/Figure';
import {HEAD_DOWN, LOOK_UP, STAND, addPose, poseAt, walk} from '../components/poses';
import {SubtitleTrack} from '../components/Subtitle';
import {cueTimes, screen, screensOf, slamFrame} from '../data/timeline';
import {impactAt} from '../engine/impact';
import {Cam, V3, fogAt, pathOf, project, projectPoly} from '../engine/projection';
import {DepthLayers, Dust, Item, LightCone, camPath} from '../engine/world';
import {C, mix} from '../theme';

const S = {
  s01: screen('s01'),
  s02: screen('s02'),
  s03: screen('s03'),
  s04: screen('s04'),
  s05: screen('s05'),
};
const FOG = '#2A2A2C';
const LAMP: V3 = {x: -0.35, y: 4.3, z: 9.05};
const HERO: V3 = {x: -0.5, y: 0, z: 9};
const CHAIR: V3 = {x: 0.32, y: 0, z: 9.2};
const CHAIR_YAW = 200; // 椅背朝镜头，略侧

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 10×10 方阵（固定 seed，每次渲染一致） */
type Member = {i: number; row: number; col: number; p: V3; h: number; hero: boolean; leave: number};
const leaveTicks = cueTimes('s02', 'tick');
const CROWD: Member[] = (() => {
  const out: Member[] = [];
  for (let row = 0; row < 10; row++)
    for (let col = 0; col < 10; col++) {
      const i = row * 10 + col;
      const hero = row === 0 && col === 4;
      out.push({
        i,
        row,
        col,
        hero,
        h: hero ? 1 : 0.93 + random(`h${i}`) * 0.12,
        p: {
          x: (col - 4.5) * 1.0 + (hero ? 0 : (random(`jx${i}`) - 0.5) * 0.22),
          y: 0,
          z: 9 + row * 1.05 + (hero ? 0 : (random(`jz${i}`) - 0.5) * 0.25),
        },
        leave: -1,
      });
    }
  // 选 15 个离开的人：不选主角；row0 col5（椅子的位置）一定离开
  // 多从前五排里挑，方阵里留下的空位才看得见
  const pool = out
    .filter((m) => !m.hero && !(m.row === 0 && m.col === 5) && m.row < 5)
    .sort((a, b) => random(`pick${a.i}`) - random(`pick${b.i}`));
  const leavers = [out[5], ...pool.slice(0, 14)].sort((a, b) => a.row - b.row || a.col - b.col);
  leavers.sort((a, b) => random(`ord${a.i}`) - random(`ord${b.i}`));
  leavers.forEach((m, k) => (m.leave = leaveTicks[k]));
  return out;
})();

export const cameraS0 = (frame: number): Cam =>
  camPath(frame, [
    {f: S.s01.start, x: 0, y: 1.62, z: -0.6, yaw: 0, pitch: -1},
    {f: S.s02.end, x: 0.25, y: 1.6, z: 1.0, yaw: -1.5, pitch: -1},
    {f: S.s03.end - 10, x: 2.4, y: 1.5, z: 2.6, yaw: -14, pitch: -1.5},
    {f: S.s04.end - 4, x: -0.1, y: 1.36, z: 5.8, yaw: -3, pitch: -1},
    {f: S.s05.start + 40, x: 0.1, y: 1.45, z: 6.62, yaw: 0, pitch: 0.5},
    {f: S.s05.end - 34, x: 0.16, y: 1.4, z: 6.95, yaw: 0.8, pitch: 0},
    {f: S.s05.end + 14, x: CHAIR.x + 0.02, y: 0.69, z: CHAIR.z - 0.36, yaw: 0, pitch: 0},
  ]);

/** 主角（在 §0 里一直面对镜头） */
const heroPose = (f: number) =>
  poseAt(f, [
    {from: 0, pose: (ff) => addPose(STAND, {lean: Math.sin(ff / 38) * 0.8})},
    {from: S.s04.start + 12, pose: HEAD_DOWN, blend: 26},
    {from: slamFrame(S.s05) - 10, pose: LOOK_UP, blend: 14},
  ]);

export const S0Opening: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const frame = useCurrentFrame();
  const cam = cameraS0(frame);
  const hit = impactAt(frame);
  const slam5 = slamFrame(S.s05);
  // 灯：关键句落地时猛亮一下再颤
  const flick = frame >= slam5 ? Math.exp(-(frame - slam5) / 6) * 1.2 + (frame - slam5 < 20 ? 0.25 * Math.sin((frame - slam5) * 2.3) : 0) : 0;
  const lamp = 0.85 + 0.06 * Math.sin(frame / 9) + flick;
  // 人群散进雾的进度（s04）
  const dissolve = interpolate(frame, [S.s04.start, S.s04.end - 10], [0, 1], clamp);
  // 推进椅背的转场进度
  const push = interpolate(frame, [S.s05.end - 34, S.s05.end + 12], [0, 1], clamp);

  const items: Item[] = [];
  const fogD = 0.055 + dissolve * 0.05;

  // —— 石柱：两侧柱廊 + 后排 + 镜头前的两根大柱
  const pillars: {x: number; z: number; r: number}[] = [];
  for (let z = 3; z <= 44; z += 4.2) {
    pillars.push({x: -6.2, z, r: 0.5}, {x: 6.2, z, r: 0.5});
  }
  for (let x = -9; x <= 9; x += 3) pillars.push({x, z: 27, r: 0.55});
  pillars.push({x: -2.3, z: 2.4, r: 0.42}, {x: 3.5, z: 3.1, r: 0.42});
  pillars.forEach((pl, k) => {
    const b = project({x: pl.x, y: 0, z: pl.z}, cam);
    const t = project({x: pl.x, y: 40, z: pl.z}, cam);
    if (b.z < 0.4) return;
    const fog = fogAt(b.z, fogD, 2);
    const wb = pl.r * b.s;
    const wt = pl.r * t.s;
    // 镜头前的近景柱子是逆光剪影：不画亮面
    const nearPillar = b.z < 4;
    const body = nearPillar ? C.black : mix(C.dark, FOG, fog);
    const hiSide = pl.x < LAMP.x ? 1 : -1; // 迎灯一侧亮
    const strip = (o0: number, o1: number) =>
      `M${b.x + wb * o0},${b.y}L${b.x + wb * o1},${b.y}L${t.x + wt * o1},${t.y}L${t.x + wt * o0},${t.y}Z`;
    items.push({
      key: `pl${k}`,
      z: b.z,
      node: (
        <g>
          <path d={strip(-1, 1)} fill={body} />
          {nearPillar ? null : <path d={strip(hiSide > 0 ? 0.25 : -0.75, hiSide > 0 ? 0.75 : -0.25)} fill={mix(C.mid, FOG, fog)} opacity={0.55} />}
          <path d={strip(hiSide > 0 ? -1 : 0.6, hiSide > 0 ? -0.6 : 1)} fill={C.black} opacity={0.5 * (1 - fog)} />
          {/* 柱础 */}
          <path d={`M${b.x - wb * 1.3},${b.y}L${b.x + wb * 1.3},${b.y}L${b.x + wb * 1.25},${b.y - pl.r * 0.5 * b.s}L${b.x - wb * 1.25},${b.y - pl.r * 0.5 * b.s}Z`} fill={mix(C.deep, FOG, fog)} />
        </g>
      ),
    });
  });

  // —— 人群 + 主角
  CROWD.forEach((m) => {
    let p = m.p;
    let op = 1;
    let rim = 1;
    let view: 'front' | 'back' = 'front';
    let pose = addPose(STAND, {
      lean: (random(`ln${m.i}`) - 0.5) * 5 + Math.sin(frame / (34 + m.i % 7) + m.i) * 0.7,
      neck: (random(`nk${m.i}`) - 0.3) * 14,
      lSh: (random(`la${m.i}`) - 0.5) * 8,
      rSh: (random(`ra${m.i}`) - 0.5) * 8,
      armOut: random(`ao${m.i}`) * 6,
    });
    if (m.hero) pose = heroPose(frame);
    if (m.leave > 0) {
      const t = frame - m.leave;
      rim = interpolate(t, [0, 4], [1, 0], clamp);
      if (t > 8) {
        view = 'back';
        const wt = t - 8;
        const dz = Math.max(0, wt) * 0.045;
        p = {x: m.p.x + Math.sin(m.i) * dz * 0.15, y: 0, z: m.p.z + dz};
        pose = walk((wt / 32) % 1, interpolate(wt, [0, 10], [0, 1], clamp));
        op = interpolate(wt, [10, 70], [1, 0], clamp);
      }
    }
    if (!m.hero) {
      // 方阵从后往前、从两侧向中间散进雾
      const order = (Math.abs(m.col - 4) + (9 - m.row)) / 18;
      op *= 1 - interpolate(dissolve, [order * 0.6, order * 0.6 + 0.4], [0, 1], clamp);
    }
    if (op <= 0.01) return;
    const q = project(p, cam);
    if (q.z < 0.6) return;
    const fog = fogAt(q.z, fogD, 3) * (m.hero ? 0.4 : 1);
    if (m.hero) {
      // 人群散开时他侧过身，转向身边的空椅子：正面 → 横向压窄 → 侧面（轮廓光落在脸的轮廓上）
      const turnT = interpolate(frame, [S.s04.start + 2, S.s04.start + 22], [0, 1], clamp);
      const side = turnT >= 0.5;
      const sx = side ? 0.4 + (turnT - 0.5) * 1.2 : 1 - turnT * 1.2;
      items.push({
        key: 'hero',
        z: q.z,
        node: (
          <g transform={`translate(${q.x},0) scale(${sx},1) translate(${-q.x},0)`}>
            <Figure pose={pose} view={side ? 'side' : 'front'} facing={1} x={q.x} y={q.y} scale={q.s} rim={1} light={side ? 1 : 0} fog={fog} fogColor={FOG} />
          </g>
        ),
      });
      return;
    }
    items.push({
      key: `m${m.i}`,
      z: q.z,
      node: <Figure pose={pose} view={view} x={q.x} y={q.y} scale={q.s} height={m.h} rim={rim} light={0} fog={fog} fogColor={FOG} opacity={op} />,
    });
  });

  // —— 贯穿物件：空椅子（人群散开时从雾里显出来，推镜时占满画面）
  {
    const q = project(CHAIR, cam);
    if (q.z > 0.2) {
      const dx = CHAIR.x - cam.x;
      const dz = CHAIR.z - cam.z;
      const view = (Math.atan2(dx, dz) * 180) / Math.PI;
      const tilt = (Math.atan2(cam.y - 0.5, Math.hypot(dx, dz)) * 180) / Math.PI;
      const appear = interpolate(dissolve, [0.35, 0.9], [0, 1], clamp);
      items.push({
        key: 'chair',
        z: Math.max(q.z, 0.8), // 推镜到很近时仍放在中景层，保持清晰
        node: (
          <Chair
            x={q.x}
            y={q.y}
            scale={q.s}
            yaw={CHAIR_YAW - cam.yaw - view}
            tilt={tilt}
            lit={0.75 + flick * 0.2}
            light={-1}
            fog={fogAt(q.z, fogD, 3) * (1 - appear * 0.7)}
            fogColor={FOG}
            opacity={appear}
            gapGlow={push * 0.9}
          />
        ),
      });
    }
  }

  // —— 地面
  const floor = projectPoly(
    [
      {x: -40, y: 0, z: 0.2},
      {x: 40, y: 0, z: 0.2},
      {x: 40, y: 0, z: 60},
      {x: -40, y: 0, z: 60},
    ],
    cam,
  );
  const horizon = project({x: cam.x, y: cam.y, z: cam.z + 200}, cam).y;
  const lampP = project(LAMP, cam);

  return (
    <AbsoluteFill style={{opacity, transform: `translate(${hit.x}px, ${hit.y}px) scale(1.02)`}}>
      {/* 背景：上暗下雾，地平线处一条雾带 */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(180deg, ${C.black} 0%, ${C.deep} ${Math.max(5, (horizon / 1080) * 100 - 30)}%, ${FOG} ${(horizon / 1080) * 100}%, ${C.deep} ${(horizon / 1080) * 100 + 22}%, ${C.black} 100%)`,
        }}
      />
      <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id="s0floor" x1="0" y1={horizon} x2="0" y2={1080} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={FOG} />
            <stop offset="0.35" stopColor={C.deep} />
            <stop offset="1" stopColor={C.black} />
          </linearGradient>
          <radialGradient id="s0back" cx={lampP.x} cy={horizon} r={900} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#3A3937" stopOpacity={0.7} />
            <stop offset="1" stopColor={C.black} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={1920} height={1080} fill="url(#s0back)" />
        <path d={pathOf(floor)} fill="url(#s0floor)" />
      </svg>

      <DepthLayers items={items} far={17} near={2.2} farBlur={2.6} nearBlur={14}>
        {/* 灯 + 光锥 + 尘埃：夹在中景和近景之间 */}
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: 'blur(10px)'}}>
          <LightCone id="s0cone" src={LAMP} floor={{x: LAMP.x + 0.1, y: 0, z: LAMP.z + 0.1}} radius={1.7} cam={cam} intensity={Math.min(1.6, lamp) * (0.4 + dissolve * 0.4)} />
        </svg>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          {lampP.z > 0.3 ? (
            <g>
              <line x1={lampP.x} y1={-10} x2={lampP.x} y2={lampP.y - lampP.s * 0.12} stroke={C.mid} strokeWidth={Math.max(1, lampP.s * 0.008)} opacity={0.6} />
              <path
                d={`M${lampP.x - lampP.s * 0.1},${lampP.y}L${lampP.x + lampP.s * 0.1},${lampP.y}L${lampP.x + lampP.s * 0.05},${lampP.y - lampP.s * 0.12}L${lampP.x - lampP.s * 0.05},${lampP.y - lampP.s * 0.12}Z`}
                fill={C.dark}
              />
              <defs>
                <radialGradient id="s0bulb">
                  <stop offset="0" stopColor={C.accent} stopOpacity={0.95} />
                  <stop offset="0.25" stopColor={C.accent} stopOpacity={0.35} />
                  <stop offset="1" stopColor={C.accent} stopOpacity={0} />
                </radialGradient>
              </defs>
              <circle cx={lampP.x} cy={lampP.y + lampP.s * 0.01} r={lampP.s * (0.16 + flick * 0.12)} fill="url(#s0bulb)" opacity={Math.min(1, lamp)} />
            </g>
          ) : null}
          <Dust
            seed="s0dust"
            n={90}
            box={{x0: LAMP.x - 2, x1: LAMP.x + 2, y0: 0.2, y1: 4, z0: LAMP.z - 2.5, z1: LAMP.z + 2}}
            cam={cam}
            frame={frame}
            bright={(p) => Math.max(0, 1 - Math.hypot(p.x - LAMP.x, p.z - LAMP.z) / (0.5 + (LAMP.y - p.y) * 0.32)) * 0.8}
          />
        </svg>
      </DepthLayers>

      {/* 雾层：两层慢速漂移的雾带，随镜头视差移动 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 18% at ${50 - cam.x * 2 + Math.sin(frame / 90) * 4}% ${(horizon / 1080) * 100 + 4}%, rgba(58,57,55,${0.35 + dissolve * 0.35}), rgba(58,57,55,0) 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 50% 12% at ${40 - cam.x * 5 + frame * 0.02}% ${(horizon / 1080) * 100 + 14}%, rgba(42,42,44,${0.4 + dissolve * 0.3}), rgba(42,42,44,0) 70%)`,
        }}
      />

      <SubtitleTrack screens={screensOf('opening')} layer="under" />
    </AbsoluteFill>
  );
};
