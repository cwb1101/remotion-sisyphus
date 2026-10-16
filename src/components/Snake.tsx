import React from 'react';
import { PALETTE } from '../theme';
import { WARM } from '../data/script';
import { mix, rgba, rnd } from '../lib/anim';
import { Seg } from '../lib/snake';

export type SnakeProps = {
  id: string;
  segs: Seg[];
  /** 只画绕到锯条下面（under）或上面（over）的节段 */
  layer?: 'all' | 'under' | 'over';
  /** 身体变暖（愤怒）0..1 */
  warmth?: number;
  /** 暗下去、失去生气 0..1 */
  dim?: number;
  /** 暖色裂纹 0..1 */
  crack?: number;
  /** 伤口：节段序号、亮度 */
  wound?: { index: number; amount: number } | null;
  /** 头部暖光 0..1 */
  headGlow?: number;
  headScale?: number;
  /** 每节的显隐（溶解成粒子时用） */
  segOpacity?: (i: number) => number;
  opacity?: number;
  shadow?: boolean;
};

const deg = (a: Seg, b: Seg) => (Math.atan2(a.y - b.y, a.x - b.x) * 180) / Math.PI;

/**
 * 蛇：一条从头到尾逐渐变细的连续身体（逐段圆头粗线），上面叠一层淡淡的鳞纹，
 * 头部是略宽的椭圆，不画眼睛。缠绕时按 z 分成锯条下 / 锯条上两层。
 */
