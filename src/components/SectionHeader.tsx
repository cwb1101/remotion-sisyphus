import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {C, easeOut, FONT_LATIN, FONT_SANS, GRID} from '../theme';
import {SECTIONS} from '../lib/timeline';

/** 杂志式页眉：左上角 “节号 — 节名  ENGLISH” + 1px 细线，每节开头停约 3 秒 */
export const SectionHeaders: React.FC<{frame: number}> = ({frame}) => {
  const s = SECTIONS.find((x) => frame >= x.from + 10 && frame < x.from + 110);
  if (!s) return null;
  const local = frame - (s.from + 10);
  const o = Math.min(
    interpolate(local, [0, 24], [0, 1], {extrapolateRight: 'clamp', easing: easeOut}),
    interpolate(local, [80, 100], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: GRID.marginX, top: 84, color: C.dark}}>
        <div style={{display: 'flex', alignItems: 'baseline', gap: 18}}>
          <span style={{fontFamily: FONT_SANS, fontWeight: 300, fontSize: 22, letterSpacing: '0.12em'}}>
            {s.id} — {s.name}
          </span>
          <span style={{fontFamily: FONT_LATIN, fontWeight: 300, fontSize: 20, letterSpacing: '0.2em', opacity: 0.6}}>
            {s.en}
          </span>
        </div>
        <div style={{width: 120, height: 1, background: C.dark, opacity: 0.55, marginTop: 12}} />
      </div>
    </AbsoluteFill>
  );
};
