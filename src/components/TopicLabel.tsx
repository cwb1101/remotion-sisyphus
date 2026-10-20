import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ease, prog } from '../anim';
import { SECTIONS, sectionAt, THEME } from '../data/script';
import { C, FONT_SANS, FONT_SERIF } from '../theme';

/**
 * 左上角主题标注：在镜头之外，全程固定位置、不跟镜头缩放。
 * 第一行本期主题，第二行当前小节标题；换节时小标题上滑淡出、新标题自下而上淡入。
 */
export const TopicLabel: React.FC = () => {
  const f = useCurrentFrame();
  const cur = sectionAt(f);
  const idx = SECTIONS.indexOf(cur);
  const prev = idx > 0 ? SECTIONS[idx - 1] : null;
  const t = prev ? prog(f, cur.start, cur.start + 14, ease.inOut) : 1;

  const title = (text: string, o: number, dy: number) => (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        opacity: o,
        transform: `translateY(${dy}px)`,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );

  return (
    <div style={{ position: 'absolute', left: 56, top: 46, display: 'flex', gap: 16 }}>
      <div style={{ width: 3, height: 70, borderRadius: 2, background: C.gold, opacity: 0.6 }} />
      <div>
        <div
          style={{
            fontFamily: FONT_SANS,
            fontWeight: 500,
            fontSize: 22,
            letterSpacing: '0.12em',
            color: C.subtitle,
            opacity: 0.5,
            lineHeight: '26px',
          }}
        >
          {THEME}
        </div>
        <div
          style={{
            position: 'relative',
            marginTop: 10,
            height: 36,
            width: 360,
            overflow: 'hidden',
            fontFamily: FONT_SERIF,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: '0.16em',
            color: C.subtitle,
            opacity: 0.78,
            lineHeight: '36px',
          }}
        >
          {prev && t < 1 ? title(prev.title, 1 - t, -18 * t) : null}
          {title(cur.title, t, 18 * (1 - t))}
        </div>
      </div>
    </div>
  );
};
