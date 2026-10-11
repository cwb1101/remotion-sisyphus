import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {Orb} from '../components/Orb';
import {Sfx} from '../components/Sfx';
import {hash, inOut, lerp, out, type Pt, ramp} from '../lib/anim';
import type {Impact, Shot} from '../lib/camera';
import {cue} from '../lib/cues';
import {keyed, makeSlope, mixSlope, type Slope} from '../lib/geom';
import {useTextPoints} from '../lib/textPoints';
import {COLORS, SERIF} from '../theme';
import {DESCENT_SLOPE, DESCENT_T} from './Descent';
import {DOT_R, FOOT, PEAK_U, QMARK, QMARK_SIZE, STONE_R, TOP} from './Opening';

// 第五节（第 38–44 屏）：回答。
// 光收回坡底的橙点，大山的坡变回开头那条山坡、相机回到开头的构图（回到开头的问题）。
// 开头那个灰色问号的粒子重新聚起来 → 加缪的回答：问号的粒子落到坡上，变成一个个脚印 →
// 橙点推石头上坡，走过的地方一路亮成光带 → 石头照旧滚不上去，光带不灭 → 镜头贴着坡面，脚印逐个闪亮。

export const OPEN_SLOPE = makeSlope(FOOT, TOP);
const OS = OPEN_SLOPE;
export const gapOf = (sl: Slope) => (STONE_R + DOT_R + 4) / sl.len;

const cBQ = cue('back-to-q');
const cQ = cue('q-again');
const cCA = cue('camus-answer');
const cStr = cue('struggle');
const cFill = cue('fill-heart');
const cNS = cue('not-summit');
const cES = cue('every-step');

const T = {
  m0: DESCENT_T.hand0,
  m1: DESCENT_T.hand1,
  push0: cQ.start + 16,
  form0: cQ.start + 2,
  form1: cQ.start + 52,
  stream0: cCA.start,
  stream1: cCA.start + 40,
  topReach: cFill.start + 57,
  end: cES.end,
};

const slopeAt = (f: number) => mixSlope(DESCENT_SLOPE, OS, ramp(f, T.m0, T.m1, inOut));
export const answerStoneU = (f: number) => {
  const u = keyed(f, [[T.push0, 0], [cQ.end, 0.3], [cCA.end, 0.36], [cStr.end, 0.7], [T.topReach, PEAK_U]], Easing.inOut(Easing.sin));
  return f < cNS.start ? u : PEAK_U - 0.008 * Math.abs(Math.sin((f - cNS.start) / 3)) * (1 - ramp(f, cNS.start, cES.start));
};
const GAP = gapOf(OS);
const dotU = (f: number) => answerStoneU(f) - gapOf(slopeAt(f));
/** 光带亮到哪里（脚印的 u 小于它就亮） */
export const bandU = (f: number) => Math.max(0, dotU(f)) * ramp(f, cCA.end - 10, cStr.start + 12);

export const answerShots: Shot[] = [
  {f: T.m1, x: 20, y: 30, zoom: 1.0, rot: 1, ease: Easing.inOut(Easing.cubic)},
  // 和开头问号成形时同样的景别；相机略高一点，石头落在字幕带下方
  {f: T.form1, x: 0, y: -160, zoom: 0.74, rot: -1},
  {f: cCA.end, x: 20, y: -190, zoom: 0.8, rot: 0},
  {f: cStr.end, x: 60, y: -60, zoom: 0.9, rot: 1},
  {f: cFill.end, x: 160, y: -120, zoom: 0.95, rot: -1},
  {f: cNS.start + 20, x: TOP.x - 360, y: TOP.y + 80, zoom: 2.0, rot: -4, ease: out},
  {f: cNS.end, x: TOP.x - 370, y: TOP.y + 90, zoom: 2.1, rot: -5},
  // 贴着坡面：相机转到和坡平行，坡面压在字幕带下方
  {f: cES.start + 14, x: OS.at(0.6, 120).x, y: OS.at(0.6, 120).y, zoom: 3.2, rot: -OS.angle},
  {f: cES.end, x: OS.at(0.15, 120).x, y: OS.at(0.15, 120).y, zoom: 3.0, rot: -OS.angle},
];

export const answerImpacts: Impact[] = [];

/** 问号的粒子：先聚成开头那个灰色问号，再落到坡上变成脚印 */
const Footprints: React.FC<{frame: number}> = ({frame}) => {
  const q = useTextPoints('？', QMARK_SIZE, 900, SERIF, 20);
  if (!q || q.length === 0 || frame < T.form0) return null;
  const n = q.length;
  const band = bandU(frame);
  const scan = lerp(0.62, 0.12, ramp(frame, cES.start, cES.end, (t) => t));
  const fadeTail = 1 - ramp(frame, cES.end - 12, cES.end);
  return (
    <g opacity={fadeTail}>
      {q.map((p, i) => {
        const h1 = hash(i * 1.37 + 70);
        const h2 = hash(i * 2.11 + 90);
        const scatter: Pt = {x: QMARK.x + (h1 - 0.5) * 2600, y: QMARK.y + (h2 - 0.5) * 1500};
        const inQ: Pt = {x: QMARK.x + p.x, y: QMARK.y + p.y};
        // 脚印沿坡均匀排开，左右脚交替
        const u = ((i + 0.5) / n) * (PEAK_U - GAP) + (h1 - 0.5) * 0.004;
        const foot = OS.at(u, i % 2 ? 12 : 2);
        const e1 = ramp(frame, T.form0 + h2 * 10, T.form1 - 10 + h1 * 10, inOut);
        const e2 = ramp(frame, T.stream0 + u * 18, T.stream1 + u * 8, Easing.in(Easing.cubic));
        const a = {x: lerp(scatter.x, inQ.x, e1) + Math.sin(frame / 7 + i) * 2.5, y: lerp(scatter.y, inQ.y, e1) + Math.cos(frame / 9 + i) * 2.5};
        const pos = {x: lerp(a.x, foot.x, e2), y: lerp(a.y, foot.y, e2)};
        const lit = u < band ? 1 : 0;
        const flash = Math.exp(-(((u - scan) / 0.025) ** 2)) * ramp(frame, cES.start, cES.start + 6);
        const r = lerp(4.5, 3.4, e2) + lit * 1.4 + flash * 3;
        const fill = lit || flash > 0.3 ? (flash > 0.5 ? COLORS.emberHot : COLORS.ember) : COLORS.stone;
        return <circle key={i} cx={pos.x} cy={pos.y} r={r} fill={fill} opacity={(0.35 + 0.2 * e1) * (1 - lit) + lit * 0.95 + flash * 0.4} />;
      })}
    </g>
  );
};

