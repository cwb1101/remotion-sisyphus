import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { CUES, Cue } from '../data/script';
import { clamp, ease, rgba } from '../lib/anim';
import { FONT_FAMILY } from './Subtitle';

// 大字区：画面中部偏左，右边界 1100 < 1560（禁字区），下边界 630 远离底部字幕
export const BIG = { left: 240, top: 300, width: 860, height: 330, font: 210 };

export const slamFrame = (c: Cue) => c.start + (c.beats.slam ?? 4);

/** 当前帧处在哪个“大字”屏里。 */
export const activeBig = (frame: number) => CUES.find((c) => c.big && frame >= c.start && frame < c.end);

/** 关键词大字：从屏幕外放大砸进来，落地时轻微回弹，结束前淡出。 */
export const BigWord: React.FC<{ until?: number }> = ({ until }) => {
  const frame = useCurrentFrame();
  const c = activeBig(frame);
  if (!c || !c.big) return null;
  const t0 = slamFrame(c);
  const end = Math.min(c.end, until ?? c.end);
  const p = clamp((frame - t0) / 7);
  const settle = frame - t0 - 7;
  const bounce = settle > 0 ? Math.exp(-settle / 5) * Math.sin(settle * 0.9) * 0.05 : 0;
  // 起始放大倍数按字宽封顶：放大时右边缘也不能越过 x=1530（禁字区从 1560 开始）
  const half = ([...c.big.word].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.58 : 1.04), 0) * BIG.font) / 2;
  const cx = BIG.left + BIG.width / 2;
  const s0 = Math.min(2.0, (1530 - cx) / half);
  const scale = frame < t0 ? 0 : s0 - (s0 - 1) * ease.out(p) + bounce;
  const drop = (1 - ease.out(p)) * -180;
  const out = clamp((end - frame) / 8);
  const o = clamp((frame - t0) / 3) * out;
  const glow = Math.exp(-Math.max(0, frame - t0) / 12);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* 大字后面压一层柔和暗影，让大字从复杂画面里跳出来 */}
      <div
        style={{
          position: 'absolute',
          left: BIG.left - 120,
          top: BIG.top - 80,
          width: BIG.width + 240,
          height: BIG.height + 160,
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 55%, rgba(0,0,0,0) 100%)',
          opacity: o,
        }}
      />
      <div
        data-bigword={c.id}
        style={{
          position: 'absolute',
          left: BIG.left,
          top: BIG.top,
          width: BIG.width,
          height: BIG.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: FONT_FAMILY,
          fontWeight: 900,
          fontSize: BIG.font,
          letterSpacing: 6,
          color: c.big.color,
          opacity: o,
          transform: `translateY(${drop}px) scale(${scale * (1 + (1 - out) * 0.04)}) rotate(${(1 - ease.out(p)) * -4}deg)`,
          textShadow: `0 6px 18px rgba(0,0,0,0.85), 0 0 ${24 + glow * 30}px ${rgba(c.big.color, 0.3 + glow * 0.4)}`,
          whiteSpace: 'nowrap',
        }}
      >
        {c.big.word}
      </div>
    </AbsoluteFill>
  );
};

/** 大字落地时的全屏冲击：冲击波环 + 色光闪。 */
export const Impact: React.FC = () => {
  const frame = useCurrentFrame();
  const c = activeBig(frame);
  if (!c || !c.big) return null;
  const t = frame - slamFrame(c);
  if (t < 0 || t > 40) return null;
  const color = c.big.color;
  const ox = BIG.left + BIG.width / 2;
  const oy = BIG.top + BIG.height / 2;
  const ring = (delay: number, speed: number, width: number) => {
    const tt = t - delay;
    if (tt < 0) return null;
    const r = tt * speed;
    const a = Math.max(0, 1 - tt / 26);
    return <circle cx={ox} cy={oy} r={r} fill="none" stroke={rgba(color, 0.55 * a)} strokeWidth={width * a + 1} />;
  };
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <AbsoluteFill style={{ background: `radial-gradient(circle at ${ox}px ${oy}px, ${rgba(color, 0.32 * Math.exp(-t / 6))} 0%, rgba(0,0,0,0) 70%)` }} />
      <svg width={1920} height={1080} style={{ position: 'absolute' }}>
        {ring(0, 72, 26)}
        {ring(4, 56, 14)}
        {ring(9, 40, 8)}
      </svg>
    </AbsoluteFill>
  );
};
