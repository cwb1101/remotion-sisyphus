import React from 'react';
import {AbsoluteFill, Easing, useCurrentFrame} from 'remotion';
import type {Cue} from '../data/subtitles';
import {SLAM_HIT, TITLE_STEP, impactFrame} from '../lib/cues';
import {easeIn, hash, out, ramp} from '../lib/anim';
import {COLORS, SANS, SERIF, SLAM_Y, SUB_Y} from '../theme';
import {Sfx} from './Sfx';

// 字幕层：屏幕坐标，永远在画面最上层，居中显示在画面中部。
// 所有时间都来自字幕数据；slam / title 的冲击音效也在这里按数据放进时间轴。

export type Ink = {color: string; shadow: string};

const DARK_SHADOW = '0 0 26px rgba(0,0,0,0.95), 0 0 10px rgba(0,0,0,0.9), 0 3px 10px rgba(0,0,0,0.85)';
export const DEFAULT_INK: Ink = {color: COLORS.ink, shadow: DARK_SHADOW};

const SUB_SIZE = 72;
/** 字幕后面一层很淡的暗带，保证压在任何画面上都读得清 */
const SCRIM = 'radial-gradient(ellipse 48% 50% at 50% 50%, rgba(8,8,10,0.5) 0%, rgba(8,8,10,0.28) 55%, rgba(8,8,10,0) 100%)';
const SLAM_SIZE = 230;
const TITLE_SIZE = 190;

const segments = (text: string, highlights: string[]) => {
  const out: {t: string; hl: boolean}[] = [];
  let rest = text;
  while (rest.length) {
    let best = -1;
    let word = '';
    for (const h of highlights) {
      const i = rest.indexOf(h);
      if (i >= 0 && (best < 0 || i < best)) {
        best = i;
        word = h;
      }
    }
    if (best < 0) {
      out.push({t: rest, hl: false});
      break;
    }
    if (best > 0) out.push({t: rest.slice(0, best), hl: false});
    out.push({t: word, hl: true});
    rest = rest.slice(best + word.length);
  }
  return out;
};

const Line: React.FC<{c: Cue; ink: Ink; y: number; local: number; size?: number}> = ({c, ink, y, local, size = SUB_SIZE}) => {
  const dur = c.end - c.start;
  const inT = ramp(local, 0, 5, out);
  const outT = ramp(local, dur - 5, dur, easeIn);
  return (
    <div
      style={{
        position: 'absolute',
        left: 100,
        right: 100,
        top: y,
        transform: `translateY(-50%) translateY(${(1 - inT) * 26 - outT * 10}px)`,
        textAlign: 'center',
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.3,
        letterSpacing: '0.04em',
        color: ink.color,
        textShadow: ink.shadow,
        opacity: inT * (1 - outT),
        filter: `blur(${(1 - inT) * 8 + outT * 4}px)`,
        padding: '28px 0',
        background: SCRIM,
      }}
    >
      {segments(c.text, c.highlights).map((s, i) =>
        s.hl ? (
          <span key={i} style={{color: COLORS.ember, textShadow: `0 0 20px rgba(226,85,45,0.55), ${ink.shadow}`}}>
            {s.t}
          </span>
        ) : (
          <span key={i}>{s.t}</span>
        ),
      )}
    </div>
  );
};

