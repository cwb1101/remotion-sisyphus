import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {Orb} from '../components/Orb';
import {Sfx} from '../components/Sfx';
import {hash, inOut, lerp, lerpPt, type Pt, ramp} from '../lib/anim';
import type {Impact, Shot} from '../lib/camera';
import {cue, TITLE_STEP} from '../lib/cues';
import {makeSlope, mixSlope} from '../lib/geom';
import {COLORS} from '../theme';
import type {ToScreen} from '../Film';
import {OPEN_SLOPE, gapOf} from './Answer';
import {DOT_GAP, DOT_R, FOOT, onSlope, openingShots, PEAK_U, STONE_R} from './Opening';

// 第六节（第 45–49 屏）：结尾，回到开头的画面。
// 石头又滚下来，橙点转身走下山 → 山坡放平成一行大字下面的横线（坡上的光带还亮着）→
// 石头飞进句末，成了“西西弗斯是幸福的。”的那个句号 → 句子淡去，句号落回坡底变回石头，
// 构图、计数器和第 0 帧一致，可以无缝循环。

const OS = OPEN_SLOPE;
const HL = makeSlope({x: -1300, y: 226}, {x: 1300, y: 226});

const cRA = cue('rolls-again');
const cTurn = cue('turns');
const cImg = cue('imagine');
const cHF = cue('happy-final');
const cLoop = cue('count-loop');

const T = {
  // 等镜头从坡面拉开、石头进画以后再滚
  roll0: cRA.start + 14,
  roll1: cRA.start + 46,
  walk0: cTurn.start + 8,
  walk1: cTurn.end - 6,
  flat0: cImg.start,
  flat1: cImg.start + 40,
  fly0: cHF.start + 2,
  /** 句末“。”落地的那一帧 */
  fly1: cHF.start + 2 + ([...cHF.text].length - 1) * TITLE_STEP + 5,
  back0: cLoop.start + 2,
  back1: cLoop.end - 1,
};

const slopeAt = (f: number) => mixSlope(OS, HL, ramp(f, T.flat0, T.flat1, inOut));
const stoneU = (f: number) => PEAK_U * (1 - Easing.in(Easing.quad)(ramp(f, T.roll0, T.roll1, (t) => t)));
const walk = (f: number) => ramp(f, T.walk0, T.walk1, (t) => t);
const dotU = (f: number) => lerp(PEAK_U, 0, walk(f)) - gapOf(slopeAt(f));

/** 第 0 帧的石头和橙点（开头 stoneAt(0)：石头在坡底上方 150 处正要落下） */
const FRAME0_STONE: Pt = {x: onSlope(0, STONE_R).x, y: onSlope(0, STONE_R).y - 150};
const FRAME0_DOT: Pt = onSlope(-DOT_GAP, DOT_R);

const dotAt = (f: number): Pt => {
  const sl = slopeAt(f);
  const p = sl.at(dotU(f), DOT_R);
  const bob = walk(f) > 0 && walk(f) < 1 ? 4 * Math.abs(Math.sin(f * 0.4)) : 0;
  return lerpPt({x: p.x, y: p.y - bob}, FRAME0_DOT, ramp(f, T.back0 + 4, T.back1, inOut));
};
const stoneWorld = (f: number): Pt => slopeAt(f).at(stoneU(f), STONE_R);

const frame0Shot = openingShots[0];
export const endingShots: Shot[] = [
  {f: cRA.start + 20, x: 20, y: 30, zoom: 1.0, rot: 1},
  // 转身下山：相机跟着橙点，橙点保持在字幕带上方
  {f: cTurn.start + 34, x: dotAt(cTurn.start + 34).x + 60, y: dotAt(cTurn.start + 34).y + 125, zoom: 1.3, rot: 2},
  {f: cTurn.end, x: dotAt(cTurn.end).x + 120, y: dotAt(cTurn.end).y + 110, zoom: 1.2, rot: 0},
  {f: T.flat1, x: 0, y: 0, zoom: 0.62, rot: 0},
  {f: cHF.end, x: 0, y: -10, zoom: 0.74, rot: 0},
  {f: T.back1, x: frame0Shot.x, y: frame0Shot.y, zoom: frame0Shot.zoom, rot: frame0Shot.rot, ease: Easing.inOut(Easing.cubic)},
];

export const endingImpacts: Impact[] = [{f: T.roll1, amp: 6}];

