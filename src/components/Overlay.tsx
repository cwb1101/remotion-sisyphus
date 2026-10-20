import React from 'react';
import {AbsoluteFill, Audio, Sequence, interpolate, staticFile} from 'remotion';
import {CUES, SECTIONS, SFX, TOPIC, cueAt, type Cue} from '../data/script';
import {C, FONT_SANS} from '../theme';
import {clamp01, ease, prog} from '../lib/anim';
import {SPACE_EM, SUB_LETTER, SUB_MAX_W, SUB_SIZE, runsOf, splitLines} from '../lib/text';

/** 一行字幕：空格渲染成停顿间距，重点词用唯一强调色 */
const Line: React.FC<{line: string; keywords: string[]}> = ({line, keywords}) => (
  <div style={{whiteSpace: 'nowrap'}}>
    {runsOf(line, keywords).map((r, i) =>
      r.text === ' ' ? (
        <span key={i} style={{display: 'inline-block', width: `${SPACE_EM}em`}} />
      ) : (
        <span key={i} style={{color: r.hot ? C.accent : C.sub}}>
          {[...r.text].map((ch, j) =>
            ch === ' ' ? <span key={j} style={{display: 'inline-block', width: `${SPACE_EM}em`}} /> : ch,
          )}
        </span>
      ),
    )}
  </div>
);