/** 重点词砸下来 + 全屏冲击 */
const Slam: React.FC<{c: Cue; ink: Ink; local: number}> = ({c, ink, local}) => {
  const word = c.highlights[0] ?? c.text;
  const dur = c.end - c.start;
  const fall = ramp(local, 0, SLAM_HIT, Easing.in(Easing.quad));
  const t = local - SLAM_HIT;
  const wobble = t >= 0 ? Math.exp(-t / 4) * Math.cos(t * 0.9) : 0;
  const breathe = t >= 0 ? 1 + 0.015 * Math.sin(t / 6) : 1;
  const outT = ramp(local, dur - 6, dur, easeIn);
  const sx = (t >= 0 ? 1 + 0.14 * wobble : 1.6 - 0.6 * fall) * breathe * (1 + outT * 0.08);
  const sy = (t >= 0 ? 1 - 0.18 * wobble : 1.6 - 0.6 * fall) * breathe * (1 + outT * 0.08);
  const y = SLAM_Y - 460 * (1 - fall);
  const wave = ramp(t, 0, 20, out);
  const flash = t >= 0 ? Math.exp(-t / 4) : 0;
  return (
    <>
      {/* 全屏闪光 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% ${(SLAM_Y / 1080) * 100}%, rgba(255,140,80,${0.55 * flash}) 0%, rgba(226,85,45,${0.3 * flash}) 35%, rgba(0,0,0,0) 75%)`,
        }}
      />
      {/* 冲击波 */}
      {t >= 0 && t <= 22 && (
        <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
          <circle cx={960} cy={SLAM_Y} r={60 + wave * 1300} fill="none" stroke={COLORS.ember} strokeWidth={36 * (1 - wave) + 2} opacity={0.75 * (1 - wave)} />
          <circle cx={960} cy={SLAM_Y} r={30 + wave * 800} fill="none" stroke={COLORS.ink} strokeWidth={10 * (1 - wave) + 1} opacity={0.4 * (1 - wave)} />
          {Array.from({length: 22}, (_, i) => {
            const a = Math.PI * (1.05 + 0.9 * hash(i + c.start)) - Math.PI;
            const v = 14 + hash(i * 3 + c.start) * 22;
            const px = 960 + (hash(i * 7 + c.start) - 0.5) * 500 + Math.cos(a) * v * t;
            const py = SLAM_Y + 100 + Math.sin(a) * v * t * 0.6 + 0.9 * t * t;
            return <rect key={i} x={px} y={py} width={6 + hash(i) * 8} height={3 + hash(i + 9) * 5} fill={i % 3 ? COLORS.ember : COLORS.ink} opacity={1 - t / 22} transform={`rotate(${t * 20 + i * 40} ${px} ${py})`} />;
          })}
        </svg>
      )}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: y,
          transform: `translateY(-50%) scale(${sx}, ${sy})`,
          transformOrigin: '50% 80%',
          textAlign: 'center',
          fontFamily: SERIF,
          fontWeight: 900,
          fontSize: SLAM_SIZE,
          lineHeight: 1,
          color: COLORS.ember,
          opacity: fall * (1 - outT),
          filter: `blur(${(1 - fall) * 6 + outT * 6}px)`,
          textShadow: `0 0 50px rgba(226,85,45,0.6), ${DARK_SHADOW}`,
          whiteSpace: 'nowrap',
        }}
      >
        {word}
      </div>
      <Line c={c} ink={ink} y={SUB_Y + 90} local={local} />
    </>
  );
};

