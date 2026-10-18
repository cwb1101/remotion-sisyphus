// 第五节 · 机制（第 29–35 屏）
// 光点重新长成球，一直长到撑出画面四边（29–30，浩大）→ 退回中景，尘埃聚成一个小圆环想套住球，
// 被撑开、裂开（31，装不下）→ 圆环碎掉，在更远处重新合成一个大圆环（32，重画）
// → 一粒标着“我”的尘埃连同它的朱红边界一起缩小（33）→ 大圆环“我们”向外扩（34）
// → 镜头推回第 9 屏的构图，那束斜光回来，主线问题在下面淡淡浮现（35，回到开头的问题）。
// 圆环、“我”、各簇尘埃的朱红边界一直留到第 38 屏（金句）才断开，所以这一套画面（Bonds）两节共用。
import React from 'react';
import { Label, Note } from '../components/Label';
import type { SfxCue } from '../components/Soundtrack';
import { clamp, ease, hit, progress, rand, win } from '../film/anim';
import { S, kickAtOrAfter, kickNear, move } from '../film/cues';
import type { ShotKeys, ShotState } from '../film/shot';
import { toScreen } from '../film/shot';
import { C, R } from '../film/theme';

const m29 = move(S(29).start, 1.8); // 光点长回球
const m30 = move(S(30).start, 1.2); // 撑出画面
const m31 = move(S(31).start, 1.2); // 退回中景
const m32 = move(S(32).start, 1.5); // 再退，给大圆环让位
const m33 = move(S(33).start, 1.2);
const m34 = move(S(34).start, 1.2);
const m35 = move(S(35).start, 1.5); // 推回第 9 屏的构图

/** 第 38 屏：边界断开的那一拍（在这里也要用到） */
export const BREAK = S(38).start;

export const mechanismKeys: ShotKeys = {
  s: [
    { f: S(29).start, v: 0.0009 },
    { f: m29.to, v: 0.5 },
    { f: m30.from, v: 0.52, ease: ease.linear },
    { f: m30.to, v: 1.0 },
    { f: m31.from, v: 1.02, ease: ease.linear },
    { f: m31.to, v: 0.36 },
    { f: m32.from, v: 0.37, ease: ease.linear },
    { f: m32.to, v: 0.24 },
    { f: m33.from, v: 0.245, ease: ease.linear },
    { f: m33.to, v: 0.26 },
    { f: m34.from, v: 0.262, ease: ease.linear },
    { f: m34.to, v: 0.2 },
    { f: m35.from, v: 0.205, ease: ease.linear },
    { f: m35.to, v: 0.42 },
  ],
  // 横移、光束角都从上一节的末值接着走，不在这里写起点（否则接缝处会跳）
  ax: [{ f: m29.to, v: 960 }],
  ay: [
    { f: S(29).start, v: 560 },
    { f: m30.to, v: 540 },
    { f: m31.to, v: 560 },
  ],
  beam: [
    { f: S(29).start, v: 0.6 },
    { f: m29.to, v: 0.2 },
    { f: m31.to, v: 0.1 },
    { f: m35.from, v: 0.1, ease: ease.linear },
    { f: m35.to, v: 0.45 },
  ],
  beamDX: [{ f: m29.to, v: 0 }],
  beamRot: [{ f: m29.to, v: 0 }],
  cool: [
    { f: S(29).start, v: 0.25 },
    { f: m29.to, v: 0 },
  ],
  rim: [
    { f: m29.to, v: 1 },
    { f: m30.to, v: 1.35 },
    { f: m31.to, v: 1 },
  ],
  lightAmt: [
    { f: m29.to, v: 0.8 },
    { f: m30.to, v: 1 },
    { f: m31.to, v: 0.8 },
  ],
};

export const mechanismSfx: SfxCue[] = [
  { name: 'swell', at: S(29).start, gain: 0.4 },
  { name: 'whoosh_up', at: S(29).start, gain: 0.4 },
  { name: 'stretch', at: kickAtOrAfter(S(31).start + 10), gain: 0.4 },
  { name: 'glint_rev', at: S(32).start - 18, gain: 0.35 },
  { name: 'glint', at: S(32).start, gain: 0.35 },
  { name: 'tick', at: kickAtOrAfter(S(33).start), gain: 0.3 },
  { name: 'swell', at: S(34).start, gain: 0.35 },
  { name: 'rev_swell', at: S(36).start - 72, gain: 0.3, frames: 72 },
];

