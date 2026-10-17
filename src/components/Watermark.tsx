import React from 'react';
import { rules } from '../data/script';
import { FONT } from '../theme';

const W = rules.watermark;

/** 右上角固定水印：在所有镜头变换之外，全程同一位置、同一大小。 */
export const Watermark: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      left: W.x,
      top: W.y,
      width: W.w,
      height: W.h,
      boxSizing: 'border-box',
      border: `${W.borderWidth}px solid #FFFFFF`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: FONT,
      fontWeight: 500,
      fontSize: W.fontSize,
      lineHeight: 1,
      letterSpacing: 1,
      color: '#FFFFFF',
      opacity: W.opacity,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}
  >
    {W.text}
  </div>
);
