import React, {createContext, useContext} from 'react';
import {AbsoluteFill} from 'remotion';
import {clamp01, ease, lerp} from './anim';

export type Cam = {x: number; y: number; s: number; r: number};

export type CamKey = {
  f: number;
  x: number;
  y: number;
  s: number;
  r?: number;
  /** 从上一个关键帧到这一帧的缓动 */
  e?: (t: number) => number;
};

/** 关键帧插值；缩放在对数空间插值，推拉更自然 */
export const camAt = (keys: CamKey[], frame: number): Cam => {
  const k0 = keys[0];
  if (frame <= k0.f) return {x: k0.x, y: k0.y, s: k0.s, r: k0.r ?? 0};
  for (let i = 1; i < keys.length; i++) {
    const b = keys[i];
    if (frame <= b.f) {
      const a = keys[i - 1];
      const t = (b.e ?? ease.inOut)(clamp01((frame - a.f) / (b.f - a.f)));
      return {
        x: lerp(a.x, b.x, t),
        y: lerp(a.y, b.y, t),
        s: Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)),
        r: lerp(a.r ?? 0, b.r ?? 0, t),
      };
    }
  }
  const z = keys[keys.length - 1];
  return {x: z.x, y: z.y, s: z.s, r: z.r ?? 0};
};

type CamState = {cam: Cam; vel: {x: number; y: number; zoom: number}};

const CamCtx = createContext<CamState>({cam: {x: 0, y: 0, s: 1, r: 0}, vel: {x: 0, y: 0, zoom: 0}});

export const useCam = () => useContext(CamCtx);

export const CameraProvider: React.FC<{keys: CamKey[]; frame: number; children: React.ReactNode}> = ({
  keys,
  frame,
  children,
}) => {
  const cam = camAt(keys, frame);
  const a = camAt(keys, frame - 0.5);
  const b = camAt(keys, frame + 0.5);
  // 屏幕空间速度（像素/帧），用来自动加运动模糊
  const vel = {x: (b.x - a.x) * cam.s, y: (b.y - a.y) * cam.s, zoom: Math.log(b.s / a.s)};
  return <CamCtx.Provider value={{cam, vel}}>{children}</CamCtx.Provider>;
};

/** 世界坐标 → 屏幕坐标（depth 为视差深度，1 是主体层） */
export const toScreen = (cam: Cam, wx: number, wy: number, depth = 1) => {
  const s = cam.s ** depth;
  const dx = wx - cam.x * depth;
  const dy = wy - cam.y * depth;
  const cos = Math.cos((cam.r * Math.PI) / 180);
  const sin = Math.sin((cam.r * Math.PI) / 180);
  return {x: 960 + s * (dx * cos - dy * sin), y: 540 + s * (dx * sin + dy * cos), s};
};

let layerSeq = 0;

/**
 * 一个视差层。depth<1 是远景（移动慢、缩放小），depth>1 是前景。
 * 子元素直接用世界坐标绘制（远景层请用 depth 对应的坐标：worldX * depth）。
 * blur=true 时根据镜头速度自动加方向性运动模糊（甩镜）。
 */
export const Layer: React.FC<{
  depth?: number;
  blur?: boolean;
  opacity?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({depth = 1, blur = true, opacity = 1, style, children}) => {
  const {cam, vel} = useCam();
  const s = cam.s ** depth;
  const [id] = React.useState(() => `mb${layerSeq++}`);
  const bx = blur ? Math.min(70, Math.max(0, Math.abs(vel.x) * depth - 18) * 0.22) : 0;
  const by = blur ? Math.min(70, Math.max(0, Math.abs(vel.y) * depth - 18) * 0.22) : 0;
  const bz = blur ? Math.min(6, Math.max(0, Math.abs(vel.zoom) * depth - 0.035) * 50) : 0;
  const useFilter = bx > 0.5 || by > 0.5 || bz > 0.5;
  const transform = `translate(960 540) rotate(${cam.r}) scale(${s}) translate(${-cam.x * depth} ${-cam.y * depth})`;
  return (
    <AbsoluteFill style={{opacity, filter: useFilter ? `url(#${id})` : undefined, ...style}}>
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{overflow: 'visible'}}>
        {useFilter ? (
          <defs>
            <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation={`${bx + bz} ${by + bz}`} />
            </filter>
          </defs>
        ) : null}
        <g transform={transform}>{children}</g>
      </svg>
    </AbsoluteFill>
  );
};

/** 屏幕空间层（不跟镜头动），用于大字、闪白、跟拍道具等 */
export const ScreenLayer: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({
  children,
  style,
}) => (
  <AbsoluteFill style={style}>
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{overflow: 'visible'}}>
      {children}
    </svg>
  </AbsoluteFill>
);
