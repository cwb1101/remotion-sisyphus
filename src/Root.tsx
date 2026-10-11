import React from 'react';
import {Composition} from 'remotion';
import {CUES, FPS} from './data/subtitles';
import {Cover, CoverVertical} from './Cover';
import {Film} from './Film';
import {MYTH_END} from './sections/Myth';
import {HEIGHT, WIDTH} from './theme';

/** 全片时长 = 最后一屏的结束帧 */
const FULL_END = CUES[CUES.length - 1].end;

export const RemotionRoot: React.FC = () => (
  <>
    {/* 完整片：七节，一个连续镜头 */}
    <Composition
      id="Sisyphus"
      component={Film}
      durationInFrames={FULL_END}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{sections: ['opening', 'myth', 'punishment', 'absurd', 'descent', 'answer', 'ending'], fadeOut: false}}
    />
    {/* 16:9 封面（单帧） */}
    <Composition id="Cover" component={Cover} durationInFrames={1} fps={FPS} width={WIDTH} height={HEIGHT} />
    {/* 9:16 竖版封面（单帧） */}
    <Composition id="CoverVertical" component={CoverVertical} durationInFrames={1} fps={FPS} width={1080} height={1920} />
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
