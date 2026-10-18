// 第一节 · 钩子（第 1–9 屏）
// 贴地的直线 → 镜头上升，线变弯 → 合成一个球 → 有人绕着看了一眼 → drop：主线问题
import React from 'react';
import { Label } from '../components/Label';
import { limbYAt } from '../components/Mote';
import type { SfxCue } from '../components/Soundtrack';
import { clamp, ease, hit, progress } from '../film/anim';
import { DROP, S, barAtOrBefore, kickAtOrAfter, kickNear, move } from '../film/cues';
import type { ShotKeys, ShotState } from '../film/shot';
import { toScreen } from '../film/shot';
import { C, R } from '../film/theme';

const m3 = move(S(3).start, 1.75); // 上升：线开始弯
const m4 = move(S(4).start, 1.2); // 弯成弧
const m5 = move(S(5).start, 1.6); // 合成一个球
const m7 = move(S(7).start, 1.2); // 小光点落回球面
const inhale = { from: S(8).start, to: kickNear(S(8).start + 30) }; // break：吸气
const punch = { from: barAtOrBefore(DROP - 1), to: DROP }; // 冲进 drop
const glint = { from: kickAtOrAfter(S(2).start), to: kickNear(S(2).start + 64) };
const orbitIn = kickAtOrAfter(S(6).start);

export const hookKeys: ShotKeys = {
  s: [
    { f: S(1).start, v: 3000 },
    { f: m3.from, v: 2400, ease: ease.linear },
    { f: m3.to, v: 6 },
    { f: m4.from, v: 5.2, ease: ease.linear },
    { f: m4.to, v: 1.5 },
    { f: m5.from, v: 1.35, ease: ease.linear },
    { f: m5.to, v: 0.3 },
    { f: inhale.from, v: 0.335, ease: ease.linear },
    { f: inhale.to, v: 0.3 },
    { f: punch.from, v: 0.3, ease: ease.linear },
    { f: punch.to, v: 0.4, ease: ease.in },
    { f: S(9).end, v: 0.42, ease: ease.linear },
  ],
  anchor: [
    { f: m5.from, v: 0 },
    { f: m5.to, v: 1 },
  ],
  // 第 1–2 屏地平线是直的，镜头只能靠缓慢上浮 + 横移（带动尘埃视差）保持呼吸
  ax: [
    { f: S(1).start, v: 1040 },
    { f: m3.from, v: 960, ease: ease.linear },
  ],
  ay: [
    { f: S(1).start, v: 722 },
    { f: m3.from, v: 690, ease: ease.linear },
    { f: m3.to, v: 735 },
    { f: m4.to, v: 670 },
    { f: m5.from, v: 665, ease: ease.linear },
    { f: m5.to, v: 560 },
  ],
  ambient: [
    { f: inhale.from, v: 1 },
    { f: inhale.to, v: 0.7 },
    { f: DROP - 1, v: 0.7, ease: ease.linear },
    { f: DROP, v: 1.15, ease: ease.linear },
    { f: DROP + 20, v: 1, ease: ease.out },
  ],
  speed: [
    { f: inhale.from, v: 1 },
    { f: inhale.to, v: 0.3 },
    { f: DROP - 1, v: 0.3, ease: ease.linear },
    { f: DROP, v: 2.6, ease: ease.linear },
    { f: DROP + 40, v: 1, ease: ease.out },
  ],
  rim: [
    { f: DROP - 1, v: 0.85 },
    { f: DROP, v: 1.9, ease: ease.linear },
    { f: DROP + 25, v: 1.15, ease: ease.out },
  ],
  beam: [
    { f: DROP - 1, v: 0 },
    { f: DROP, v: 1, ease: ease.linear },
    { f: DROP + 24, v: 1, ease: ease.linear },
    { f: DROP + 80, v: 0.45, ease: ease.out },
  ],
};

export const hookSfx: SfxCue[] = [
  { name: 'glint', at: glint.from, gain: 0.45 },
  { name: 'whoosh_up', at: m3.from, gain: 0.55 },
  { name: 'swell', at: m4.from, gain: 0.45 },
  { name: 'tick', at: orbitIn, gain: 0.5 },
  { name: 'thud', at: m7.to, gain: 0.7 },
  { name: 'rev_swell', at: DROP - 72, gain: 0.5, frames: 72 },
  { name: 'boom', at: DROP, gain: 1, heavy: true },
];

