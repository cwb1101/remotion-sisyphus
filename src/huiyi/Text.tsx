import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, TextSegment} from './config';
import {sansFont, serifFont, titleFont} from './fonts';

// 描边字：底层画粗描边，上层画填充，避免 -webkit-text-stroke 往字里面吃
export const Outlined: React.FC<{
  children: React.ReactNode;
  color: string;
  stroke: number;
  shadow?: boolean;
}> = ({children, color, stroke, shadow = true}) => {
  return (
    <span style={{position: 'relative', display: 'inline-block'}}>
      <span
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          color: COLORS.stroke,
          WebkitTextStroke: `${stroke}px ${COLORS.stroke}`,
          textShadow: shadow
            ? `0 ${stroke * 0.5}px ${stroke}px rgba(0,0,0,0.55)`
            : undefined,
        }}
      >
        {children}
      </span>
      <span style={{position: 'relative', color}}>{children}</span>
    </span>
  );
};

// 逐字「砸」进画面：从 2.4 倍缩到 1 倍，带一点回弹
const PopChars: React.FC<{
  text: string;
  delay: number;
  color: string;
  stroke: number;
}> = ({text, delay, color, stroke}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <>
      {Array.from(text).map((ch, i) => {
        const s = spring({
          frame: frame - delay - i * 1.2,
          fps,
          config: {damping: 11, stiffness: 220, mass: 0.6},
        });
        const scale = interpolate(s, [0, 1], [2.4, 1]);
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `scale(${scale})`,
              opacity: s > 0.02 ? 1 : 0,
            }}
          >
            <Outlined color={color} stroke={stroke}>
              {ch === ' ' ? ' ' : ch}
            </Outlined>
          </span>
        );
      })}
    </>
  );
};

export const EnglishLine: React.FC<{text: string; size: number; delay: number}> = ({
  text,
  size,
  delay,
}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, 5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        fontFamily: serifFont,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: 1,
        whiteSpace: 'nowrap',
        opacity: p,
        transform: `translateY(${(1 - p) * 12}px)`,
      }}
    >
      <Outlined color={COLORS.white} stroke={size * 0.18}>
        {text}
      </Outlined>
    </div>
  );
};

// 「1. 课间的嬉戏打闹」+ 英文
export const ItemTitle: React.FC<{no: number; title: string; en: string}> = ({
  no,
  title,
  en,
}) => {
  const {width} = useVideoConfig();
  const size = width * 0.072;
  return (
    <div
      style={{
        position: 'absolute',
        top: '4%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: titleFont,
          fontSize: size,
          lineHeight: 1.05,
          whiteSpace: 'nowrap',
          filter: 'url(#rough)',
        }}
      >
        <PopChars text={`${no}. `} delay={0} color={COLORS.yellow} stroke={size * 0.12} />
        <PopChars text={title} delay={2} color={COLORS.yellow} stroke={size * 0.12} />
      </div>
      <EnglishLine text={en} size={size * 0.33} delay={6} />
    </div>
  );
};

// 开头钩子 / 结尾：多行、每段可单独上色和放大
export const LinesTitle: React.FC<{
  lines: TextSegment[][];
  en: string;
  align: 'left' | 'center';
}> = ({lines, en, align}) => {
  const {width} = useVideoConfig();
  const size = width * 0.075;
  let charIndex = 0;
  return (
    <div
      style={{
        position: 'absolute',
        top: align === 'left' ? '3%' : '32%',
        left: align === 'left' ? '2.5%' : 0,
        right: align === 'left' ? undefined : 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'left' ? 'flex-start' : 'center',
      }}
    >
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            fontFamily: titleFont,
            fontSize: size,
            lineHeight: 1.15,
            whiteSpace: 'nowrap',
            filter: 'url(#rough)',
          }}
        >
          {line.map((seg, si) => {
            const delay = charIndex * 1.2;
            charIndex += Array.from(seg.text).length;
            const segSize = size * (seg.scale ?? 1);
            return (
              <span key={si} style={{fontSize: segSize}}>
                <PopChars
                  text={seg.text}
                  delay={delay}
                  color={seg.color ?? COLORS.white}
                  stroke={segSize * 0.12}
                />
              </span>
            );
          })}
        </div>
      ))}
      <div style={{marginTop: size * 0.05}}>
        <EnglishLine text={en} size={size * 0.33} delay={charIndex * 1.2 + 2} />
      </div>
    </div>
  );
};

// 角色头顶的对白：“你给我站住”
export const QuoteBubble: React.FC<{text: string; x: number; y: number}> = ({
  text,
  x,
  y,
}) => {
  const frame = useCurrentFrame();
  const {fps, width} = useVideoConfig();
  const size = width * 0.036;
  const s = spring({frame, fps, config: {damping: 9, stiffness: 260, mass: 0.5}});
  const scale = interpolate(s, [0, 1], [0.3, 1]);
  const wobble = Math.sin(frame * 0.9) * Math.exp(-frame / 6) * 6;
  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${wobble}deg)`,
        opacity: s > 0.02 ? 1 : 0,
        fontFamily: sansFont,
        fontWeight: 900,
        fontSize: size,
        whiteSpace: 'nowrap',
      }}
    >
      <Outlined color={COLORS.white} stroke={size * 0.16}>
        “{text}”
      </Outlined>
    </div>
  );
};
