import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {Orb} from '../components/Orb';
import {Sfx} from '../components/Sfx';
import {easeIn, hash, inOut, lerp, lerpPt, noise1, out, type Pt, ramp} from '../lib/anim';
import type {Impact, Shot} from '../lib/camera';
import {cue} from '../lib/cues';
import {keyed, makeSlope, mixSlope} from '../lib/geom';
import {useTextPoints} from '../lib/textPoints';
import {COLORS, SERIF} from '../theme';
import {GODS_MERGE, RETURN} from './Myth';
import {DOT_R, PEAK_U, STONE_R, uInLoop} from './Opening';

// 第二节（第 16–23 屏）：惩罚。
// 众神的光环收缩成一块巨石，砸在新的山坡上 → 推到快到山顶又滚回 → 镜头拉远，几百座同样的山坡 →
// 定格、推回其中一座 → 山坡放平成一条书写线，粒子聚成“1942” → 石头胀大、压满画面 → 原地空转。

const S = RETURN;
export const PUN_SLOPE = makeSlope({x: S.x - 560, y: S.y + 300}, {x: S.x + 560, y: S.y - 220});
const SL = PUN_SLOPE;
/** 加缪段落里放平之后的书写线 */
export const LINE_Y = S.y + 40;
const FLAT = makeSlope({x: S.x - 800, y: LINE_Y}, {x: S.x + 800, y: LINE_Y});
const GAP = (STONE_R + DOT_R + 4) / SL.len;
const REST = FLAT.at(0.26, STONE_R);
const BIG_R = 330;
const BIG: Pt = {x: S.x - 150, y: LINE_Y - BIG_R};
const YEAR: Pt = {x: S.x + 160, y: LINE_Y - 520};
const GAUGE0: Pt = {x: S.x + 260, y: LINE_Y - 110};
const GAUGE1: Pt = {x: S.x + 760, y: LINE_Y - 110};

const cNear = cue('near-top');
const cAgain = cue('again');
const cNoEnd = cue('no-end');
const cWhyThis = cue('why-this');
const cCamus = cue('camus-1942');
const cThought = cue('gods-thought');
const cFutile = cue('futile');

const T = {
  wash: GODS_MERGE,
  merge1: GODS_MERGE + 14,
  fall0: GODS_MERGE + 16,
  land: GODS_MERGE + 28,
  pushA: GODS_MERGE + 36,
  nearTop: cNear.start + 46,
  rollStart: cNear.start + 58,
  rollEnd: cNear.end - 2,
  walkEnd: cAgain.start + 34,
  loop0: cNoEnd.start,
  freeze: cWhyThis.start,
  flat0: cCamus.start,
  flat1: cCamus.start + 28,
  year0: cCamus.start + 14,
  year1: cCamus.start + 56,
  grow0: cThought.start,
  grow1: cThought.start + 60,
  futile: cFutile.start,
  end: cFutile.end,
};
const PULSE = 18;

// ---------- 石头和橙点 ----------
const stoneU = (f: number) => {
  if (f < T.pushA) return 0;
  if (f < T.nearTop) return keyed(f, [[T.pushA, 0], [cNear.start, 0.2], [T.nearTop, PEAK_U]], Easing.inOut(Easing.sin));
  if (f < T.rollStart) return PEAK_U - 0.004 * Math.abs(noise1(f * 0.9));
  if (f < T.rollEnd) return PEAK_U * (1 - Easing.in(Easing.quad)(ramp(f, T.rollStart, T.rollEnd, (t) => t)));
  if (f < T.walkEnd) return 0;
  if (f < T.loop0) return 0.04 * ramp(f, T.walkEnd, T.loop0);
  const ph = 0.17 + (Math.min(f, T.freeze) - T.loop0) / 50;
  return uInLoop(ph % 1);
};
const dotU = (f: number) => {
  if (f < T.pushA) return -GAP;
  if (f < T.rollStart) return stoneU(f) - GAP;
  if (f < T.rollEnd + 2) return PEAK_U - GAP;
  if (f < T.walkEnd) return lerp(PEAK_U - GAP, -GAP, inOut(ramp(f, T.rollEnd + 2, T.walkEnd, (t) => t)));
  return stoneU(f) - GAP;
};

