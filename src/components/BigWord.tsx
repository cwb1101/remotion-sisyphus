import React from 'react';
import { useCurrentFrame } from 'remotion';
import { rules, type Screen } from '../data/script';
import { FONT } from '../theme';
import { clamp, ease, prog } from '../lib/anim';

/** 砸字落地的那一帧 = 该屏第一个音效的时间点，画面和声音从同一处取。 */
export const impactFrame = (s: Screen) => s.startFrame + (s.sfx[0]?.atFrame ?? 0);

const Z = rules.bigWordZone;

export const assertBigWordZone = (s: Screen) => {
  const b = s.bigWord!;
  if (b.x < Z.minX || b.x + b.w > Z.maxX || b.y < Z.minY || b.y + b.h > Z.maxY) {
    throw new Error(`screen ${s.id} bigWord box out of zone: ${JSON.stringify(b)}`);
  }
};

/** 大字开始下落的帧：不早于本屏开始，最多提前 8 帧 */
export const appearFrame = (s: Screen) => Math.max(s.startFrame, impactFrame(s) - 8);

/**
 * 砸下来的大字（屏幕坐标）。
 * dimAt：下一个大字所在屏开始前 2 帧，这个字变成 25% 白色描边，不再算高亮（保证每屏高亮 ≤ 2）。
 * outAt：所在小节结束前淡出。
 * scripts/check-script.mjs 用同样的规则逐帧数高亮。
 */
export const BigWord: React.FC<{ s: Screen; dimAt: number | null; outAt: number }> = ({ s, dimAt, outAt }) => {
  const frame = useCurrentFrame();
  assertBigWordZone(s);
  const b = s.bigWord!;
  const hit = impactFrame(s);
  const start = appearFrame(s);
  if (frame < start || frame > outAt + 12) return null;
  const fall = prog(frame, start, hit, ease.in);
  const settle = clamp((frame - hit) / 10);
  const squash = frame >= hit ? Math.sin(settle * Math.PI) * 0.24 * (1 - settle) : 0;
  const scale = 1.9 - 0.9 * fall;
  const dy = (1 - fall) * -140;
  const dimmed = dimAt !== null && frame >= dimAt;
  const out = prog(frame, outAt, outAt + 12);
  const fontSize = Math.min(b.h * 0.9, (b.w / b.text.length) * 0.95);
  return (
    <div
      style={{
        position: 'absolute',
        left: b.x,
        top: b.y,
        width: b.w,
        height: b.h,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        letterSpacing: fontSize * 0.04,
        color: dimmed ? 'transparent' : b.color,
        WebkitTextStroke: dimmed ? '3px rgba(255,255,255,0.25)' : undefined,
        opacity: Math.min(1, fall * 1.5) * (1 - out),
        transform: `translateY(${dy}px) scale(${scale * (1 + squash)}, ${scale * (1 - squash)})`,
        transformOrigin: '50% 100%',
        textShadow: dimmed ? undefined : `0 0 36px ${b.color}66, 0 6px 18px rgba(0,0,0,0.55)`,
        whiteSpace: 'nowrap',
      }}
    >
      {b.text}
    </div>
  );
};
