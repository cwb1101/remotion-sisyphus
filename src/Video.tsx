import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {SCRIPT, SCREENS, sceneRange} from './data/script';
import {useFonts} from './Fonts';
import {Opening} from './scenes/Opening';
import {Section1, section1Anchors} from './scenes/Section1';
import {AnchorFn, SlamFX, slamShake, SubtitleTrack} from './components/Subtitle';
import {FilmLook} from './components/FilmLook';
import {prog} from './lib/anim';
import {C} from './theme';

const ANCHORS: Record<string, AnchorFn> = {...section1Anchors};

/** 场景按字幕数据里的帧范围排列；相机在场景之间连续推拉 */
const SCENES: Array<{id: string; Comp: React.FC<{frame: number}>}> = [
  {id: 'opening', Comp: Opening},
  {id: 's1', Comp: Section1},
];

export const Video: React.FC<{tail?: number}> = ({tail = 0}) => {
  useFonts();
  const frame = useCurrentFrame();
  const shake = slamShake(frame);
  const lastEnd = Math.max(...SCREENS.map((s) => s.end));
  const outro = prog(frame, lastEnd, lastEnd + tail);
  return (
    <AbsoluteFill style={{background: C.base}}>
      <AbsoluteFill style={{transform: `translate(${shake.dx}px, ${shake.dy}px) scale(1.012)`}}>
        {SCENES.map(({id, Comp}, i) => {
          const r = sceneRange(id);
          const isLast = i === SCENES.length - 1;
          const end = isLast ? r.end + tail : r.end;
          if (frame < r.start || frame >= end) return null;
          return <Comp key={id} frame={frame} />;
        })}
        <SubtitleTrack frame={frame} anchors={ANCHORS} />
        <SlamFX frame={frame} />
      </AbsoluteFill>
      <FilmLook frame={frame} />
      <AbsoluteFill style={{background: '#000', opacity: outro}} />
      <SoundTrack tail={tail} />
    </AbsoluteFill>
  );
};

/** 音效：底噪按场景铺，单个音效按字幕数据里的 at 帧放 */
const SoundTrack: React.FC<{tail: number}> = ({tail}) => (
  <>
    {SCRIPT.scenes.map((sc, i) => {
      if (!sc.bed) return null;
      const r = sceneRange(sc.id);
      const isLast = i === SCRIPT.scenes.length - 1;
      const dur = r.end - r.start + (isLast ? tail : 12);
      const vol = sc.bed.volume;
      return (
        <Sequence key={sc.id} from={r.start} durationInFrames={dur} layout="none">
          <Audio
            src={staticFile(`sfx/${sc.bed.sound}.wav`)}
            loop
            volume={(f) => vol * Math.min(1, f / 12, (dur - f) / 12)}
          />
        </Sequence>
      );
    })}
    {SCREENS.flatMap((s) =>
      (s.sfx ?? []).map((cue, k) => (
        <Sequence key={`${s.id}-${k}`} from={s.start + cue.at} layout="none">
          <Audio src={staticFile(`sfx/${cue.sound}.wav`)} volume={cue.volume ?? 1} />
        </Sequence>
      )),
    )}
  </>
);