const Visual: React.FC<{frame: number}> = ({frame}) => {
  const sl = slopeAt(frame);
  const flat = ramp(frame, T.flat0, T.flat1, inOut);
  const lineOut = 1 - ramp(frame, T.back0, T.back0 + 24);
  const bandEnd = sl.at(PEAK_U - gapOf(sl));
  const stone = stoneWorld(frame);
  const dot = dotAt(frame);
  const turn = frame - cTurn.start;
  return (
    <g>
      <g opacity={lineOut}>
        <line x1={sl.foot.x - 1400 * (1 - flat)} y1={sl.foot.y} x2={sl.foot.x} y2={sl.foot.y} stroke={COLORS.ink} strokeWidth={2} opacity={0.35 * (1 - flat)} />
        <line x1={sl.foot.x} y1={sl.foot.y} x2={sl.top.x} y2={sl.top.y} stroke={COLORS.ink} strokeWidth={3} strokeLinecap="round" />
        <line x1={sl.top.x} y1={sl.top.y} x2={sl.top.x + 900 * (1 - flat)} y2={sl.top.y} stroke={COLORS.ink} strokeWidth={2} opacity={0.3 * (1 - flat)} />
        {/* 光带一直亮着 */}
        <line x1={sl.foot.x} y1={sl.foot.y} x2={bandEnd.x} y2={bandEnd.y} stroke={COLORS.ember} strokeWidth={40} opacity={0.16} strokeLinecap="round" />
        <line x1={sl.foot.x} y1={sl.foot.y} x2={bandEnd.x} y2={bandEnd.y} stroke={COLORS.ember} strokeWidth={9} opacity={0.9} strokeLinecap="round" />
        {/* 光带上一道亮光顺着坡往下跑，反复不停 */}
        {[0, 0.5].map((o, k) => {
          const u = (PEAK_U - gapOf(sl)) * (1 - ((frame / 70 + o) % 1));
          const a = sl.at(Math.max(0, u - 0.04));
          const b = sl.at(u);
          return <line key={k} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#FFE3CC" strokeWidth={10} strokeLinecap="round" opacity={0.85} />;
        })}
      </g>
      {/* 放平之后，从横线上缓缓升起的光点 */}
      {flat > 0 &&
        Array.from({length: 40}, (_, i) => {
          const ph = ((frame - T.flat0) / (80 + 60 * hash(i + 500)) + hash(i + 501)) % 1;
          const base = sl.at(hash(i + 502) * (PEAK_U - gapOf(sl)));
          return <circle key={`r${i}`} cx={base.x + Math.sin(ph * 6 + i) * 14} cy={base.y - ph * 260} r={2.5 + hash(i + 503) * 2.5} fill={COLORS.emberHot} opacity={0.7 * flat * Math.sin(Math.PI * ph) * lineOut} />;
        })}
      {frame < T.fly0 && <Orb x={stone.x} y={stone.y} r={STONE_R} rotation={((stoneU(frame) * OS.len) / STONE_R) * (180 / Math.PI)} glow={0.25} />}
      <Orb
        x={dot.x}
        y={dot.y}
        r={DOT_R}
        variant="ember"
        glow={0.8 + 0.2 * Math.sin(frame / 6)}
        squash={turn >= 0 && turn < 10 ? -0.25 * Math.sin((Math.PI * turn) / 10) : 0}
      />
    </g>
  );
};

/** 句号的位置（屏幕坐标），由片名排版推出：字号、字距与 Subtitles 的 Title 一致 */
const periodPos = (): Pt => {
  const n = [...cHF.text].length;
  const size = Math.min(190, 1700 / (n * 1.14));
  const left = 960 - (n * 1.14 * size) / 2;
  // 系数按渲染出的“。”字形中心实测校准
  return {x: left + (n - 1) * 1.14 * size + 0.17 * size, y: 540 + 0.37 * size};
};

/** 石头飞进句末变成句号，最后再落回开头第 0 帧的位置（屏幕坐标叠加层） */
export const EndingOverlay: React.FC<{toScreen: ToScreen}> = ({toScreen}) => {
  const frame = useCurrentFrame();
  if (frame < T.fly0) return null;
  const radiusAt = (p: Pt, r: number) => {
    const a = toScreen(p);
    const b = toScreen({x: p.x + r, y: p.y});
    return Math.hypot(b.x - a.x, b.y - a.y);
  };
  const src = stoneWorld(T.fly0);
  const s0 = toScreen(src);
  const r0 = radiusAt(src, STONE_R);
  const per = periodPos();
  const rPer = 23;
  let pos: Pt;
  let r: number;
  if (frame < T.back0) {
    const t = ramp(frame, T.fly0, T.fly1, inOut);
    pos = {x: lerp(s0.x, per.x, t), y: lerp(s0.y, per.y, t) + 140 * Math.sin(Math.PI * t)};
    r = lerp(r0, rPer, t);
  } else {
    const t = ramp(frame, T.back0 + 4, T.back1, inOut);
    const dst = toScreen(FRAME0_STONE);
    pos = {x: lerp(per.x, dst.x, t), y: lerp(per.y, dst.y, t) - 120 * Math.sin(Math.PI * t)};
    r = lerp(rPer, radiusAt(FRAME0_STONE, STONE_R), t);
  }
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      <Orb x={pos.x} y={pos.y} r={r} rotation={frame * 2} glow={0.25} />
    </svg>
  );
};

const Sound: React.FC = () => (
  <>
    <Sfx name="roll" at={T.roll0} volume={0.6} />
    <Sfx name="thump" at={T.roll1} volume={0.45} />
    <Sfx name="slide" at={cTurn.start + 2} volume={0.3} rate={0.7} />
    {Array.from({length: 6}, (_, k) => (
      <Sfx key={k} name="step" at={T.walk0 + 4 + k * 10} volume={0.35} rate={k % 2 ? 1.05 : 0.95} />
    ))}
    <Sfx name="whoosh" at={T.flat0} volume={0.4} rate={0.8} />
    <Sfx name="pad" at={T.flat0 + 6} volume={0.45} />
    <Sfx name="whoosh" at={T.fly0} volume={0.35} rate={1.3} />
    <Sfx name="bell_low" at={T.fly1} volume={0.7} />
    <Sfx name="whoosh" at={T.back0 + 4} volume={0.45} rate={0.9} />
    <Sfx name="riser" at={T.back1 - 40} volume={0.35} />
  </>
);

export const Ending: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = frame >= cRA.start;
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
