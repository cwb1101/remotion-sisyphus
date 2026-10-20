import React from 'react';
import { Html5Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { ease, prog, track } from '../anim';
import { GAUGE, SFX } from '../data/timeline';
import { C } from '../theme';

/** 细颗粒：很淡，逐帧换种子，只增加质感不抢画面 */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => {
  const f = useCurrentFrame();
  return (
    <svg
      width={1920}
      height={1080}
      style={{ position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity, pointerEvents: 'none' }}
    >
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={f % 37} stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={1920} height={1080} filter="url(#grain)" />
    </svg>
  );
};

/** 暗角 + 底部轻微压暗（保证字幕可读） */
export const Vignette: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background:
        'radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(6,6,18,0.42) 100%),' +
        'linear-gradient(to bottom, rgba(0,0,0,0) 68%, rgba(8,8,22,0.32) 100%)',
    }}
  />
);

/** 右上角"情绪接收表"：只有心形图标和指针，没有文字 */
export const Gauge: React.FC<{ from: number }> = ({ from }) => {
  const f = useCurrentFrame();
  const o = prog(f, from, from + 14, ease.out);
  if (o <= 0) return null;
  const keys = GAUGE.map(([fr, v]) => [fr, v, ease.inOut] as [number, number, typeof ease.inOut]);
  const v = track(f, keys);
  const a = -120 + v * 240;
  const r = 40;
  const arc = (from: number, to: number) => {
    const p = (deg: number) => {
      const t = ((deg - 90) * Math.PI) / 180;
      return `${(Math.cos(t) * r).toFixed(2)} ${(Math.sin(t) * r).toFixed(2)}`;
    };
    return `M ${p(from)} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${p(to)}`;
  };
  return (
    <svg width={140} height={120} style={{ position: 'absolute', right: 52, top: 40, opacity: o * 0.8 }}>
      <g transform="translate(70 66)">
        <path d={arc(-120, 120)} stroke={C.subtitle} strokeOpacity={0.22} strokeWidth={6} fill="none" strokeLinecap="round" />
        <path d={arc(-120, a)} stroke={C.accent} strokeOpacity={0.85} strokeWidth={6} fill="none" strokeLinecap="round" />
        <g transform={`rotate(${a})`}>
          <path d="M -2.5 0 L 0 -32 L 2.5 0 Z" fill={C.subtitle} opacity={0.85} />
        </g>
        <circle r={5} fill={C.subtitle} opacity={0.85} />
        <path
          d="M 0 30 C -10 22 -14 16 -14 11 C -14 6 -10 3 -6.5 3 C -3.5 3 -1.5 5 0 7.5 C 1.5 5 3.5 3 6.5 3 C 10 3 14 6 14 11 C 14 16 10 22 0 30 Z"
          fill={C.accent}
          opacity={0.75}
          transform="translate(0 4) scale(0.8)"
        />
      </g>
    </svg>
  );
};

/** 按时间轴放置合成好的音效 wav */
export const SfxTrack: React.FC<{ until: number }> = ({ until }) => (
  <>
    {SFX.filter((e) => e.at < until).map((e, i) => (
      <Sequence key={i} from={e.at} durationInFrames={Math.max(1, Math.min(90, until - e.at))} layout="none">
        <Html5Audio src={staticFile(`sfx/${e.sound}.wav`)} volume={e.volume} />
      </Sequence>
    ))}
  </>
);
