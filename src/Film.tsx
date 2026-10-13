/**
 * 完整片：§0–§7 共 8 个场景当成一个连续镜头。
 * 相邻场景在交界处重叠 OVERLAP 帧：上一节一边做推 / 穿过物件的镜头运动一边淡出，
 * 下一节在底下已经开始同方向的运动（没有黑场）。
 * 层次：场景 → 字幕（不跟画面震动）→ 胶片颗粒 / 暗角 → 水印（完全在镜头运动之外）。
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {FilmLook} from './components/FilmLook';
import {SfxTrack} from './components/SfxTrack';
import {SubtitleTrack} from './components/Subtitle';
import {Watermark} from './components/Watermark';
import {ensureFonts} from './components/fonts';
import {SCENES, SCREENS, SceneId} from './data/script';
import {FILM_TAIL_FRAMES} from './data/film-meta';
import {OVERLAP, sceneRange} from './data/timeline';
import {S0Opening} from './sections/S0Opening';
import {S1Corridor, manScreenX} from './sections/S1Corridor';
import {S2Mirrors, manScreenXS2} from './sections/S2Mirrors';
import {S3Seawall} from './sections/S3Seawall';
import {S4Arches, manScreenXS4} from './sections/S4Arches';
import {S5Room} from './sections/S5Room';
import {S6Ridge, manScreenXS6} from './sections/S6Ridge';
import {S7Stairs, friendScreenX} from './sections/S7Stairs';
import {C} from './theme';

ensureFonts();

export const FILM_TAIL = FILM_TAIL_FRAMES;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

type Sec = {id: SceneId; C: React.FC<{opacity?: number}>; follow?: (f: number) => number};
export const SECTIONS: Sec[] = [
  {id: 'opening', C: S0Opening},
  {id: 'corridor', C: S1Corridor, follow: (f) => manScreenX(f) - 430},
  {id: 'mirrors', C: S2Mirrors, follow: (f) => manScreenXS2(f) - 300},
  {id: 'seawall', C: S3Seawall},
  {id: 'arches', C: S4Arches, follow: (f) => manScreenXS4(f) - 380},
  {id: 'room', C: S5Room},
  {id: 'ridge', C: S6Ridge, follow: (f) => manScreenXS6(f) - 380},
  {id: 'stairs', C: S7Stairs, follow: (f) => friendScreenX(f) - 300},
];

export const filmDuration = () => SCREENS[SCREENS.length - 1].end + FILM_TAIL;

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const half = OVERLAP / 2;
  const last = SECTIONS.length - 1;
  const end = SCREENS[SCREENS.length - 1].end;
  const fadeOut = interpolate(frame, [end + 5, end + FILM_TAIL], [1, 0], clamp);
  const follow = (f: number) => {
    const s = SCREENS.find((x) => f >= x.start && f < x.end);
    const sec = SECTIONS.find((x) => x.id === s?.scene);
    return sec?.follow ? sec.follow(f) : 200;
  };
  return (
    <AbsoluteFill style={{background: C.black}}>
      <AbsoluteFill style={{opacity: fadeOut}}>
        {/* 后一节先画（在下面），前一节在上面淡出 */}
        {[...SECTIONS].reverse().map((sec, ri) => {
          const i = last - ri;
          const r = sceneRange(sec.id);
          const from = i === 0 ? 0 : r.start - half;
          const to = i === last ? end + FILM_TAIL : r.end + half;
          if (frame < from || frame >= to) return null;
          const op = i === last ? 1 : interpolate(frame, [r.end - half, r.end + half], [1, 0], clamp);
          return <sec.C key={sec.id} opacity={op} />;
        })}
      </AbsoluteFill>
      <SubtitleTrack screens={SCREENS} layer="over" followX={follow} />
      <FilmLook />
      <Watermark />
      <SfxTrack scenes={SECTIONS.map((s) => s.id)} overlap={half} />
    </AbsoluteFill>
  );
};

export const ALL_SCENES = SCENES.map((s) => s.id);
