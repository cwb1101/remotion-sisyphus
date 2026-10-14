import React from 'react';
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {MUSIC, SCENES} from './config';
import {getCutFrames} from './beat';
import {hasStaticFile} from './Footage';
import {Scene} from './Scene';

export const HuiYi: React.FC = () => {
  const cuts = getCutFrames();
  const {fps} = useVideoConfig();

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <SvgFilters />
      {SCENES.map((scene, i) => (
        <Sequence
          key={i}
          from={cuts[i]}
          durationInFrames={cuts[i + 1] - cuts[i]}
          name={scene.kind === 'item' ? `${scene.no}. ${scene.title}` : scene.kind}
        >
          <Scene
            scene={scene}
            index={i}
            duration={cuts[i + 1] - cuts[i]}
            globalStart={cuts[i]}
            isFirst={i === 0}
            isLast={i === SCENES.length - 1}
          />
        </Sequence>
      ))}
      <CutFlash cuts={cuts} />
      <WarmGrade />
      <Grain />
      {hasStaticFile(MUSIC.src) ? (
        <Audio
          src={staticFile(MUSIC.src)}
          trimBefore={Math.round(MUSIC.startSec * fps)}
          volume={MUSIC.volume}
        />
      ) : null}
    </AbsoluteFill>
  );
};

// 切点上闪一下白，掩盖硬切
const CutFlash: React.FC<{cuts: number[]}> = ({cuts}) => {
  const frame = useCurrentFrame();
  const inner = cuts.slice(1, -1);
  const d = Math.min(...inner.map((c) => Math.abs(frame - c)));
  const opacity = interpolate(d, [0, 3], [0.35, 0], {extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{backgroundColor: '#fff6e0', opacity}} />;
};

// 暖色调 + 暗角
const WarmGrade: React.FC = () => (
  <>
    <AbsoluteFill
      style={{
        background:
          'linear-gradient(160deg, rgba(255,190,90,0.22), rgba(255,120,40,0.08) 60%, rgba(40,20,0,0.15))',
        mixBlendMode: 'soft-light',
      }}
    />
    <AbsoluteFill
      style={{
        background:
          'radial-gradient(ellipse 75% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.45) 100%)',
      }}
    />
  </>
);

// 胶片颗粒：每帧换一个随机种子
const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{opacity: 0.12, mixBlendMode: 'overlay'}}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="2"
            seed={frame % 30}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

// 标题字的毛边：轻微扰动字形边缘，模仿笔刷/做旧字效
const SvgFilters: React.FC = () => (
  <svg width="0" height="0" style={{position: 'absolute'}}>
    <filter id="rough">
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" seed="3" />
      <feDisplacementMap in="SourceGraphic" scale="5" />
    </filter>
  </svg>
);
