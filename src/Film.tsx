import React from 'react';
import {AbsoluteFill, Html5Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import './lib/fonts';
import {Dust, Vignette} from './components/Atmosphere';
import {type Ink, Subtitles} from './components/Subtitles';
import type {Section} from './data/subtitles';
import {driftAt, type Impact, sampleShots, shakeAt, type Shot} from './lib/camera';
import {cuesOf, impactFrame} from './lib/cues';
import {Opening, openingImpacts, openingShots} from './sections/Opening';
import {Myth, mythImpacts, mythShots} from './sections/Myth';
import {COLORS} from './theme';

// 整片是一个连续镜头：所有段落都摆在同一个世界坐标里，
// 相机（推、拉、摇、旋转）在它们之间移动，不做原地换页。

const SECTIONS: Partial<Record<Section, {Scene: React.FC; shots: Shot[]; impacts: Impact[]}>> = {
  opening: {Scene: Opening, shots: openingShots, impacts: openingImpacts},
  myth: {Scene: Myth, shots: mythShots, impacts: mythImpacts},
};

/** 片名压在填满画面的橙色圆上，用深色字 */
const INKS: Record<string, Ink> = {
  title: {color: COLORS.bg, shadow: '0 0 30px rgba(255,190,150,0.35)'},
};

export const Film: React.FC<{sections: Section[]}> = ({sections}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const parts = sections.map((s) => SECTIONS[s]).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const cues = cuesOf(sections);

  const slamImpacts: Impact[] = cues.flatMap((c) => {
    const f = impactFrame(c);
    return f === null ? [] : [{f, amp: c.style === 'title' ? 12 : 20}];
  });
  const cam = sampleShots(frame, parts.flatMap((p) => p.shots));
  const drift = driftAt(frame, cam.zoom);
  const shake = shakeAt(frame, [...slamImpacts, ...parts.flatMap((p) => p.impacts)]);
  const x = cam.x + drift.x;
  const y = cam.y + drift.y;
  const rot = cam.rot + drift.rot + shake.dr;

  const fadeOut = interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{background: COLORS.bg, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transformOrigin: '0 0',
          transform: `translate(${960 + shake.dx}px, ${540 + shake.dy}px) rotate(${rot}deg) scale(${cam.zoom}) translate(${-x}px, ${-y}px)`,
        }}
      >
        {/* 后面的段落画在下层，前一段的物件才能盖在新场景上完成交接 */}
        {[...parts].reverse().map(({Scene}, i) => (
          <Scene key={i} />
        ))}
      </div>
      <Dust cam={{...cam, x, y}} frame={frame} color={COLORS.ink} />
      <Vignette amount={0.65} />
      <Subtitles cues={cues} inks={INKS} />
      <AbsoluteFill style={{background: '#000', opacity: fadeOut}} />
      <Html5Audio
        src={staticFile('sfx/drone.wav')}
        loop
        volume={(f) =>
          0.28 *
          interpolate(f, [0, 20, durationInFrames - 20, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
        }
      />
    </AbsoluteFill>
  );
};
