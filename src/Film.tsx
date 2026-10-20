import React from 'react';
import { AbsoluteFill } from 'remotion';
import './fonts';
import { Gauge, Grain, SfxTrack, Vignette } from './components/Overlays';
import { Subtitles } from './components/Subtitles';
import { TopicLabel } from './components/TopicLabel';
import { B } from './data/timeline';
import { PREVIEW_FRAMES } from './Root';
import { S0Hook } from './sections/S0Hook';
import { S1NotColdViolence } from './sections/S1NotColdViolence';

/**
 * 整片当成一个连续镜头：各节组件自己管理镜头，并在交界处重叠，
 * 用推近 / 拉远 / 甩镜 / 匹配完成场景过渡。
 * 字幕、主题标注、接收表在镜头之外，固定在屏幕空间。
 */
export const Film: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0E1022' }}>
      <S0Hook />
      <S1NotColdViolence />
      <Vignette />
      <Grain opacity={0.05} />
      <Gauge from={B.corridorIn + 10} />
      <TopicLabel />
      <Subtitles />
      <SfxTrack until={PREVIEW_FRAMES} />
    </AbsoluteFill>
  );
};