/** 片名：一个字一个字砸下来 */
const Title: React.FC<{c: Cue; ink: Ink; local: number}> = ({c, ink, local}) => {
  const chars = [...c.text];
  const dur = c.end - c.start;
  const outT = ramp(local, dur - 8, dur, easeIn);
  const lastLand = 2 + (chars.length - 1) * TITLE_STEP + 5;
  const subIn = ramp(local, lastLand + 2, lastLand + 14, out);
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 540, transform: `translateY(-50%) scale(${1 + outT * 0.06})`, opacity: 1 - outT, textAlign: 'center'}}>
      <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: TITLE_SIZE, lineHeight: 1.1, letterSpacing: '0.14em', color: ink.color, textShadow: ink.shadow}}>
        {chars.map((ch, i) => {
          const s = 2 + i * TITLE_STEP;
          const f = ramp(local, s, s + 5, Easing.in(Easing.quad));
          const t = local - s - 5;
          const sq = t >= 0 ? Math.exp(-t / 3) * Math.cos(t) * 0.16 : 0;
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                opacity: f,
                transform: `translateY(${-200 * (1 - f)}px) scale(${(1.8 - 0.8 * f) * (1 + sq)}, ${(1.8 - 0.8 * f) * (1 - sq)})`,
                transformOrigin: '50% 90%',
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      {c.sub && (
        <div style={{fontFamily: SANS, fontWeight: 500, fontSize: 34, letterSpacing: `${0.3 + subIn * 0.5}em`, color: ink.color, opacity: subIn * 0.85, marginTop: 18, textShadow: ink.shadow}}>
          {c.sub}
        </div>
      )}
    </div>
  );
};

const parseCount = (text: string) => {
  const m = text.match(/^(.*?)(\d+)(.*)$/);
  return m ? {pre: m[1], n: Number(m[2]), post: m[3]} : null;
};

/** 计数器：相邻的 counter 屏之间数字连续滚动（按指数加速） */
const Counter: React.FC<{c: Cue; prev: Cue | undefined; next: Cue | undefined; ink: Ink; local: number}> = ({c, prev, next, ink, local}) => {
  const p = parseCount(c.text);
  if (!p) return null;
  const chainedPrev = prev?.style === 'counter' && prev.end === c.start ? parseCount(prev.text) : null;
  const chainedNext = next?.style === 'counter' && next.start === c.end;
  const dur = c.end - c.start;
  const n0 = chainedPrev?.n ?? p.n;
  const e = ramp(local, 2, dur * 0.85, Easing.in(Easing.quad));
  const value = n0 === p.n ? p.n : Math.round(n0 * Math.pow(p.n / n0, e));
  const inT = chainedPrev || c.start === 0 ? 1 : ramp(local, 0, 5, out);
  const outT = chainedNext ? 0 : ramp(local, dur - 5, dur, easeIn);
  const pop = 1 + 0.05 * Math.abs(Math.sin(value * 1.3));
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: SUB_Y,
        transform: `translateY(-50%) translateY(${(1 - inT) * 26}px)`,
        textAlign: 'center',
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: SUB_SIZE,
        color: ink.color,
        textShadow: ink.shadow,
        opacity: inT * (1 - outT),
        whiteSpace: 'nowrap',
      }}
    >
      {p.pre}
      <span style={{display: 'inline-block', minWidth: `${0.62 * String(value).length}em`, margin: '0 0.15em', fontWeight: 900, fontSize: 150, color: COLORS.ember, transform: `scale(${pop})`, verticalAlign: '-0.12em', textShadow: `0 0 40px rgba(226,85,45,0.5), ${DARK_SHADOW}`, fontVariantNumeric: 'tabular-nums'}}>
        {value}
      </span>
      {p.post}
    </div>
  );
};

export const Subtitles: React.FC<{cues: Cue[]; inks?: Record<string, Ink>}> = ({cues, inks = {}}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {cues.map((c, i) => {
        if (frame < c.start || frame >= c.end) return null;
        const ink = inks[c.id] ?? DEFAULT_INK;
        const local = frame - c.start;
        if (c.style === 'slam') return <Slam key={c.id} c={c} ink={ink} local={local} />;
        if (c.style === 'title') return <Title key={c.id} c={c} ink={ink} local={local} />;
        if (c.style === 'counter') return <Counter key={c.id} c={c} prev={cues[i - 1]} next={cues[i + 1]} ink={ink} local={local} />;
        return <Line key={c.id} c={c} ink={ink} y={SUB_Y} local={local} />;
      })}
      {cues.map((c) => {
        const f = impactFrame(c);
        if (f === null) return null;
        return (
          <React.Fragment key={`sfx-${c.id}`}>
            <Sfx name="impact" at={f} volume={c.style === 'title' ? 0.65 : 0.8} />
            {c.style === 'title' &&
              [...c.text].map((_, i) => <Sfx key={i} name="thump" at={c.start + 2 + i * TITLE_STEP + 5} volume={0.45} rate={1 + i * 0.06} />)}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
