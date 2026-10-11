import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {Orb} from '../components/Orb';
import {Sfx} from '../components/Sfx';
import {hash, inOut, lerp, mixColor, noise1, out, type Pt, ramp} from '../lib/anim';
import type {Impact, Shot} from '../lib/camera';
import {cue} from '../lib/cues';
import {useTextPoints} from '../lib/textPoints';
import {COLORS, SERIF} from '../theme';

// 开头（第 1–6 屏）：黑底上的一条山坡、一块石头、一个橙点。
// 计数器狂跳 → 推近“差一点” → “幸福”被滚回的石头震碎 → 碎片聚成问号 → 问号被橙点吸进去，
// 橙点长大到填满整个画面（片名），再缩回去，交给第一节。

// ---------- 场景几何（世界坐标） ----------
export const FOOT: Pt = {x: -560, y: 300};
export const TOP: Pt = {x: 560, y: -220};
const LEN = Math.hypot(TOP.x - FOOT.x, TOP.y - FOOT.y);
const DIR: Pt = {x: (TOP.x - FOOT.x) / LEN, y: (TOP.y - FOOT.y) / LEN};
const UP: Pt = {x: DIR.y, y: -DIR.x};
export const STONE_R = 78;
export const DOT_R = 14;
export const onSlope = (u: number, lift: number): Pt => ({x: FOOT.x + DIR.x * LEN * u + UP.x * lift, y: FOOT.y + DIR.y * LEN * u + UP.y * lift});
export const DOT_GAP = (STONE_R + DOT_R + 4) / LEN;
export const PEAK_U = 0.93;

/** 橙点最后站的位置；问号被吸进这里，片名从这里长出来，第一节也从这里开始 */
export const P: Pt = onSlope(PEAK_U - DOT_GAP, DOT_R);

const WORD: Pt = {x: 300, y: -500};
const WORD_SIZE = 170;
export const QMARK: Pt = {x: 0, y: -60};
export const QMARK_SIZE = 1250;

// ---------- 时间点：全部由字幕数据推出 ----------
const c1 = cue('count-1');
const c2 = cue('count-1000');
const cAlmost = cue('almost');
const cHappy = cue('happy');
const cWhy = cue('why');
const cTitle = cue('title');

export const OPENING_T = {
  land: c1.start + 8,
  loopStart: c1.start + 14,
  loopEnd: c2.end - 2,
  almostTop: cAlmost.start + 8,
  almostSlide: cAlmost.end - 12,
  happyWord: cHappy.start + 2,
  happyPush: cHappy.start + 10,
  happyTop: cHappy.end - 8,
  shatter: cWhy.start + 6, // 与“凭什么”砸下来是同一帧
  rollDone: cWhy.start + 26,
  formStart: cWhy.start + 26,
  formEnd: cWhy.start + 60,
  // 片名是深色字，橙色圆必须在第一个字落下（开始帧 +7）之前填满画面
  collapse: cWhy.end - 24,
  collapseEnd: cTitle.start - 4,
  orbFull: cTitle.start + 6,
  orbShrink: cTitle.end - 12,
  orbSmall: cTitle.end + 22,
};
const T = OPENING_T;
/** 第一节从这一帧接管橙点 */
export const HANDOFF = T.orbSmall;

const LOOPS = 9;
const loopPhase = (f: number) => LOOPS * Math.pow(ramp(f, T.loopStart, T.loopEnd, (t) => t), 3);
export const uInLoop = (s: number) => (s < 0.72 ? PEAK_U * inOut(s / 0.72) : PEAK_U * (1 - Easing.in(Easing.quad)((s - 0.72) / 0.28)));
/** 每一次石头开始滚回的帧，用来放 tick */
const LOOP_TICKS = Array.from({length: LOOPS}, (_, k) => {
  const t = Math.cbrt((k + 0.72) / LOOPS);
  return Math.round(lerp(T.loopStart, T.loopEnd, t));
});

const stoneU = (f: number) => {
  if (f < T.loopEnd) {
    const ph = loopPhase(f);
    return uInLoop(ph - Math.floor(ph));
  }
  if (f < cAlmost.start) return 0;
  if (f < T.almostSlide) return 0.962 * ramp(f, cAlmost.start, T.almostTop, out) - 0.003 * Math.abs(noise1(f * 0.9));
  if (f < cHappy.start) return 0.962 * (1 - ramp(f, T.almostSlide, cHappy.start, Easing.in(Easing.quad)));
  if (f < T.happyTop) return PEAK_U * ramp(f, T.happyPush, T.happyTop, Easing.inOut(Easing.sin));
  return PEAK_U * (1 - ramp(f, T.happyTop, T.rollDone, Easing.in(Easing.quad)));
};

