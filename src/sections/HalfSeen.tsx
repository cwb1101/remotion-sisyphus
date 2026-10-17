import React from 'react';
import { random, useCurrentFrame } from 'remotion';
import { Balloon } from '../components/Balloon';
import { Figure, figureJoints, POSES, poseTrack, type FigureProps, type Pose } from '../components/Figure';
import { Drift } from '../components/Particles';
import { at, screen } from '../data/script';
import { type Cam, camTransform, clamp, ease, mixCam, prog, track } from '../lib/anim';
import { C } from '../theme';
import { EARLY_GROUND, cue, earlyRig } from './rigs';

/**
 * 看透只看了一半（屏 14–18）：接着上一节推到脚的镜头，同一片夜色旷野。
 * 脚下出现一排“经历”砖，只有一块是实的；气球的光在地上铺出几条路，又一条条断掉；
 * 最后推近气球，它只有朝上的半边亮着——下一节从这颗半亮的球拉出来。
 */
const T0 = at(14);
const base = earlyRig(T0); // 交接帧：人物、气球、机位都从上一节的最后状态接着走
const G = EARLY_GROUND;

const LOOK_RIGHT: Pose = { ...POSES.dangle, head: -22, torso: 6 };
const LEAN: Pose = { ...POSES.dangle, torso: 16, head: -12, lHip: 18, lKn: -8, rHip: 34, rKn: -6 };
const RETRACT: Pose = { ...POSES.dangle, torso: -4, head: 4, lHip: 70, lKn: -112, rHip: 82, rKn: -118 };
const TOE: Pose = { ...POSES.reachDown, rHip: 4, rKn: 0, lHip: -16, lKn: -24 };

/** 屏 18 结束时气球在屏幕上的位置和大小——下一节从这里接 */
export const HALF_END_BALLOON = { x: 600, y: 360, r: 420 };

const PATHS = [
  { end: { x: 1500, y: 812 }, bend: -40, cut: 0.62 },
  { end: { x: 1440, y: 852 }, bend: -20, cut: 0.7 },
  { end: { x: 1580, y: 902 }, bend: 10, cut: 0.55 },
  { end: { x: 1360, y: 952 }, bend: 30, cut: 0.66 },
];

export const halfRig = (f: number) => {
  const c14 = cue(14);
  const h0 = base.teen.hover ?? 0;
  const hover = track(f, [
    [T0, h0],
    [c14 - 10, h0 + 2],
    [c14, 3],
    [c14 + 20, h0],
    [at(15), h0 + 2],
    [at(18), h0 + 10],
  ]);
  const pose = poseTrack(
    f,
    [
      [T0, base.teen.pose],
      [c14 - 10, TOE],
      [c14 + 20, base.teen.pose],
      [at(15) + 4, LOOK_RIGHT],
      [at(16) + 4, LOOK_RIGHT],
      [at(16) + 26, LEAN],
      [at(17) + 4, LEAN],
      [at(17) + 24, RETRACT],
    ],
    ease.inOut,
  );
  const teen: FigureProps = { ...base.teen, pose, hover };
  const hand = figureJoints(teen).nearHand;
  const r = base.balloon.r + 4 * prog(f, at(18), at(18) + 40);
  const sway = Math.sin(f / 19) * 7;
  const stringLen = base.balloon.anchor.y - base.balloon.cy - base.balloon.r;
  const balloon = {
    cx: hand.x + 14 + sway * 0.5,
    cy: hand.y - stringLen - r,
    r,
    rings: 3,
    glow: base.balloon.glow - 0.3 * prog(f, at(17), at(17) + 40),
    anchor: hand,
    sway,
    halfDark: prog(f, cue(18) - 2, cue(18) + 34),
  };

  // 机位：先接住上一节（推到脚）→ 屏 15 拉开成低机位全景看地上的路 → 屏 18 推近气球
  const own: Cam = {
    z: track(f, [[T0, 1.75], [at(15), 1.6], [at(15) + 34, 0.92], [at(18), 1.0]]),
    fx: track(f, [[T0, 612], [at(15), 640], [at(15) + 34, 980], [at(18), 1010]]),
    fy: track(f, [[T0, 790], [at(15), 780], [at(15) + 34, 700], [at(18), 690]]),
    sx: track(f, [[T0, 900], [at(15) + 34, 960]]),
    sy: track(f, [[T0, 560], [at(15) + 34, 520]]),
  };
  const close: Cam = { z: HALF_END_BALLOON.r / r, fx: balloon.cx, fy: balloon.cy, sx: HALF_END_BALLOON.x, sy: HALF_END_BALLOON.y };
  let cam = mixCam(base.cam, own, prog(f, T0, T0 + 30));
  cam = mixCam(cam, close, prog(f, at(18) + 4, screen(18).endFrame - 6, ease.inOut));
  return { cam, teen, balloon };
};

