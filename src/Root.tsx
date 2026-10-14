import React from 'react';
import {Composition, staticFile} from 'remotion';
import {loadFont} from '@remotion/fonts';
import {Film} from './Film';
import {FONT_LATIN, FONT_SANS, FONT_SERIF} from './theme';
import {FPS, PREVIEW} from './lib/timeline';

// 字体全部本地加载（public/fonts，由 scripts/build-fonts.py 生成的子集）
loadFont({family: FONT_SERIF, url: staticFile('fonts/SourceHanSerifSC-SemiBold.woff2'), weight: '600'});
loadFont({family: FONT_SANS, url: staticFile('fonts/SourceHanSansSC-Light.woff2'), weight: '300'});
loadFont({family: FONT_LATIN, url: staticFile('fonts/SourceSans3-Light.woff2'), weight: '300'});

export const Root: React.FC = () => (
  <>
    <Composition
      id="Preview"
      component={Film}
      durationInFrames={PREVIEW.to - PREVIEW.from}
      fps={FPS}
      width={1920}
      height={1080}
      defaultProps={{subtitles: 'full' as const, audio: true}}
    />
  </>
);