/** 橙点：推的时候贴着石头；石头滚回去时，它留在原地看着 */
const dotU = (f: number) => {
  const s = stoneU(f) - DOT_GAP;
  if (f < T.loopEnd || (f >= cAlmost.start && f < T.almostSlide) || (f >= T.happyPush && f < T.happyTop)) return s;
  if (f >= T.almostSlide && f < cHappy.start) return 0.962 - DOT_GAP;
  if (f >= cHappy.start && f < T.happyPush) return lerp(0.962 - DOT_GAP, -DOT_GAP, ramp(f, cHappy.start, T.happyPush));
  return PEAK_U - DOT_GAP;
};

const stoneAt = (f: number) => {
  const u = stoneU(f);
  const drop = -150 * (1 - ramp(f, 0, T.land, Easing.in(Easing.quad)));
  const bounce = f > T.land && f < T.land + 10 ? -22 * Math.sin((Math.PI * (f - T.land)) / 10) : 0;
  const p = onSlope(u, STONE_R);
  return {x: p.x, y: p.y + drop + bounce, rot: ((u * LEN) / STONE_R) * (180 / Math.PI)};
};

/** 标题时的橙点半径：吸进问号 → 长大填满画面 → 缩回 */
const dotRadius = (f: number) => {
  if (f < T.collapseEnd) return DOT_R + 6 * ramp(f, T.collapse, T.collapseEnd);
  if (f < T.orbShrink) return lerp(DOT_R + 6, 1500, ramp(f, T.collapseEnd + 2, T.orbFull, Easing.in(Easing.exp)));
  return lerp(1500, 18, ramp(f, T.orbShrink, T.orbSmall, Easing.inOut(Easing.exp)));
};

// ---------- 相机 ----------
/** 开头的相机关键帧；片尾回到第 0 帧的构图时也用它 */
export const openingShots: Shot[] = [
  {f: 0, x: FOOT.x + 300, y: FOOT.y - 30, zoom: 2.0, rot: -3},
  {f: T.land + 8, x: FOOT.x + 290, y: FOOT.y - 40, zoom: 1.85, rot: -2},
  {f: c2.start + 6, x: 20, y: 30, zoom: 1.0, rot: 1},
  {f: c2.end, x: 60, y: 0, zoom: 1.14, rot: 3},
  {f: T.almostTop, x: TOP.x - 350, y: TOP.y + 70, zoom: 2.0, rot: -4, ease: Easing.out(Easing.exp)},
  {f: cAlmost.end - 4, x: TOP.x - 360, y: TOP.y + 80, zoom: 2.2, rot: -5},
  {f: cHappy.start + 22, x: 60, y: -130, zoom: 0.95, rot: 0},
  {f: cWhy.start + 2, x: 140, y: -190, zoom: 1.08, rot: 1},
  {f: T.formEnd, x: 0, y: -90, zoom: 0.74, rot: -1},
  {f: T.collapse, x: 40, y: -100, zoom: 0.78, rot: 1},
  {f: T.orbFull, x: P.x, y: P.y, zoom: 1.0, rot: 0},
  {f: T.orbShrink, x: P.x, y: P.y, zoom: 1.2, rot: 2},
];

export const openingImpacts: Impact[] = [
  {f: T.land, amp: 10},
  {f: T.shatter, amp: 8},
];

