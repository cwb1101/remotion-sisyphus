import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {Orb} from '../components/Orb';
import {Sfx} from '../components/Sfx';
import {easeIn, hash, inOut, lerp, lerpPt, noise1, out, type Pt, pulse, ramp} from '../lib/anim';
import type {Impact, Shot} from '../lib/camera';
import {cue} from '../lib/cues';
import {COLORS} from '../theme';
import {HANDOFF, P} from './Opening';

// 第一节（第 7–15 屏）：他是谁。
// 场景从黑色虚空换成黄昏的科林斯：地平线、柱廊、暖色天光；地平线以下是冷色的冥界。
// 橙点（西西弗斯）是主角：戴上王冠、在柱子间穿梭、告密、用锁链缠住死神、坠入冥界、再溜回人间，最后被众神合围。

// ---------- 场景几何（世界坐标，全部相对 P） ----------
const HORIZON = P.y + 330;
const COLS = Array.from({length: 9}, (_, i) => ({x: P.x + (i - 4) * 130, h: 300 - Math.abs(i - 4) * 24}));
const ZEUS: Pt = {x: P.x + 320, y: P.y - 720};
const DEATH_HOME: Pt = {x: P.x, y: P.y - 700};
const DEATH_R = 520;
const UNDER: Pt = {x: P.x, y: HORIZON + 320};
const QUEEN: Pt = {x: P.x + 320, y: HORIZON + 380};
/** 西西弗斯从冥界溜回人间后站的位置；众神在这里合围，第二节从这里开始 */
export const RETURN: Pt = {x: P.x - 60, y: HORIZON - 160};

// ---------- 时间点：全部由字幕数据推出 ----------
const cKing = cue('king');
const cCunning = cue('cunning');
const cSecret = cue('secret');
const cDeath = cue('death');
const cLock = cue('lock');
const cNobody = cue('nobody-dies');
const cDied = cue('died');
const cQueen = cue('persephone');
const cGods = cue('gods');

const T = {
  colsStart: cKing.start - 10,
  crown: cKing.start + 50,
  zig0: cCunning.start + 2,
  zig1: cCunning.end - 4,
  zeusIn: cSecret.start + 4,
  ripples: [cSecret.start + 26, cSecret.start + 34, cSecret.start + 42],
  zeusTurn: cSecret.end - 24,
  deathIn: cDeath.start,
  deathLand: cDeath.start + 26,
  whip: cLock.start,
  clamp: cLock.start + 6, // 与“锁”砸下来同一帧
  band2: cLock.start + 22,
  band3: cLock.start + 46,
  orbitEnd: cLock.end - 10,
  peopleIn: cNobody.start - 4,
  snap: cDied.start + 4,
  sinkStart: cDied.start + 14,
  sinkEnd: cDied.end + 6,
  queenIn: cQueen.start + 2,
  queenFlash: cQueen.start + 14,
  climb0: cQueen.start + 24,
  climb1: cQueen.end - 6,
  godsIn: cGods.start + 2,
  converge0: cGods.start + 22,
  converge1: cGods.end + 18,
};

// ---------- 橙点的位置 ----------
const ZIG: Pt[] = [
  [0, 0], [-130, 190], [-260, 40], [-390, 230], [-130, 120], [130, 240], [260, 60], [390, 210], [130, 100], [0, 0],
].map(([dx, dy]) => ({x: P.x + dx, y: P.y + dy}));

const orbitPos = (f: number) => {
  // 第一圈 6 帧甩完，之后慢慢绕 1.5 圈
  const turns = f < T.clamp ? ramp(f, T.whip, T.clamp, (t) => t) : 1 + 1.5 * ramp(f, T.clamp, T.orbitEnd, Easing.inOut(Easing.sin));
  const a = Math.PI / 2 + turns * Math.PI * 2;
  const R = deathR(f) + 70;
  const c = deathCenter(f);
  return {x: c.x + Math.cos(a) * R, y: c.y + Math.sin(a) * R * 0.55};
};

