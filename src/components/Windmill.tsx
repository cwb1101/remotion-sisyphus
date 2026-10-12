import React from 'react';

/**
 * 拉曼查风车：圆筒塔身 + 圆锥顶 + 四片格栅帆。
 * 局部坐标原点在塔基中心，y 向下；塔高约 900，帆长约 760。
 */
export const SAIL_LEN = 760;
export const HUB_Y = -930;

export const Sail: React.FC<{fill: string; cloth: number; detail: boolean; rim?: string; rimOpacity?: number}> = ({
  fill, cloth, detail, rim, rimOpacity = 0,
}) => {
  const w = 120;
  const start = 110;
  const bars = [];
  if (detail) {
    for (let y = start; y <= SAIL_LEN; y += 52) {
      bars.push(<line key={`b${y}`} x1={0} y1={-y} x2={w} y2={-y} stroke={fill} strokeWidth={7} />);
    }
  }
  return (
    <g>
      {/* 主桅 */}
      <path d={`M -9 0 L 9 0 L 6 ${-SAIL_LEN - 30} L -6 ${-SAIL_LEN - 30} Z`} fill={fill} />
      {/* 外框 */}
      <rect x={0} y={-SAIL_LEN} width={w} height={SAIL_LEN - start} fill="none" stroke={fill} strokeWidth={detail ? 9 : 14} />
      {bars}
      {/* 帆布：只蒙住一部分，透出格栅 */}
      {cloth > 0 ? (
        <path
          d={`M 8 ${-start} L ${w * 0.92} ${-start - 20} L ${w * 0.95} ${-SAIL_LEN + 20} L 8 ${-SAIL_LEN} Z`}
          fill={fill}
          opacity={cloth}
        />
      ) : null}
      {rim && rimOpacity > 0 ? (
        <path
          d={`M ${w} ${-start} L ${w} ${-SAIL_LEN}`}
          stroke={rim}
          strokeWidth={3}
          opacity={rimOpacity}
        />
      ) : null}
    </g>
  );
};

export const Windmill: React.FC<{
  x: number;
  y: number;
  scale: number;
  rot: number;
  fill: string;
  bodyFill?: string;
  cloth?: number;
  detail?: boolean;
  rim?: string;
  rimOpacity?: number;
}> = ({x, y, scale, rot, fill, bodyFill, cloth = 0.55, detail = true, rim, rimOpacity = 0}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {/* 塔身 */}
    <path d="M -150 0 L -118 -820 L 118 -820 L 150 0 Z" fill={bodyFill ?? fill} />
    {/* 门和小窗，只在近处显现 */}
    {detail ? (
      <>
        <path d="M -30 0 L -30 -150 A 30 30 0 0 1 30 -150 L 30 0 Z" fill={fill} opacity={0.9} />
        <rect x={-14} y={-520} width={28} height={50} fill={fill} opacity={0.9} />
      </>
    ) : null}
    {/* 圆锥顶 */}
    <path d="M -140 -815 C -120 -900 -60 -975 0 -995 C 60 -975 120 -900 140 -815 Z" fill={fill} />
    {rim && rimOpacity > 0 ? (
      <path
        d="M -140 -815 C -120 -900 -60 -975 0 -995 C 60 -975 120 -900 140 -815 M 118 -820 L 150 0"
        fill="none"
        stroke={rim}
        strokeWidth={4}
        opacity={rimOpacity}
      />
    ) : null}
    {/* 帆 */}
    <g transform={`translate(0 ${HUB_Y + 20}) rotate(${rot})`}>
      {[0, 90, 180, 270].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <Sail fill={fill} cloth={cloth} detail={detail} rim={rim} rimOpacity={rimOpacity * 0.7} />
        </g>
      ))}
      <circle r={28} fill={fill} />
    </g>
  </g>
);
