import React from 'react';
import {COLORS, SANS} from '../theme';

/** 右上角固定水印：屏幕坐标，不随相机移动、旋转、缩放或震动 */
export const WATERMARK_TEXT = '肆号静匣Logos';

export const Watermark: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 40,
      right: 48,
      padding: '8px 18px 9px',
      border: '1.5px solid rgba(237,230,218,0.32)',
      fontFamily: SANS,
      fontWeight: 500,
      fontSize: 26,
      lineHeight: 1.2,
      letterSpacing: '0.08em',
      color: COLORS.ink,
      opacity: 0.5,
      pointerEvents: 'none',
    }}
  >
    {WATERMARK_TEXT}
  </div>
);
