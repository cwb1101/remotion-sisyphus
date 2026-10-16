import React from 'react';
import { rgba, v } from '../lib/anim';
import { WARM } from '../data/script';

/** 三段首尾相追的弧形箭头（“越深越疼，越疼越用力”的循环）。ang 为整体转角（度）。 */
export const LoopArrows: React.FC<{ cx: number; cy: number; rx: number; ry: number; ang: number; opacity: number; width?: number }> = ({
  cx,
  cy,
  rx,
  ry,
  ang,
  opacity,
  width = 7,
}) => (
  <g transform={`translate(${cx} ${cy})`} opacity={opacity}>
    {[0, 120, 240].map((a0) => {
      const a = ((a0 + ang) * Math.PI) / 180;
      const span = 0.95;
      const pts = Array.from({ length: 16 }, (_, k) => {
        const t = a + (k / 15) * span;
        return `${rx * Math.cos(t)},${ry * Math.sin(t)}`;
      }).join(' ');
      const te = a + span;
      const tip = v(rx * Math.cos(te), ry * Math.sin(te));
      const tan = Math.atan2(ry * Math.cos(te), -rx * Math.sin(te));
      const hw = width * 2.3;
      const head = [
        `${tip.x + Math.cos(tan) * width * 3},${tip.y + Math.sin(tan) * width * 3}`,
        `${tip.x + Math.cos(tan + Math.PI / 2) * hw},${tip.y + Math.sin(tan + Math.PI / 2) * hw}`,
        `${tip.x + Math.cos(tan - Math.PI / 2) * hw},${tip.y + Math.sin(tan - Math.PI / 2) * hw}`,
      ].join(' ');
      return (
        <g key={a0}>
          <polyline points={pts} fill="none" stroke={rgba(WARM, 0.85)} strokeWidth={width} strokeLinecap="round" />
          <polygon points={head} fill={rgba(WARM, 0.9)} />
        </g>
      );
    })}
  </g>
);
