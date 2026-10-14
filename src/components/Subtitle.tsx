import React from 'react';
import {AbsoluteFill, interpolate, random} from 'remotion';
import {C, easeOut, FONT_LATIN, FONT_SANS, FONT_SERIF, GRID} from '../theme';
import {Screen, SCREENS} from '../lib/timeline';

/** padOnly：只画字下的淡渐变垫层，不画字（用于对比度检测） */
export type SubtitleMode = 'full' | 'padOnly';

const IN = 20; // 淡入 + 上移 12px
const IN_KEY = 40; // 关键句慢显
const OUT = 15; // 淡出

/** 把一行文字切成普通段和强调段 */
const splitEmphasis = (line: string, words: string[]) => {
  const parts: {t: string; em: boolean}[] = [];
  let rest = line;
  while (rest.length) {
    let hit = -1;
    let word = '';
    for (const w of words) {
      const i = rest.indexOf(w);
      if (i >= 0 && (hit < 0 || i < hit)) {
        hit = i;
        word = w;
      }
    }
    if (hit < 0) {
      parts.push({t: rest, em: false});
      break;
    }
    if (hit > 0) parts.push({t: rest.slice(0, hit), em: false});
    parts.push({t: word, em: true});
    rest = rest.slice(hit + word.length);
  }
  return parts;
};

const Line: React.FC<{text: string; words: string[]; size: number; family?: string; weight?: number; mode: SubtitleMode}> = ({
  text,
  words,
  size,
  family = FONT_SERIF,
  weight = 600,
  mode,
}) => (
  <div
    style={{
      fontFamily: family,
      fontWeight: weight,
      fontSize: size,
      letterSpacing: '0.04em',
      lineHeight: 1.5,
      color: C.dark,
      whiteSpace: 'pre',
      visibility: mode === 'padOnly' ? 'hidden' : 'visible',
    }}
  >
    {splitEmphasis(text, words).map((p, i) =>
      p.em ? (
        <span key={i} style={{color: C.accentText, fontSize: Math.round(size * GRID.emphasisScale), lineHeight: 1}}>
          {p.t}
        </span>
      ) : (
        <span key={i}>{p.t}</span>
      ),
    )}
  </div>
);

/** 字下垫一层很淡、很宽的亮渐变（不用描边、投影、底框） */
const Pad: React.FC<{cx: number; cy: number; w: number; h: number; alpha: number}> = ({cx, cy, w, h, alpha}) => (
  <div
    style={{
      position: 'absolute',
      left: cx - w / 2,
      top: cy - h / 2,
      width: w,
      height: h,
      background: `radial-gradient(ellipse closest-side, rgba(234,229,218,${alpha}) 0%, rgba(234,229,218,${alpha * 0.75}) 35%, rgba(234,229,218,${alpha * 0.35}) 65%, rgba(234,229,218,${alpha * 0.1}) 85%, rgba(234,229,218,0) 100%)`,
    }}
  />
);

/** 基线 960 时容器底边距：行高 1.5 的半行距 0.25em + 思源字体下伸 0.12em */
const bottomFor = (size: number) => 1080 - (GRID.baseline + 0.37 * size);
const widthOf = (line: string, size: number) => line.length * size * 1.04;

