/**
 * §1 少掉的那些人 · 长廊
 * 镜头从椅背的光缝里冲进长廊 → 跟在他背后走，两侧的门在他经过时一扇扇关上 →
 * 镜头压低、贴向左墙：墙边六把椅子，每把头顶一道光 → 光一盏盏熄灭，只剩一把，他在旁边停下 →
 * 后景所有门熄灭，镜头绕到他侧面，他回头 → 拿出手机，名单很短。
 * 门关上的帧 = s07 的 door 音效帧；椅子熄灭的帧 = s09 的 wood 音效帧。
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {Chair} from '../components/Chair';
import {Figure, View, solve} from '../components/Figure';
import {LOOK_BACK, PHONE, PHONE_HAND_DOWN, STAND, poseAt, walk} from '../components/poses';
import {SubtitleTrack} from '../components/Subtitle';
import {cueTimes, screen, screensOf} from '../data/timeline';
import {impactAt} from '../engine/impact';
import {Cam, V3, fogAt, pathOf, project, projectPoly} from '../engine/projection';
import {DepthLayers, Dust, Item, LightCone, camPath} from '../engine/world';
import {C, mix} from '../theme';

const S = {
  s06: screen('s06'),
  s07: screen('s07'),
  s08: screen('s08'),
  s09: screen('s09'),
  s10: screen('s10'),
  s11: screen('s11'),
};
const FOG = '#2A2A2A';
const HW = 1.6; // 半宽
const CEIL = 3.4;
const END_Z = 34;
const MAN_X = -0.35;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// —— 他的走位：匀速走，s09 中段减速停下（逐帧积分，便于对齐门和椅子）
const SPEED = 1.04 / 30;
const STOP_A = S.s09.start + 40;
const STOP_B = S.s09.start + 78;
const Z0 = 2.5;
const zTable: number[] = [];
{
  let z = Z0 - (S.s06.start - (S.s06.start - 40)) * SPEED;
  for (let f = S.s06.start - 40; f <= S.s11.end + 60; f++) {
    zTable.push(z);
    const v = SPEED * (1 - interpolate(f, [STOP_A, STOP_B], [0, 1], clamp));
    z += v;
  }
}
export const manZ = (f: number) => zTable[Math.max(0, Math.min(zTable.length - 1, Math.round(f - (S.s06.start - 40))))];
const STOP_Z = manZ(STOP_B + 5);

// —— 门：s07 每一个 door 音效对应他正经过的一扇门
type Door = {z: number; side: -1 | 1; close: number; w: number};
const doorCloses = cueTimes('s07', 'door');
const hush = S.s10.start;
const CHAIR_Z0 = 10.2;
const CHAIR_DZ = (STOP_Z - 0.3 - CHAIR_Z0) / 5;
const CHAIRS = Array.from({length: 6}, (_, i) => CHAIR_Z0 + i * CHAIR_DZ);
const DOORS: Door[] = (() => {
  const out: Door[] = [];
  // 很早以前就关上的门
  out.push({z: 1.6, side: -1, close: -999, w: 0.85}, {z: 3.0, side: 1, close: -999, w: 0.85}, {z: 4.4, side: -1, close: -999, w: 0.85});
  doorCloses.forEach((f, k) => out.push({z: manZ(f) - 0.5, side: k % 2 === 0 ? 1 : -1, close: f, w: 0.85}));
  // 前方还亮着的门：s10 开头从近到远一起熄灭
  let k = 0;
  for (let z = manZ(doorCloses[doorCloses.length - 1]) + 1.3; z < END_Z - 1; z += 1.25) {
    const side: -1 | 1 = k % 2 === 0 ? 1 : -1;
    const inChairZone = side === -1 && z > CHAIR_Z0 - 1.2 && z < STOP_Z + 0.8;
    if (!inChairZone) out.push({z, side, close: hush + 4 + k * 2, w: 0.85});
    k++;
  }
  return out;
})();
const chairOff = cueTimes('s09', 'wood'); // 0..4 号椅子依次熄灭，5 号留着

const smooth = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};

// 手机在世界里的位置（他面朝 +z，侧面视角里 x = 前方，y = 高度）
const PHONE_J = solve(PHONE, 'side', 1).hand[1];
const PHONE_W: V3 = {x: MAN_X, y: PHONE_J.y, z: STOP_Z + PHONE_J.x};
/** 沿着「镜头 → 手机」的方向，离手机 d 米的机位 */
const towardPhone = (from: {x: number; y: number; z: number}, d: number) => {
  const dx = PHONE_W.x - from.x;
  const dy = PHONE_W.y - from.y;
  const dz = PHONE_W.z - from.z;
  const L = Math.hypot(dx, dy, dz);
  return {
    x: PHONE_W.x - (dx / L) * d,
    y: PHONE_W.y - (dy / L) * d,
    z: PHONE_W.z - (dz / L) * d,
    yaw: (Math.atan2(dx, dz) * 180) / Math.PI,
    pitch: (Math.atan2(dy, Math.hypot(dx, dz)) * 180) / Math.PI,
  };
};
const SIDE_CAM = {x: 1.1, y: 1.55, z: STOP_Z + 1.05};

