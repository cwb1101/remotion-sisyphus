// 第三节 · 命名（第 18–21 屏）
// 光重新亮起、背景转回暖色，镜头退到中景；四周的尘埃一粒粒亮起（别的观察者），
// 朝地球聚拢成一圈轨道 → 「总观效应」砸下，一道光环推满全屏（重卡点）→ 轨道上的光点数到 746。
import React from 'react';
import { Note } from '../components/Label';
import type { SfxCue } from '../components/Soundtrack';
import { clamp, ease, hit, progress, rand, win } from '../film/anim';
import { S, barAtOrBefore, kickAtOrAfter, move } from '../film/cues';
import type { ShotKeys, ShotState } from '../film/shot';
import { toScreen } from '../film/shot';
import { C, R } from '../film/theme';

const m18 = move(S(18).start, 1.5); // 退到中景，光回来
const name = S(20).start; // 重卡点：总观效应
const punch = { from: barAtOrBefore(name - 1), to: name };
const m21 = move(S(21).start, 1.2);
const COUNT_FROM = kickAtOrAfter(S(21).start);
const COUNT_TO = S(21).end - 18;

export const namingKeys: ShotKeys = {
  s: [
    { f: S(18).start, v: 0.7 },
    { f: m18.to, v: 0.3 },
    { f: punch.from, v: 0.34, ease: ease.linear },
    { f: punch.to, v: 0.4, ease: ease.in },
    { f: S(20).end, v: 0.35, ease: ease.out },
    { f: m21.to, v: 0.32 },
  ],
  ay: [
    { f: S(18).start, v: 1340 },
    { f: m18.to, v: 600 },
  ],
  ambient: [
    { f: S(18).start, v: 0.5 },
    { f: m18.to, v: 1 },
    { f: name - 1, v: 1, ease: ease.linear },
    { f: name, v: 1.15, ease: ease.linear },
    { f: name + 20, v: 1, ease: ease.out },
  ],
  focus: [
    { f: S(18).start, v: 1 },
    { f: m18.to, v: 0 },
  ],
  speed: [
    { f: S(18).start, v: 0.3 },
    { f: m18.to, v: 1 },
    { f: name - 1, v: 1, ease: ease.linear },
    { f: name, v: 2.4, ease: ease.linear },
    { f: name + 40, v: 1, ease: ease.out },
  ],
  cool: [
    { f: S(18).start, v: 0.35 },
    { f: m18.to, v: 0 },
  ],
  lightAngle: [
    { f: S(18).start, v: -60 },
    { f: m18.to, v: -130 },
  ],
  beam: [
    { f: S(18).start, v: 0 },
    { f: m18.to, v: 0.15 },
  ],
  beamDX: [{ f: m18.to, v: 0 }],
  beamRot: [{ f: m18.to, v: 0 }],
  rim: [
    { f: name - 1, v: 1 },
    { f: name, v: 1.9, ease: ease.linear },
    { f: name + 25, v: 1.15, ease: ease.out },
  ],
};

export const namingSfx: SfxCue[] = [
  ...[0, 1, 2, 3].map((i) => ({ name: 'glint', at: kickAtOrAfter(S(18).start + i * 20), gain: 0.22 })),
  { name: 'rev_swell', at: name - 72, gain: 0.5, frames: 72 },
  { name: 'boom', at: name, gain: 1, heavy: true },
  { name: 'bell', at: name, gain: 0.5 },
  ...Array.from({ length: 8 }, (_, i) => ({ name: 'tick', at: Math.round(COUNT_FROM + (COUNT_TO - COUNT_FROM) * (1 - Math.pow(1 - i / 8, 1.6))), gain: 0.25 })),
];