const Visual: React.FC<{frame: number}> = ({frame}) => {
  const sl = slopeAt(frame);
  const u = answerStoneU(frame);
  const stone = sl.at(u, STONE_R);
  const dot = sl.at(dotU(frame), DOT_R);
  const band = bandU(frame);
  const bandEnd = OS.at(band);
  const inf = ramp(frame, T.m0 + 4, T.m1) * (1 - ramp(frame, cCA.start, cCA.start + 30));
  const halo = 150 * ramp(frame, cFill.start, cFill.start + 40, out) * (1 + 0.05 * Math.sin(frame / 8));
  return (
    <g>
      {inf > 0 && (
        <text x={60} y={-330} textAnchor="middle" dominantBaseline="central" fontFamily={SERIF} fontWeight={700} fontSize={640} fill={COLORS.ink} opacity={0.08 * inf}>
          ∞
        </text>
      )}
      <line x1={sl.foot.x - 1400} y1={sl.foot.y} x2={sl.foot.x} y2={sl.foot.y} stroke={COLORS.ink} strokeWidth={2} opacity={0.35} />
      <line x1={sl.foot.x} y1={sl.foot.y} x2={sl.top.x} y2={sl.top.y} stroke={COLORS.ember} strokeWidth={14} opacity={0.12} />
      <line x1={sl.foot.x} y1={sl.foot.y} x2={sl.top.x} y2={sl.top.y} stroke={COLORS.ink} strokeWidth={3} strokeLinecap="round" />
      <line x1={sl.top.x} y1={sl.top.y} x2={sl.top.x + 900} y2={sl.top.y} stroke={COLORS.ink} strokeWidth={2} opacity={0.3} />
      {band > 0.001 && (
        <g>
          <line x1={FOOT.x} y1={FOOT.y} x2={bandEnd.x} y2={bandEnd.y} stroke={COLORS.ember} strokeWidth={40} opacity={0.16} strokeLinecap="round" />
          <line x1={FOOT.x} y1={FOOT.y} x2={bandEnd.x} y2={bandEnd.y} stroke={COLORS.ember} strokeWidth={9} opacity={0.9} strokeLinecap="round" />
        </g>
      )}
      <Footprints frame={frame} />
      <Orb x={stone.x} y={stone.y} r={STONE_R} rotation={((u * OS.len) / STONE_R) * (180 / Math.PI)} glow={0.25} />
      {halo > 1 && (
        <g>
          <defs>
            <radialGradient id="answerHalo">
              <stop offset="0" stopColor={COLORS.emberHot} stopOpacity={0.5} />
              <stop offset="1" stopColor={COLORS.ember} stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={dot.x} cy={dot.y} r={halo} fill="url(#answerHalo)" />
        </g>
      )}
      <Orb x={dot.x} y={dot.y} r={DOT_R + 3 * ramp(frame, cFill.start, cFill.start + 30)} variant="ember" glow={0.8 + 0.2 * Math.sin(frame / 6)} />
    </g>
  );
};

const Sound: React.FC = () => (
  <>
    <Sfx name="tick" at={cBQ.start + 4} volume={0.55} />
    <Sfx name="bell" at={T.m1} volume={0.3} rate={0.75} />
    <Sfx name="sizzle" at={T.form0 + 4} volume={0.45} />
    <Sfx name="grind" at={T.push0} volume={0.35} />
    <Sfx name="grind" at={T.push0 + 40} volume={0.3} rate={0.9} />
    <Sfx name="sizzle" at={T.stream0 + 2} volume={0.4} />
    <Sfx name="ping" at={T.stream0 + 22} volume={0.35} />
    <Sfx name="pad" at={cStr.start} volume={0.5} />
    <Sfx name="grind" at={cStr.start + 8} volume={0.4} />
    <Sfx name="pad" at={cFill.start + 10} volume={0.45} rate={1.122} />
    <Sfx name="chord" at={cFill.start + 40} volume={0.45} />
    <Sfx name="grind" at={cNS.start} volume={0.3} rate={0.8} />
    <Sfx name="whoosh" at={cNS.start - 6} volume={0.35} />
    <Sfx name="arp" at={cES.start + 4} volume={0.45} />
    {[0, 1, 2, 3, 4].map((k) => (
      <Sfx key={k} name="step" at={cES.start + 10 + k * 11} volume={0.3} rate={0.9 + k * 0.05} />
    ))}
  </>
);

export const Answer: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = frame >= T.m0 && frame < T.end;
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