// ---- 圆环 ----
const OLD_N = 96;
const BIG_N = 240;
const formOld = { from: S(31).start, to: kickNear(S(31).start + 25) };
const strain = { from: formOld.to, to: S(31).end - 6 };
const shatter = { from: S(32).start, to: S(32).start + 26 };
const reform = { from: shatter.to, to: m32.to };
const widen = { from: S(34).start, to: m34.to };

const DOTS = Array.from({ length: BIG_N }, (_, i) => {
  const a = rand(i * 3.7 + 11) * Math.PI * 2;
  const d = (1.6 + rand(i * 5.9 + 2) * 1.2) * R;
  return {
    sx: Math.cos(a) * d,
    sy: Math.sin(a) * d,
    oldA: (i / OLD_N) * Math.PI * 2,
    bigA: (i / BIG_N) * Math.PI * 2,
    fly: 1.4 + rand(i * 8.1) * 0.9,
    // 撑开时这两段先裂开
    crack: (i >= 20 && i < 27) || (i >= 64 && i < 70),
  };
});

const bigRadius = (f: number) => (1.9 + 0.6 * ease.inOut(progress(f, widen.from, widen.to))) * R;

const dotPos = (i: number, f: number): { x: number; y: number; a: number } => {
  const d = DOTS[i];
  const spin = f * 0.0012;
  if (i < OLD_N && f < shatter.from) {
    const r = (0.55 + 0.47 * ease.inOut(progress(f, strain.from, strain.to))) * R;
    const rx = Math.cos(d.oldA + spin) * r;
    const ry = Math.sin(d.oldA + spin) * r;
    const g = ease.out(progress(f, formOld.from + (i % 12), formOld.to));
    const cracked = d.crack ? progress(f, strain.to - 22, strain.to) : 0;
    return { x: d.sx + (rx - d.sx) * g, y: d.sy + (ry - d.sy) * g, a: g * (1 - cracked) };
  }
  // 碎开 → 在大圆环上重新合拢
  const ox = i < OLD_N ? Math.cos(d.oldA) * R : d.sx * 0.9;
  const oy = i < OLD_N ? Math.sin(d.oldA) * R : d.sy * 0.9;
  const t1 = ease.out(progress(f, shatter.from, shatter.to));
  const fx = ox * (1 + (d.fly - 1) * t1);
  const fy = oy * (1 + (d.fly - 1) * t1);
  const g = ease.inOut(progress(f, reform.from + (i % 20) * 0.6, reform.to));
  const rb = bigRadius(f);
  const bx = Math.cos(d.bigA + spin) * rb;
  const by = Math.sin(d.bigA + spin) * rb;
  const appear = i < OLD_N ? 1 : clamp((f - shatter.from) / 10);
  return { x: fx + (bx - fx) * g, y: fy + (by - fy) * g, a: appear };
};

// ---- “我”和各簇尘埃 ----
const ME = { x: -1.25 * R, y: -0.8 * R };
const CLUSTERS = [20, 65, 110, 155, 245, 290, 335].map((deg, k) => {
  const a = (deg * Math.PI) / 180;
  const d = (1.42 + rand(k * 2.3) * 0.15) * R;
  return {
    x: Math.cos(a) * d,
    y: Math.sin(a) * d,
    pts: Array.from({ length: 5 }, (_, j) => ({ dx: (rand(k * 9 + j) - 0.5) * 0.14 * R, dy: (rand(k * 13 + j) - 0.5) * 0.14 * R })),
  };
});