export const cameraS1 = (frame: number): Cam => {
  const follow = (f: number) => manZ(f) - 2.7;
  return camPath(frame, [
    {f: S.s06.start - 24, x: 0.25, y: 1.15, z: follow(S.s06.start) - 3.4, yaw: 0, pitch: -3},
    {f: S.s06.start + 40, x: -0.15, y: 1.52, z: follow(S.s06.start + 40), yaw: 0, pitch: -1},
    {f: S.s07.start, x: -0.15, y: 1.55, z: follow(S.s07.start), yaw: 0, pitch: -1},
    {f: S.s07.end - 12, x: 0.28, y: 1.55, z: follow(S.s07.end - 12), yaw: -2.5, pitch: -1},
    {f: S.s08.start + 70, x: -0.62, y: 0.62, z: follow(S.s08.start) + 1.2, yaw: -13, pitch: 2},
    {f: S.s09.end - 25, x: -0.6, y: 0.78, z: follow(S.s08.start) + 2.2, yaw: -9, pitch: 3},
    {f: S.s10.start + 45, x: 1.3, y: 1.3, z: STOP_Z - 0.6, yaw: -62, pitch: 0},
    {f: S.s10.end - 4, ...SIDE_CAM, yaw: -122, pitch: -2},
    {f: S.s11.start + 60, ...towardPhone(SIDE_CAM, 1.05)},
    {f: S.s11.end + 30, ...towardPhone(SIDE_CAM, 0.42)},
  ]);
};

const manPose = (f: number) =>
  poseAt(f, [
    {from: 0, pose: (ff) => walk(((ff - S.s06.start) / 34) % 1 + 1, interpolate(ff, [STOP_A, STOP_B], [1, 0], clamp))},
    {from: STOP_B, pose: STAND, blend: 10},
    {from: S.s10.start + 22, pose: LOOK_BACK, blend: 24},
    {from: S.s11.start + 2, pose: PHONE_HAND_DOWN, blend: 14},
    {from: S.s11.start + 16, pose: PHONE, blend: 20},
  ]);

/** 他在屏幕上的位置（follow 版式用） */
export const manScreenX = (frame: number) => project({x: MAN_X, y: 0, z: manZ(frame)}, cameraS1(frame)).x;

