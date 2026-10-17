import React from 'react';
import { random } from 'remotion';
import type { QuestionShape as Q } from '../sections/rigs';

const STROKE = '#C9D3FF';
const K = 1.5; // 图形整体放大倍数

/** 图形上的采样点（局部坐标），碎成微粒时从这些点出发 */
const samples = (kind: Q['kind']) => {
  const pts: [number, number][] = [];
  if (kind === 'orbit') {
    for (let i = 0; i < 36; i++) pts.push([Math.cos((i / 36) * Math.PI * 2) * 70, Math.sin((i / 36) * Math.PI * 2) * 70]);
  } else if (kind === 'stairs') {
    for (let k = 0; k < 4; k++) for (let i = 0; i < 9; i++) pts.push([-80 + k * 40 + (i < 5 ? i * 8 : 40), 60 - k * 34 - (i < 5 ? 0 : (i - 4) * 7)]);
  } else {
    for (let i = 0; i < 12; i++) pts.push([-80 + i * 14.5, -40]);
    for (let i = 0; i < 8; i++) pts.push([0, -40 + i * 13]);
    for (let i = 0; i < 8; i++) pts.push([-80 + Math.cos(Math.PI * (i / 7)) * 26, 10 + Math.sin(Math.PI * (i / 7)) * 14]);
    for (let i = 0; i < 8; i++) pts.push([80 + Math.cos(Math.PI * (i / 7)) * 26, 10 + Math.sin(Math.PI * (i / 7)) * 14]);
  }
  return pts;
};

export const QuestionShape: React.FC<{ q: Q; frame: number; seed: string }> = ({ q, frame, seed }) => {
  if (q.draw <= 0 || q.fly >= 1) return null;
  const o = 1 - q.fade;
  const dash = 900;
  const common = {
    fill: 'none',
    stroke: STROKE,
    strokeWidth: 3,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeDasharray: dash,
    strokeDashoffset: dash * (1 - q.draw),
  };
  let shape: React.ReactNode = null;
  if (q.kind === 'orbit') {
    const a = frame / 14;
    shape = (
      <g>
        <circle r={70} {...common} />
        <circle r={9} fill={STROKE} opacity={q.draw} />
        <circle cx={Math.cos(a) * 70} cy={Math.sin(a) * 70} r={7} fill={STROKE} opacity={q.draw} />
      </g>
    );
  } else if (q.kind === 'stairs') {
    const climb = (frame / 22) % 4;
    const k = Math.floor(climb);
    shape = (
      <g>
        <polyline points="-80,60 -40,60 -40,26 0,26 0,-8 40,-8 40,-42 80,-42" {...common} />
        <circle cx={-60 + k * 40} cy={48 - k * 34 - Math.abs(Math.sin((climb - k) * Math.PI)) * 14} r={7} fill={STROKE} opacity={q.draw} />
      </g>
    );
  } else {
    const tilt = Math.sin(frame / 16) * 9;
    shape = (
      <g>
        <line x1={0} y1={-40} x2={0} y2={64} {...common} />
        <line x1={-26} y1={64} x2={26} y2={64} {...common} />
        <g transform={`rotate(${tilt} 0 -40)`}>
          <line x1={-84} y1={-40} x2={84} y2={-40} {...common} />
          <path d="M -84 -40 L -104 10 M -84 -40 L -64 10 M -108 10 A 24 12 0 0 0 -60 10" {...common} />
          <path d="M 84 -40 L 64 10 M 84 -40 L 104 10 M 60 10 A 24 12 0 0 0 108 10" {...common} />
        </g>
      </g>
    );
  }
  const pts = samples(q.kind);
  return (
    <g>
      <g transform={`translate(${q.x} ${q.y}) scale(${K})`} opacity={o * 0.85}>
        {shape}
      </g>
      {q.fly > 0
        ? pts.map(([px, py], i) => {
            const d = Math.min(1, Math.max(0, (q.fly - random(`${seed}${i}`) * 0.3) / 0.7));
            const sx = q.x + px * K;
            const sy = q.y + py * K;
            const bend = (random(`${seed}b${i}`) - 0.5) * 160;
            const x = sx + (q.target.x - sx) * d;
            const y = sy + (q.target.y - sy) * d - Math.sin(d * Math.PI) * (60 + bend);
            return <circle key={i} cx={x} cy={y} r={2.6} fill="#FFD7A8" opacity={0.9 * (1 - d * 0.7)} />;
          })
        : null}
    </g>
  );
};
