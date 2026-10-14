import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  useCurrentFrame,
} from 'remotion';
import {noise2D} from '@remotion/noise';
import {BEAT_PUNCH, SceneConfig, TRANSITION_HALF} from './config';
import {beatPunch, framesPerBeat} from './beat';
import {Footage} from './Footage';
import {ItemTitle, LinesTitle, QuoteBubble} from './Text';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// 一个场景 = 运镜后的素材 + 缩放模糊转场 + 边缘模糊 + 文字
export const Scene: React.FC<{
  scene: SceneConfig;
  index: number;
  duration: number;
  globalStart: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({scene, index, duration, globalStart, isFirst, isLast}) => {
  const frame = useCurrentFrame();
  const global = globalStart + frame;

  // 转场强度：切点处为 1。切出时加速放大（ease in），切入时从放大状态快速收回（ease out）
  const enter = isFirst
    ? 0
    : interpolate(frame, [0, TRANSITION_HALF], [1, 0], {
        ...clamp,
        easing: Easing.out(Easing.cubic),
      });
  const exit = isLast
    ? 0
    : interpolate(frame, [duration - TRANSITION_HALF, duration], [0, 1], {
        ...clamp,
        easing: Easing.in(Easing.cubic),
      });
  const zoom = Math.max(enter, exit);

  // 运镜：整段缓慢推近（Ken Burns）+ 每拍一下的「顿」+ 手持感抖动
  const push = interpolate(frame, [0, duration], [1.04, 1.12]);
  const punch = beatPunch(global) * BEAT_PUNCH;
  const shakeAmp = 4 + zoom * 30;
  const sx = noise2D('x', global * 0.15, index) * shakeAmp;
  const sy = noise2D('y', global * 0.15, index) * shakeAmp;
  const rot = noise2D('r', global * 0.1, index) * (0.3 + zoom * 2);
  const scale = push + punch + zoom * 0.35;

  const footage = (
    <Footage
      clip={scene.clip}
      clipStartSec={scene.clipStartSec}
      speed={scene.speed}
      index={index}
    />
  );

  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          transform: `translate(${sx}px, ${sy}px) rotate(${rot}deg) scale(${scale})`,
          filter: `blur(${zoom * 10}px) saturate(1.15) contrast(1.06) brightness(${1 + zoom * 0.25})`,
        }}
      >
        {footage}
        {/* 径向（缩放）模糊：同一画面叠几层逐渐放大的半透明副本 */}
        {zoom > 0.02
          ? [1, 2, 3, 4].map((k) => (
              <AbsoluteFill
                key={k}
                style={{transform: `scale(${1 + zoom * 0.07 * k})`, opacity: 0.32}}
              >
                {footage}
              </AbsoluteFill>
            ))
          : null}
        {/* 常驻的边缘模糊：中间清楚四周糊，原片那种梦幻感 */}
        <AbsoluteFill
          style={{
            filter: 'blur(14px)',
            transform: 'scale(1.06)',
            WebkitMaskImage:
              'radial-gradient(ellipse 62% 60% at 50% 55%, transparent 45%, black 100%)',
            maskImage:
              'radial-gradient(ellipse 62% 60% at 50% 55%, transparent 45%, black 100%)',
          }}
        >
          {footage}
        </AbsoluteFill>
      </AbsoluteFill>

      {/* 文字层跟着转场一起被甩出去，但不做多重副本 */}
      <AbsoluteFill
        style={{
          transform: `scale(${1 + exit * 0.25 + punch * 0.6})`,
          filter: `blur(${exit * 6}px)`,
          opacity: 1 - exit * 0.6,
        }}
      >
        {scene.kind === 'item' ? (
          <>
            <ItemTitle no={scene.no} title={scene.title} en={scene.en} />
            {scene.quotes.map((q, i) => (
              <Sequence
                key={i}
                from={Math.round(q.beat * framesPerBeat())}
                layout="none"
              >
                <QuoteBubble text={q.text} x={q.x} y={q.y} />
              </Sequence>
            ))}
          </>
        ) : (
          <LinesTitle
            lines={scene.lines}
            en={scene.en}
            align={scene.kind === 'hook' ? 'left' : 'center'}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
