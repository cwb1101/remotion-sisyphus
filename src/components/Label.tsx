// 附着标签：跟着物件走（镜头层里），一根细引线 + 小字。
// 位置会被挤出水印区和底部安全区。
import React from 'react';
import { C, FONT_SANS, SAFE_BOTTOM, WATERMARK_ZONE } from '../film/theme';

interface LabelProps {
  /** 被标注的点 */
  x: number;
  y: number;
  text: string;
  /** 文字相对被标注点的偏移 */
  dx?: number;
  dy?: number;
  opacity: number;
  size?: number;
  align?: 'left' | 'right';
}

const EST_CHAR = 0.62;

export const Label: React.FC<LabelProps> = ({ x, y, text, dx = 60, dy = -60, opacity, size = 30, align = 'left' }) => {
  if (opacity <= 0.001) return null;
  const width = Array.from(text).reduce((w, ch) => w + (/[一-鿿《》·，]/.test(ch) ? 1 : EST_CHAR), 0) * size * 1.08;
  let tx = x + dx;
  let ty = y + dy;
  const left = align === 'left' ? tx : tx - width;
  // 不进水印区
  if (left + width > WATERMARK_ZONE.x && ty - size < WATERMARK_ZONE.y + WATERMARK_ZONE.h) {
    ty = WATERMARK_ZONE.y + WATERMARK_ZONE.h + size + 10;
  }
  // 不进底部 10%
  ty = Math.min(ty, SAFE_BOTTOM - 16);
  const lineEndX = align === 'left' ? tx - 10 : tx + 10;
  return (
    <g opacity={opacity}>
      <line x1={x} y1={y} x2={lineEndX} y2={ty - size * 0.35} stroke={C.ivory} strokeWidth={1} strokeOpacity={0.55} />
      <circle cx={x} cy={y} r={3} fill={C.gold} />
      <text
        x={tx}
        y={ty}
        textAnchor={align === 'left' ? 'start' : 'end'}
        fontFamily={FONT_SANS}
        fontSize={size}
        letterSpacing="0.06em"
        fill={C.ivory}
        fillOpacity={0.82}
      >
        {text}
      </text>
    </g>
  );
};
