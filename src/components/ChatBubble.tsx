import React from 'react';
import { FONT_SANS } from '../theme';

/** 通用聊天气泡（不仿任何真实 App），中心点定位，宽度随文字 */
export const ChatBubble: React.FC<{
  x: number;
  y: number;
  text: string;
  fill: string;
  color?: string;
  size?: number;
  side?: 'left' | 'right';
  scale?: number;
  opacity?: number;
}> = ({ x, y, text, fill, color = '#FFFFFF', size = 84, side = 'left', scale = 1, opacity = 1 }) => {
  const w = Math.max(size * 1.9, text.length * size + size * 1.3);
  const h = size * 1.9;
  const tail =
    side === 'left'
      ? `M ${-w / 2 + 34} ${h / 2 - 22} Q ${-w / 2 - 6} ${h / 2 + 18} ${-w / 2 - 22} ${h / 2 + 22} Q ${-w / 2 + 22} ${h / 2 + 6} ${-w / 2 + 64} ${h / 2 - 6} Z`
      : `M ${w / 2 - 34} ${h / 2 - 22} Q ${w / 2 + 6} ${h / 2 + 18} ${w / 2 + 22} ${h / 2 + 22} Q ${w / 2 - 22} ${h / 2 + 6} ${w / 2 - 64} ${h / 2 - 6} Z`;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <rect x={-w / 2 + 6} y={-h / 2 + 14} width={w} height={h} rx={h / 2} fill="#000" opacity={0.22} />
      <path d={tail} fill={fill} />
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={fill} />
      <text
        x={0}
        y={size * 0.36}
        textAnchor="middle"
        fontFamily={FONT_SANS}
        fontWeight={500}
        fontSize={size}
        fill={color}
      >
        {text}
      </text>
    </g>
  );
};

export const bubbleWidth = (text: string, size = 84) => Math.max(size * 1.9, text.length * size + size * 1.3);
