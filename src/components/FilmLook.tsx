import React from 'react';
import {Img, random, staticFile} from 'remotion';
import {GRAIN_TILES} from '../data/assets';

/**
 * 全程胶片颗粒 + 暗角 + 轻微亮度闪烁。
 * 颗粒贴图全部常驻，只切换可见的那一张，避免每帧重新加载图片。
 */
export const FilmLook: React.FC<{frame: number; vignette?: number; grain?: number}> = ({
  frame,
  vignette = 1,
  grain = 1,
}) => {
  const tile = Math.floor(random(`grain-${frame}`) * GRAIN_TILES);
  const ox = Math.floor(random(`gx-${frame}`) * 200);
  const oy = Math.floor(random(`gy-${frame}`) * 200);
  const flicker = (random(`fl-${frame}`) - 0.5) * 0.035;
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {Array.from({length: GRAIN_TILES}).map((_, i) => (
        <Img
          key={i}
          src={staticFile(`grain/grain-${i}.png`)}
          style={{
            position: 'absolute',
            left: -ox,
            top: -oy,
            width: 1920 + 400,
            height: 1080 + 400,
            opacity: 0.22 * grain,
            mixBlendMode: 'overlay',
            visibility: i === tile ? 'visible' : 'hidden',
          }}
        />
      ))}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.42) 78%, rgba(0,0,0,0.82) 100%)',
          opacity: vignette,
        }}
      />
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: Math.max(0, flicker)}} />
      <div style={{position: 'absolute', inset: 0, background: '#FFF3DA', opacity: Math.max(0, -flicker) * 0.4}} />
    </div>
  );
};