/** 底部字幕：横排、居中、最多两行、单行不超过 960px，距底边 100px */
export const Subtitles: React.FC<{frame: number}> = ({frame}) => {
  const c = cueAt(frame);
  if (!c || c.display === 'slam') return null;
  const local = frame - c.start;
  const dur = c.end - c.start;
  // 片头第一屏从第 0 帧就完整显示
  const inP = c.start === 0 ? 1 : ease.out(prog(local, 0, 5));
  // 下一屏紧接着时只做 2 帧的交叉淡出，保证阅读时间
  const outP = prog(local, dur - 2, 2);
  const lines = splitLines(c.text);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <div
        style={{
          position: 'absolute',
          left: (1920 - SUB_MAX_W) / 2,
          width: SUB_MAX_W,
          bottom: 100,
          textAlign: 'center',
          fontFamily: FONT_SANS,
          fontWeight: 700,
          fontSize: SUB_SIZE,
          lineHeight: 1.32,
          letterSpacing: `${SUB_LETTER}em`,
          opacity: inP * (1 - outP),
          transform: `translateY(${(1 - inP) * 14}px)`,
          textShadow: '0 2px 14px rgba(0,0,0,0.42)',
        }}
      >
        {lines.map((l, i) => (
          <Line key={i} line={l} keywords={c.keywords} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** 左上角主题标注：固定位置，不跟镜头；换节时小标题平滑切换 */
export const TopicLabel: React.FC<{frame: number}> = ({frame}) => {
  const now = cueAt(frame) ?? CUES[CUES.length - 1];
  const idx = SECTIONS.findIndex((s) => s.id === now.section);
  const sectionStart = CUES.find((c) => c.section === now.section)!.start;
  const t = idx > 0 ? ease.inOut(prog(frame, sectionStart, 14)) : 1;
  const prev = idx > 0 ? SECTIONS[idx - 1].title : '';
  const cur = SECTIONS[idx].title;
  const box: React.CSSProperties = {position: 'absolute', left: 0, top: 0, whiteSpace: 'nowrap'};
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* 标注下面垫一层很淡的暗角，画面元素经过时也看得清 */}
      <div
        style={{
          position: 'absolute',
          left: -200,
          top: -160,
          width: 760,
          height: 400,
          background: 'radial-gradient(ellipse at 40% 50%, rgba(6,8,12,0.55), rgba(6,8,12,0) 70%)',
        }}
      />
      <div style={{position: 'absolute', left: 56, top: 44, fontFamily: FONT_SANS, color: C.sub}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 12, opacity: 0.62}}>
          <div style={{width: 4, height: 22, background: C.accent, borderRadius: 2}} />
          <div style={{fontSize: 22, fontWeight: 500, letterSpacing: '0.12em'}}>{TOPIC}</div>
        </div>
        <div style={{position: 'relative', height: 44, marginTop: 8, marginLeft: 16, overflow: 'hidden'}}>
          {t < 1 ? (
            <div style={{...box, fontSize: 30, fontWeight: 700, opacity: 0.78 * (1 - t), transform: `translateY(${-t * 30}px)`}}>
              {prev}
            </div>
          ) : null}
          <div style={{...box, fontSize: 30, fontWeight: 700, opacity: 0.78 * t, transform: `translateY(${(1 - t) * 30}px)`}}>
            {cur}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * 中央大字（display: 'slam' 的屏）：从大到小砸下来，伴随一圈冲击波和压暗。
 * exitTo 给出时，非重点字淡出、重点词缩小飞向该屏幕位置（用于"致命"变纸签）。
 */
export const Slam: React.FC<{frame: number; exitTo?: Record<string, {at: number; x: number; y: number; scale: number}>}> = ({
  frame,
  exitTo,
}) => {
  const c = cueAt(frame);
  if (!c || c.display !== 'slam') return null;
  const local = frame - c.start;
  const dur = c.end - c.start;
  const chars = [...c.text].filter((ch) => ch !== ' ').length;
  const size = Math.min(440, Math.floor(880 / chars));
  const land = prog(local, 0, 8);
  const k = ease.outBack(land);
  const scale = (1.45 - 0.45 * k) * (1 + 0.035 * prog(local, 8, dur - 8));
  const exit = exitTo?.[c.id];
  const exitP = exit ? ease.inOut(prog(frame, exit.at, c.end - exit.at)) : 0;
  const fade = exit ? 1 : 1 - prog(local, dur - 4, 4);
  const ring = prog(local, 2, 16);
  const dim = clamp01(land * 2) * (1 - (exit ? exitP : prog(local, dur - 4, 4))) * 0.5;
  const runs = runsOf(c.text.replace(/ /g, ''), c.keywords);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      <AbsoluteFill style={{background: `rgba(8,10,14,${dim})`}} />
      <svg width={1920} height={1080} style={{position: 'absolute'}}>
        <circle cx={960} cy={500} r={120 + ring * 620} fill="none" stroke={C.paper} strokeWidth={6 * (1 - ring)} opacity={(1 - ring) * 0.5} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: 960 - 450,
          width: 900,
          top: 500 - size * 0.62,
          textAlign: 'center',
          fontFamily: "'Noto Serif SC', serif",
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          opacity: clamp01(land * 3) * fade,
          transform: `translateY(${(1 - k) * -40}px) scale(${scale})`,
          textShadow: '0 6px 30px rgba(0,0,0,0.45)',
        }}
      >
        {runs.map((r, i) => {
          if (!exit) return <span key={i} style={{color: r.hot ? C.accent : C.sub}}>{r.text}</span>;
          // 退出：重点词飞向目标，其余淡出
          if (!r.hot) return <span key={i} style={{color: C.sub, opacity: 1 - clamp01(exitP * 3)}}>{r.text}</span>;
          const dx = (exit.x - 960) * exitP;
          const dy = (exit.y - 500) * exitP;
          const s = 1 + (exit.scale - 1) * exitP;
          return (
            <span
              key={i}
              style={{
                color: C.accent,
                display: 'inline-block',
                transform: `translate(${dx / scale}px, ${dy / scale}px) scale(${s})`,
                opacity: interpolate(exitP, [0.8, 1], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
              }}
            >
              {r.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 按字幕稿里的音效时间轴摆放合成音效 */
export const SfxTrack: React.FC = () => (
  <>
    {SFX.map((s, i) => (
      <Sequence key={i} from={s.at} layout="none" name={`sfx ${s.sound}`}>
        <Audio src={staticFile(`sfx/${s.sound}.wav`)} volume={s.gain} />
      </Sequence>
    ))}
  </>
);

/** 底部压暗，保证白字在任何画面上都清楚 */
export const BottomShade: React.FC = () => (
  <AbsoluteFill
    style={{
      pointerEvents: 'none',
      background: 'linear-gradient(to bottom, rgba(6,8,12,0) 58%, rgba(6,8,12,0.62) 100%)',
    }}
  />
);

export const cueList = (section: Cue['section']) => CUES.filter((c) => c.section === section);
