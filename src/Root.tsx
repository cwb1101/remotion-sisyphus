import React from 'react';
import { Composition } from 'remotion';
import beatmap from './data/beatmap.json';
import { screen } from './data/subtitles';
import { Film } from './Film';
import { FPS, H, W } from './film/theme';

// 预览：开头 + 第一节的开场，到第 10 屏（地球升起）结束
const PREVIEW_END = screen(10).end;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Overview"
      component={Film}
      durationInFrames={beatmap.durationInFrames}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ durationInFrames: beatmap.durationInFrames }}
    />
    <Composition
      id="Preview"
      component={Film}
      durationInFrames={PREVIEW_END}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ durationInFrames: PREVIEW_END, fadeOutFrames: 12 }}
    />
  </>
);