export const Snake: React.FC<SnakeProps> = ({
  id,
  segs,
  layer = 'all',
  warmth = 0,
  dim = 0,
  crack = 0,
  wound = null,
  headGlow = 0,
  headScale = 1,
  segOpacity,
  opacity = 1,
  shadow = true,
}) => {
  const bodyBase = mix(PALETTE.snake, PALETTE.snakeDead, dim);
  const body = mix(bodyBase, '#A8432F', warmth * 0.85);
  const back = mix(body, '#0E1410', 0.28); // 背脊深色带
  const belly = mix(mix(PALETTE.snakeBelly, PALETTE.snakeDead, dim), '#B4553D', warmth * 0.7);
  const edge = mix(PALETTE.snakeEdge, '#3A1712', warmth * 0.6);
  const underFill = mix(body, '#0B0F0D', 0.5);

  const pick = (s: Seg) => (layer === 'all' ? true : layer === 'under' ? s.z < 0 : s.z >= 0);
  const op = (i: number) => (segOpacity ? segOpacity(i) : 1);
  const n = segs.length;
  const idx = Array.from({ length: n - 1 }, (_, k) => n - 2 - k); // 尾 → 头
  const scaleAt = (i: number) => (i === 0 ? headScale : i < 3 ? 1 + (headScale - 1) * (1 - i / 3) : 1);

  const bone = (i: number, width: number, color: string, key: string, extra?: React.SVGProps<SVGLineElement>) => (
    <line key={key} x1={segs[i].x} y1={segs[i].y} x2={segs[i + 1].x} y2={segs[i + 1].y} stroke={color} strokeWidth={width} strokeLinecap="round" opacity={op(i)} {...extra} />
  );

  const headPass = (outline: boolean) => {
    const h = segs[0];
    if (!pick(h) || op(0) <= 0.01) return null;
    const a = deg(h, segs[1]);
    const r = h.r * headScale;
    return (
      <g transform={`translate(${h.x} ${h.y}) rotate(${a})`} opacity={op(0)}>
        {outline && headGlow > 0.01 && <ellipse cx={r * 0.5} rx={r * 1.9} ry={r * 1.4} fill={WARM} opacity={headGlow * 0.5} filter={`url(#${id}-glow)`} />}
        <path
          d={`M${-r * 0.9} ${-r * 0.82} C${r * 0.4} ${-r * 1.15} ${r * 1.55} ${-r * 0.65} ${r * 1.6} 0 C${r * 1.55} ${r * 0.65} ${r * 0.4} ${r * 1.15} ${-r * 0.9} ${r * 0.82} Z`}
          fill={h.z < 0 ? underFill : body}
          stroke={outline ? edge : 'none'}
          strokeWidth={outline ? 5 : 0}
        />
        {!outline && <path d={`M${-r * 0.2} 0 L${r * 1.1} 0`} stroke={back} strokeWidth={r * 0.5} strokeLinecap="round" strokeOpacity={0.5} />}
      </g>
    );
  };

  return (
    <g opacity={opacity}>
      <defs>
        <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation={5} />
        </filter>
      </defs>
      {shadow && layer !== 'under' && (
        <g transform="translate(6 10)">
          {idx.map((i) => (pick(segs[i]) ? bone(i, (segs[i].r + segs[i + 1].r) * 1.05 * scaleAt(i), 'rgba(0,0,0,0.33)', `sh${i}`) : null))}
        </g>
      )}
      {headPass(true)}
      {/* 描边 → 身体 → 背脊带 → 腹部高光 */}
      {idx.map((i) => (pick(segs[i]) ? bone(i, (segs[i].r + segs[i + 1].r) * scaleAt(i) + 3, edge, `e${i}`) : null))}
      {idx.map((i) => (pick(segs[i]) ? bone(i, (segs[i].r + segs[i + 1].r) * scaleAt(i), segs[i].z < 0 ? underFill : body, `b${i}`) : null))}
      {idx.map((i) => (pick(segs[i]) && segs[i].z >= 0 ? bone(i, (segs[i].r + segs[i + 1].r) * 0.42 * scaleAt(i), back, `k${i}`, { strokeOpacity: 0.55 }) : null))}
      {idx.map((i) =>
        pick(segs[i]) && segs[i].z >= 0 ? (
          <line
            key={`h${i}`}
            x1={segs[i].x}
            y1={segs[i].y - segs[i].r * 0.45}
            x2={segs[i + 1].x}
            y2={segs[i + 1].y - segs[i + 1].r * 0.45}
            stroke={rgba('#FFFFFF', 0.06 + 0.05 * (1 - dim))}
            strokeWidth={segs[i].r * 0.35}
            strokeLinecap="round"
            opacity={op(i)}
          />
        ) : null,
      )}
      {/* 鳞纹：每节一个淡淡的菱形 */}
      {idx.map((i) => {
        const s = segs[i];
        if (!pick(s) || s.z < 0 || i === 0) return null;
        const a = deg(segs[Math.max(0, i - 1)], segs[i + 1]);
        const r = s.r * scaleAt(i);
        return (
          <path
            key={`sc${i}`}
            d={`M${-r * 0.55} 0 L0 ${-r * 0.42} L${r * 0.55} 0 L0 ${r * 0.42} Z`}
            transform={`translate(${s.x} ${s.y}) rotate(${a})`}
            fill={belly}
            opacity={0.32 * op(i)}
          />
        );
      })}
      {/* 裂纹（愤怒、受伤） */}
      {crack > 0 &&
        idx.map((i) => {
          const s = segs[i];
          if (!pick(s) || i === 0 || rnd(`${id}c${i}`) >= crack) return null;
          const a = deg(segs[Math.max(0, i - 1)], segs[i + 1]);
          const r = s.r;
          return (
            <polyline
              key={`c${i}`}
              points={`${-r * 0.7},${-r * 0.35} ${-r * 0.2},${r * 0.2} ${r * 0.15},${-r * 0.25} ${r * 0.65},${r * 0.3}`}
              transform={`translate(${s.x} ${s.y}) rotate(${a})`}
              fill="none"
              stroke={WARM}
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={Math.min(1, crack * 1.4) * (1 - dim * 0.6) * op(i)}
            />
          );
        })}
      {/* 伤口 */}
      {wound && wound.amount > 0.01 && pick(segs[wound.index]) && (() => {
        const s = segs[wound.index];
        const a = deg(segs[wound.index - 1], segs[wound.index + 1]);
        return (
          <g transform={`translate(${s.x} ${s.y}) rotate(${a - 18})`} opacity={op(wound.index)}>
            <ellipse rx={s.r * 0.75} ry={3.4} fill={WARM} opacity={wound.amount * 0.7} filter={`url(#${id}-glow)`} />
            <ellipse rx={s.r * 0.6} ry={1.5} fill="#FFD2C4" opacity={wound.amount} />
          </g>
        );
      })()}
      {/* 头：先在身体下面画带描边的头，再在上面盖一层不描边的，脖子处就没有接缝 */}
      {headPass(false)}
    </g>
  );
};
