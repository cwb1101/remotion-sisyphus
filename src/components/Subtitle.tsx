import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { cueAt, Cue, WHITE } from '../data/script';
import { clamp } from '../lib/anim';

// 版式常量：与 scripts/check-script.mjs 一致
export const SUB = { left: 360, width: 1200, bottom: 116, font: 64, lineHeight: 1.32 };
export const FONT_FAMILY = '"Noto Sans SC", "Source Han Sans SC", "思源黑体", sans-serif';

/** 把字幕拆成白字和高亮词。 */
const splitText = (c: Cue) => {
  const parts: { t: string; color: string | null }[] = [];
  let rest = c.text;
  while (rest.length) {
    let best: { i: number; w: string; color: string } | null = null;
    for (const h of c.highlights) {
      const i = rest.indexOf(h.word);
      if (i >= 0 && (!best || i < best.i)) best = { i, w: h.word, color: h.color };
    }
    if (!best) {
      parts.push({ t: rest, color: null });
      break;
    }
    if (best.i > 0) parts.push({ t: rest.slice(0, best.i), color: null });
    parts.push({ t: best.w, color: best.color });
    rest = rest.slice(best.i + best.w.length);
  }
  return parts;
};

/**
 * 主字幕：固定在画面底部居中（x 360–1560，底边距底 116px），
 * 处在相机之外，不跟着镜头缩放平移。
 */
export const Subtitle: React.FC<{ until?: number; band?: boolean }> = ({ until, band = true }) => {
  const frame = useCurrentFrame();
  const c = cueAt(frame);
  const fadeIn = c ? clamp((frame - c.start) / 5) : 0;
  const fadeOut = c ? clamp((Math.min(c.end, until ?? c.end) - frame) / 5) : 0;
  const o = Math.min(fadeIn, fadeOut);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* 底部暗色渐变带：保证白字在亮背景上也看得清 */}
      {band && <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 380,
          background: 'linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0) 100%)',
        }}
      />}
      {c && (
        <div
          data-subtitle={c.id}
          style={{
            position: 'absolute',
            left: SUB.left,
            width: SUB.width,
            bottom: SUB.bottom,
            textAlign: 'center',
            fontFamily: FONT_FAMILY,
            fontWeight: 700,
            fontSize: SUB.font,
            lineHeight: SUB.lineHeight,
            color: WHITE,
            letterSpacing: 2,
            opacity: o,
            transform: `translateY(${(1 - fadeIn) * 14}px)`,
            textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 18px rgba(0,0,0,0.6)',
          }}
        >
          {splitText(c).map((p, i) =>
            p.color ? (
              <span key={i} style={{ color: p.color, whiteSpace: 'nowrap' }}>
                {p.t}
              </span>
            ) : (
              <span key={i}>{p.t}</span>
            ),
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};