type StoneState = {x: number; y: number; r: number; rot: number; dim: number};
const stoneAt = (f: number): StoneState => {
  const roll = (u: number) => ((u * SL.len) / STONE_R) * (180 / Math.PI);
  if (f < T.fall0) return {...S, r: STONE_R, rot: 0, dim: 0};
  if (f < T.land) {
    const t = ramp(f, T.fall0, T.land, (v) => v);
    const p = lerpPt(S, SL.at(0, STONE_R), Easing.in(Easing.quad)(t));
    return {x: p.x, y: p.y - 160 * Math.sin(Math.PI * t), r: STONE_R, rot: 0, dim: 0};
  }
  if (f < T.flat0) {
    const p = SL.at(stoneU(f), STONE_R);
    return {...p, r: STONE_R, rot: roll(stoneU(f)), dim: 0};
  }
  const frozen = SL.at(stoneU(T.freeze), STONE_R);
  const m = ramp(f, T.flat0, T.flat1, inOut);
  const g = ramp(f, T.grow0, T.grow1, inOut);
  const r = lerp(STONE_R, BIG_R, g);
  const rest = lerpPt(frozen, REST, m);
  const spin = f >= T.futile ? Math.pow(f - T.futile, 1.6) * 0.9 : 0;
  return {
    x: lerp(rest.x, BIG.x, g),
    y: lerp(rest.y, LINE_Y - r, g),
    r,
    rot: roll(stoneU(T.freeze)) + m * 160 + g * 90 + spin,
    dim: 0.85 * g,
  };
};

const dotAt = (f: number): Pt => {
  if (f < T.fall0) return S;
  if (f < T.land + 4) return lerpPt(S, SL.at(-GAP, DOT_R), Easing.in(Easing.quad)(ramp(f, T.fall0, T.land + 4, (t) => t)));
  if (f < T.flat0) return SL.at(dotU(f), DOT_R);
  const st = stoneAt(f);
  const frozen = SL.at(dotU(T.freeze), DOT_R);
  const target = {x: st.x - st.r - 22, y: LINE_Y - DOT_R};
  return lerpPt(frozen, target, ramp(f, T.flat0, T.flat1, inOut));
};

/** 第三节从这里接手 */
export const PUN_END = {stone: stoneAt(T.end), dot: dotAt(T.end)};

// ---------- 相机 ----------
export const punishmentShots: Shot[] = [
  // 石头落在坡底时压在字幕带下方
  {f: T.wash + 24, x: S.x - 220, y: S.y - 40, zoom: 0.95, rot: 0},
  {f: cNear.start, x: S.x - 120, y: S.y - 60, zoom: 1.0, rot: -1},
  {f: cNear.start + 22, x: S.x + 45, y: S.y - 180, zoom: 1.7, rot: -5, ease: out},
  {f: T.rollStart, x: S.x + 60, y: S.y - 190, zoom: 1.8, rot: -6},
  {f: T.rollEnd, x: S.x - 40, y: S.y + 30, zoom: 0.95, rot: 0},
  {f: cNoEnd.start, x: S.x, y: S.y + 20, zoom: 1.0, rot: 1},
  {f: cNoEnd.start + 30, x: S.x, y: S.y + 40, zoom: 0.12, rot: 0, ease: Easing.inOut(Easing.exp)},
  {f: cNoEnd.end, x: S.x + 30, y: S.y + 40, zoom: 0.11, rot: 2},
  {f: cWhyThis.end - 16, x: S.x, y: S.y + 40, zoom: 0.92, rot: 0, ease: Easing.inOut(Easing.exp)},
  {f: T.flat1, x: S.x, y: LINE_Y - 260, zoom: 1.0, rot: 0},
  {f: cCamus.end, x: S.x + 20, y: LINE_Y - 260, zoom: 1.04, rot: 0},
  {f: T.grow1, x: S.x + 40, y: LINE_Y - 280, zoom: 1.12, rot: -1},
  {f: T.end, x: S.x + 60, y: LINE_Y - 300, zoom: 1.2, rot: 1},
];