const dotPos = (f: number): Pt => {
  if (f < T.zig0) return {x: P.x, y: P.y - 6 * Math.sin(f / 9)};
  if (f < T.zig1) {
    const s = ramp(f, T.zig0, T.zig1, (t) => t) * (ZIG.length - 1);
    const i = Math.min(ZIG.length - 2, Math.floor(s));
    return lerpPt(ZIG[i], ZIG[i + 1], inOut(s - i));
  }
  if (f < T.whip) return P;
  if (f < T.orbitEnd) return orbitPos(f);
  if (f < cDied.start) return lerpPt(orbitPos(T.orbitEnd - 0.01), P, ramp(f, T.orbitEnd, T.orbitEnd + 14));
  if (f < T.climb0) return lerpPt(P, UNDER, ramp(f, T.sinkStart, T.sinkEnd, inOut));
  const s = ramp(f, T.climb0, T.climb1, inOut);
  return {x: lerp(UNDER.x, RETURN.x, s) + 80 * Math.sin(s * Math.PI * 2), y: lerp(UNDER.y, RETURN.y, s)};
};
const dotDim = (f: number) => {
  if (f < T.snap + 4) return 0;
  const p = dotPos(f);
  if (f >= T.climb0 && p.y < HORIZON) return 0;
  return ramp(f, T.snap + 4, T.snap + 22);
};

// ---------- 死神 ----------
const deathCenter = (f: number): Pt => {
  const fly = ramp(f, T.snap, T.snap + 26, easeIn);
  const jitter = f >= T.clamp && f < T.snap ? 6 : 0;
  return {
    x: DEATH_HOME.x + noise1(f / 2) * jitter,
    y: lerp(P.y - 1600, DEATH_HOME.y, ramp(f, T.deathIn, T.deathLand, out)) - 1800 * fly + noise1(f / 2 + 9) * jitter,
  };
};
const deathR = (f: number) => {
  const grow = lerp(300, DEATH_R, ramp(f, T.deathIn, T.deathLand, out));
  const squeeze = lerp(1, 0.86, ramp(f, T.clamp, T.clamp + 5, out));
  return grow * squeeze * (1 - 0.5 * ramp(f, T.snap, T.snap + 26));
};

/** 缠在死神身上的锁链：三圈倾斜的椭圆，只画朝向观众的半圈 */
const BANDS = [
  {tilt: -28, from: T.whip, to: T.clamp},
  {tilt: 18, from: T.band2 - 10, to: T.band2},
  {tilt: 62, from: T.band3 - 10, to: T.band3},
];
const Chains: React.FC<{frame: number}> = ({frame}) => {
  const c = deathCenter(frame);
  const R = deathR(frame);
  const snapT = frame - T.snap;
  if (frame < T.whip || snapT > 30) return null;
  return (
    <g>
      {BANDS.map((b, k) => {
        const grow = ramp(frame, b.from, b.to, (t) => t);
        if (grow <= 0) return null;
        const tight = lerp(1.25, 1.03, ramp(frame, b.to, b.to + 6, Easing.out(Easing.back(2))));
        const n = 70;
        const rad = (b.tilt * Math.PI) / 180;
        return Array.from({length: Math.floor(n * grow)}, (_, i) => {
          const a = (i / n) * Math.PI;
          let x = Math.cos(a) * R * tight;
          let y = Math.sin(a) * R * tight * 0.34;
          const rx = x * Math.cos(rad) - y * Math.sin(rad);
          const ry = x * Math.sin(rad) + y * Math.cos(rad);
          const ang = (Math.atan2(Math.cos(a) * 0.34, -Math.sin(a)) * 180) / Math.PI + b.tilt;
          x = c.x + rx;
          y = c.y + ry;
          if (snapT >= 0) {
            const h = hash(i + k * 100);
            const v = 8 + h * 16;
            x += (rx / R) * v * snapT;
            y += (ry / R) * v * snapT + 0.5 * snapT * snapT;
          }
          return (
            <ellipse
              key={`${k}-${i}`}
              cx={x}
              cy={y}
              rx={i % 2 ? 13 : 9}
              ry={i % 2 ? 6 : 4}
              transform={`rotate(${ang} ${x} ${y})`}
              fill="none"
              stroke={COLORS.metal}
              strokeWidth={4}
              opacity={snapT >= 0 ? 1 - snapT / 30 : 1}
            />
          );
        });
      })}
    </g>
  );
};

