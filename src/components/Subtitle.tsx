import React from 'react';
import { useCurrentFrame } from 'remotion';
import { activeScreen, rules, type Screen } from '../data/script';
import { C, FONT } from '../theme';
import { clamp } from '../lib/anim';

const S = rules.subtitle;

/** 把一屏文字按重点词切成若干段，重点词按 script.json 里给的颜色上色。 */
export const splitHighlights = (s: Screen) => {
  const parts: { text: string; color: string }[] = [];
  let rest = s.text;
  const hls = [...s.highlights];
  while (rest.length) {
    let best: { idx: number; word: string; color: string } | null = null;
    for (const h of hls) {
      const idx = rest.indexOf(h.word);
      if (idx >= 0 && (!best || idx < best.idx)) best = { idx, ...h };
    }
    if (!best) {
      parts.push({ text: rest, color: C.white });
      break;
    }
    if (best.idx > 0) parts.push({ text: rest.slice(0, best.idx), color: C.white });
    parts.push({ text: best.word, color: best.color });
    rest = rest.slice(best.idx + best.word.length);
    hls.splice(hls.findIndex((h) => h.word === best!.word), 1);
  }
  return parts;
};

/** 底部主字幕：屏幕坐标固定，不在任何镜头变换里。 */
export const Subtitle: React.FC<{ textOnly?: boolean; lastScreen?: number }> = ({ textOnly = false, lastScreen }) => {
  const frame = useCurrentFrame();
  const s = activeScreen(frame, lastScreen);
  const fadeIn = s ? clamp((frame - s.startFrame) / 5) : 0;
  const fadeOut = s ? clamp((s.endFrame - frame) / 4) : 0;
  const o = Math.min(fadeIn, fadeOut);
  return (
    <>
      {/* 底部暗色渐变带：常驻，避免随字幕闪烁 */}
      {!textOnly ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 330,
            background: 'linear-gradient(to bottom, rgba(5,6,12,0) 0%, rgba(5,6,12,0.32) 45%, rgba(5,6,12,0.58) 100%)',
          }}
        />
      ) : null}
      {s ? (
        <div
          style={{
            position: 'absolute',
            left: S.left,
            width: S.maxWidth,
            bottom: S.bottomMargin,
            textAlign: 'center',
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: S.fontSize,
            lineHeight: 1.3,
            letterSpacing: 2,
            color: C.white,
            opacity: o,
            transform: `translateY(${(1 - fadeIn) * 10}px)`,
            textShadow: '0 2px 6px rgba(0,0,0,0.7), 0 0 22px rgba(0,0,0,0.45)',
            // 最多两行：超出宽度换行，check-script 会拦住超过两行的稿子
            wordBreak: 'break-all',
          }}
        >
          {splitHighlights(s).map((p, i) => (
            <span key={i} style={{ color: p.color }}>
              {p.text}
            </span>
          ))}
        </div>
      ) : null}
    </>
  );
};
