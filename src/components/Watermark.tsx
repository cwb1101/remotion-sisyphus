/**
 * 右上角固定水印：文字外包一圈 1px 空心细框。
 * 放在所有镜头运动、震屏、交叉淡化之外，全程同一位置、同一大小。字幕版式不会进入这个区域。
 */
import React from 'react';
import {C, FONT, WATERMARK} from '../theme';

export const WATERMARK_BOX = {right: 80, top: 72};

export const Watermark: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      right: WATERMARK_BOX.right,
      top: WATERMARK_BOX.top,
      border: `1px solid ${C.paper}`,
      padding: '7px 14px 8px',
      fontFamily: FONT.sansRegular,
      fontSize: 22,
      lineHeight: 1,
      letterSpacing: '0.14em',
      color: C.paper,
      opacity: 0.35,
      whiteSpace: 'nowrap',
    }}
  >
    {WATERMARK}
  </div>
);