/** 死神身下拖着的一截锁链（还没被反锁时） */
const HangingChain: React.FC<{frame: number}> = ({frame}) => {
  if (frame < T.deathIn || frame >= T.whip) return null;
  const c = deathCenter(frame);
  const R = deathR(frame);
  const swing = Math.sin(frame / 9) * 0.25;
  return (
    <g>
      {Array.from({length: 14}, (_, i) => {
        const d = R + 10 + i * 20;
        const x = c.x + Math.sin(swing * (i / 14)) * d * 0.4;
        const y = c.y + d;
        return <ellipse key={i} cx={x} cy={y} rx={i % 2 ? 5 : 9} ry={i % 2 ? 11 : 6} fill="none" stroke={COLORS.metal} strokeWidth={4} opacity={0.9} />;
      })}
    </g>
  );
};

// ---------- 相机 ----------
export const mythShots: Shot[] = [
  // 地平线放在字幕带上方，字幕落在冥界的深色地面上
  {f: HANDOFF, x: P.x, y: HORIZON + 60, zoom: 0.8, rot: 0, ease: Easing.inOut(Easing.exp)},
  {f: cKing.end, x: P.x + 80, y: HORIZON + 90, zoom: 0.9, rot: 1},
  {f: cCunning.start + 16, x: P.x - 30, y: HORIZON + 60, zoom: 1.15, rot: -2},
  {f: cCunning.end, x: P.x + 40, y: HORIZON + 70, zoom: 1.2, rot: 2},
  {f: cSecret.start + 30, x: P.x + 150, y: P.y - 330, zoom: 0.7, rot: 0},
  {f: cSecret.end, x: P.x + 120, y: P.y - 300, zoom: 0.76, rot: -1},
  {f: cDeath.start + 22, x: P.x, y: P.y - 330, zoom: 0.62, rot: 0},
  {f: cDeath.end, x: P.x, y: P.y - 380, zoom: 0.66, rot: 1},
  {f: cLock.start + 10, x: P.x, y: P.y - 640, zoom: 0.58, rot: -3},
  {f: cLock.end, x: P.x, y: P.y - 620, zoom: 0.72, rot: -14},
  {f: cNobody.start + 24, x: P.x, y: HORIZON + 67, zoom: 0.3, rot: 0},
  {f: cNobody.end, x: P.x + 80, y: HORIZON + 60, zoom: 0.32, rot: 1},
  {f: cDied.start + 24, x: P.x, y: HORIZON + 60, zoom: 0.7, rot: 0},
  {f: cDied.end, x: P.x + 60, y: HORIZON + 40, zoom: 0.95, rot: 1},
  {f: cQueen.start + 30, x: P.x + 150, y: HORIZON + 130, zoom: 1.0, rot: 2},
  {f: cQueen.end, x: P.x - 40, y: HORIZON - 60, zoom: 0.88, rot: -1},
  {f: cGods.start + 22, x: RETURN.x, y: RETURN.y + 120, zoom: 0.6, rot: 0},
  {f: T.converge1, x: RETURN.x, y: RETURN.y + 40, zoom: 0.78, rot: 2},
];

export const mythImpacts: Impact[] = [
  {f: T.snap, amp: 14},
  {f: T.converge1 - 6, amp: 18},
];

// ---------- 画面 ----------
const Sky: React.FC<{frame: number}> = ({frame}) => {
  const on = ramp(frame, HANDOFF - 34, HANDOFF);
  const dark = 0.55 * ramp(frame, T.deathIn, T.deathLand) * (1 - ramp(frame, cNobody.start, cNobody.start + 20));
  return (
    <g opacity={on}>
      <defs>
        <linearGradient id="mythSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLORS.skyTop} />
          <stop offset="0.72" stopColor={COLORS.skyMid} />
          <stop offset="1" stopColor={COLORS.skyGlow} />
        </linearGradient>
        <linearGradient id="mythUnder" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={COLORS.under} />
          <stop offset="1" stopColor={COLORS.underDeep} />
        </linearGradient>
        <radialGradient id="mythSun">
          <stop offset="0" stopColor={COLORS.ember} stopOpacity={0.45} />
          <stop offset="1" stopColor={COLORS.ember} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={P.x - 9000} y={HORIZON - 3200} width={18000} height={3200} fill="url(#mythSky)" />
      <ellipse cx={P.x - 200 + frame * 0.6} cy={HORIZON} rx={1400} ry={420} fill="url(#mythSun)" />
      {/* 远山 */}
      <polygon
        points={[...Array.from({length: 40}, (_, i) => {
          const x = P.x - 6000 + i * 300;
          return `${x},${HORIZON - 60 - 90 * Math.abs(noise1(i * 0.7 + 3))}`;
        }), `${P.x + 6000},${HORIZON}`, `${P.x - 6000},${HORIZON}`].join(' ')}
        fill={COLORS.hills}
      />
      <rect x={P.x - 9000} y={HORIZON} width={18000} height={3000} fill="url(#mythUnder)" />
      <line x1={P.x - 9000} y1={HORIZON} x2={P.x + 9000} y2={HORIZON} stroke={COLORS.ember} strokeWidth={10} opacity={0.18} />
      <line x1={P.x - 9000} y1={HORIZON} x2={P.x + 9000} y2={HORIZON} stroke={COLORS.ink} strokeWidth={2.5} opacity={0.7} />
      <rect x={P.x - 9000} y={HORIZON - 3200} width={18000} height={6200} fill="#000" opacity={dark} />
    </g>
  );
};