// ---------- 粒子：“幸福”碎开 → 聚成问号 → 被吸进橙点 ----------
const Particles: React.FC<{frame: number}> = ({frame}) => {
  const word = useTextPoints('幸福', WORD_SIZE, 900, SERIF, 5);
  const q = useTextPoints('？', QMARK_SIZE, 900, SERIF, 20);
  if (!word || !q || q.length === 0 || frame < T.shatter || frame > T.collapseEnd + 2) return null;
  return (
    <g>
      {word.map((p, i) => {
        const h1 = hash(i * 1.37);
        const h2 = hash(i * 2.11 + 9);
        const start = {x: WORD.x + p.x, y: WORD.y + p.y};
        const len = Math.hypot(p.x, p.y) || 1;
        const speed = 5 + h1 * 13;
        const exp = (tau: number) => ({
          x: start.x + ((p.x / len) * speed - 3) * 10 * (1 - Math.exp(-tau / 10)),
          y: start.y + ((p.y / len) * speed + 2) * 10 * (1 - Math.exp(-tau / 10)) + 0.06 * tau * tau,
        });
        const tq = q[i % q.length];
        const target = {x: QMARK.x + tq.x + (h1 - 0.5) * 10, y: QMARK.y + tq.y + (h2 - 0.5) * 10};
        const delay = h2 * 10;
        let pos: Pt;
        if (frame < T.formStart + delay) {
          pos = exp(frame - T.shatter);
        } else {
          const from = exp(T.formStart + delay - T.shatter);
          const e = ramp(frame, T.formStart + delay, T.formEnd + delay * 0.4, inOut);
          const swirl = Math.sin(Math.PI * e) * 70 * (h1 - 0.5);
          pos = {x: lerp(from.x, target.x, e) + swirl, y: lerp(from.y, target.y, e) - swirl * 0.5};
          pos.x += Math.sin(frame / 7 + i) * 2.5 * e;
          pos.y += Math.cos(frame / 9 + i) * 2.5 * e;
        }
        const c = ramp(frame, T.collapse + h1 * 6, T.collapseEnd, Easing.in(Easing.cubic));
        pos = {x: lerp(pos.x, P.x, c), y: lerp(pos.y, P.y, c)};
        // 聚成问号时冷却成石头的灰色，退到字幕后面；被吸进橙点时重新烧红
        const cool = ramp(frame, T.formStart, T.formEnd, inOut) * (1 - c);
        const flick = (0.7 + 0.3 * Math.sin(frame / 3 + i)) * (1 - 0.5 * cool);
        const hot = i % 7 === 0 ? COLORS.emberHot : COLORS.ember;
        return <circle key={i} cx={pos.x} cy={pos.y} r={(3.4 + cool * 1.6) * (1 - c * 0.5)} fill={mixColor(cool, hot, COLORS.stone)} opacity={flick} />;
      })}
    </g>
  );
};

