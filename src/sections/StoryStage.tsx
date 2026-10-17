import React from 'react';
import { Drift } from '../components/Particles';
import { type Cam, camTransform } from '../lib/anim';
import { C } from '../theme';
import { SG, skyAt } from './story';

/**
 * 后半片四节共用的舞台：天空（屏幕坐标）、星星、地平线暖光、地面（世界坐标）。
 * 天色按帧从深夜过渡到黎明，所以相邻两节在交接帧上画出来完全一样。
 */
export const StoryStage: React.FC<{
  id: string;
  f: number;
  cam: Cam;
  opacity?: number;
  /** 只画 x ≥ clipX 的部分（分屏时用） */
  clipX?: number;
  children?: React.ReactNode;
  /** 画在镜头之外、屏幕坐标的东西 */
  overlay?: React.ReactNode;
}> = ({ id, f, cam, opacity = 1, clipX, children, overlay }) => {
  const sky = skyAt(f);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity }}>
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky.top} />
          <stop offset="62%" stopColor={sky.mid} />
          <stop offset="100%" stopColor={sky.bottom} />
        </linearGradient>
        <radialGradient id={`${id}-warm`}>
          <stop offset="0%" stopColor={C.think} stopOpacity={1} />
          <stop offset="100%" stopColor={C.think} stopOpacity={0} />
        </radialGradient>
        {clipX !== undefined ? (
          <clipPath id={`${id}-clip`}>
            <rect x={clipX} y={0} width={Math.max(0, 1920 - clipX)} height={1080} />
          </clipPath>
        ) : null}
      </defs>
      <g clipPath={clipX !== undefined ? `url(#${id}-clip)` : undefined}>
        <rect width={1920} height={1080} fill={`url(#${id}-sky)`} />
        <Drift seed="st" count={90} frame={f} color="#C9D3FF" maxOpacity={sky.stars} h={760} speed={0.1} />
        <g transform={camTransform(cam)}>
          <ellipse cx={cam.fx} cy={SG} rx={2400 / cam.z} ry={260} fill={`url(#${id}-warm)`} opacity={sky.warm} />
          <rect x={cam.fx - 4000} y={SG} width={8000} height={1600} fill="#141A2C" />
          <line x1={cam.fx - 4000} y1={SG} x2={cam.fx + 4000} y2={SG} stroke={C.groundLine} strokeWidth={3} />
          {children}
        </g>
        {overlay}
      </g>
    </svg>
  );
};