const Columns: React.FC<{frame: number}> = ({frame}) => (
  <g>
    {COLS.map((c, i) => {
      const order = Math.abs(i - 4);
      const rise = ramp(frame, T.colsStart + order * 6, T.colsStart + order * 6 + 22, Easing.out(Easing.back(1.4)));
      const h = c.h * rise;
      return (
        <g key={i} opacity={Math.min(1, rise * 2)}>
          <rect x={c.x - 24} y={HORIZON - h} width={48} height={h} fill="#2A1A14" />
          <rect x={c.x - 24} y={HORIZON - h} width={10} height={h} fill={COLORS.ember} opacity={0.25} />
          <rect x={c.x - 34} y={HORIZON - h - 14} width={68} height={14} fill="#3A241B" />
        </g>
      );
    })}
    <rect x={COLS[0].x - 50} y={HORIZON - 4} width={COLS[8].x - COLS[0].x + 100} height={8} fill="#3A241B" opacity={ramp(frame, T.colsStart, T.colsStart + 20)} />
  </g>
);

const Zeus: React.FC<{frame: number}> = ({frame}) => {
  const s = ramp(frame, T.zeusIn, T.zeusIn + 14, Easing.out(Easing.back(1.8)));
  const fade = 1 - ramp(frame, T.deathIn, T.deathIn + 18);
  if (s <= 0 || fade <= 0) return null;
  const dot = dotPos(frame);
  const look = Math.atan2(dot.y - ZEUS.y, dot.x - ZEUS.x);
  const a = lerp(-Math.PI / 2, look, ramp(frame, T.zeusTurn, T.zeusTurn + 12, Easing.out(Easing.back(2))));
  const seed = Math.floor(frame / 3);
  return (
    <g opacity={fade}>
      <Orb x={ZEUS.x} y={ZEUS.y} r={230 * s} variant="ring" ringWidth={12} glow={1} />
      <circle cx={ZEUS.x + Math.cos(a) * 230 * s} cy={ZEUS.y + Math.sin(a) * 230 * s} r={22 * s} fill={COLORS.white} />
      {[0, 1, 2].map((k) => {
        const ang = hash(seed * 3 + k) * Math.PI * 2;
        const pts = Array.from({length: 6}, (_, i) => {
          const d = 240 + i * 45;
          const j = (hash(seed + k * 10 + i) - 0.5) * 60;
          return `${ZEUS.x + Math.cos(ang) * d * s - Math.sin(ang) * j},${ZEUS.y + Math.sin(ang) * d * s + Math.cos(ang) * j}`;
        }).join(' ');
        return <polyline key={k} points={pts} fill="none" stroke={COLORS.white} strokeWidth={4} opacity={0.5 + 0.5 * hash(seed + k)} />;
      })}
    </g>
  );
};