// ---------- 画面 ----------
const Visual: React.FC<{frame: number}> = ({frame}) => {
  const slopeDraw = ramp(frame, 0, 30, out);
  const slopeFade = 1 - ramp(frame, T.collapse, T.collapseEnd + 10);
  const tip = onSlope(slopeDraw, 0);
  const stone = stoneAt(frame);
  const dotP = frame >= T.collapse ? P : onSlope(dotU(frame), DOT_R);
  const dotR = dotRadius(frame);
  const ghosts = frame > c2.start && frame < T.loopEnd ? [1, 2, 3, 4] : [];
  const wordIn = ramp(frame, T.happyWord, T.happyWord + 16, out);
  const crack = ramp(frame, T.happyTop + 2, T.shatter, (t) => t);
  const landDust = frame - T.land;
  // 石头每次回到坡底时扬起的尘
  const dustBursts = [T.land, cHappy.start, T.rollDone];

  return (
    <g>
      <g opacity={slopeFade}>
        {/* 地面与山坡 */}
        <line x1={FOOT.x - 1400} y1={FOOT.y} x2={FOOT.x} y2={FOOT.y} stroke={COLORS.ink} strokeWidth={2} opacity={0.35 * slopeDraw} />
        <line x1={FOOT.x} y1={FOOT.y} x2={tip.x} y2={tip.y} stroke={COLORS.ember} strokeWidth={14} opacity={0.12} />
        <line x1={FOOT.x} y1={FOOT.y} x2={tip.x} y2={tip.y} stroke={COLORS.ink} strokeWidth={3} strokeLinecap="round" />
        <line x1={TOP.x} y1={TOP.y} x2={TOP.x + 900 * slopeDraw} y2={TOP.y} stroke={COLORS.ink} strokeWidth={2} opacity={0.3 * slopeDraw} />

        {/* 计数时的残影 */}
        {ghosts.map((k) => {
          const g = stoneAt(frame - k * 1.5);
          return <Orb key={k} x={g.x} y={g.y} r={STONE_R} rotation={g.rot} opacity={0.22 - k * 0.045} />;
        })}

        {/* 尘土 */}
        {dustBursts.map((b, j) =>
          frame - b >= 0 && frame - b < 26
            ? Array.from({length: 18}, (_, i) => {
                const t = frame - b;
                const a = Math.PI + hash(i + j * 40) * Math.PI;
                const v = 2 + hash(i * 3 + j) * 6;
                const base = onSlope(stoneU(b), 0);
                return <circle key={`${j}-${i}`} cx={base.x + Math.cos(a) * v * t} cy={base.y + Math.sin(a) * v * t * 0.5 + 0.08 * t * t} r={2 + hash(i) * 3} fill={COLORS.stone} opacity={0.6 * (1 - t / 26)} />;
              })
            : null,
        )}

        <Orb x={stone.x} y={stone.y} r={STONE_R} rotation={stone.rot} squash={landDust >= 0 && landDust < 8 ? 0.12 * Math.sin((Math.PI * landDust) / 8) : 0} glow={0.25} />

        {/* “幸福”二字：震碎前是实体字 */}
        {frame >= T.happyWord && frame < T.shatter && (
          <g transform={`translate(${WORD.x} ${WORD.y}) scale(${0.9 + 0.1 * wordIn})`} opacity={wordIn}>
            <text textAnchor="middle" dominantBaseline="central" fontFamily={SERIF} fontWeight={900} fontSize={WORD_SIZE} fill={COLORS.ember} opacity={0.35} transform="scale(1.04)">
              幸福
            </text>
            <text textAnchor="middle" dominantBaseline="central" fontFamily={SERIF} fontWeight={900} fontSize={WORD_SIZE} fill={COLORS.ember}>
              幸福
            </text>
            {crack > 0 && (
              <polyline
                points={Array.from({length: 9}, (_, i) => `${-170 + i * 42},${(i % 2 ? -1 : 1) * 30 * hash(i + 3)}`).join(' ')}
                fill="none"
                stroke={COLORS.bg}
                strokeWidth={8}
                strokeDasharray={420}
                strokeDashoffset={420 * (1 - crack)}
              />
            )}
          </g>
        )}
      </g>

      <Particles frame={frame} />

      {/* 西西弗斯：橙点。片名时长大到填满画面 */}
      <Orb
        x={dotP.x}
        y={dotP.y}
        r={dotR}
        variant="ember"
        glow={frame >= T.collapse ? 0.9 : 0.6 + 0.2 * Math.sin(frame / 6)}
        opacity={frame >= HANDOFF ? 0 : 1}
      />
      {/* 片名停留时，填满画面的圆从中心一圈圈荡出热浪 */}
      {dotR > 400 &&
        [0, 1, 2, 3].map((k) => {
          const ph = ((frame - T.orbFull) / 26 + k / 4) % 1;
          if (frame < T.orbFull || 80 + ph * 1100 > dotR) return null;
          return <circle key={k} cx={P.x} cy={P.y} r={80 + ph * 1100} fill="none" stroke={COLORS.emberDeep} strokeWidth={40 * (1 - ph) + 4} opacity={0.22 * (1 - ph) * Math.min(1, ph * 5)} />;
        })}
    </g>
  );
};

// ---------- 音效 ----------
const Sound: React.FC = () => (
  <>
    <Sfx name="thump" at={T.land} volume={0.9} />
    <Sfx name="grind" at={T.loopStart} volume={0.45} />
    {LOOP_TICKS.map((f, k) => (
      <Sfx key={k} name="tick" at={f} volume={0.55} rate={1 + k * 0.05} />
    ))}
    {LOOP_TICKS.slice(0, 3).map((f, k) => (
      <Sfx key={`r${k}`} name="roll" at={f} volume={0.35 - k * 0.08} />
    ))}
    <Sfx name="whoosh" at={cAlmost.start - 4} volume={0.6} />
    <Sfx name="grind" at={T.almostTop} volume={0.35} />
    <Sfx name="roll" at={T.almostSlide} volume={0.55} />
    <Sfx name="thump" at={cHappy.start} volume={0.3} />
    <Sfx name="bell" at={T.happyWord} volume={0.3} />
    <Sfx name="grind" at={T.happyPush + 6} volume={0.4} />
    <Sfx name="roll" at={T.happyTop} volume={0.7} />
    <Sfx name="shatter" at={T.shatter - 1} volume={0.9} />
    <Sfx name="sizzle" at={T.shatter + 4} volume={0.5} />
    <Sfx name="sizzle" at={T.formStart + 4} volume={0.35} />
    <Sfx name="riser" at={T.collapse - 30} volume={0.55} />
    <Sfx name="bell_low" at={T.orbFull - 4} volume={0.8} />
    <Sfx name="whoosh" at={T.orbShrink} volume={0.5} />
  </>
);

export const Opening: React.FC = () => {
  const frame = useCurrentFrame();
  const visible = frame <= HANDOFF + 2;
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
