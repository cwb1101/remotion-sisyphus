import React from 'react';
import {C, FONT_SANS, WATERMARK} from '../theme';

/** 右上角固定水印：细空心方框包住文字，约 35% 透明度 */
export const Watermark: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: WATERMARK.top,
      right: WATERMARK.right,
      height: WATERMARK.height,
      padding: '0 12px',
      display: 'flex',
      alignItems: 'center',
      border: `1px solid ${C.text}`,
      color: C.text,
      fontFamily: FONT_SANS,
      fontWeight: 400,
      fontSize: 22,
      letterSpacing: '0.06em',
      lineHeight: 1,
      opacity: 0.35,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}
  >
    肆号静匣Logos
  </div>
);