export const punishmentImpacts: Impact[] = [
  {f: T.land, amp: 12},
  {f: T.rollEnd, amp: 6},
];

// ---------- 画面 ----------
/** 几百座同样的山坡（没有尽头） */
const Grid: React.FC<{frame: number}> = ({frame}) => {
  const on = ramp(frame, T.loop0 + 4, T.loop0 + 22) * (1 - ramp(frame, T.freeze + 14, cWhyThis.end - 10));
  if (on <= 0) return null;
  const ff = Math.min(frame, T.freeze);
  const cells: React.ReactNode[] = [];
  for (let i = -6; i <= 6; i++) {
    for (let j = -6; j <= 6; j++) {
      if (i === 0 && j === 0) continue;
      const k = (i + 7) * 31 + (j + 7);
      const off = {x: i * 1450, y: j * 820};
      const ph = hash(k) + (ff - T.loop0) / (36 + 30 * hash(k + 7));
      const u = uInLoop(ph % 1);
      const st = SL.at(u, STONE_R);
      const dt = SL.at(u - GAP, DOT_R);
      cells.push(
        <g key={k} transform={`translate(${off.x} ${off.y})`}>
          <line x1={SL.foot.x} y1={SL.foot.y} x2={SL.top.x} y2={SL.top.y} stroke={COLORS.ink} strokeWidth={10} opacity={0.5} />
          <circle cx={st.x} cy={st.y} r={STONE_R} fill={COLORS.stone} opacity={0.85} />
          <circle cx={dt.x} cy={dt.y} r={DOT_R * 1.8} fill={COLORS.ember} />
        </g>,
      );
    }
  }
  return <g opacity={on}>{cells}</g>;
};

/** 众神的光环收缩成石头（接第一节最后一帧的状态） */
const MergingRings: React.FC<{frame: number}> = ({frame}) => {
  if (frame > T.merge1 + 2) return null;
  return (
    <g>
      {Array.from({length: 8}, (_, k) => {
        const t = ramp(frame, T.wash + k, T.merge1, Easing.in(Easing.cubic));
        const r = lerp(970, STONE_R * 0.6, t);
        return <Orb key={k} x={S.x} y={S.y} r={r} variant="ring" ringWidth={lerp(48, STONE_R, t)} glow={0.8} opacity={1 - ramp(frame, T.merge1 - 2, T.merge1 + 2)} />;
      })}
    </g>
  );
};

const Year: React.FC<{frame: number}> = ({frame}) => {
  const pts = useTextPoints('1942', 300, 900, SERIF, 7);
  if (!pts || frame < T.year0 - 2 || frame > T.grow0 + 40) return null;
  const gone = ramp(frame, T.grow0, T.grow0 + 36, easeIn);
  return (
    <g>
      {pts.map((p, i) => {
        const h1 = hash(i * 1.71 + 3);
        const h2 = hash(i * 2.37 + 5);
        const from = {x: YEAR.x + (h1 - 0.5) * 1800, y: YEAR.y + (h2 - 0.5) * 1000};
        const e = ramp(frame, T.year0 + h2 * 12, T.year1 + h1 * 8, inOut);
        const x = lerp(from.x, YEAR.x + p.x, e) + Math.sin(frame / 8 + i) * 2;
        const y = lerp(from.y, YEAR.y + p.y, e) - gone * (60 + h1 * 260);
        return <circle key={i} cx={x} cy={y} r={2.6} fill={i % 5 === 0 ? COLORS.ember : COLORS.ink} opacity={(0.25 + 0.75 * e) * (1 - gone)} />;
      })}
    </g>
  );
};

