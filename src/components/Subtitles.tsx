// 主字幕层（屏幕空间，不跟镜头动）。
// 普通屏：逐字由虚变实；重卡点屏：整行从放大、模糊状态砸下，正好落在 start 帧上。
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { SCREENS, type Screen } from '../data/subtitles';
import { clamp, ease } from '../film/anim';
import { C, FONT_SERIF, SUB, W } from '../film/theme';

const CHAR_IN = 7; // 每个字由虚变实用的帧数
const STAGGER = 1; // 字与字的间隔帧
const OUT = 6; // 退场帧数（在 end 之前完成）
const SLAM_PRE = 4; // 重卡点提前几帧开始砸，第 start 帧落定

/** 下一屏是重卡点时，这一屏要在它开始砸之前完全退场，避免两行叠在一起 */
const exitAt = (s: Screen) => {
  const next = SCREENS.find((x) => x.start === s.end);
  return next?.heavy ? s.end - SLAM_PRE : s.end;
};

const Line: React.FC<{ s: Screen; f: number }> = ({ s, f }) => {
  const chars = Array.from(s.text);
  const hi = s.highlight ? s.text.indexOf(s.highlight) : -1;
  const hiEnd = hi >= 0 ? hi + Array.from(s.highlight!).length : -1;
  const end = exitAt(s);
  // 重卡点里很短的一行（主题词）用大字号
  const size = s.heavy && chars.length <= 6 ? SUB.size * 1.75 : SUB.size;
  const hiColor = s.tone === 'vermilion' ? C.vermilion : C.gold;
  const out = 1 - clamp((f - (end - OUT)) / OUT);

  let lineScale = 1;
  let lineBlur = 0;
  let lineOpacity = out;
  if (s.heavy) {
    const t = clamp((f - (s.start - SLAM_PRE)) / SLAM_PRE);
    const e = ease.in(t);
    lineScale = 1.32 - 0.32 * e + 0.035 * Math.exp(-Math.max(0, f - s.start) / 3) * (t >= 1 ? 1 : 0);
    lineBlur = 16 * (1 - e);
    lineOpacity *= clamp(t * 1.6);
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: (W - SUB.maxWidth) / 2,
        width: SUB.maxWidth,
        top: SUB.y,
        transform: `translateY(-50%) scale(${lineScale})`,
        filter: lineBlur > 0.05 ? `blur(${lineBlur}px)` : undefined,
        opacity: lineOpacity,
        textAlign: 'center',
        fontFamily: FONT_SERIF,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: size > SUB.size ? '0.18em' : '0.06em',
        lineHeight: 1.25,
        color: C.ivory,
        textShadow: '0 0 24px rgba(8,6,4,0.85), 0 0 6px rgba(8,6,4,0.6)',
        whiteSpace: 'nowrap',
      }}
    >
      {chars.map((ch, i) => {
        const local = s.heavy ? 1 : clamp((f - s.start - i * STAGGER) / CHAR_IN);
        const e = ease.out(local);
        const isHi = i >= hi && i < hiEnd;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: e,
              filter: e < 0.999 ? `blur(${(1 - e) * 10}px)` : undefined,
              color: isHi ? hiColor : undefined,
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const Subtitles: React.FC = () => {
  const f = useCurrentFrame();
  const active = SCREENS.filter((s) => f >= s.start - (s.heavy ? SLAM_PRE : 0) && f < exitAt(s));
  return (
    <>
      {active.map((s) => (
        <Line key={s.id} s={s} f={f} />
      ))}
    </>
  );
};
