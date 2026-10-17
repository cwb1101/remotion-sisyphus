import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Balloon } from '../components/Balloon';
import { Drift } from '../components/Particles';
import { impactFrame } from '../components/BigWord';
import { at, screen } from '../data/script';
import { camTransform, clamp, ease, prog } from '../lib/anim';
import { C } from '../theme';
import { THESIS_GROUND, cue, orbR, orbWorld, thesisCam } from './rigs';

/**
 * 拆开命题（屏 03–06）：镜头钻进气球，它变成满屏的“想法之球”。
 * 上半是想法（色①），下面一条地面线是经历（色②）。
 */
export const Thesis: React.FC<{ opacity: number; extra?: string }> = ({ opacity, extra }) => {
  const f = useCurrentFrame();
  const cam = thesisCam(f);
  const o = orbWorld(f);
  const r = orbR(f);
  const lineDraw = prog(f, at(3) + 4, at(3) + 46, ease.out);

  // 屏 04：一颗色①光点从球里快速飞出，一颗色②光点在地面上慢慢爬
  const launch = cue(4);
  const fast = prog(f, launch, launch + 40, ease.in);
  const fastPt = {
    x: o.x + 120 + fast * 820,
    y: o.y - 40 - Math.sin(fast * Math.PI * 0.9) * 230 + fast * 60,
  };
  const trail = Array.from({ length: 14 }, (_, i) => {
    const t = Math.max(0, fast - i * 0.025);
    return { x: o.x + 120 + t * 820, y: o.y - 40 - Math.sin(t * Math.PI * 0.9) * 230 + t * 60, a: 1 - i / 14 };
  });
  const slow = prog(f, launch, screen(6).endFrame, ease.linear);
  const slowX = 250 + slow * 420;

  // 屏 05：砸“脑子”——冲击波环 + 暖色闪
  const h5 = impactFrame(screen(5));
  const wave5 = clamp((f - h5) / 34);
  // 屏 06：砸“人生”——沿地面向两边荡开的色②涟漪 + 全屏绿色铺光
  const h6 = impactFrame(screen(6));
  const wave6 = clamp((f - h6) / 40);
  // 涟漪从“人生”落地点荡开（大字框中心，取自 script.json）
  const landX = screen(6).bigWord!.x + screen(6).bigWord!.w / 2;
  const greenLine = f >= h6 ? clamp((f - h6) / 30) : 0;

  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity }}>
      <defs>
        <radialGradient id="th-bg" cx="57%" cy="33%" r="75%">
          <stop offset="0%" stopColor="#3D2C30" />
          <stop offset="55%" stopColor="#1E1927" />
          <stop offset="100%" stopColor="#12111C" />
        </radialGradient>
        <radialGradient id="th-green">
          <stop offset="0%" stopColor={C.act} stopOpacity={0.5} />
          <stop offset="100%" stopColor={C.act} stopOpacity={0} />
        </radialGradient>
      </defs>
      <g transform={extra}>
        <rect x={-200} y={-200} width={2320} height={1480} fill="url(#th-bg)" />
        <Drift seed="th" count={46} frame={f} color="#FFD7A8" maxOpacity={0.3} speed={-0.18} />
        <g transform={camTransform(cam)}>
          {/* 地面线：经历 */}
          <rect x={-300} y={THESIS_GROUND} width={2600} height={600} fill="#15131D" opacity={0.8} />
          <line x1={-300} y1={THESIS_GROUND} x2={-300 + 2600 * lineDraw} y2={THESIS_GROUND} stroke={C.groundLine} strokeWidth={4} />
          {greenLine > 0 ? (
            <line x1={landX - 1300 * greenLine} y1={THESIS_GROUND} x2={landX + 1400 * greenLine} y2={THESIS_GROUND} stroke={C.act} strokeWidth={5} opacity={0.9} />
          ) : null}
          {/* 慢的那颗：贴着地面爬 */}
          {/* 慢的那颗：屏 03 先在左边地面上亮起、呼吸，屏 04 开始贴着地面爬 */}
          {f >= at(3) + 16 ? (
            <g opacity={prog(f, at(3) + 16, at(3) + 30)}>
              <line x1={250} y1={THESIS_GROUND} x2={slowX} y2={THESIS_GROUND} stroke={C.act} strokeWidth={4} opacity={0.6} />
              <circle cx={slowX} cy={THESIS_GROUND} r={16 + 5 * Math.sin(f / 7)} fill={C.act} opacity={0.25} />
              <circle cx={slowX} cy={THESIS_GROUND} r={8} fill={C.act} />
            </g>
          ) : null}
          <Balloon
            id="th-orb"
            cx={o.x}
            cy={o.y}
            r={r}
            rings={3 + 0.6 * Math.sin(f / 30)}
            glow={0.9 + 0.5 * (1 - wave5) * (f >= h5 ? 1 : 0)}
            stringLen={70}
            sway={Math.sin(f / 22) * 14}
          />
          {/* 快的那颗：从想法里窜出去 */}
          {f >= launch && fast < 1
            ? trail.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={10 * p.a} fill={C.think} opacity={0.75 * p.a} />)
            : null}
          {f >= launch && fast < 1 ? <circle cx={fastPt.x} cy={fastPt.y} r={11} fill="#FFE6C4" /> : null}
          {/* 冲击波 */}
          {f >= h5 && wave5 < 1 ? (
            <circle cx={o.x} cy={o.y} r={r + wave5 * 1500} fill="none" stroke={C.think} strokeWidth={30 * (1 - wave5) + 2} opacity={0.55 * (1 - wave5)} />
          ) : null}
          {f >= h6 && wave6 < 1
            ? [0, 0.18].map((d, i) => {
                const w = clamp(wave6 - d);
                return (
                  <ellipse key={i} cx={landX} cy={THESIS_GROUND} rx={40 + w * 1500} ry={10 + w * 70} fill="none" stroke={C.act} strokeWidth={10 * (1 - w) + 1.5} opacity={0.7 * (1 - w)} />
                );
              })
            : null}
        </g>
        {/* 全屏级别的光：砸字那一下整屏染色，随后退去 */}
        {f >= h5 ? <rect width={1920} height={1080} fill={C.think} opacity={0.14 * Math.exp(-(f - h5) / 7)} /> : null}
        {f >= h6 ? (
          <ellipse cx={landX} cy={THESIS_GROUND} rx={1500} ry={900} fill="url(#th-green)" opacity={0.55 * Math.exp(-(f - h6) / 16)} />
        ) : null}
      </g>
    </svg>
  );
};
