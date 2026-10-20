import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ease, prog } from '../anim';
import { CUES } from '../data/script';
import { fontSizeFor, layoutCue, SUB } from '../subtitleLayout';
import { C, FONT_SANS } from '../theme';

/**
 * 字幕：画面下方居中，横排，最多两行，单行 ≤ 960px。
 * 白字为主，重点词只用强调色；无描边、无渐变，只有一层很淡的阴影。
 * 普通句逐字亮起；关键句（slam）大字从上方砸下来。
 */
export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const idx = CUES.findIndex((x) => f >= x.start && f < x.end);
  if (idx < 0) return null;
  const c = CUES[idx];
  const next = CUES[idx + 1];

  const lines = layoutCue(c);
  const size = fontSizeFor(c);
  const local = f - c.start;
  const isSlam = c.style === 'slam';
  const isNote = c.style === 'note';
  // 紧接着下一屏时直接换屏，不提前淡出，保证每屏的完整阅读时间
  const back2back = next && next.start === c.end;
  const out = back2back ? 1 : 1 - prog(f, c.end - 5, c.end, ease.in);

  let n = 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: 960 - SUB.maxWidth / 2,
        width: SUB.maxWidth,
        bottom: SUB.bottom,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: size * (SUB.lineHeight - 1),
        opacity: out,
        fontFamily: FONT_SANS,
        fontWeight: isSlam ? 900 : isNote ? 400 : 700,
        fontSize: size,
        lineHeight: 1,
        color: C.subtitle,
        textShadow: isNote ? 'none' : '0 3px 14px rgba(8, 8, 24, 0.42)',
        letterSpacing: isSlam ? '0.06em' : '0.03em',
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: 'flex', whiteSpace: 'nowrap' }}>
          {line.map((seg, si) => (
            <span key={si} style={{ display: 'inline-flex', marginLeft: si ? `${SUB.gapEm}em` : 0 }}>
              {seg.map((g) => {
                const i = n++;
                if (isNote) {
                  return (
                    <span key={g.index} style={{ opacity: 0.72 * prog(local, i * 0.6, i * 0.6 + 8) }}>
                      {g.ch}
                    </span>
                  );
                }
                if (isSlam) {
                  const t = prog(local, i * 1.3, i * 1.3 + 7, ease.outBack);
                  const o = prog(local, i * 1.3, i * 1.3 + 3);
                  return (
                    <span
                      key={g.index}
                      style={{
                        display: 'inline-block',
                        opacity: o,
                        color: g.key ? C.accent : undefined,
                        transform: `translateY(${(1 - t) * -150}px) scale(${1 + (1 - t) * 0.7})`,
                      }}
                    >
                      {g.ch}
                    </span>
                  );
                }
                const t = prog(local, i * 1.2, i * 1.2 + 5, ease.out);
                return (
                  <span
                    key={g.index}
                    style={{
                      display: 'inline-block',
                      opacity: t,
                      color: g.key ? C.accent : undefined,
                      transform: `translateY(${(1 - t) * 12}px)`,
                    }}
                  >
                    {g.ch}
                  </span>
                );
              })}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
};