export const SubtitleScreen: React.FC<{s: Screen; frame: number; mode: SubtitleMode; padAlpha?: number}> = ({
  s,
  frame,
  mode,
  padAlpha = 0.55,
}) => {
  const local = frame - s.from;
  const dur = s.to - s.from;
  const inF = s.key ? IN_KEY : IN;
  const tIn = interpolate(local, [0, inF], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut});
  const tOut = interpolate(local, [dur - OUT, dur], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const opacity = Math.min(tIn, tOut);
  const rise = (1 - tIn) * 12;
  const lines = s.text.split('\n');
  const size = s.key ? GRID.keySize : GRID.mainSize;
  const words = s.emphasis;
  const alpha = padAlpha + (words.length ? 0.25 : 0);
  const longest = Math.max(...lines.map((l) => l.length));
  const wrap: React.CSSProperties = {position: 'absolute', transform: `translateY(${rise}px)`};

  let content: React.ReactNode;
  let pad: React.ReactNode;

  switch (s.layout) {
    case 'bottom-left-en': {
      const w = widthOf(lines[0], size);
      pad = <Pad cx={GRID.marginX + w / 2} cy={915} w={w + 420} h={300} alpha={alpha} />;
      content = (
        <div style={{...wrap, left: GRID.marginX, bottom: bottomFor(size)}}>
          <div
            style={{
              fontFamily: FONT_LATIN,
              fontWeight: 300,
              fontSize: GRID.enSize,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: C.dark,
              opacity: mode === 'padOnly' ? 0 : 0.6,
              marginBottom: 10,
            }}
          >
            {s.en}
          </div>
          <Line text={lines[0]} words={words} size={size} mode={mode} />
        </div>
      );
      break;
    }
    case 'bottom-center': {
      const w = widthOf(lines[0], size);
      pad = <Pad cx={960} cy={935} w={w + 460} h={250} alpha={alpha} />;
      content = (
        <div style={{...wrap, left: 0, right: 0, bottom: bottomFor(size), textAlign: 'center'}}>
          <Line text={lines[0]} words={words} size={size} mode={mode} />
        </div>
      );
      break;
    }
    case 'top-center': {
      const w = widthOf(longest > 0 ? lines.reduce((a, b) => (a.length > b.length ? a : b)) : '', size);
      const top = GRID.top;
      pad = <Pad cx={960} cy={top + (lines.length * size * 1.5) / 2} w={w + 460} h={lines.length * size * 1.5 + 200} alpha={alpha} />;
      content = (
        <div style={{...wrap, left: 0, right: 0, top, textAlign: 'center'}}>
          {lines.map((l, i) => (
            <Line key={i} text={l} words={words} size={size} mode={mode} />
          ))}
        </div>
      );
      break;
    }
    case 'top-left': {
      const w = widthOf(lines[0], size);
      const top = 150;
      pad = <Pad cx={GRID.marginX + w / 2} cy={top + size * 0.75} w={w + 420} h={260} alpha={alpha} />;
      content = (
        <div style={{...wrap, left: GRID.marginX, top}}>
          {lines.map((l, i) => (
            <Line key={i} text={l} words={words} size={size} mode={mode} />
          ))}
        </div>
      );
      break;
    }
    case 'offset': {
      // 大小字错位：上行小字，下行主字缩进 1.5–2.5 个字（random(seed) 固定，每次渲染一致）
      const small = 48;
      const indent = Math.round((1.5 + random(`offset-${s.id}`)) * size);
      const w = Math.max(widthOf(lines[0], small), indent + widthOf(lines[1] ?? '', size));
      pad = <Pad cx={GRID.marginX + indent / 2 + w / 2} cy={925} w={w + 420} h={320} alpha={alpha} />;
      content = (
        <div style={{...wrap, left: GRID.marginX, bottom: bottomFor(size)}}>
          <Line text={lines[0]} words={words} size={small} mode={mode} />
          <div style={{marginLeft: indent}}>
            <Line text={lines[1] ?? ''} words={words} size={size} mode={mode} />
          </div>
        </div>
      );
      break;
    }
    case 'left-paragraph':
    case 'left-paragraph-small': {
      const smallStyle = s.layout === 'left-paragraph-small';
      const ps = smallStyle ? 44 : 64;
      const w = widthOf(lines.reduce((a, b) => (a.length > b.length ? a : b)), ps);
      const h = lines.length * ps * 1.5;
      pad = <Pad cx={GRID.marginX + w / 2} cy={GRID.baseline - h / 2 + ps * 0.4} w={w + 420} h={h + 220} alpha={alpha} />;
      content = (
        <div style={{...wrap, left: GRID.marginX, bottom: bottomFor(ps)}}>
          {lines.map((l, i) => (
            <Line
              key={i}
              text={l}
              words={words}
              size={ps}
              family={smallStyle ? FONT_SANS : FONT_SERIF}
              weight={smallStyle ? 300 : 600}
              mode={mode}
            />
          ))}
        </div>
      );
      break;
    }
    case 'reveal': {
      // 遮罩擦出：从左向右露出（配合场景前景遮挡）
      const wipe = interpolate(local, [0, 30], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut});
      const w = widthOf(longest ? lines.reduce((a, b) => (a.length > b.length ? a : b)) : '', size);
      pad = <Pad cx={GRID.marginX + w / 2} cy={905} w={w + 420} h={300} alpha={alpha} />;
      content = (
        <div style={{...wrap, transform: 'none', left: GRID.marginX, bottom: bottomFor(size), clipPath: `inset(0 ${100 - wipe}% 0 0)`}}>
          {lines.map((l, i) => (
            <Line key={i} text={l} words={words} size={size} mode={mode} />
          ))}
        </div>
      );
      break;
    }
    case 'center': {
      const w = widthOf(lines.reduce((a, b) => (a.length > b.length ? a : b)), size);
      pad = <Pad cx={960} cy={540} w={w + 520} h={lines.length * size * 1.5 + 260} alpha={alpha} />;
      content = (
        <div style={{...wrap, left: 0, right: 0, top: 540 - (lines.length * size * 1.5) / 2, textAlign: 'center'}}>
          {lines.map((l, i) => (
            <Line key={i} text={l} words={words} size={size} mode={mode} />
          ))}
        </div>
      );
      break;
    }
  }

  return (
    <AbsoluteFill style={{opacity}}>
      {pad}
      {content}
    </AbsoluteFill>
  );
};

/** 按数据文件逐屏摆放字幕；padAlpha 由各场景按背景亮度给出 */
export const SubtitleTrack: React.FC<{frame: number; mode: SubtitleMode; padFor?: (s: Screen) => number}> = ({
  frame,
  mode,
  padFor,
}) => (
  <AbsoluteFill>
    {SCREENS.filter((s) => frame >= s.from && frame < s.to).map((s) => (
      <SubtitleScreen key={s.id} s={s} frame={frame} mode={mode} padAlpha={padFor?.(s)} />
    ))}
  </AbsoluteFill>
);
