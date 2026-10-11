import React from 'react';
import {AbsoluteFill, Html5Audio, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import './lib/fonts';
import {Dust, Vignette} from './components/Atmosphere';
import {type Ink, Subtitles} from './components/Subtitles';
import {Watermark} from './components/Watermark';
import type {Section} from './data/subtitles';
import type {Pt} from './lib/anim';
import {driftAt, type Impact, sampleShots, shakeAt, type Shot} from './lib/camera';
import {cuesOf, impactFrame} from './lib/cues';
import {Opening, openingImpacts, openingShots} from './sections/Opening';
import {Myth, mythImpacts, mythShots} from './sections/Myth';
import {Punishment, punishmentImpacts, PunishmentBackdrop, punishmentShots} from './sections/Punishment';
import {Absurd, absurdImpacts, AbsurdBackdrop, absurdShots} from './sections/Absurd';
import {Descent, descentImpacts, DescentBackdrop, descentShots} from './sections/Descent';
import {Answer, answerImpacts, answerShots} from './sections/Answer';
import {Ending, endingImpacts, EndingOverlay, endingShots} from './sections/Ending';
import {COLORS} from './theme';

// 整片是一个连续镜头：所有段落都摆在同一个世界坐标里，
// 相机（推、拉、摇、旋转）在它们之间移动，不做原地换页。

/** 世界坐标 → 屏幕坐标（含相机漂移和震动），给屏幕空间的叠加层用 */
export type ToScreen = (p: Pt) => Pt;

type Part = {
  Scene: React.FC<{last?: boolean}>;
  shots: Shot[];
  impacts: Impact[];
  /** 屏幕空间的底色 / 光线层，画在世界下面 */
  Backdrop?: React.FC;
  /** 屏幕空间的叠加层，画在世界上面、字幕下面 */
  Overlay?: React.FC<{toScreen: ToScreen}>;
};

const SECTIONS: Record<Section, Part> = {
  opening: {Scene: Opening, shots: openingShots, impacts: openingImpacts},
  myth: {Scene: Myth, shots: mythShots, impacts: mythImpacts},
  punishment: {Scene: Punishment, shots: punishmentShots, impacts: punishmentImpacts, Backdrop: PunishmentBackdrop},
  absurd: {Scene: Absurd, shots: absurdShots, impacts: absurdImpacts, Backdrop: AbsurdBackdrop},
  descent: {Scene: Descent, shots: descentShots, impacts: descentImpacts, Backdrop: DescentBackdrop},
  answer: {Scene: Answer, shots: answerShots, impacts: answerImpacts},
  ending: {Scene: Ending, shots: endingShots, impacts: endingImpacts, Overlay: EndingOverlay},
};

/** 片名压在填满画面的橙色圆上，用深色字 */
const INKS: Record<string, Ink> = {
  title: {color: COLORS.bg, shadow: '0 0 30px rgba(255,190,150,0.35)'},
};

export const Film: React.FC<{sections: Section[]; fadeOut?: boolean}> = ({sections, fadeOut = true}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const parts = sections.map((s) => SECTIONS[s]);
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
  const rad = (rot * Math.PI) / 180;
  const toScreen: ToScreen = (p) => {
    const dx = (p.x - x) * cam.zoom;
    const dy = (p.y - y) * cam.zoom;
    return {x: 960 + shake.dx + dx * Math.cos(rad) - dy * Math.sin(rad), y: 540 + shake.dy + dx * Math.sin(rad) + dy * Math.cos(rad)};
  };

  const fade = fadeOut
    ? interpolate(frame, [durationInFrames - 12, durationInFrames - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
    : 0;

  // “世界却一言不发”：嗡声压到很低，留出一段几乎无声的空白（有意为之）
  const silence = cues.find((c) => c.id === 'silence');
  const duckAt = silence ? impactFrame(silence)! : -1;

  return (
    <AbsoluteFill style={{background: COLORS.bg, overflow: 'hidden'}}>
      {parts.map(({Backdrop}, i) => (Backdrop ? <Backdrop key={i} /> : null))}
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
          <Scene key={i} last={i === 0} />
        ))}
      </div>
      <Dust cam={{...cam, x, y}} frame={frame} color={COLORS.ink} />
      <Vignette amount={0.65} />
      {parts.map(({Overlay}, i) => (Overlay ? <Overlay key={i} toScreen={toScreen} /> : null))}
      <Subtitles cues={cues} inks={INKS} />
      <AbsoluteFill style={{background: '#000', opacity: fade}} />
      <Watermark />
      <Html5Audio
        src={staticFile('sfx/drone.wav')}
        loop
        volume={(f) =>
          0.16 *
          interpolate(f, [0, 20, durationInFrames - 20, durationInFrames], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
          (duckAt < 0 ? 1 : interpolate(f, [duckAt + 4, duckAt + 12, duckAt + 40, duckAt + 60], [1, 0.15, 0.15, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}))
        }
      />
    </AbsoluteFill>
  );
};
