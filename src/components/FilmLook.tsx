/** 胶片颗粒 + 暗角 + 落地闪光。全程叠在最上层（字幕之下的颗粒更真实，所以字幕也一起被颗粒覆盖）。 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {impactAt} from '../engine/impact';

export const FilmLook: React.FC<{vignette?: number}> = ({vignette = 0.72}) => {
  const frame = useCurrentFrame();
  const {flash, pulse} = impactAt(frame);
  const seed = (frame * 7919) % 997;
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {/* 落地瞬间的曝光闪烁（米白） */}
      <AbsoluteFill style={{background: '#E9E3D6', opacity: flash, mixBlendMode: 'screen'}} />
      {/* 暗角：关键句落地时收紧一下 */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse ${78 - pulse * 10}% ${72 - pulse * 10}% at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${vignette}) 100%)`,
        }}
      />
      {/* 胶片颗粒：半分辨率噪声放大两倍，每帧换 seed */}
      <svg width={960} height={540} style={{position: 'absolute', left: 0, top: 0, transform: 'scale(2)', transformOrigin: '0 0', mixBlendMode: 'soft-light', opacity: 0.55}}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="960" height="540" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};
