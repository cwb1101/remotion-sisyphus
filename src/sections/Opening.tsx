import React from 'react';
import { useCurrentFrame } from 'remotion';
import { Balloon } from '../components/Balloon';
import { Figure } from '../components/Figure';
import { Footprints } from '../components/Footprints';
import { Drift } from '../components/Particles';
import { at } from '../data/script';
import { camTransform, prog } from '../lib/anim';
import { C } from '../theme';
import { OPEN_GROUND, openingRig } from './rigs';

/** 开头（屏 01–02）：少年被气球拽离地面，先走路的人从他脚下走过，留下一串脚印。 */
export const Opening: React.FC<{ opacity: number }> = ({ opacity }) => {
  const f = useCurrentFrame();
  const { cam, teen, balloon, walker, prints } = openingRig(f);
  const lineDraw = prog(f, 0, 32);
  const shadowK = Math.max(0, 1 - (teen.hover ?? 0) / 60);
  // 推近时人物和地面先退场，只留气球被推成满屏——避免浅色人物在放大后压到底部字幕后面
  const stage = 1 - prog(f, at(3) - 26, at(3) - 12);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity }}>
      <defs>
        <linearGradient id="op-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#11142A" />
          <stop offset="70%" stopColor={C.bg} />
          <stop offset="100%" stopColor="#1D2340" />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill="url(#op-sky)" />
      <Drift seed="op" count={70} frame={f} color="#9AA6D6" maxOpacity={0.45} h={760} />
      <g transform={camTransform(cam)}>
        <g opacity={stage}>
        <rect x={-2000} y={OPEN_GROUND} width={6000} height={1200} fill="#181D31" />
        <line
          x1={-400}
          y1={OPEN_GROUND}
          x2={-400 + 2800 * lineDraw}
          y2={OPEN_GROUND}
          stroke={C.groundLine}
          strokeWidth={3}
        />
        <Footprints prints={prints} frame={f} scale={1.1} />
        <ellipse cx={teen.x} cy={OPEN_GROUND + 6} rx={46 * shadowK} ry={8 * shadowK} fill="#000" opacity={0.35 * shadowK} />
        </g>
        <Balloon id="op-b" {...balloon} />
        <Figure {...teen} opacity={stage} />
        <Figure {...walker} opacity={stage} />
      </g>
    </svg>
  );
};
