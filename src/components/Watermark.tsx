// 水印：右上角固定，不跟镜头运动或缩放
import React from 'react';
import { FONT_SANS, C } from '../film/theme';

export const Watermark: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 34,
      right: 40,
      padding: '7px 14px',
      border: `1px solid ${C.ivory}`,
      color: C.ivory,
      opacity: 0.35,
      fontFamily: FONT_SANS,
      fontSize: 22,
      lineHeight: 1,
      letterSpacing: '0.08em',
      whiteSpace: 'nowrap',
    }}
  >
    肆号静匣Logos
  </div>
);