/** 746 粒光点：去过太空的人。先散在四周，再聚成绕地球的一圈轨道 */
export const SPECK_N = 746;
const RING = 1.32 * R;
const SPECKS = Array.from({ length: SPECK_N }, (_, i) => {
  const a = rand(i * 1.37 + 3) * Math.PI * 2;
  const d = (1.7 + rand(i * 2.91 + 5) * 2.6) * R;
  return {
    sx: Math.cos(a) * d,
    sy: Math.sin(a) * d * 0.7,
    ringA: (i / SPECK_N) * Math.PI * 2 + (rand(i * 7.3) - 0.5) * 0.004,
    ringR: RING + (rand(i * 4.1) - 0.5) * 18,
    // 第 18 屏亮 60 粒，第 19 屏再亮 160 粒，其余在第 21 屏数出来
    lit:
      i < 60
        ? S(18).start + 6 + (i / 60) * 70
        : i < 220
          ? S(19).start + ((i - 60) / 160) * 60
          : COUNT_FROM + (COUNT_TO - COUNT_FROM) * (1 - Math.pow(1 - (i - 220) / (SPECK_N - 220), 1.6)),
    // 第 18 屏先亮的 60 粒大一些，要让人看见“一粒粒亮起来”
    size: (i < 60 ? 2.6 : 1.6) + rand(i * 9.7) * 1.4,
  };
});

/** 轨道整体转角：聚拢时转得快，命名之后慢下来 */
const ringSpin = (f: number) => {
  const t0 = S(19).start;
  if (f < t0) return 0;
  const fast = Math.min(f, name) - t0;
  const slow = Math.max(0, f - name);
  return fast * 0.006 + slow * 0.003;
};

export const speckPositions = (f: number, st: ShotState) => {
  const gather = (i: number) => (i < 220 ? ease.inOut(progress(f, S(19).start + (i % 30), name - 4)) : 1);
  const spin = ringSpin(f);
  return SPECKS.map((p, i) => {
    const g = gather(i);
    const a = p.ringA + spin;
    const rx = Math.cos(a) * p.ringR;
    const ry = Math.sin(a) * p.ringR;
    const wx = p.sx + (rx - p.sx) * g;
    const wy = p.sy + (ry - p.sy) * g;
    const q = toScreen(st, wx, wy);
    return { ...q, lit: clamp((f - p.lit) / 5), size: p.size };
  });
};

const Specks: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  // 第 22 屏镜头猛退时，光点跟着地球一起缩进那一粒光里，同时淡掉
  const fade = 1 - progress(f, S(22).start, S(22).start + 40);
  if (f < S(18).start || fade <= 0) return null;
  const pts = speckPositions(f, st);
  const flash = 1 + 1.5 * hit(f, name, 10);
  return (
    <g opacity={fade}>
      {pts.map((p, i) =>
        p.lit > 0 ? (
          <circle key={i} cx={p.x} cy={p.y} r={p.size * (1 + 1.5 * (1 - p.lit))} fill={i % 5 === 0 ? C.ivory : C.gold} opacity={Math.min(1, 0.85 * p.lit * flash)} />
        ) : null,
      )}
    </g>
  );
};

/** 重卡点：光环从轨道推开到全屏 */
const Shock: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  const t = f - name;
  if (t < 0 || t > 30) return null;
  const k = ease.out(t / 30);
  const r = RING * st.s + k * 1400;
  return <circle cx={st.cx} cy={st.cy} r={r} fill="none" stroke={C.gold} strokeWidth={6 * (1 - k) + 1} strokeOpacity={0.8 * (1 - k)} />;
};

export const NamingOverlay: React.FC<{ f: number; st: ShotState }> = ({ f, st }) => {
  const s20 = S(20);
  const parts = (s20.label ?? '').split(' · ');
  // 第 21 屏的计数：标签开头的数字跟着亮起的光点一起滚
  const s21 = S(21);
  const label21 = s21.label ?? '';
  const target = Number(label21.match(/^\d+/)?.[0] ?? SPECK_N);
  const n = Math.round(target * (220 / SPECK_N + (1 - 220 / SPECK_N) * (1 - Math.pow(1 - progress(f, COUNT_FROM, COUNT_TO), 1.6))));
  return (
    <>
      <Specks f={f} st={st} />
      <Shock f={f} st={st} />
      {parts.map((t, i) => (
        <Note key={i} y={600 + i * 44} text={t} size={i === 0 ? 30 : 26} opacity={win(f, name + 12 + i * 22, s20.end)} />
      ))}
      <Note y={930} size={30} text={label21.replace(/^\d+/, String(n))} opacity={win(f, s21.start + 4, s21.end)} />
    </>
  );
};

export const namingFlash = (f: number) => 0.26 * hit(f, name, 3);
