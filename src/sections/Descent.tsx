import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {Orb} from '../components/Orb';
import {Sfx} from '../components/Sfx';
import {clamp, hash, inOut, lerp, mixColor, out, type Pt, pulse, ramp} from '../lib/anim';
import type {Impact, Shot} from '../lib/camera';
import {cue} from '../lib/cues';
import {keyed, makeSlope} from '../lib/geom';
import {COLORS} from '../theme';
import {DOT_R, FOOT, STONE_R} from './Opening';

// 第四节（第 29–37 屏）：下山。
// 场景换成夜里的大山：星空、山体剪影、坡面一道暖色边光。石头被推上山顶又滚下去，镜头留在山顶的橙点身上；
// 橙点慢慢下山，长出“清醒”的光晕 → 光晕里看见石头一次次滚落 → 光晕变成锯齿（折磨）→ 收成头顶的光环（胜利，呼应国王的王冠）
// → 走回石头旁，把石头映成暖橙 → 众神的环再次压下 → 橙点的光扩散，把众神一个个照散。
// 这座山的坡底就是开头那条山坡的坡底，第五节直接在这里把山坡变回开头的样子。

export const DESCENT_SLOPE = makeSlope(FOOT, {x: FOOT.x + 1800, y: FOOT.y - 900});
const DS = DESCENT_SLOPE;
const GAP = (STONE_R + DOT_R + 4) / DS.len;
const TOPU = 0.94;

const cNP = cue('not-pushing');
const cWD = cue('walk-down');
const cLuc = cue('lucidity');
const cKnows = cue('he-knows');
const cTorm = cue('torment');
const cVic = cue('victory');
const cBack = cue('goes-back');
const cGP = cue('gods-punish');
const cNotP = cue('not-punished');
const cHero = cue('absurd-hero');

const T = {
  /** 第三节的裂缝转成山坡时，星空和山体开始出现 */
  env0: cHero.start + 27,
  env1: cHero.end - 5,
  pushTop: cNP.start + 45,
  roll0: cNP.start + 53,
  roll1: cNP.start + 91,
  arrive: cBack.start + 58,
  lightMax: cNotP.start + 80,
  /** 第五节开始的那一帧：光收回到坡底的橙点，大山淡出 */
  hand0: cNotP.end,
  hand1: cNotP.end + 34,
};
export const DESCENT_T = T;

const stoneU = (f: number) => {
  if (f < T.pushTop) return TOPU * Easing.inOut(Easing.quad)(ramp(f, cNP.start, T.pushTop, (t) => t));
  if (f < T.roll0) return TOPU;
  return TOPU * (1 - Easing.in(Easing.quad)(ramp(f, T.roll0, T.roll1, (t) => t)));
};
const WALK: [number, number][] = [
  [cWD.start, TOPU - GAP],
  [cLuc.start, 0.62],
  [cKnows.start, 0.53],
  [cTorm.start, 0.44],
  [cVic.start, 0.36],
  [cBack.start, 0.27],
  [T.arrive, -GAP],
];
const dotU = (f: number) => (f < T.pushTop ? stoneU(f) - GAP : f < cWD.start ? TOPU - GAP : keyed(f, WALK));
const walking = (f: number) => f >= cWD.start && f < T.arrive;
export const descentDot = (f: number): Pt => {
  const p = DS.at(dotU(f), DOT_R);
  return {x: p.x, y: p.y - (walking(f) ? 4 * Math.abs(Math.sin(f * 0.35)) : 0)};
};

const haloR = (f: number) => {
  const grow = 260 * ramp(f, cLuc.start, cLuc.start + 40, out) * (1 + 0.06 * Math.sin(f / 9));
  return grow * (1 - ramp(f, cVic.start, cVic.start + 30, inOut));
};
/** 不再被惩罚：橙点的光向外扩散的半径 */
const lightR = (f: number) =>
  f < T.hand0 ? 2600 * ramp(f, cNotP.start + 6, T.lightMax, inOut) : 2600 * (1 - ramp(f, T.hand0, T.hand1, inOut));

