// 附着标签：跟着物件走（镜头层里），一根细引线 + 小字。
// 位置会被挤出水印区和底部安全区。
import React from 'react';
import { C, FONT_SANS, H, SAFE_BOTTOM, SUB, W, WATERMARK_ZONE } from '../film/theme';

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
  /** 避开主字幕带（预览段定稿的标签关掉，保持原样） */
  avoidSubtitle?: boolean;
}

const EST_CHAR = 0.62;

export const Label: React.FC<LabelProps> = ({ x, y, text, dx = 60, dy = -60, opacity, size = 30, align = 'left', avoidSubtitle = true }) => {
  if (opacity <= 0.001) return null;
  // 被标注的点跑出画面时，标签也不挂在画面边上
  if (x < -20 || x > W + 20 || y < -20 || y > H + 20) return null;
  const width = Array.from(text).reduce((w, ch) => w + (/[一-鿿《》·，]/.test(ch) ? 1 : EST_CHAR), 0) * size * 1.08;
  let tx = x + dx;
  let ty = y + dy;
  // 不出画面左右边
  if (align === 'left' && tx + width > W - 30) tx = W - 30 - width;
  if (align === 'right' && tx - width < 30) tx = 30 + width;
  const left2 = align === 'left' ? tx : tx - width;
  // 不压主字幕：落进字幕带就挪到字幕带上方或下方（离原位置近的一边）
  const subTop = SUB.y - SUB.size * 0.75;
  const subBottom = SUB.y + SUB.size * 0.75;
  const subLeft = (W - SUB.maxWidth) / 2;
  if (avoidSubtitle && ty > subTop && ty - size < subBottom && left2 < subLeft + SUB.maxWidth && left2 + width > subLeft) {
    ty = ty - subTop < subBottom + size - ty ? subTop - 8 : subBottom + size + 8;
  }
  // 不进水印区
  if (left2 + width > WATERMARK_ZONE.x && ty - size < WATERMARK_ZONE.y + WATERMARK_ZONE.h) {
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

/** 注释：屏幕空间、水平居中的一行小字（出处、署名），层级最低 */
export const Note: React.FC<{ y: number; text: string; opacity: number; size?: number; x?: number }> = ({
  y,
  text,
  opacity,
  size = 26,
  x = 960,
}) => {
  if (opacity <= 0.001) return null;
  return (
    <text
      x={x}
      y={Math.min(y, SAFE_BOTTOM - 16)}
      textAnchor="middle"
      fontFamily={FONT_SANS}
      fontSize={size}
      letterSpacing="0.06em"
      fill={C.ivory}
      fillOpacity={0.62 * opacity}
      style={{ paintOrder: 'stroke', stroke: 'rgba(8,6,4,0.7)', strokeWidth: 4 }}
    >
      {text}
    </text>
  );
};
