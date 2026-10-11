import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import {Orb} from '../components/Orb';
import {Sfx} from '../components/Sfx';
import {hash, inOut, lerp, lerpPt, out, type Pt, ramp} from '../lib/anim';
import type {Impact, Shot} from '../lib/camera';
import {cue} from '../lib/cues';
import {COLORS} from '../theme';
import {DESCENT_SLOPE} from './Descent';
import {DOT_R, STONE_R} from './Opening';
import {LINE_Y, PUN_END} from './Punishment';
import {RETURN} from './Myth';

// 第三节（第 24–28 屏）：荒诞。
// 压满画面的石头离开地面、变暗，成了一个巨大、沉默的暗圆（世界）；底色换成冷色。
// 橙点一圈圈发出追问的波纹，碰到暗圆就被吞掉 → 两者之间裂开一道光 → 裂缝转成一座新的山坡，
// 暗圆落回坡底变回石头。

const V: Pt = {x: RETURN.x - 28, y: LINE_Y - 810};
const DA: Pt = {x: RETURN.x - 28, y: LINE_Y - 30};
const DS = DESCENT_SLOPE;
const GAP_D = (STONE_R + DOT_R + 4) / DS.len;

const cWord = cue('absurd-word');
const cAsk = cue('ask-meaning');
const cSilence = cue('silence');
const cCollide = cue('collision');
const cHero = cue('absurd-hero');

const T = {
  rise0: cWord.start,
  rise1: cWord.start + 56,
  crack: cCollide.start + 2,
  morph0: cHero.start,
  morph1: cHero.start + 32,
  fall0: cHero.start + 12,
  fall1: cHero.start + 42,
  end: cHero.end,
};
const RIPPLES = [
  ...Array.from({length: 5}, (_, k) => cAsk.start + 5 + k * 14),
  ...Array.from({length: 3}, (_, k) => cSilence.start + 7 + k * 12),
];
const RIPPLE_LIFE = 44;

const voidR = (f: number) => {
  const grow = lerp(PUN_END.stone.r, 520, ramp(f, T.rise0, T.rise1, inOut)) + 40 * ramp(f, cSilence.start, cCollide.start);
  return lerp(grow, STONE_R, ramp(f, T.fall0, T.fall1, Easing.in(Easing.cubic)));
};
const voidCenter = (f: number): Pt => {
  const up = lerpPt(PUN_END.stone, V, ramp(f, T.rise0, T.rise1, inOut));
  return lerpPt(up, DS.at(0, STONE_R), ramp(f, T.fall0, T.fall1, Easing.in(Easing.cubic)));
};
const dotAt = (f: number): Pt => {
  const a = lerpPt(PUN_END.dot, DA, ramp(f, T.rise0, T.rise0 + 46, inOut));
  return lerpPt(a, DS.at(-GAP_D, DOT_R), ramp(f, T.fall0, T.fall1 + 6, inOut));
};

export const absurdShots: Shot[] = [
  {f: cWord.start + 36, x: V.x, y: LINE_Y - 420, zoom: 0.62, rot: 0},
  {f: cAsk.end, x: V.x, y: LINE_Y - 400, zoom: 0.66, rot: 1},
  {f: cSilence.end, x: V.x, y: LINE_Y - 390, zoom: 0.7, rot: -1},
  {f: cCollide.end, x: V.x, y: LINE_Y - 380, zoom: 0.8, rot: 0},
  {f: T.end - 6, x: lerp(DS.foot.x, DS.top.x, 0.5), y: lerp(DS.foot.y, DS.top.y, 0.5), zoom: 0.55, rot: 0},
];

export const absurdImpacts: Impact[] = [
  {f: T.crack, amp: 12},
  {f: T.fall1, amp: 8},
];