const ORBIT_R = 1.16 * R;
/** 绕行角度：按帧走，落地后停住（落点固定） */
const orbitAngle = (f: number) => -2.35 + (Math.min(f, m7.to) - orbitIn) * 0.011;

/** 金色反光沿地平线从左扫到右（第 2 屏；结尾第 40 屏原样再来一次） */
export const GlintSweep: React.FC<{ f: number; st: ShotState; from: number; to: number }> = ({ f, st, from, to }) => {
  const t = progress(f, from, to);
  if (f < from || f > to + 10) return null;
  const x = -150 + ease.inOut(t) * 2220;
  const y = limbYAt(st.cx, st.cy, st.r, x);
  const a = Math.sin(Math.PI * clamp(t)) * (f > to ? 1 - (f - to) / 10 : 1);
  return (
    <g opacity={a}>
      <defs>
        <radialGradient id="glint">
          <stop offset={0} stopColor={C.ivory} stopOpacity={1} />
          <stop offset={0.2} stopColor={C.gold} stopOpacity={0.6} />
          <stop offset={1} stopColor={C.gold} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y} rx={260} ry={46} fill="url(#glint)" />
      <ellipse cx={x} cy={y} rx={70} ry={3} fill={C.ivory} opacity={0.85} />
    </g>
  );
};

const Glint: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => <GlintSweep f={f} st={st} from={glint.from} to={glint.to} />;

/** 第 6–8 屏：一粒小光点绕球转，然后落回球面 */
const Orbiter: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  if (f < orbitIn - 2 || f > S(8).end) return null;
  const appear = clamp((f - orbitIn + 2) / 4);
  const land = ease.inOut(progress(f, m7.from, m7.to));
  const a0 = orbitAngle(f);
  const rad = ORBIT_R - (ORBIT_R - R) * land;
  const p = toScreen(st, Math.cos(a0) * rad, Math.sin(a0) * rad);
  const trailLen = 28 * (1 - land);
  const trail = Array.from({ length: Math.max(2, Math.round(trailLen)) }, (_, i) => {
    const a = a0 - i * 0.03;
    return toScreen(st, Math.cos(a) * rad, Math.sin(a) * rad);
  });
  const fadeOut = 1 - progress(f, S(8).start, S(8).start + 20);
  const ripple = f - m7.to;
  return (
    <g>
      <g opacity={appear * fadeOut}>
        <path
          d={`M ${trail.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' L ')}`}
          fill="none"
          stroke={C.gold}
          strokeWidth={2}
          strokeOpacity={0.4 * (1 - land)}
          strokeLinecap="round"
        />
        <circle cx={p.x} cy={p.y} r={14} fill={C.gold} opacity={0.18} />
        <circle cx={p.x} cy={p.y} r={4.5} fill={C.ivory} />
      </g>
      {ripple >= 0 && ripple < 40 ? (
        <circle cx={p.x} cy={p.y} r={8 + ripple * 2.2} fill="none" stroke={C.gold} strokeWidth={1.5} strokeOpacity={0.8 * (1 - ripple / 40)} />
      ) : null}
    </g>
  );
};

export const HookOverlay: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  const s3 = S(3);
  const s4 = S(4);
  const target = Number((s3.label ?? '').match(/(\d+)\s*km/)?.[1] ?? 400);
  const km = Math.round(target * ease.inOut(progress(f, m3.from, m3.to)));
  const labelX = 1380;
  const ly = limbYAt(st.cx, st.cy, st.r, labelX);
  const fade = (from: number, to: number) => clamp((f - from) / 8) * clamp((to - f) / 6);
  return (
    <>
      <Glint f={f} st={st} />
      <Label x={labelX} y={ly} dx={40} dy={-70} text={`高度 ${km} km`} opacity={fade(s3.start + 6, s3.end)} avoidSubtitle={false} />
      <Label x={labelX - 120} y={limbYAt(st.cx, st.cy, st.r, labelX - 120)} dx={40} dy={-80} size={24} text={s4.label ?? ''} opacity={0.85 * fade(m4.to - 10, s4.end)} avoidSubtitle={false} />
      <Orbiter f={f} st={st} />
    </>
  );
};

/** drop 的全屏闪光强度（给 Film 的闪光层用） */
export const hookFlash = (f: number) => 0.24 * hit(f, DROP, 3);