const People: React.FC<{frame: number}> = ({frame}) => {
  const on = ramp(frame, T.peopleIn, T.peopleIn + 16) * (1 - ramp(frame, T.snap + 10, cDied.end));
  if (on <= 0) return null;
  return (
    <g opacity={on}>
      {Array.from({length: 260}, (_, i) => {
        const x = P.x + (hash(i) - 0.5) * 6000;
        const y = HORIZON - 14 - hash(i + 7) * 40;
        const t = frame - (cNobody.start + 10 + hash(i + 3) * 55);
        // 本该熄灭：光暗下去，又立刻亮回来
        const dip = t > 0 && t < 10 ? pulse(t, 10) * 0.85 : 0;
        const ring = t > 5 && t < 18 ? (t - 5) / 13 : 0;
        return (
          <g key={i}>
            <circle cx={x} cy={y} r={30} fill={COLORS.emberHot} opacity={0.12 * (1 - dip)} />
            <circle cx={x} cy={y} r={11} fill="#F6DDBB" opacity={1 - dip} />
            {ring > 0 && <circle cx={x} cy={y} r={11 + ring * 50} fill="none" stroke="#F6DDBB" strokeWidth={4} opacity={1 - ring} />}
          </g>
        );
      })}
    </g>
  );
};

const Ripples: React.FC<{frame: number}> = ({frame}) => (
  <g>
    {T.ripples.map((s, k) => {
      const t = ramp(frame, s, s + 24, out);
      if (frame < s || t >= 1) return null;
      const d = dotPos(frame);
      const R = 30 + t * 220;
      const a0 = -1.3;
      const a1 = 0.2;
      return (
        <path
          key={k}
          d={`M ${d.x + Math.cos(a0) * R} ${d.y + Math.sin(a0) * R} A ${R} ${R} 0 0 1 ${d.x + Math.cos(a1) * R} ${d.y + Math.sin(a1) * R}`}
          fill="none"
          stroke={COLORS.ember}
          strokeWidth={6}
          opacity={1 - t}
        />
      );
    })}
  </g>
);

const Queen: React.FC<{frame: number}> = ({frame}) => {
  const on = ramp(frame, T.queenIn, T.queenIn + 12) * (1 - ramp(frame, cGods.start, cGods.start + 16));
  if (on <= 0) return null;
  const flash = pulse(frame - T.queenFlash, 16);
  const pathOn = ramp(frame, T.climb0 - 8, T.climb0 + 20, out);
  const pts = Array.from({length: 40}, (_, i) => {
    const s = i / 39;
    return `${lerp(UNDER.x, RETURN.x, s) + 80 * Math.sin(s * Math.PI * 2)},${lerp(UNDER.y, RETURN.y, s)}`;
  }).join(' ');
  return (
    <g opacity={on}>
      <polyline points={pts} fill="none" stroke={COLORS.pale} strokeWidth={3} strokeDasharray="10 12" opacity={0.6 * pathOn} />
      <Orb x={QUEEN.x} y={QUEEN.y} r={46 * (1 + 0.25 * flash)} variant="pale" glow={0.5 + 1.2 * flash} />
    </g>
  );
};

const Gods: React.FC<{frame: number}> = ({frame}) => {
  if (frame < T.godsIn) return null;
  return (
    <g>
      {Array.from({length: 8}, (_, k) => {
        // 从四面八方合围
        const a = (k / 8) * Math.PI * 2 + 0.35;
        const home = {x: RETURN.x + Math.cos(a) * 1150, y: RETURN.y + Math.sin(a) * 820};
        const s = ramp(frame, T.godsIn + k * 3, T.godsIn + k * 3 + 12, Easing.out(Easing.back(2)));
        const c = ramp(frame, T.converge0 + k * 2, T.converge1, easeIn);
        const pos = lerpPt(home, RETURN, c);
        return <Orb key={k} x={pos.x} y={pos.y} r={(70 + c * 900) * s} variant="ring" ringWidth={8 + c * 40} glow={0.8} opacity={s} />;
      })}
    </g>
  );
};