const GOD_COUNT = 8;
const godAt = (k: number, f: number) => {
  const a = Math.PI * (1.12 + (0.76 * k) / (GOD_COUNT - 1));
  const d = lerp(780, 450, ramp(f, cGP.start + 6, cGP.end, inOut));
  const dot = descentDot(f);
  return {x: dot.x + Math.cos(a) * d, y: dot.y + Math.sin(a) * d * 0.9, d};
};

const D = (f: number) => descentDot(f);
export const descentShots: Shot[] = [
  {f: cNP.start + 25, x: lerp(DS.foot.x, DS.top.x, 0.55), y: lerp(DS.foot.y, DS.top.y, 0.55) - 40, zoom: 0.6, rot: 0},
  {f: cNP.start + 50, x: DS.top.x - 260, y: DS.top.y + 170, zoom: 1.05, rot: -2},
  {f: cWD.start, x: DS.top.x - 280, y: DS.top.y + 175, zoom: 1.1, rot: -1},
  {f: cWD.start + 46, x: D(cWD.start + 46).x, y: D(cWD.start + 46).y + 143, zoom: 1.35, rot: 0},
  {f: cLuc.start - 6, x: D(cLuc.start - 6).x, y: D(cLuc.start - 6).y - 255, zoom: 1.1, rot: 0},
  {f: cKnows.end, x: D(cKnows.end).x, y: D(cKnows.end).y - 250, zoom: 1.15, rot: 1},
  {f: cTorm.end, x: D(cTorm.end).x, y: D(cTorm.end).y - 245, zoom: 1.25, rot: 2},
  {f: cVic.end, x: D(cVic.end).x, y: D(cVic.end).y - 240, zoom: 1.2, rot: -1},
  {f: cBack.start + 50, x: D(cBack.start + 50).x + 260, y: D(cBack.start + 50).y - 210, zoom: 0.9, rot: 0},
  {f: cBack.end, x: FOOT.x + 300, y: FOOT.y - 250, zoom: 0.8, rot: 0},
  {f: cGP.end, x: FOOT.x + 200, y: FOOT.y - 330, zoom: 0.6, rot: 1},
  {f: T.lightMax, x: FOOT.x + 150, y: FOOT.y - 300, zoom: 0.55, rot: 0},
  {f: cNotP.end, x: FOOT.x + 160, y: FOOT.y - 280, zoom: 0.6, rot: 0},
];

export const descentImpacts: Impact[] = [];

/** 清醒的光晕：半透明圆盘；折磨时边缘变锯齿、偏红、随心跳抽动 */
const Halo: React.FC<{frame: number; at: Pt; r: number}> = ({frame, at, r}) => {
  if (r < 2) return null;
  const jag = ramp(frame, cTorm.start, cTorm.start + 12) * (1 - ramp(frame, cVic.start, cVic.start + 20));
  const beat = jag * pulse((frame - cTorm.start) % 20, 8) * 0.1;
  const edge = mixColor(jag, COLORS.ember, '#D12A1E');
  const n = 72;
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = (1 + beat) * (1 + jag * ((i % 2 ? -1 : 1) * 0.07 + 0.04 * Math.sin(a * 5 + frame * 0.5)));
    d += `${i ? 'L' : 'M'}${(at.x + Math.cos(a) * r * k).toFixed(1)} ${(at.y + Math.sin(a) * r * k).toFixed(1)}`;
  }
  return (
    <g>
      <defs>
        <radialGradient id="descentHalo">
          <stop offset="0" stopColor={COLORS.emberHot} stopOpacity={0.5} />
          <stop offset="0.7" stopColor={edge} stopOpacity={0.16} />
          <stop offset="1" stopColor={edge} stopOpacity={0.05} />
        </radialGradient>
      </defs>
      <path d={d + 'Z'} fill="url(#descentHalo)" stroke={edge} strokeWidth={3} strokeOpacity={0.7} />
    </g>
  );
};

