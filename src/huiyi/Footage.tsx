import React from 'react';
import {
  AbsoluteFill,
  getStaticFiles,
  Img,
  OffthreadVideo,
  random,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const cover: React.CSSProperties = {width: '100%', height: '100%', objectFit: 'cover'};

export const hasStaticFile = (path: string | undefined) =>
  path !== undefined && getStaticFiles().some((f) => f.name === path);

export const Footage: React.FC<{
  clip?: string;
  clipStartSec?: number;
  speed?: number;
  index: number;
}> = ({clip, clipStartSec = 0, speed = 1, index}) => {
  const {fps} = useVideoConfig();
  if (clip && hasStaticFile(clip)) {
    if (/\.(png|jpe?g|webp)$/i.test(clip)) {
      return <Img src={staticFile(clip)} style={cover} />;
    }
    return (
      <OffthreadVideo
        src={staticFile(clip)}
        muted
        trimBefore={Math.round(clipStartSec * fps)}
        playbackRate={speed}
        style={cover}
      />
    );
  }
  return <Placeholder index={index} clip={clip} />;
};

// 没有素材时的占位：暖色夕阳 + 方块建筑 + 透视地面，方便直接预览转场和字效
const Placeholder: React.FC<{index: number; clip?: string}> = ({index, clip}) => {
  const frame = useCurrentFrame();
  // 只在暖色范围里换色相，接近原片的夕阳感
  const hue = ((index * 37) % 70) - 25;
  const blocks = Array.from({length: 14}, (_, i) => {
    const r = (k: string) => random(`${index}-${i}-${k}`);
    return {
      left: i * 7.5 - 2 + r('x') * 3,
      w: 6 + r('w') * 6,
      h: 18 + r('h') * 38,
      light: 30 + r('l') * 30,
    };
  });
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(180deg, hsl(${hue + 200},45%,62%) 0%, hsl(${hue + 30},85%,72%) 55%, hsl(${hue + 20},70%,55%) 100%)`,
        overflow: 'hidden',
      }}
    >
      <AbsoluteFill style={{transform: `translateX(${-frame * 1.2}px)`}}>
        {blocks.map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${b.left}%`,
              bottom: '38%',
              width: `${b.w}%`,
              height: `${b.h}%`,
              background: `hsl(${hue + 15},35%,${b.light}%)`,
              boxShadow: 'inset -18px 0 0 rgba(0,0,0,0.18)',
            }}
          />
        ))}
      </AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          left: '-50%',
          width: '200%',
          bottom: 0,
          height: '42%',
          transformOrigin: 'top center',
          transform: 'perspective(600px) rotateX(55deg)',
          backgroundColor: `hsl(${hue + 25},35%,40%)`,
          backgroundImage:
            'linear-gradient(90deg, rgba(0,0,0,0.25) 2px, transparent 2px), linear-gradient(0deg, rgba(0,0,0,0.25) 2px, transparent 2px)',
          backgroundSize: '80px 80px',
          backgroundPosition: `0 ${frame * 6}px`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: '100%',
          textAlign: 'center',
          bottom: '10%',
          fontFamily: 'monospace',
          fontSize: 22,
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        占位画面 · 放入 public/{clip ?? 'clips/…'}
      </div>
    </AbsoluteFill>
  );
};
