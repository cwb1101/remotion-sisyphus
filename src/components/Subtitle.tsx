/**
 * 字幕版式：按 script.ts 里每屏的 layout 摆放。
 * - 主字幕：思源宋体 SemiBold 68px；重点词：思源宋体 Bold 92px（1.35 倍）+ 强调色，砸下来
 * - 小字 / 英文注：思源黑体
 * - 只在下方、左侧、左上、正中，不放右侧，右上角整块留空（水印区）
 */
import React from 'react';
import {Easing, interpolate, random, useCurrentFrame} from 'remotion';
import {Layout, Screen} from '../data/script';
import {slamFrame} from '../data/timeline';
import {C, FONT, TYPE, W} from '../theme';

/** 估算文字宽度（中文全角 = 1em） */
export const textWidth = (s: string, size: number) =>
  [...s].reduce((w, ch) => w + size * (/[\x20-\x7e]/.test(ch) ? (/[%A-Z0-9]/.test(ch) ? 0.62 : 0.5) : 1), 0);

const lineWidth = (line: string, kws: string[], main: number) => {
  let w = textWidth(line, main);
  for (const k of kws) if (line.includes(k)) w += textWidth(k, TYPE.keyword) - textWidth(k, main);
  return w;
};

/** 版式里的小幅随机错位：用 random(seed)，每次渲染结果一样 */
export const jitter = (seed: string, amp: number) => (random(seed) - 0.5) * 2 * amp;

/** 版式的安全区：右边界不越过 1380px，右上角 (1440..1920, 0..260) 永远空着 */
export const SAFE_RIGHT = 1380;

type Seg = {t: string; kw: boolean};
const segments = (line: string, kws: string[]): Seg[] => {
  if (!kws.length) return [{t: line, kw: false}];
  const re = new RegExp(`(${kws.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`);
  return line
    .split(re)
    .filter(Boolean)
    .map((t) => ({t, kw: kws.includes(t)}));
};

const Line: React.FC<{
  line: string;
  s: Screen;
  size: number;
  family: string;
  color?: string;
  frame: number;
  impact?: boolean;
}> = ({line, s, size, family, color = C.paper, frame, impact}) => {
  const slam = slamFrame(s);
  return (
    <div style={{fontFamily: family, fontSize: size, color, lineHeight: 1.32, whiteSpace: 'nowrap', letterSpacing: '0.04em'}}>
      {segments(line, s.keywords).map((g, i) => {
        if (!g.kw) return <span key={i}>{g.t}</span>;
        // 重点词：在 slam 帧之前 6 帧出现，加速砸落，落地后轻微压扁回弹
        const t = frame - slam;
        const y = interpolate(t, [-6, 0], [-(impact ? 90 : 64), 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.in(Easing.cubic),
        });
        const op = interpolate(t, [-6, -3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
        const sq = t >= 0 && t < 8 ? Math.sin((t / 8) * Math.PI) : 0;
        const blur = t < 0 && t > -6 ? 3 : 0;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontFamily: FONT.serifBold,
              fontSize: TYPE.keyword,
              color: C.accent,
              transform: `translateY(${y}px) scale(${1 + sq * 0.02}, ${1 - sq * 0.07})`,
              transformOrigin: '50% 100%',
              opacity: op,
              filter: blur ? `blur(${blur}px)` : undefined,
              margin: '0 0.04em',
              textShadow: `0 0 ${18 * sq}px rgba(224,160,64,${0.35 * sq})`,
            }}
          >
            {g.t}
          </span>
        );
      })}
    </div>
  );
};

/** 字幕下的淡暗色衬底，保证亮背景上也读得清 */
const Backdrop: React.FC<{layout: Layout; opacity: number}> = ({layout, opacity}) => {
  let bg = '';
  if (layout === 'top-left') bg = 'radial-gradient(ellipse 60% 45% at 18% 14%, rgba(11,11,12,0.55), rgba(11,11,12,0) 70%)';
  else if (layout === 'center') bg = 'radial-gradient(ellipse 45% 22% at 50% 53%, rgba(11,11,12,0.42), rgba(11,11,12,0) 75%)';
  else if (layout === 'stagger-left') bg = 'linear-gradient(90deg, rgba(11,11,12,0.5), rgba(11,11,12,0) 45%)';
  else bg = 'linear-gradient(0deg, rgba(11,11,12,0.6), rgba(11,11,12,0) 36%)';
  return <div style={{position: 'absolute', inset: 0, background: bg, opacity}} />;
};

export type SubtitleProps = {
  s: Screen;
  /** follow 版式：人物在屏幕上的 x（px） */
  followX?: (frame: number) => number;
};

