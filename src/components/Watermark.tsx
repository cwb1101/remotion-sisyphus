import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT_FAMILY } from './Subtitle';

/** 右上角固定水印：在相机之外，不随镜头缩放平移。字号 22px、1px 细空心方框、约 35% 透明度。 */
export const WATERMARK = { text: '肆号静匣Logos', right: 44, top: 34 };

export const Watermark: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none' }}>
    <div
      data-watermark
      style={{
        position: 'absolute',
        right: WATERMARK.right,
        top: WATERMARK.top,
        padding: '5px 12px 6px',
        border: '1px solid #FFFFFF',
        color: '#FFFFFF',
        fontFamily: FONT_FAMILY,
        fontWeight: 500,
        fontSize: 22,
        lineHeight: 1.2,
        letterSpacing: 2,
        opacity: 0.35,
        whiteSpace: 'nowrap',
      }}
    >
      {WATERMARK.text}
    </div>
  </AbsoluteFill>
);
