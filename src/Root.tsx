import React from 'react';
import {Composition} from 'remotion';
import {FPS} from './data/subtitles';
import {Film} from './Film';
import {MYTH_END} from './sections/Myth';
import {HEIGHT, WIDTH} from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    {/* 预览：开头 + 第一节 */}
    <Composition
      id="Preview"
      component={Film}
      durationInFrames={MYTH_END}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{sections: ['opening', 'myth']}}
    />
  </>
);
