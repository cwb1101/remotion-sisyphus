import React from 'react';
import {AbsoluteFill} from 'remotion';

/**
 * 2.5D 针孔相机。x/y：镜头横移量（深度 1 处的像素），z：镜头向前推的距离。
 * 深度为 D 的层：缩放 s = D / (D - z)，横移 x / D —— 近处层移动快，远处层移动慢。
 */
export type Cam = {x: number; y: number; z: number};

export const mixCam = (a: Cam, b: Cam, t: number): Cam => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  z: a.z + (b.z - a.z) * t,
});

export const layerScale = (cam: Cam, depth: number) => depth / (depth - cam.z);

/** 设计坐标 (u, v) 在给定深度层上的屏幕坐标 */
export const project = (cam: Cam, depth: number, u: number, v: number) => {
  const s = layerScale(cam, depth);
  return {x: 960 + s * (u - 960 - cam.x / depth), y: 540 + s * (v - 540 - cam.y / depth), s};
};

/** 景深：离对焦深度越远越虚 */
export const dofBlur = (depth: number, focus: number, strength: number) =>
  Math.abs(1 / depth - 1 / focus) * strength;

export const Layer: React.FC<{
  cam: Cam;
  depth: number;
  blur?: number;
  opacity?: number;
  children: React.ReactNode;
}> = ({cam, depth, blur = 0, opacity = 1, children}) => {
  const s = layerScale(cam, depth);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: '0 0',
        transform: `translate(960px,540px) scale(${s}) translate(${-960 - cam.x / depth}px, ${-540 - cam.y / depth}px)`,
        filter: blur > 0.15 ? `blur(${blur / s}px)` : undefined,
        opacity,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** 1920×1080 的 SVG 画布，内容可越出边界（镜头平移时需要） */
export const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
  <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{overflow: 'visible', position: 'absolute'}}>
    {children}
  </svg>
);