const Visual: React.FC<{frame: number}> = ({frame}) => {
  const env = ramp(frame, T.env0, T.env1) * (1 - ramp(frame, T.hand0, T.hand1));
  const u = stoneU(frame);
  const stone = DS.at(u, STONE_R);
  const dot = descentDot(frame);
  const hr = haloR(frame);
  const crown = ramp(frame, cVic.start + 18, cVic.start + 34, Easing.out(Easing.back(2)));
  const warm = 0.55 * ramp(frame, T.arrive - 14, T.arrive + 16);
  const lr = lightR(frame);
  const knowsOn = ramp(frame, cKnows.start, cKnows.start + 10) * (1 - ramp(frame, cKnows.end - 10, cKnows.end));
  const mine = frame < T.hand0; // 本节自己的山坡、石头、橙点；之后交给第五节
  return (
    <g>
      {/* 星空和山体 */}
      <g opacity={env}>
        {Array.from({length: 170}, (_, i) => {
          const x = DS.foot.x - 1600 + hash(i) * 4800;
          const y = DS.top.y - 1700 + hash(i + 50) * 1900;
          return <circle key={i} cx={x} cy={y} r={1.5 + hash(i + 9) * 2.5} fill={COLORS.ink} opacity={(0.25 + 0.5 * hash(i + 3)) * (0.6 + 0.4 * Math.sin(frame / (6 + hash(i) * 10) + i))} />;
        })}
        <polygon
          points={`${DS.foot.x - 3000},${DS.foot.y} ${DS.foot.x},${DS.foot.y} ${DS.top.x},${DS.top.y} ${DS.top.x + 1700},${DS.foot.y + 300} ${DS.top.x + 1700},${DS.foot.y + 3000} ${DS.foot.x - 3000},${DS.foot.y + 3000}`}
          fill="#100B0A"
        />
        <line x1={DS.foot.x - 3000} y1={DS.foot.y} x2={DS.foot.x} y2={DS.foot.y} stroke={COLORS.ink} strokeWidth={2} opacity={0.35} />
        <line x1={DS.top.x} y1={DS.top.y} x2={DS.top.x + 1700} y2={DS.foot.y + 300} stroke={COLORS.ink} strokeWidth={2} opacity={0.2} />
      </g>
      {mine && frame >= cNP.start && (
        <>
          <line x1={DS.foot.x} y1={DS.foot.y} x2={DS.top.x} y2={DS.top.y} stroke={COLORS.ember} strokeWidth={14} opacity={0.18} />
          <line x1={DS.foot.x} y1={DS.foot.y} x2={DS.top.x} y2={DS.top.y} stroke={COLORS.ink} strokeWidth={3} strokeLinecap="round" />
          {/* 下山路上留下的淡淡光迹 */}
          {frame >= cWD.start && (
            <line x1={DS.at(TOPU - GAP).x} y1={DS.at(TOPU - GAP).y} x2={DS.at(dotU(frame)).x} y2={DS.at(dotU(frame)).y} stroke={COLORS.emberHot} strokeWidth={6} opacity={0.35} strokeLinecap="round" />
          )}
        </>
      )}
      {/* 光晕里看见的：石头一次次滚落 */}
      {knowsOn > 0 &&
        [0, 1, 2].map((j) => {
          const ph = ((frame - cKnows.start) / 26 + j / 3) % 1;
          const gu = dotU(frame) + 0.16 - ph * 0.32;
          const g = DS.at(gu, STONE_R);
          const dist = Math.hypot(g.x - dot.x, g.y - dot.y);
          const o = 0.45 * clamp(1 - dist / Math.max(hr, 1)) * knowsOn;
          return o > 0 ? <Orb key={j} x={g.x} y={g.y} r={STONE_R} rotation={ph * 300} opacity={o} /> : null;
        })}
      {mine && frame >= cNP.start && (
        <>
          <Orb x={stone.x} y={stone.y} r={STONE_R} rotation={((u * DS.len) / STONE_R) * (180 / Math.PI)} glow={0.25} />
          {warm > 0 && <Orb x={stone.x} y={stone.y} r={STONE_R} variant="ember" opacity={warm} />}
        </>
      )}
      {mine && <Halo frame={frame} at={dot} r={hr} />}
      {/* 不再被惩罚：光向外扩散 */}
      {lr > 1 && (
        <g>
          <defs>
            <radialGradient id="descentLight">
              <stop offset="0" stopColor="#FFE2C2" stopOpacity={0.62} />
              <stop offset="0.5" stopColor={COLORS.ember} stopOpacity={0.3} />
              <stop offset="1" stopColor={COLORS.ember} stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={DS.at(-GAP, DOT_R).x} cy={DS.at(-GAP, DOT_R).y} r={lr} fill="url(#descentLight)" />
        </g>
      )}
      {/* 众神的环再次压下，又被光一个个照散 */}
      {frame >= cGP.start &&
        frame < T.hand0 + 10 &&
        Array.from({length: GOD_COUNT}, (_, k) => {
          const g = godAt(k, frame);
          const s = ramp(frame, cGP.start + 2 + k * 3, cGP.start + 14 + k * 3, Easing.out(Easing.back(2)));
          const gone = ramp(lr, g.d * 0.75, g.d * 1.05);
          return <Orb key={k} x={g.x} y={g.y} r={lerp(80, 110, ramp(frame, cGP.start, cGP.end)) * s * (1 - 0.7 * gone)} variant="ring" ringWidth={9} glow={0.8} opacity={s * (1 - gone)} />;
        })}
      {mine && (
        <>
          {crown > 0 && <Orb x={dot.x} y={dot.y - 62 - 6 * Math.sin(frame / 10)} r={30 * crown} variant="emberRing" ringWidth={6} glow={0.9} opacity={crown} />}
          <Orb x={dot.x} y={dot.y} r={DOT_R + 4 * ramp(frame, cLuc.start, cLuc.start + 30)} variant="ember" glow={0.9 + 0.2 * Math.sin(frame / 6)} />
        </>
      )}
    </g>
  );
};

