/**
 * 预览：§0 开头 + §1 长廊（约 38 秒）。
 * 两个场景在交界处重叠 OVERLAP 帧：§0 推进椅背、§1 从光缝里冲进长廊，整片当一个连续镜头。
 * 字幕画在最上层（不跟着画面震动和交叉淡化），胶片颗粒盖在所有东西上面。
 */
import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {FilmLook} from './components/FilmLook';
import {SfxTrack} from './components/SfxTrack';
import {SubtitleTrack} from './components/Subtitle';
import {ensureFonts} from './components/fonts';
import {OVERLAP, PREVIEW_SCENES, PREVIEW_TAIL, sceneRange, screensOf} from './data/timeline';
import {S0Opening} from './sections/S0Opening';
import {S1Corridor, manScreenX} from './sections/S1Corridor';
import {C} from './theme';

ensureFonts();

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Preview: React.FC = () => {
  const frame = useCurrentFrame();
  const r1 = sceneRange('corridor');
  const cut = r1.start;
  const half = OVERLAP / 2;
  const show0 = frame < cut + half;
  const show1 = frame >= cut - half;
  // §0 在推镜过程中淡出，露出底下已经开始冲进长廊的 §1
  const op0 = interpolate(frame, [cut - half, cut + half], [1, 0], clamp);
  const end = interpolate(frame, [r1.end, r1.end + PREVIEW_TAIL], [1, 0], clamp);
  return (
    <AbsoluteFill style={{background: C.black}}>
      <AbsoluteFill style={{opacity: end}}>
        {show1 ? <S1Corridor /> : null}
        {show0 ? <S0Opening opacity={op0} /> : null}
      </AbsoluteFill>
      <SubtitleTrack screens={[...screensOf('opening'), ...screensOf('corridor')]} layer="over" followX={(f) => manScreenX(f) - 430} />
      <FilmLook />
      <SfxTrack scenes={PREVIEW_SCENES} overlap={half} />
    </AbsoluteFill>
  );
};