export const Subtitle: React.FC<SubtitleProps> = ({s, followX}) => {
  const frame = useCurrentFrame();
  const dur = s.end - s.start;
  const t = frame - s.start;
  const impact = !!s.impact;
  const inLen = impact ? 9 : 12;
  const op = interpolate(t, [0, inLen, dur - 9, dur - 1], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rise = impact
    ? interpolate(t, [0, inLen], [-46, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)})
    : interpolate(t, [0, inLen], [16, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const outBlur = interpolate(t, [dur - 9, dur - 1], [0, 3], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const inBlur = impact ? interpolate(t, [0, inLen], [6, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
  const lines = s.text.split('\n');
  const main = TYPE.main;
  const wrap: React.CSSProperties = {
    position: 'absolute',
    opacity: op,
    transform: `translateY(${rise}px)`,
    filter: outBlur + inBlur > 0.05 ? `blur(${outBlur + inBlur}px)` : undefined,
  };
  const noteStyle: React.CSSProperties = {
    fontFamily: FONT.sans,
    fontSize: TYPE.note,
    color: C.light,
    letterSpacing: '0.2em',
    whiteSpace: 'nowrap',
  };
  const bottom = TYPE.bottom - 16;
  // 同一种版式在不同屏上左右略有错位（杂志排版感），seed = 屏号
  const jx = Math.round(jitter(`${s.id}:x`, 28));
  let body: React.ReactNode;

  switch (s.layout) {
    case 'bottom-center': {
      body = (
        <div style={{...wrap, left: 0, width: W, bottom, display: 'flex', justifyContent: 'center'}}>
          <Line line={lines.join('')} s={s} size={main} family={FONT.serif} frame={frame} />
        </div>
      );
      break;
    }
    case 'bottom-left-note': {
      body = (
        <div style={{...wrap, left: 160 + jx, bottom}}>
          {s.note ? (
            <div style={{...noteStyle, display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10}}>
              <span style={{display: 'inline-block', width: 44, height: 1, background: C.accent}} />
              {s.note}
            </div>
          ) : null}
          <Line line={lines.join('')} s={s} size={main} family={FONT.serif} frame={frame} />
        </div>
      );
      break;
    }
    case 'lower-left-paragraph': {
      body = (
        <div style={{...wrap, left: TYPE.marginX + Math.abs(jx), bottom: bottom + 4, borderLeft: `2px solid ${C.mid}`, paddingLeft: 28}}>
          {s.note ? <div style={{...noteStyle, fontSize: 22, marginBottom: 8}}>{s.note}</div> : null}
          {lines.map((l, i) => (
            <Line key={i} line={l} s={s} size={64} family={FONT.serif} frame={frame} />
          ))}
        </div>
      );
      break;
    }
    case 'stagger-bottom': {
      const [a, b] = lines.length > 1 ? lines : ['', lines[0]];
      body = (
        <div style={{...wrap, left: 200 + jx, bottom}}>
          <div style={{fontFamily: FONT.sansRegular, fontSize: TYPE.small, color: C.light, letterSpacing: '0.12em', whiteSpace: 'nowrap', marginBottom: 2}}>
            {a}
          </div>
          <div style={{marginLeft: 150}}>
            <Line line={b} s={s} size={72} family={FONT.serif} frame={frame} />
          </div>
        </div>
      );
      break;
    }
    case 'stagger-left': {
      const [a, b] = lines.length > 1 ? lines : ['', lines[0]];
      body = (
        <div style={{...wrap, left: TYPE.marginX + Math.abs(jx), top: 420}}>
          <div style={{fontFamily: FONT.sansRegular, fontSize: TYPE.small, color: C.light, letterSpacing: '0.12em', whiteSpace: 'nowrap'}}>{a}</div>
          <div style={{marginLeft: 70}}>
            <Line line={b} s={s} size={72} family={FONT.serif} frame={frame} />
          </div>
        </div>
      );
      break;
    }
    case 'follow': {
      const w = Math.max(...lines.map((l) => lineWidth(l, s.keywords, 64)));
      const raw = followX ? followX(frame) - w * 0.35 : 200;
      // 只在左半和下方移动：左边界 ≥ 80，右边界 ≤ 画面中线 + 一点余量
      const x = Math.max(TYPE.marginX, Math.min(980 - w, raw));
      body = (
        <div style={{...wrap, left: x, bottom}}>
          {lines.map((l, i) => (
            <Line key={i} line={l} s={s} size={64} family={FONT.serif} frame={frame} />
          ))}
        </div>
      );
      break;
    }
    case 'occluded': {
      body = (
        <div style={{...wrap, left: 140, bottom}}>
          <Line line={lines.join('')} s={s} size={main} family={FONT.serif} frame={frame} />
        </div>
      );
      break;
    }
    case 'top-left': {
      body = (
        <div style={{...wrap, left: TYPE.marginX + Math.abs(jx), top: TYPE.marginTop}}>
          {lines.map((l, i) => (
            <Line key={i} line={l} s={s} size={64} family={FONT.serif} frame={frame} />
          ))}
          {s.note ? <div style={{...noteStyle, marginTop: 12}}>{s.note}</div> : null}
        </div>
      );
      break;
    }
    case 'center': {
      // 关键句：整行砸下来；两侧细线随重点词落地展开
      const slamT = frame - slamFrame(s);
      const rule = interpolate(slamT, [0, 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
      body = (
        <div style={{...wrap, left: 0, width: W, top: 500, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          {lines.map((l, i) => (
            <Line key={i} line={l} s={s} size={72} family={FONT.serif} frame={frame} impact />
          ))}
          <div style={{marginTop: 18, width: 420 * rule, height: 1, background: C.mid, opacity: 0.8}} />
        </div>
      );
      break;
    }
  }
  return (
    <>
      <Backdrop layout={s.layout} opacity={op} />
      {body}
    </>
  );
};

/** 一个场景的字幕轨：under = 画在前景之下（occluded 版式），over = 画在最上层 */
export const SubtitleTrack: React.FC<{
  screens: Screen[];
  layer: 'over' | 'under';
  followX?: (frame: number) => number;
}> = ({screens, layer, followX}) => {
  const frame = useCurrentFrame();
  return (
    <>
      {screens
        .filter((s) => frame >= s.start && frame < s.end)
        .filter((s) => (s.layout === 'occluded') === (layer === 'under'))
        .map((s) => (
          <Subtitle key={s.id} s={s} followX={followX} />
        ))}
    </>
  );
};

