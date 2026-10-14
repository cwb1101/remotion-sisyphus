import React from 'react';
import {AbsoluteFill, Audio, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, easeCam} from './theme';
import {Grade, Grain} from './components/Grade';
import {SubtitleMode, SubtitleTrack} from './components/Subtitle';
import {SectionHeaders} from './components/SectionHeader';
import {S00Window} from './sections/S00Window';
import {S01Arcade} from './sections/S01Arcade';
import {Screen} from './lib/timeline';

/**
 * 00 → 01 交接：镜头一直向右平移，经过一根贴近镜头的墙垛（离镜头近，所以掠过得快），
 * 墙垛后面就是拱廊——像镜头平移进了相邻的空间（不原地换内容，不整屏叠化）。
 */
const X01 = {from: 352, to: 420};
const WIPE_SOFT = 180;
const PIER_W = 230;

/** 字下垫层强度：按该屏背后的亮度给 */
const padFor = (s: Screen) => {
  if (s.layout === 'center' || s.layout === 'top-center') return 0.45;
  return 0.45;
};

export const Film: React.FC<{subtitles?: SubtitleMode | 'none'; audio?: boolean}> = ({subtitles = 'full', audio = true}) => {
  const frame = useCurrentFrame();
  const wipe = interpolate(frame, [X01.from, X01.to], [1920, -WIPE_SOFT], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeCam});
  const mask = `linear-gradient(to right, rgba(0,0,0,0) ${wipe}px, rgba(0,0,0,1) ${wipe + WIPE_SOFT}px)`;
  return (
    <AbsoluteFill style={{background: C.mid}}>
      <Grade>
        {frame < X01.to && <S00Window frame={frame} />}
        {frame >= X01.from && (
          <AbsoluteFill style={frame < X01.to ? {WebkitMaskImage: mask, maskImage: mask} : undefined}>
            <S01Arcade frame={frame} />
          </AbsoluteFill>
        )}
        {frame >= X01.from && frame < X01.to && (
          <div
            style={{
              position: 'absolute',
              top: -40,
              bottom: -40,
              left: wipe + WIPE_SOFT / 2 - PIER_W / 2,
              width: PIER_W,
              background: 'linear-gradient(to right, rgba(58,55,51,0) 0%, rgba(58,55,51,0.92) 28%, rgba(66,62,58,0.92) 72%, rgba(106,102,96,0) 100%)',
              filter: 'blur(10px)',
            }}
          />
        )}
      </Grade>
      <SectionHeaders frame={frame} />
      {subtitles !== 'none' && <SubtitleTrack frame={frame} mode={subtitles} padFor={padFor} />}
      <Grain frame={frame} />
      {audio && <Audio src={staticFile('audio/preview.wav')} />}
    </AbsoluteFill>
  );
};
