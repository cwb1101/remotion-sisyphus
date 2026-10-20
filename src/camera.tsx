import React from 'react';

/** 镜头：世界坐标里的注视点 + 缩放 + 旋转 */
export type Cam = { x: number; y: number; zoom: number; rot?: number };

/**
 * 某一景深层的变换。
 * depth = 1 是主体所在平面；<1 是背景（移动、缩放都更慢）；>1 是前景（更快）。
 * anchor 是场景的参照点，背景/前景都围绕它画，视差才不会把元素甩出画面。
 */
export const camT = (c: Cam, depth = 1, anchor: { x: number; y: number } = { x: 0, y: 0 }) => {
  const x = anchor.x + (c.x - anchor.x) * depth;
  const y = anchor.y + (c.y - anchor.y) * depth;
  const z = Math.pow(c.zoom, depth);
  return `translate(960 540) rotate(${(c.rot ?? 0) * depth}) scale(${z}) translate(${-x} ${-y})`;
};

/**
 * 屏幕空间的方向性运动模糊（甩镜、速度渐变用）。
 * bx/by 单位是屏幕像素；为 0 时不挂滤镜，省渲染时间。
 */
export const MotionBlur: React.FC<{
  id: string;
  bx: number;
  by: number;
  children: React.ReactNode;
}> = ({ id, bx, by, children }) => {
  const on = Math.abs(bx) > 0.4 || Math.abs(by) > 0.4;
  return (
    <>
      {on ? (
        <defs>
          <filter id={id} filterUnits="userSpaceOnUse" x={-200} y={-200} width={2320} height={1480}>
            <feGaussianBlur stdDeviation={`${Math.abs(bx).toFixed(2)} ${Math.abs(by).toFixed(2)}`} />
          </filter>
        </defs>
      ) : null}
      <g filter={on ? `url(#${id})` : undefined}>{children}</g>
    </>
  );
};

/** 全屏 SVG 画布 */
export const Stage: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({
  children,
  style,
}) => (
  <svg
    width={1920}
    height={1080}
    viewBox="0 0 1920 1080"
    style={{ position: 'absolute', inset: 0, overflow: 'hidden', ...style }}
  >
    {children}
  </svg>
);
