import React from 'react';
import { mix } from '../theme';

/**
 * 贯穿全片的物件：小红球 = 你的情绪。
 * 各节通过参数让它长大、变暗、被压扁、发光、旋转（滚动），以后还会被盖章、变蓝。
 */
export type BallProps = {
  uid: string;
  x: number;
  y: number;
  r: number;
  /** 外发光 0–1 */
  glow?: number;
  /** 变暗程度 0–1（被冷落的累积） */
  dim?: number;
  /** 压扁：>1 横向拉宽、纵向压扁（撞击） */
  squash?: number;
  /** 滚动角度（度） */
  spin?: number;
  /** 基色，默认红；后面的章节会把它冷却成蓝 */
  hue?: 'red' | 'blue';
  opacity?: number;
};

const PALETTE = {
  red: { hi: '#FF9A7A', mid: '#FC593F', lo: '#B8352A', halo: '#FC593F', dimTo: '#6B3936' },
  blue: { hi: '#B9D4F5', mid: '#7C93B5', lo: '#4A5F80', halo: '#8FB4E8', dimTo: '#3A4256' },
};

export const EmotionBall: React.FC<BallProps> = ({
  uid,
  x,
  y,
  r,
  glow = 0.6,
  dim = 0,
  squash = 1,
  spin = 0,
  hue = 'red',
  opacity = 1,
}) => {
  const p = PALETTE[hue];
  const hi = mix(p.hi, p.dimTo, dim * 0.8);
  const mid = mix(p.mid, p.dimTo, dim);
  const lo = mix(p.lo, '#2A1E22', dim * 0.7);
  const g = glow * (1 - dim * 0.75);
  const sx = squash;
  const sy = 1 / squash;
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <defs>
        <radialGradient id={`${uid}-halo`}>
          <stop offset="0%" stopColor={p.halo} stopOpacity={0.55 * g} />
          <stop offset="45%" stopColor={p.halo} stopOpacity={0.18 * g} />
          <stop offset="100%" stopColor={p.halo} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${uid}-body`} cx="38%" cy="34%" r="70%">
          <stop offset="0%" stopColor={hi} />
          <stop offset="55%" stopColor={mid} />
          <stop offset="100%" stopColor={lo} />
        </radialGradient>
        <radialGradient id={`${uid}-core`}>
          <stop offset="0%" stopColor="#FFF4E0" stopOpacity={0.55 * g} />
          <stop offset="100%" stopColor="#FFF4E0" stopOpacity={0} />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>
          <circle r={r} />
        </clipPath>
      </defs>
      {g > 0.01 ? <circle r={r * 2.6} fill={`url(#${uid}-halo)`} /> : null}
      {/* 地面接触阴影由场景自己画；这里只画球体 */}
      <g transform={`scale(${sx} ${sy})`}>
        <circle r={r} fill={`url(#${uid}-body)`} />
        <circle r={r * 0.62} cx={-r * 0.08} cy={-r * 0.06} fill={`url(#${uid}-core)`} />
        <g clipPath={`url(#${uid}-clip)`} transform={`rotate(${spin})`}>
          {/* 一条淡淡的弧带，转起来才看得出在滚 */}
          <path
            d={`M ${-r * 1.1} ${-r * 0.15} Q 0 ${r * 0.55} ${r * 1.1} ${-r * 0.15}`}
            stroke="#FFFFFF"
            strokeOpacity={0.16}
            strokeWidth={r * 0.09}
            fill="none"
          />
          <path
            d={`M ${-r * 1.1} ${r * 0.45} Q 0 ${r * 1.05} ${r * 1.1} ${r * 0.45}`}
            stroke="#000000"
            strokeOpacity={0.08}
            strokeWidth={r * 0.07}
            fill="none"
          />
        </g>
        <ellipse
          cx={-r * 0.36}
          cy={-r * 0.42}
          rx={r * 0.27}
          ry={r * 0.15}
          transform={`rotate(-32 ${-r * 0.36} ${-r * 0.42})`}
          fill="#FFFFFF"
          opacity={0.5 * (1 - dim * 0.6)}
        />
        <circle r={r} fill="none" stroke={hi} strokeOpacity={0.25} strokeWidth={Math.max(1, r * 0.03)} />
      </g>
    </g>
  );
};