const Sound: React.FC = () => {
  const steps: number[] = [];
  for (let f = cWD.start + 4; f < T.arrive; f += 14) steps.push(f);
  return (
    <>
      <Sfx name="grind" at={cNP.start} volume={0.5} />
      <Sfx name="grind" at={cNP.start + 22} volume={0.4} rate={1.1} />
      <Sfx name="roll" at={T.roll0} volume={0.7} />
      <Sfx name="roll" at={T.roll0 + 18} volume={0.35} rate={0.8} />
      <Sfx name="thump" at={T.roll1} volume={0.25} rate={0.8} />
      <Sfx name="wind" at={cWD.start} volume={0.45} />
      <Sfx name="wind" at={cKnows.start - 10} volume={0.3} rate={0.9} />
      <Sfx name="wind" at={cBack.start} volume={0.3} rate={1.1} />
      {steps.map((f, k) => (
        <Sfx key={k} name="step" at={f} volume={0.3} rate={k % 2 ? 1.05 : 0.95} />
      ))}
      <Sfx name="pad" at={cLuc.start} volume={0.55} />
      {[0, 1, 2].map((j) => (
        <Sfx key={`g${j}`} name="roll" at={cKnows.start + 8 + j * 26} volume={0.18} rate={0.7} />
      ))}
      {[0, 1, 2].map((j) => (
        <Sfx key={`h${j}`} name="heartbeat" at={cTorm.start + 2 + j * 20} volume={0.75} />
      ))}
      <Sfx name="chord" at={cVic.start + 6} volume={0.62} />
      <Sfx name="thump" at={T.arrive} volume={0.35} rate={1.3} />
      <Sfx name="bell" at={T.arrive + 10} volume={0.25} rate={0.75} />
      <Sfx name="rumble" at={cGP.start} volume={0.75} />
      {[0, 1, 2].map((j) => (
        <Sfx key={`z${j}`} name="ping" at={cGP.start + 4 + j * 8} volume={0.2} rate={0.5 + j * 0.05} />
      ))}
      <Sfx name="pad" at={cNotP.start + 4} volume={0.6} />
      <Sfx name="arp" at={cNotP.start + 44} volume={0.35} />
      <Sfx name="whoosh" at={T.hand0 - 4} volume={0.45} rate={0.7} />
    </>
  );
};

export const DescentBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const on = ramp(frame, T.env0 + 15, T.env1 + 15) * (1 - ramp(frame, T.hand0, T.hand1));
  if (on <= 0) return null;
  return <AbsoluteFill style={{opacity: on, background: 'linear-gradient(180deg, #0B0E1C 0%, #10101A 55%, #160D0B 100%)'}} />;
};

export const Descent: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = frame >= T.env0 && frame <= T.hand1;
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