const Visual: React.FC<{frame: number}> = ({frame}) => {
  const d = dotPos(frame);
  const dim = dotDim(frame);
  const crown = ramp(frame, T.crown, T.crown + 12, Easing.out(Easing.back(2))) * (1 - ramp(frame, T.whip, T.whip + 8));
  // 戴上王冠时橙点长大一圈，开始绕死神时收回来
  const dotR = 18 + 16 * crown + 4 * Math.sin(frame / 8);
  const cy = d.y - dotR + 18;
  const trail = frame >= T.zig0 && frame < T.zig1 + 10 ? Array.from({length: 12}, (_, k) => dotPos(frame - k)) : [];
  const deathOn = frame >= T.deathIn && frame < T.snap + 30;
  const dc = deathCenter(frame);
  const whipTrail = frame >= T.whip && frame < T.orbitEnd ? Array.from({length: 8}, (_, k) => orbitPos(Math.max(T.whip, frame - k * 0.7))) : [];
  return (
    <g>
      <Sky frame={frame} />
      <Columns frame={frame} />
      <People frame={frame} />
      <Zeus frame={frame} />
      <HangingChain frame={frame} />
      {deathOn && <Orb x={dc.x} y={dc.y} r={deathR(frame)} variant="void" ringWidth={10} squash={frame >= T.clamp && frame < T.clamp + 8 ? 0.08 * pulse(frame - T.clamp, 8) : 0} />}
      <Chains frame={frame} />
      <Queen frame={frame} />
      <Ripples frame={frame} />
      {trail.length > 0 && <polyline points={trail.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={COLORS.ember} strokeWidth={7} strokeLinejoin="round" opacity={0.55} />}
      {whipTrail.length > 0 && <polyline points={whipTrail.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={COLORS.ember} strokeWidth={12} strokeLinecap="round" opacity={0.45} />}
      {crown > 0 && (
        <polygon
          points={`${d.x - 22},${cy - 30} ${d.x - 22},${cy - 52} ${d.x - 11},${cy - 40} ${d.x},${cy - 58} ${d.x + 11},${cy - 40} ${d.x + 22},${cy - 52} ${d.x + 22},${cy - 30}`}
          fill={COLORS.ember}
          opacity={crown}
          transform={`translate(0 ${(1 - crown) * -40})`}
        />
      )}
      {frame >= HANDOFF && <Orb x={d.x} y={d.y} r={dotR} variant="ember" glow={0.9 + 0.3 * Math.sin(frame / 5)} dim={dim} />}
      <Gods frame={frame} />
    </g>
  );
};

// ---------- 音效 ----------
const Sound: React.FC = () => (
  <>
    {COLS.map((_, i) => {
      const order = Math.abs(i - 4);
      return i <= 4 ? <Sfx key={i} name="ping" at={T.colsStart + order * 6 + 8} volume={0.15} rate={0.7 + (4 - order) * 0.12} /> : null;
    })}
    <Sfx name="bell" at={T.crown} volume={0.3} rate={1.5} />
    <Sfx name="slide" at={T.zig0 + 2} volume={0.5} />
    <Sfx name="slide" at={T.zig0 + 24} volume={0.45} rate={1.2} />
    <Sfx name="zap" at={T.zeusIn} volume={0.65} />
    {T.ripples.map((f, k) => (
      <Sfx key={k} name="ping" at={f} volume={0.22} rate={1.6 + k * 0.1} />
    ))}
    <Sfx name="zap" at={T.zeusTurn} volume={0.5} rate={0.8} />
    <Sfx name="swell" at={T.deathIn - 10} volume={0.7} />
    <Sfx name="whoosh" at={T.whip - 4} volume={0.6} rate={1.4} />
    <Sfx name="lock" at={T.clamp} volume={0.85} />
    <Sfx name="chain" at={T.clamp + 2} volume={0.6} />
    <Sfx name="chain" at={T.band2 - 8} volume={0.45} rate={0.9} />
    <Sfx name="chain" at={T.band3 - 8} volume={0.4} rate={1.1} />
    <Sfx name="whoosh" at={cNobody.start - 6} volume={0.4} rate={0.8} />
    <Sfx name="whine" at={cNobody.start + 10} volume={0.3} />
    <Sfx name="snap" at={T.snap} volume={0.85} />
    <Sfx name="sub_drop" at={T.sinkStart} volume={0.8} />
    <Sfx name="ping" at={T.queenFlash} volume={0.35} rate={0.55} />
    <Sfx name="arp" at={T.climb0 + 4} volume={0.55} />
    <Sfx name="rumble" at={cGods.start} volume={0.85} />
    <Sfx name="riser" at={T.converge1 - 40} volume={0.5} />
    <Sfx name="impact" at={T.converge1 - 6} volume={0.55} />
  </>
);

export const MYTH_END = T.converge1 + 6;
/** 众神的环收拢到最大的那一帧（之后由第二节接手） */
export const GODS_MERGE = T.converge1;

/** last=false 时（后面还有段落）在众神合围那一帧收场，交给第二节 */
export const Myth: React.FC<{last?: boolean}> = ({last = true}) => {
  const frame = useCurrentFrame();
  const visible = frame >= HANDOFF - 40 && (last || frame < T.converge1);
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
