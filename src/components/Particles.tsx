import React from 'react';
import { random } from 'remotion';

/** 缓慢漂浮的环境微粒（星尘），确定性随机，逐帧可复现。 */
export const Drift: React.FC<{
  seed: string;
  count: number;
  frame: number;
  w?: number;
  h?: number;
  color: string;
  maxOpacity?: number;
  speed?: number;
}> = ({ seed, count, frame, w = 1920, h = 1080, color, maxOpacity = 0.5, speed = 0.25 }) => (
  <g>
    {Array.from({ length: count }, (_, i) => {
      const x0 = random(`${seed}x${i}`) * w;
      const y0 = random(`${seed}y${i}`) * h;
      const r = 0.8 + random(`${seed}r${i}`) * 2.2;
      const ph = random(`${seed}p${i}`) * Math.PI * 2;
      const x = (x0 + frame * speed * (0.4 + random(`${seed}v${i}`))) % w;
      const y = y0 + Math.sin(frame / 40 + ph) * 6;
      const o = maxOpacity * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame / 25 + ph)));
      return <circle key={i} cx={x} cy={y} r={r} fill={color} opacity={o} />;
    })}
  </g>
);

/** 从四周向一个点聚拢的微粒（第 7 屏：念头被吸进气球）。 */
export const Converge: React.FC<{
  seed: string;
  count: number;
  t: number; // 0..1
  tx: number;
  ty: number;
  spread: number;
  color: string;
}> = ({ seed, count, t, tx, ty, spread, color }) => (
  <g>
    {Array.from({ length: count }, (_, i) => {
      const a = random(`${seed}a${i}`) * Math.PI * 2;
      const d = spread * (0.45 + 0.55 * random(`${seed}d${i}`));
      const delay = random(`${seed}t${i}`) * 0.5;
      const k = Math.min(1, Math.max(0, (t - delay) / 0.5));
      const e = k * k * (3 - 2 * k);
      const x = tx + Math.cos(a) * d * (1 - e);
      const y = ty + Math.sin(a) * d * (1 - e);
      const o = k <= 0 ? 0.25 : k >= 1 ? 0 : 0.85 * (1 - e * 0.6);
      return <circle key={i} cx={x} cy={y} r={2 + random(`${seed}r${i}`) * 2} fill={color} opacity={o} />;
    })}
  </g>
);
