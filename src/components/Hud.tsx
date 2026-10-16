import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { COOL, CUES, cueAt, WHITE } from '../data/script';
import { clamp } from '../lib/anim';
import { FONT_FAMILY } from './Subtitle';

/**
 * 左上角的标注：「锯子移动距离 0 cm」计数器 + 步骤编号。
 * 只在左上角（x 120–520），离右上角水印和右侧禁字区都很远。
 */
export const Hud: React.FC<{ until?: number }> = ({ until }) => {
  const frame = useCurrentFrame();
  const c = cueAt(frame);
  if (!c) return null;
  const idx = CUES.indexOf(c);
  const prev = CUES[idx - 1];
  const next = CUES[idx + 1];
  const end = Math.min(c.end, until ?? c.end);

  // 计数器：上一屏也显示就不再淡入，下一屏也显示就不淡出
  const counterOn = c.counter !== null;
  const cIn = prev && prev.counter !== null ? 1 : clamp((frame - c.start - 4) / 10);
  const cOut = next && next.counter !== null && end === c.end ? 1 : clamp((end - frame) / 8);
  const flashT = c.counter === 'flash' ? frame - c.start - 6 : -1;
  const flash = flashT >= 0 ? Math.max(0, 1 - flashT / 34) : 0;
  const numColor = flash > 0.02 ? COOL : WHITE;

  // 步骤编号
  const stepOn = c.step !== null;
  const stepChanged = !prev || prev.step !== c.step;
  const sIn = stepChanged ? clamp((frame - c.start) / 8) : 1;
  const sOut = next && next.step !== null && end === c.end ? 1 : clamp((end - frame) / 8);
  const pop = stepChanged ? 1 + Math.exp(-Math.max(0, frame - c.start) / 6) * 0.35 : 1;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', fontFamily: FONT_FAMILY }}>
      {counterOn && (
        <div data-hud="counter" style={{ position: 'absolute', left: 120, top: 70, opacity: Math.min(cIn, cOut), textShadow: '0 2px 6px rgba(0,0,0,0.8)' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: WHITE, opacity: 0.62, letterSpacing: 3 }}>锯子移动距离</div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              color: numColor,
              opacity: flash > 0.02 ? 1 : 0.8,
              transform: `scale(${1 + flash * 0.25})`,
              transformOrigin: 'left center',
              letterSpacing: 1,
            }}
          >
            0 cm
          </div>
        </div>
      )}
      {stepOn && (
        <div
          data-hud="step"
          style={{
            position: 'absolute',
            left: 120,
            top: 200,
            width: 64,
            height: 64,
            borderRadius: 32,
            border: `3px solid ${WHITE}`,
            color: WHITE,
            fontSize: 36,
            fontWeight: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: Math.min(sIn, sOut) * 0.9,
            transform: `scale(${pop})`,
            boxShadow: '0 2px 10px rgba(0,0,0,0.6)',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          {c.step}
        </div>
      )}
    </AbsoluteFill>
  );
};