export const S1Corridor: React.FC<{opacity?: number}> = ({opacity = 1}) => {
  const frame = useCurrentFrame();
  const cam = cameraS1(frame);
  const hit = impactAt(frame);
  const items: Item[] = [];
  const fogD = 0.06 + interpolate(frame, [hush, hush + 60], [0, 0.05], clamp);

  // —— 墙、地、天花：沿 z 切片，按深度上雾色
  const slice = 1.5;
  for (let z = -12; z < END_Z; z += slice) {
    const zc = z + slice / 2;
    const depth = Math.max(0.1, zc - cam.z);
    const fog = fogAt(depth, fogD, 1);
    const wallC = mix('#19191A', FOG, fog);
    const floorC = mix('#0F0F10', FOG, fog * 0.9);
    const ceilC = mix('#0C0C0D', FOG, fog * 0.7);
    const quad = (pts: V3[], fill: string, k: string) => {
      const pp = projectPoly(pts, cam);
      if (pp) items.push({key: k, z: 400 + depth, node: <path d={pathOf(pp)} fill={fill} stroke={fill} strokeWidth={1} />});
    };
    quad([{x: -HW, y: 0, z}, {x: -HW, y: CEIL, z}, {x: -HW, y: CEIL, z: z + slice}, {x: -HW, y: 0, z: z + slice}], wallC, `wl${z}`);
    quad([{x: HW, y: 0, z}, {x: HW, y: CEIL, z}, {x: HW, y: CEIL, z: z + slice}, {x: HW, y: 0, z: z + slice}], wallC, `wr${z}`);
    quad([{x: -HW, y: 0, z}, {x: HW, y: 0, z}, {x: HW, y: 0, z: z + slice}, {x: -HW, y: 0, z: z + slice}], floorC, `fl${z}`);
    quad([{x: -HW, y: CEIL, z}, {x: HW, y: CEIL, z}, {x: HW, y: CEIL, z: z + slice}, {x: -HW, y: CEIL, z: z + slice}], ceilC, `cl${z}`);
  }
  // 尽头的墙
  {
    const pp = projectPoly([{x: -HW, y: 0, z: END_Z}, {x: HW, y: 0, z: END_Z}, {x: HW, y: CEIL, z: END_Z}, {x: -HW, y: CEIL, z: END_Z}], cam);
    if (pp) items.push({key: 'end', z: 399, node: <path d={pathOf(pp)} fill={mix('#19191A', FOG, fogAt(END_Z - cam.z, fogD, 1))} />});
  }
  // 墙裙线、踢脚线（只做透视陪衬）
  for (const side of [-1, 1]) {
    for (const yy of [0.12, 1.0, 2.6]) {
      const pp = projectPoly([{x: side * HW * 0.999, y: yy, z: -12}, {x: side * HW * 0.999, y: yy + 0.015, z: -12}, {x: side * HW * 0.999, y: yy + 0.015, z: END_Z}, {x: side * HW * 0.999, y: yy, z: END_Z}], cam);
      if (pp) items.push({key: `ln${side}${yy}`, z: 398, node: <path d={pathOf(pp)} fill={C.mid} opacity={0.16} />});
    }
  }

  // —— 门 + 门缝光
  DOORS.forEach((d, k) => {
    const open = d.close < -100 ? 0 : 1 - smooth((frame - d.close) / 9);
    const x = d.side * HW * 0.998;
    const depth = Math.max(0.2, d.z + d.w / 2 - cam.z);
    if (d.z + d.w < cam.z - 0.5) return;
    const fog = fogAt(depth, fogD, 1);
    const panel = projectPoly([{x, y: 0, z: d.z}, {x, y: 2.25, z: d.z}, {x, y: 2.25, z: d.z + d.w}, {x, y: 0, z: d.z + d.w}], cam);
    const frameP = projectPoly([{x, y: 0, z: d.z - 0.07}, {x, y: 2.33, z: d.z - 0.07}, {x, y: 2.33, z: d.z + d.w + 0.07}, {x, y: 0, z: d.z + d.w + 0.07}], cam);
    const gap = 0.012 + 0.07 * open;
    const slit = projectPoly([{x, y: 0, z: d.z + d.w - gap}, {x, y: 2.25, z: d.z + d.w - gap}, {x, y: 2.25, z: d.z + d.w}, {x, y: 0, z: d.z + d.w}], cam);
    const spill = projectPoly(
      [
        {x, y: 0.001, z: d.z + d.w - gap},
        {x, y: 0.001, z: d.z + d.w},
        {x: x - d.side * 1.3, y: 0.001, z: d.z + d.w + 0.55},
        {x: x - d.side * 1.3, y: 0.001, z: d.z + d.w - 0.35},
      ],
      cam,
    );
    const lightOp = open * (1 - fog * 0.6);
    items.push({
      key: `door${k}`,
      z: 300 + depth,
      node: (
        <g>
          <path d={pathOf(frameP)} fill={mix('#101011', FOG, fog)} />
          <path d={pathOf(panel)} fill={mix('#161617', FOG, fog)} />
          <path d={pathOf(slit)} fill={mix(C.paper, FOG, fog * 0.7)} opacity={0.15 + lightOp * 0.85} />
          {lightOp > 0.02 ? <path d={pathOf(spill)} fill={C.paper} opacity={0.09 * lightOp} style={{mixBlendMode: 'screen'}} /> : null}
        </g>
      ),
    });
  });
  // 尽头门缝（呼应 §0 的灯光，竖直一道）
  {
    const open = 1 - smooth((frame - hush - 30) / 12);
    const pp = projectPoly([{x: -0.04, y: 0, z: END_Z - 0.01}, {x: 0.04, y: 0, z: END_Z - 0.01}, {x: 0.04, y: 2.3, z: END_Z - 0.01}, {x: -0.04, y: 2.3, z: END_Z - 0.01}], cam);
    if (pp) items.push({key: 'endslit', z: 398.5, node: <path d={pathOf(pp)} fill={C.paper} opacity={0.2 + 0.75 * open} />});
  }

  // —— 贯穿物件：墙边六把椅子，每把头顶一道光；s09 依次熄灭，留下 5 号
  const chairLit = CHAIRS.map((_, i) => {
    const on = interpolate(frame, [S.s07.end - 30 + i * 6, S.s07.end + i * 6], [0, 1], clamp);
    const off = i < 5 ? 1 - smooth((frame - chairOff[i]) / 7) : 1;
    return on * off;
  });
  const cones: React.ReactNode[] = [];
  CHAIRS.forEach((z, i) => {
    const p: V3 = {x: -1.22, y: 0, z};
    const q = project(p, cam);
    if (q.z < 0.25) return;
    const dx = p.x - cam.x;
    const dz = p.z - cam.z;
    const view = (Math.atan2(dx, dz) * 180) / Math.PI;
    const tilt = (Math.atan2(cam.y - 0.5, Math.hypot(dx, dz)) * 180) / Math.PI;
    const fog = fogAt(q.z, fogD, 1);
    const lit = chairLit[i];
    items.push({
      key: `chair${i}`,
      z: q.z,
      // 椅子随头顶的光一起从暗处显出来（之前不露面，免得和他的剪影粘在一起）
      node: <Chair x={q.x} y={q.y} scale={q.s} yaw={-90 - cam.yaw - view} tilt={tilt} lit={0.12 + lit * 0.88} light={1} fog={fog * (1 - lit * 0.5)} fogColor={FOG} opacity={interpolate(frame, [S.s07.end - 40, S.s07.end + 10], [0, 1], clamp)} />,
    });
    if (lit > 0.01) cones.push(<LightCone key={`cone${i}`} id={`s1cone${i}`} src={{x: -1.2, y: CEIL, z}} floor={{x: -1.15, y: 0, z}} radius={0.62} cam={cam} intensity={lit * 0.9} />);
  });

  // —— 他
  {
    const z = manZ(frame);
    const p: V3 = {x: MAN_X, y: 0, z};
    const q = project(p, cam);
    if (q.z > 0.3) {
      // 根据镜头相对他的方位决定画背面还是侧面，侧面时朝向取他前进方向在屏幕上的走向
      const toCam = Math.atan2(cam.x - p.x, cam.z - p.z) * (180 / Math.PI);
      const rel = Math.abs(((toCam + 540) % 360) - 180); // 0 = 镜头在他正前方, 180 = 正后方
      const view: View = rel > 150 ? 'back' : rel < 30 ? 'front' : 'side';
      const ahead = project({x: MAN_X, y: 0, z: z + 0.5}, cam);
      const facing: 1 | -1 = ahead.x >= q.x ? 1 : -1;
      const pose = manPose(frame);
      const phone = interpolate(frame, [S.s11.start + 14, S.s11.start + 30], [0, 1], clamp);
      const fog = fogAt(q.z, fogD, 2) * 0.7;
      items.push({
        key: 'man',
        z: q.z,
        node: <Figure pose={pose} view={view} facing={facing} x={q.x} y={q.y} scale={q.s} rim={1} light={view === 'side' ? -facing : 0} fog={fog} fogColor={FOG} phone={view === 'side' ? phone : 0} phoneDevice={false} />,
      });
      // 手机屏幕（特写时画在屏幕空间，朝向镜头）
      if (view === 'side' && phone > 0) {
        const j = solve(pose, 'side', facing);
        const h = j.hand[1];
        const hp = {x: q.x + h.x * q.s, y: q.y - h.y * q.s};
        const lightOn = interpolate(frame, cueTimes('s11', 'beep').map((b) => [b - 2, b + 3]).flat(), [0, 1], clamp);
        const dark = interpolate(frame, [S.s11.end - 6, S.s11.end + 16], [1, 0], clamp);
        items.push({key: 'phone', z: q.z - 0.05, node: <PhoneScreen x={hp.x} y={hp.y} s={q.s} frame={frame} on={lightOn * dark} show={phone} />});
      }
    }
  }

  const followHorizon = project({x: cam.x, y: cam.y, z: cam.z + 300}, cam).y;
  return (
    <AbsoluteFill style={{opacity, transform: `translate(${hit.x}px, ${hit.y}px) scale(1.02)`, background: C.black}}>
      <DepthLayers items={items} far={14} near={0.75} farBlur={2.4} nearBlur={13}>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, filter: 'blur(8px)'}}>
          {cones}
        </svg>
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <Dust
            seed="s1dust"
            n={110}
            box={{x0: -1.5, x1: 1.5, y0: 0.1, y1: 3.2, z0: cam.z + 0.5, z1: cam.z + 9}}
            cam={cam}
            frame={frame}
            bright={(p) => {
              let b = 0.06;
              CHAIRS.forEach((z, i) => {
                const d = Math.hypot(p.x + 1.2, p.z - z);
                b += chairLit[i] * Math.max(0, 1 - d / 0.7) * 0.8;
              });
              return b;
            }}
          />
        </svg>
      </DepthLayers>
      {/* 后景雾往前涌（s10） */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 40% 30% at 50% ${(followHorizon / 1080) * 100}%, rgba(42,42,42,${0.25 + interpolate(frame, [hush, hush + 70], [0, 0.45], clamp)}), rgba(42,42,42,0) 70%)`,
        }}
      />
      <SubtitleTrack screens={screensOf('corridor')} layer="under" />
    </AbsoluteFill>
  );
};

/** 手机屏幕：短短一列联系人（灰条），拇指往下划，很快到底 */
const PhoneScreen: React.FC<{x: number; y: number; s: number; frame: number; on: number; show: number}> = ({x, y, s, frame, on, show}) => {
  const w = 0.072 * s;
  const h = 0.15 * s;
  const t0 = screen('s11').start + 46;
  // 列表上滑：先快后慢，到底后回弹一下
  const scroll = interpolate(frame, [t0, t0 + 22, t0 + 30, t0 + 38], [0, 1.08, 0.96, 1], clamp);
  const rows = 4;
  const rowH = h * 0.14;
  const listTop = h * 0.2 - scroll * rowH * 2.2;
  const id = `ph${Math.round(x)}`;
  return (
    <g transform={`translate(${x - w * 0.5},${y - h * 0.62}) rotate(-6 ${w / 2} ${h / 2})`} opacity={show}>
      <defs>
        <clipPath id={id}>
          <rect x={0} y={0} width={w} height={h} rx={w * 0.12} />
        </clipPath>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor={C.accent} stopOpacity={0.3 * on} />
          <stop offset="1" stopColor={C.accent} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={w / 2} cy={h / 2} rx={w * 0.85} ry={h * 0.62} fill={`url(#${id}g)`} style={{mixBlendMode: 'screen'}} />
      <rect x={-w * 0.04} y={-w * 0.04} width={w * 1.08} height={h + w * 0.08} rx={w * 0.15} fill={C.black} />
      <g clipPath={`url(#${id})`}>
        <rect width={w} height={h} fill={mix('#1A1814', C.accent, 0.18 * on)} />
        {Array.from({length: rows}, (_, i) => {
          const yy = listTop + i * rowH;
          return (
            <g key={i} opacity={on}>
              <circle cx={w * 0.18} cy={yy + rowH * 0.5} r={rowH * 0.28} fill={mix(C.mid, C.accent, 0.25)} />
              <rect x={w * 0.34} y={yy + rowH * 0.32} width={w * (0.5 - i * 0.07)} height={rowH * 0.16} rx={rowH * 0.08} fill={mix(C.light, C.accent, 0.2)} />
              <rect x={w * 0.34} y={yy + rowH * 0.6} width={w * 0.3} height={rowH * 0.1} fill={C.mid} opacity={0.6} />
            </g>
          );
        })}
        {/* 列表到底之后的空白 */}
        <rect x={w * 0.3} y={listTop + rows * rowH + rowH * 0.6} width={w * 0.4} height={1.5} fill={C.mid} opacity={0.5 * on} />
      </g>
    </g>
  );
};
