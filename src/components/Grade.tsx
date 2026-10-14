import React from 'react';
import {AbsoluteFill} from 'remotion';

/**
 * 全局调色层：整体曝光 / 灰阶曲线 / 暗角 / 颗粒都在这里调。
 * - curve：灰阶映射（输入 0,32,64,…,255 → 输出），压中间调、保留高光，
 *   让每帧平均亮度 YAVG 落在 90–135、全片均值 100–120，同时画面仍通透。
 * - exposure：整体再乘一个系数，想整体调亮调暗改这里。
 * - vignette：四角最多压暗 15–20%；grain：颗粒透明度 4–6%。
 */
export const GRADE = {
  exposure: 0.97,
  curve: [0, 30, 55, 80, 102, 128, 162, 205, 245],
  vignette: 0.17,
  grain: 0.05,
};

const table = (GRADE.curve.map((v) => Math.min(1, (v / 255) * GRADE.exposure))).join(' ');

export const Grade: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill>
    <svg width={0} height={0} style={{position: 'absolute'}}>
      <filter id="gradeCurve" colorInterpolationFilters="sRGB">
        <feComponentTransfer>
          <feFuncR type="table" tableValues={table} />
          <feFuncG type="table" tableValues={table} />
          <feFuncB type="table" tableValues={table} />
        </feComponentTransfer>
      </filter>
    </svg>
    <AbsoluteFill style={{filter: 'url(#gradeCurve)'}}>{children}</AbsoluteFill>
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 75% 75% at 50% 50%, rgba(30,29,27,0) 55%, rgba(30,29,27,${GRADE.vignette}) 100%)`,
      }}
    />
  </AbsoluteFill>
);

/** 细胶片颗粒：每帧换一个种子，确定性 */
export const Grain: React.FC<{frame: number; opacity?: number}> = ({frame, opacity = GRADE.grain}) => (
  <AbsoluteFill style={{opacity, pointerEvents: 'none'}}>
    <svg width={1920} height={1080}>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={(frame * 7919) % 9973} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={1920} height={1080} filter="url(#grain)" />
    </svg>
  </AbsoluteFill>
);