const Visual: React.FC<{frame: number}> = ({frame}) => {
  const vc = voidCenter(frame);
  const vr = voidR(frame);
  const toVoid = ramp(frame, T.rise0 + 14, T.rise0 + 46);
  const toStone = ramp(frame, T.fall0 + 10, T.fall1);
  const dot = dotAt(frame);
  const dark = 0.38 * ramp(frame, cSilence.start + 7, cSilence.start + 37) * (1 - ramp(frame, cCollide.start, cCollide.start + 24));
  // 裂缝：从橙点到暗圆底部；随后变成新的山坡
  const crackOn = ramp(frame, T.crack - 2, T.crack + 4);
  const m = ramp(frame, T.morph0, T.morph1, inOut);
  const a0 = lerpPt(DA, DS.foot, m);
  const a1 = lerpPt({x: V.x, y: V.y + 560}, DS.top, m);
  const seed = Math.floor(frame / 2);
  const pts = Array.from({length: 11}, (_, i) => {
    const t = i / 10;
    const j = i === 0 || i === 10 ? 0 : (hash(seed * 13 + i) - 0.5) * 90 * (1 - m);
    const p = lerpPt(a0, a1, t);
    const len = Math.hypot(a1.x - a0.x, a1.y - a0.y) || 1;
    return {x: p.x + (-(a1.y - a0.y) / len) * j, y: p.y + ((a1.x - a0.x) / len) * j};
  });
  const crackStr = pts.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <g>
      {/* 被暗圆慢慢吸进去的浮尘：世界只进不出 */}
      {frame >= T.rise0 + 10 &&
        frame < T.fall0 + 10 &&
        Array.from({length: 70}, (_, i) => {
          const ph = ((frame - T.rise0) / (110 + 90 * hash(i + 400)) + hash(i + 401)) % 1;
          const R = lerp(1500, vr * 0.92, Math.pow(ph, 1.4));
          const a = hash(i + 402) * Math.PI * 2 + ph * 2.4;
          const o = 0.8 * Math.min(1, ph * 4) * (1 - ramp(frame, T.fall0 - 10, T.fall0 + 10));
          return <circle key={`m${i}`} cx={vc.x + Math.cos(a) * R} cy={vc.y + Math.sin(a) * R} r={3 + hash(i + 403) * 4} fill={COLORS.ink} opacity={o} />;
        })}
      {RIPPLES.map((s, k) => {
        const t = (frame - s) / RIPPLE_LIFE;
        if (t < 0 || t > 1) return null;
        return <circle key={k} cx={DA.x} cy={DA.y} r={20 + out(t) * 1000} fill="none" stroke={COLORS.ember} strokeWidth={7} opacity={0.9 * (1 - t)} />;
      })}
      {/* 裂缝迸出的火星 */}
      {crackOn > 0 &&
        m < 1 &&
        Array.from({length: 36}, (_, i) => {
          const life = 14;
          const age = (frame - T.crack + i * 3) % life;
          const born = frame - age;
          const p = pts[1 + Math.floor(hash(i + born * 0.13) * 9)];
          const ang = hash(i * 7 + born) * Math.PI * 2;
          const v = 4 + hash(i * 3 + born) * 9;
          return <circle key={`s${i}`} cx={p.x + Math.cos(ang) * v * age} cy={p.y + Math.sin(ang) * v * age + 0.3 * age * age} r={3} fill={COLORS.emberHot} opacity={(1 - age / life) * (1 - m)} />;
        })}
      {crackOn > 0 && (
        <g opacity={crackOn}>
          <polyline points={crackStr} fill="none" stroke={COLORS.ember} strokeWidth={lerp(26, 14, m)} opacity={0.25} strokeLinejoin="round" />
          <polyline points={crackStr} fill="none" stroke={m > 0.5 ? COLORS.ink : '#FFE3CC'} strokeWidth={lerp(6, 3, m)} strokeLinejoin="round" />
        </g>
      )}
      {/* 石头 → 沉默的暗圆 → 落回坡底变回石头 */}
      <Orb x={vc.x} y={vc.y} r={vr} rotation={PUN_END.stone.rot} dim={PUN_END.stone.dim * (1 - toStone)} glow={0.25} opacity={Math.max(1 - toVoid, toStone)} />
      <Orb x={vc.x} y={vc.y} r={vr} variant="void" ringWidth={10} opacity={toVoid * (1 - toStone)} />
      <Orb x={dot.x} y={dot.y} r={DOT_R} variant="ember" glow={lerp(0.6, 1.2, ramp(frame, T.fall1, T.end)) + 0.2 * Math.sin(frame / 6)} />
      {dark > 0 && <rect x={V.x - 6000} y={V.y - 4000} width={12000} height={9000} fill="#000" opacity={dark} />}
    </g>
  );
};

const Sound: React.FC = () => (
  <>
    <Sfx name="rumble" at={T.rise0} volume={0.5} />
    <Sfx name="whoosh" at={T.rise0 + 16} volume={0.4} rate={0.7} />
    <Sfx name="whine" at={T.rise1} volume={0.22} rate={0.5} />
    {RIPPLES.map((f, k) => (
      <Sfx key={k} name="ping" at={f} volume={k < 5 ? 0.42 : 0.32} rate={1 + (k % 5) * 0.06} />
    ))}
    <Sfx name="dissonant_hit" at={T.crack} volume={0.8} />
    <Sfx name="zap" at={T.crack + 2} volume={0.35} rate={0.7} />
    <Sfx name="bell_low" at={T.morph0 + 6} volume={0.55} />
    <Sfx name="whoosh" at={T.fall0} volume={0.35} />
    <Sfx name="thump" at={T.fall1} volume={0.7} />
  </>
);

export const AbsurdBackdrop: React.FC = () => {
  const frame = useCurrentFrame();
  const on = ramp(frame, T.rise0, T.rise0 + 46) * (1 - ramp(frame, T.fall1, T.end + 12));
  if (on <= 0) return null;
  return <AbsoluteFill style={{opacity: on, background: 'radial-gradient(ellipse at 50% 35%, rgba(26,38,62,0.75) 0%, rgba(12,18,32,0.6) 45%, rgba(4,6,10,0.3) 100%)'}} />;
};

export const Absurd: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = frame >= T.rise0 - 1 && frame < T.end;
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