const Visual: React.FC<{frame: number}> = ({frame}) => {
  const stone = stoneAt(frame);
  const dot = dotAt(frame);
  const draw = ramp(frame, T.fall0 + 2, T.land + 16, out);
  const flat = ramp(frame, T.flat0, T.flat1, inOut);
  const sl = mixSlope(SL, FLAT, flat);
  const lineOut = 1 - ramp(frame, T.end, T.end + 22);
  const tip = sl.at(draw);
  const wash = frame >= T.wash ? 0.85 * (1 - ramp(frame, T.wash, T.wash + 24, out)) : 0;
  const ruled = ramp(frame, T.flat0, T.flat1) * (1 - ramp(frame, T.end, T.end + 26));
  const gaugeOn = ramp(frame, T.futile, T.futile + 10) * (1 - ramp(frame, T.end, T.end + 16));
  const p = frame >= T.futile ? Easing.in(Easing.quad)(((frame - T.futile) / PULSE) % 1) : 0;
  const landT = frame - T.land;
  const rollT = frame - T.rollEnd;
  const stoneOn = ramp(frame, T.merge1 - 6, T.merge1);
  return (
    <g>
      {/* 加缪段落的稿纸横线 */}
      {ruled > 0 && (
        <g opacity={ruled}>
          {Array.from({length: 16}, (_, k) => (
            <line key={k} x1={S.x - 1500} y1={LINE_Y - 800 + k * 90} x2={S.x + 1500} y2={LINE_Y - 800 + k * 90} stroke={COLORS.ink} strokeWidth={1.5} opacity={0.07} />
          ))}
          <line x1={S.x - 980} y1={LINE_Y - 900} x2={S.x - 980} y2={LINE_Y + 700} stroke={COLORS.ember} strokeWidth={2} opacity={0.18} />
        </g>
      )}
      <Grid frame={frame} />
      <g opacity={lineOut}>
        <line x1={sl.foot.x - 1400 * (1 - flat)} y1={sl.foot.y} x2={sl.foot.x} y2={sl.foot.y} stroke={COLORS.ink} strokeWidth={2} opacity={0.35 * draw * (1 - flat)} />
        <line x1={sl.foot.x} y1={sl.foot.y} x2={tip.x} y2={tip.y} stroke={COLORS.ember} strokeWidth={14} opacity={0.12} />
        <line x1={sl.foot.x} y1={sl.foot.y} x2={tip.x} y2={tip.y} stroke={COLORS.ink} strokeWidth={3} strokeLinecap="round" />
      </g>
      {/* 落地和滚回坡底时扬起的尘土 */}
      {[landT, rollT].map((t, j) =>
        t >= 0 && t < 26
          ? Array.from({length: 18}, (_, i) => {
              const a = Math.PI + hash(i + j * 40 + 300) * Math.PI;
              const v = 2 + hash(i * 3 + j + 300) * 6;
              const base = SL.at(0, 0);
              return <circle key={`${j}-${i}`} cx={base.x + Math.cos(a) * v * t} cy={base.y + Math.sin(a) * v * t * 0.5 + 0.08 * t * t} r={2 + hash(i) * 3} fill={COLORS.stone} opacity={0.6 * (1 - t / 26)} />;
            })
          : null,
      )}
      <Year frame={frame} />
      {/* 无用又无望：刻度一走到头就归零 */}
      {gaugeOn > 0 && (
        <g opacity={gaugeOn}>
          <line x1={GAUGE0.x} y1={GAUGE0.y} x2={GAUGE1.x} y2={GAUGE1.y} stroke={COLORS.ink} strokeWidth={3} opacity={0.35} />
          {Array.from({length: 11}, (_, k) => (
            <line key={k} x1={lerp(GAUGE0.x, GAUGE1.x, k / 10)} y1={GAUGE0.y - 14} x2={lerp(GAUGE0.x, GAUGE1.x, k / 10)} y2={GAUGE0.y + 14} stroke={COLORS.ink} strokeWidth={2} opacity={0.35} />
          ))}
          <line x1={GAUGE0.x} y1={GAUGE0.y} x2={lerp(GAUGE0.x, GAUGE1.x, p)} y2={GAUGE0.y} stroke={COLORS.ember} strokeWidth={10} strokeLinecap="round" />
          <circle cx={GAUGE1.x} cy={GAUGE1.y} r={18 + 30 * (1 - p)} fill="none" stroke={COLORS.ember} strokeWidth={3} opacity={p < 0.25 ? 1 - p * 4 : 0} />
        </g>
      )}
      <MergingRings frame={frame} />
      {/* 石头和橙点在本节最后一帧交给第三节 */}
      {frame < T.end && (
        <>
          <Orb x={stone.x} y={stone.y} r={stone.r} rotation={stone.rot} dim={stone.dim} glow={0.25} opacity={stoneOn} squash={landT >= 0 && landT < 8 ? 0.12 * Math.sin((Math.PI * landT) / 8) : 0} />
          <Orb x={dot.x} y={dot.y} r={DOT_R} variant="ember" glow={0.6 + 0.2 * Math.sin(frame / 6)} />
        </>
      )}
      {wash > 0 && <rect x={S.x - 6000} y={S.y - 4000} width={12000} height={8000} fill={COLORS.white} opacity={wash} />}
    </g>
  );
};

