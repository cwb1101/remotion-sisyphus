import React from 'react';
import { Balloon } from '../components/Balloon';
import { Figure, figureJoints } from '../components/Figure';
import { walkerLanternR, walkerProps } from './story';

/** 先走路的人 + 他手腕上那颗小灯（色①，和少年的气球是同一种东西，只是小而稳） */
export const WalkerActor: React.FC<{ f: number; id: string; opacity?: number; beam?: number }> = ({ f, id, opacity = 1, beam = 0 }) => {
  const w = walkerProps(f);
  const hand = figureJoints(w).nearHand;
  const r = walkerLanternR(f);
  const sway = Math.sin(f / 15) * 3;
  const lantern = { cx: hand.x + 4 + sway * 0.4, cy: hand.y - 12 - r, r };
  return (
    <g opacity={opacity}>
      {beam > 0 ? (
        <g opacity={beam}>
          <rect x={lantern.cx - 16} y={lantern.cy} width={32} height={760 - lantern.cy} fill="#FFD7A8" opacity={0.1} />
          <line x1={lantern.cx} y1={lantern.cy + r} x2={lantern.cx} y2={768} stroke="#F4E3CF" strokeWidth={2.5} strokeOpacity={0.85} />
        </g>
      ) : null}
      <Figure {...w} />
      <Balloon id={id} cx={lantern.cx} cy={lantern.cy} r={r} rings={r > 16 ? 1 : 0} glow={0.9} anchor={hand} sway={sway} />
    </g>
  );
};
