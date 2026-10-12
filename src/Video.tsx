import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {SCRIPT, SCREENS, sceneRange} from './data/script';
import {useFonts} from './Fonts';
import {Opening} from './scenes/Opening';
import {Section1, section1Anchors} from './scenes/Section1';
import {Section2, section2Anchors} from './scenes/Section2';
import {Section3} from './scenes/Section3';
import {Section4, section4Anchors} from './scenes/Section4';
import {Section5} from './scenes/Section5';
import {Epilogue, epilogueAnchors} from './scenes/Epilogue';
import {AnchorFn, SlamFX, slamShake, SubtitleTrack} from './components/Subtitle';
import {FilmLook} from './components/FilmLook';
import {Watermark} from './components/Watermark';
import {ease, prog} from './lib/anim';
import {C} from './theme';

const ANCHORS: Record<string, AnchorFn> = {
  ...section1Anchors,
  ...section2Anchors,
  ...section4Anchors,
  ...epilogueAnchors,
};

const COMPS: Record<string, React.FC<{frame: number}>> = {
  opening: Opening,
  s1: Section1,
  s2: Section2,
  s3: Section3,
  s4: Section4,
  s5: Section5,
  ep: Epilogue,
};

/**
 * 场景按字幕数据里的帧范围排列。下一节有 transitionIn 时，上一节继续渲染这几帧，
 * 下一节在上面淡入（窗光、浪花这类白场转场）；为 0 时是物件填满画面的匹配剪辑。
 */
export const Video: React.FC<{tail?: number; lastScene?: string}> = ({tail = 0, lastScene}) => {
  useFonts();
  const frame = useCurrentFrame();
  const shake = slamShake(frame);
  const scenes = lastScene ? SCRIPT.scenes.slice(0, SCRIPT.scenes.findIndex((s) => s.id === lastScene) + 1) : SCRIPT.scenes;
  const lastEnd = sceneRange(scenes[scenes.length - 1].id).end;
  const outro = prog(frame, lastEnd + tail * 0.3, lastEnd + tail);
  return (
    <AbsoluteFill style={{background: C.base}}>
      <AbsoluteFill style={{transform: `translate(${shake.dx}px, ${shake.dy}px) scale(1.012)`}}>
        {scenes.map((sc, i) => {
          const r = sceneRange(sc.id);
          const next = scenes[i + 1];
          const end = next ? sceneRange(next.id).start + (next.transitionIn ?? 0) : r.end + tail;
          if (frame < r.start || frame >= end) return null;
          const Comp = COMPS[sc.id];
          const tIn = sc.transitionIn ?? 0;
          const opacity = tIn > 0 ? prog(frame, r.start - 1, r.start + tIn, ease) : 1;
          return (
            <AbsoluteFill key={sc.id} style={{opacity}}>
              <Comp frame={frame} />
            </AbsoluteFill>
          );
        })}
        <SubtitleTrack frame={frame} anchors={ANCHORS} />
        <SlamFX frame={frame} />
      </AbsoluteFill>
      <FilmLook frame={frame} />
      <AbsoluteFill style={{background: '#000', opacity: outro}} />
      {/* 水印在镜头运动之外：固定位置，不随震屏和推拉变化 */}
      <Watermark />
      <SoundTrack scenes={scenes.map((s) => s.id)} tail={tail} />
    </AbsoluteFill>
  );
};

/** 音效：底噪按场景铺（交界处互相叠 12 帧，不留空档），单个音效按字幕数据里的 at 帧放 */
const SoundTrack: React.FC<{scenes: string[]; tail: number}> = ({scenes, tail}) => (
  <>
    {SCRIPT.scenes
      .filter((sc) => scenes.includes(sc.id))
      .map((sc, i, arr) => {
        if (!sc.bed) return null;
        const r = sceneRange(sc.id);
        const isLast = i === arr.length - 1;
        const from = Math.max(0, r.start - 6);
        const dur = r.end - from + (isLast ? tail : 14);
        const vol = sc.bed.volume;
        return (
          <Sequence key={sc.id} from={from} durationInFrames={dur} layout="none">
            <Audio
              src={staticFile(`sfx/${sc.bed.sound}.wav`)}
              loop
              volume={(f) => vol * Math.min(1, (f + 1) / 14, (dur - f) / 14)}
            />
          </Sequence>
        );
      })}
    {SCREENS.filter((s) => scenes.includes(s.scene)).flatMap((s) =>
      (s.sfx ?? []).map((cue, k) => (
        <Sequence key={`${s.id}-${k}`} from={s.start + cue.at} layout="none">
          <Audio src={staticFile(`sfx/${cue.sound}.wav`)} volume={cue.volume ?? 1} />
        </Sequence>
      )),
    )}
  </>
);
