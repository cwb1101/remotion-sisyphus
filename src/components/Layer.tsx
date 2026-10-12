import React from 'react';
import {H, W} from '../theme';

/**
 * 一层全幅 SVG；blur 用来做景深（远景、前景虚化）。
 * 有模糊的层按半分辨率绘制再放大：模糊后的画面看不出差别，模糊运算量只剩四分之一。
 */
export const Layer: React.FC<{
  blur?: number;
  opacity?: number;
  blend?: React.CSSProperties['mixBlendMode'];
  children: React.ReactNode;
}> = ({blur = 0, opacity = 1, blend, children}) => {
  const half = blur > 0.6;
  const k = half ? 0.5 : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: W * k,
        height: H * k,
        transform: half ? 'scale(2)' : undefined,
        transformOrigin: '0 0',
        filter: blur > 0.15 ? `blur(${(blur * k).toFixed(2)}px)` : undefined,
        opacity,
        mixBlendMode: blend,
      }}
    >
      <svg width={W * k} height={H * k} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        {children}
      </svg>
    </div>
  );
};