// ---------- 音效 ----------
const Sound: React.FC = () => (
  <>
    <Sfx name="riser" at={T.wash - 8} volume={0.3} rate={1.4} />
    <Sfx name="thump" at={T.land} volume={0.9} />
    <Sfx name="grind" at={T.pushA} volume={0.45} />
    <Sfx name="grind" at={cNear.start + 12} volume={0.4} />
    <Sfx name="grind" at={cNear.start + 30} volume={0.35} rate={0.9} />
    <Sfx name="roll" at={T.rollStart} volume={0.7} />
    <Sfx name="thump" at={T.rollEnd} volume={0.4} />
    {[0, 1, 2, 3].map((k) => (
      <Sfx key={`s${k}`} name="step" at={T.rollEnd + 6 + k * 8} volume={0.45} rate={k % 2 ? 1.05 : 0.95} />
    ))}
    <Sfx name="grind" at={T.walkEnd} volume={0.35} />
    <Sfx name="whoosh" at={T.loop0} volume={0.5} rate={0.8} />
    {[10, 20, 30, 40, 52].map((d, k) => (
      <Sfx key={`r${k}`} name="roll" at={T.loop0 + d} volume={0.35} rate={0.8 + k * 0.1} />
    ))}
    <Sfx name="tick" at={T.freeze + 2} volume={0.7} />
    <Sfx name="whoosh" at={cWhyThis.start + 18} volume={0.35} rate={1.2} />
    <Sfx name="sizzle" at={T.year0} volume={0.45} />
    {[0, 1, 2, 3, 4, 5].map((k) => (
      <Sfx key={`t${k}`} name="tick" at={T.year0 + 10 + k * 6} volume={0.3} rate={0.8 + hash(k) * 0.4} />
    ))}
    <Sfx name="ping" at={T.flat1} volume={0.3} rate={0.9} />
    <Sfx name="swell" at={T.grow0} volume={0.5} />
    <Sfx name="rumble" at={T.grow0 + 24} volume={0.45} />
    {Array.from({length: Math.ceil((T.end - T.futile) / PULSE)}, (_, k) => (
      <Sfx key={`p${k}`} name="pulse" at={T.futile + k * PULSE} volume={0.6} />
    ))}
  </>
);

export const PunishmentBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const on = ramp(frame, T.flat0, T.flat1 + 10) * (1 - ramp(frame, T.end - 10, T.end + 30));
  if (on <= 0) return null;
  return <AbsoluteFill style={{opacity: on, background: 'radial-gradient(ellipse at 45% 55%, rgba(70,42,26,0.6) 0%, rgba(30,20,14,0.4) 45%, rgba(0,0,0,0) 80%)'}} />;
};

export const Punishment: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = frame >= T.wash - 1 && frame <= T.end + 30;
  return (
    <>
      {visible && (
        <svg width={1} height={1} style={{position: 'absolute', overflow: 'visible'}}>
          <Visual frame={frame} />
        </svg>
      )}
      <Sound />
    </>
  );
};