export const HalfSeen: React.FC<{ opacity: number }> = ({ opacity }) => {
  const f = useCurrentFrame();
  const { cam, teen, balloon } = halfRig(f);
  const foot = { x: teen.x + 18, y: G + 4 };
  const darken = prog(f, at(17), at(17) + 40);

  // 屏 14：一排“经历”砖，只有脚下那块是实心的
  const tiles = Array.from({ length: 7 }, (_, i) => {
    const x = 312 + i * 100;
    const delay = Math.abs(i - 3) * 4;
    return { x, solid: i === 3, show: prog(f, T0 + delay, T0 + delay + 12) * (i === 3 ? 1 : 1 - prog(f, at(15) + 10, at(15) + 30)) };
  });

  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity }}>
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E1124" />
          <stop offset="62%" stopColor="#1A2142" />
          <stop offset="100%" stopColor="#273158" />
        </linearGradient>
        <radialGradient id="hs-horizon">
          <stop offset="0%" stopColor="#5C6FB0" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#5C6FB0" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="hs-pool">
          <stop offset="0%" stopColor={C.think} stopOpacity={0.35} />
          <stop offset="100%" stopColor={C.think} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#hs-sky)" />
      <Drift seed="ea" count={90} frame={f} color="#C9D3FF" maxOpacity={0.55} h={820} speed={0.12} />
      <g transform={camTransform(cam)}>
        <ellipse cx={1000} cy={G} rx={1500} ry={220} fill="url(#hs-horizon)" />
        <rect x={-2000} y={G} width={6000} height={1400} fill="#151A2E" />
        <line x1={-2000} y1={G} x2={4000} y2={G} stroke={C.groundLine} strokeWidth={3} />
        {/* 气球投在地上的光 */}
        <ellipse cx={balloon.cx + 300} cy={G + 70} rx={700} ry={140} fill="url(#hs-pool)" opacity={prog(f, at(15), at(15) + 20) * (1 - darken)} />
        {tiles.map((t, i) =>
          t.show > 0 ? (
            <rect
              key={i}
              x={t.x - 42}
              y={G - 3}
              width={84}
              height={14}
              rx={3}
              fill={t.solid ? C.act : 'none'}
              fillOpacity={t.solid ? 0.9 : 0}
              stroke={C.act}
              strokeWidth={2.5}
              strokeDasharray={t.solid ? undefined : '8 6'}
              opacity={t.show * (t.solid ? 1 : 0.6)}
            />
          ) : null,
        )}
        {/* 屏 15–17：光路铺出去 → 一条条断开 → 断口碎成微粒往下掉 */}
        {PATHS.map((p, i) => {
          const draw = prog(f, at(15) + 6 + i * 6, at(15) + 36 + i * 6, ease.out);
          if (draw <= 0) return null;
          const brk = at(16) + 4 + i * 11;
          const cutK = prog(f, brk, brk + 6);
          const visible = Math.min(draw, cutK > 0 ? p.cut : 1);
          const ctrl = { x: (foot.x + p.end.x) / 2, y: (foot.y + p.end.y) / 2 + p.bend };
          const d = `M ${foot.x} ${foot.y} Q ${ctrl.x} ${ctrl.y} ${p.end.x} ${p.end.y}`;
          const fade = 1 - prog(f, at(17) + 6 + i * 4, at(17) + 40 + i * 4);
          const tail = 1 - cutK; // 断口以外那段迅速消失
          const pt = (t: number) => ({
            x: (1 - t) * (1 - t) * foot.x + 2 * (1 - t) * t * ctrl.x + t * t * p.end.x,
            y: (1 - t) * (1 - t) * foot.y + 2 * (1 - t) * t * ctrl.y + t * t * p.end.y,
          });
          const brkPt = pt(p.cut);
          const crumble = clamp((f - (at(17) + 4 + i * 4)) / 40);
          return (
            <g key={i}>
              <path d={d} fill="none" stroke={C.think} strokeWidth={16} strokeOpacity={0.14 * fade} pathLength={1} strokeDasharray={`${visible} 1`} />
              <path d={d} fill="none" stroke={C.think} strokeWidth={4} strokeOpacity={0.9 * fade} pathLength={1} strokeDasharray={`${visible} 1`} strokeLinecap="round" />
              {cutK > 0 && tail > 0 ? (
                <path d={d} fill="none" stroke={C.think} strokeWidth={4} strokeOpacity={0.9 * tail} pathLength={1} strokeDasharray={`0 ${p.cut + 0.03} ${1 - p.cut} 1`} />
              ) : null}
              {cutK > 0 && cutK < 1 ? <circle cx={brkPt.x} cy={brkPt.y} r={10 + 16 * cutK} fill="#FFE6C4" opacity={0.7 * (1 - cutK)} /> : null}
              {crumble > 0 && crumble < 1
                ? Array.from({ length: 14 }, (_, k) => {
                    const t = p.cut * (k / 13);
                    const q = pt(t);
                    const fall = crumble - random(`hs${i}${k}`) * 0.4;
                    if (fall <= 0) return null;
                    return <circle key={k} cx={q.x + (random(`hx${i}${k}`) - 0.5) * 12} cy={q.y + fall * fall * 160} r={3} fill={C.think} opacity={0.8 * (1 - fall)} />;
                  })
                : null}
            </g>
          );
        })}
        <rect x={-2000} y={G} width={6000} height={1400} fill="#000" opacity={0.3 * darken} />
        <Balloon id="hs-b" {...balloon} />
        <Figure {...teen} />
      </g>
      <rect width={1920} height={1080} fill="#05060C" opacity={0.28 * darken} />
    </svg>
  );
};