/** 朱红边界：BREAK 之前是一整圈；BREAK 时断成碎片往外飞，变成金色尘埃 */
const Boundary: React.FC<{ f: number; cx: number; cy: number; r: number; seed: number; opacity: number }> = ({ f, cx, cy, r, seed, opacity }) => {
  if (opacity <= 0.001) return null;
  if (f < BREAK) {
    return <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.vermilion} strokeWidth={1.6} strokeOpacity={0.85 * opacity} />;
  }
  const t = (f - BREAK) / 45;
  if (t >= 1) return null;
  const k = ease.out(t);
  return (
    <g opacity={opacity * (1 - t)}>
      {Array.from({ length: 12 }, (_, j) => {
        const a0 = (j / 12) * Math.PI * 2 + rand(seed + j) * 0.2;
        const a1 = a0 + 0.36;
        const rr = r * (1 + k * (1.2 + rand(seed * 3 + j)));
        const p0 = { x: cx + Math.cos(a0) * rr, y: cy + Math.sin(a0) * rr };
        const p1 = { x: cx + Math.cos(a1) * rr, y: cy + Math.sin(a1) * rr };
        return (
          <line
            key={j}
            x1={p0.x}
            y1={p0.y}
            x2={p0.x + (p1.x - p0.x) * (1 - k)}
            y2={p0.y + (p1.y - p0.y) * (1 - k)}
            stroke={k > 0.3 ? C.gold : C.vermilion}
            strokeWidth={1.6 + 2 * k}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
};

export const BondsOverlay: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  if (f < S(31).start || f >= S(40).start) return null;
  // 第 39 屏镜头扎向球面时，这些都跟着淡掉
  const out = 1 - progress(f, S(39).start, S(39).start + 30);
  const breakFlash = 1 + 1.4 * hit(f, BREAK, 12);
  const meIn = win(f, S(33).start, S(40).start, 10, 1);
  const meShrink = ease.inOut(progress(f, S(33).start, m33.to));
  const me = toScreen(st, ME.x, ME.y);
  const clusterIn = clamp((f - S(34).start) / 20);
  return (
    <g opacity={out}>
      {DOTS.map((_, i) => {
        const p = dotPos(i, f);
        if (p.a <= 0.01) return null;
        const q = toScreen(st, p.x, p.y);
        return <circle key={i} cx={q.x} cy={q.y} r={2.4} fill={i % 4 === 0 ? C.ivory : C.gold} opacity={Math.min(1, 0.8 * p.a * breakFlash)} />;
      })}
      {CLUSTERS.map((c, k) => {
        const q = toScreen(st, c.x, c.y);
        return (
          <g key={k} opacity={clusterIn}>
            {c.pts.map((p, j) => {
              const pp = toScreen(st, c.x + p.dx, c.y + p.dy);
              return <circle key={j} cx={pp.x} cy={pp.y} r={2.2} fill={C.ivory} opacity={0.8} />;
            })}
            <Boundary f={f} cx={q.x} cy={q.y} r={0.13 * R * st.s} seed={k * 17} opacity={1} />
          </g>
        );
      })}
      <g opacity={meIn}>
        <circle cx={me.x} cy={me.y} r={9 - 5.5 * meShrink} fill={C.ivory} />
        <Boundary f={f} cx={me.x} cy={me.y} r={(0.16 - 0.09 * meShrink) * R * st.s} seed={99} opacity={1} />
        <Label x={me.x} y={me.y} dx={-40} dy={-40} align="right" size={34} text="我" opacity={win(f, S(33).start + 6, S(38).end)} />
      </g>
      <Label
        x={toScreen(st, Math.cos(-0.6) * bigRadius(f), Math.sin(-0.6) * bigRadius(f)).x}
        y={toScreen(st, Math.cos(-0.6) * bigRadius(f), Math.sin(-0.6) * bigRadius(f)).y}
        dx={50}
        dy={-40}
        size={34}
        text="我们"
        opacity={win(f, S(34).start + 6, S(38).end)}
      />
      <Label
        x={toScreen(st, 0, -0.55 * R).x}
        y={toScreen(st, 0, -0.55 * R).y}
        dx={160}
        dy={-180}
        text="旧认知"
        opacity={win(f, formOld.to, S(31).end)}
      />
    </g>
  );
};

export const MechanismOverlay: React.FC<{ f: number; st: ShotState }> = ({ f }) => (
  <>
    <Note y={930} text={S(29).label ?? ''} size={24} opacity={win(f, S(29).start + 10, S(29).end)} />
    <Note y={930} text={S(30).label ?? ''} size={24} opacity={win(f, S(30).start + 10, S(30).end)} />
    <Note y={930} text={S(31).label ?? ''} size={24} opacity={win(f, S(31).start + 10, S(31).end)} />
    <Note y={930} text={S(33).label ?? ''} size={24} opacity={win(f, S(33).start + 10, S(33).end)} />
    {/* 回到开头的问题：第 9 屏那句主线问题在下方淡淡浮现 */}
    <Note y={590} text={S(9).text} size={34} opacity={0.75 * win(f, S(35).start + 12, S(35).end, 14, 8)} />
  </>
);
