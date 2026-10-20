import React from 'react';
import { AbsoluteFill } from 'remotion';
import './fonts';
import { Gauge, Grain, SfxTrack, Vignette, Watermark } from './components/Overlays';
import { Subtitles } from './components/Subtitles';
import { TopicLabel } from './components/TopicLabel';
import { B } from './data/timeline';
import { FILM_FRAMES } from './Root';
import { S0Hook } from './sections/S0Hook';
import { S1NotColdViolence } from './sections/S1NotColdViolence';
import { S2Service } from './sections/S2Service';
import { S3NoFault } from './sections/S3NoFault';
import { S4StillFeel } from './sections/S4StillFeel';
import { S5StillFace } from './sections/S5StillFace';
import { S6CantOrWont } from './sections/S6CantOrWont';
import { S7Catch } from './sections/S7Catch';

/**
 * 整片当成一个连续镜头：各节组件自己管理镜头，并在交界处重叠，
 * 用推近 / 拉远 / 甩镜 / 匹配完成场景过渡，不用黑场。
 * 字幕、主题标注、接收表、水印在镜头之外，固定在屏幕空间。
 */
export const Film: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0E1022' }}>
      <S0Hook />
      <S1NotColdViolence />
      <S2Service />
      <S3NoFault />
      <S4StillFeel />
      <S5StillFace />
      <S6CantOrWont />
      <S7Catch />
      <Vignette />
      <Grain opacity={0.05} />
      <Gauge from={B.corridorIn + 10} />
      <TopicLabel />
      <Watermark />
      <Subtitles />
      <SfxTrack until={FILM_FRAMES} />
    </AbsoluteFill>
  );
};
