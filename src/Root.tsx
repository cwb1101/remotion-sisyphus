import React from 'react';
import { Composition, Still } from 'remotion';
import { script } from './data/script';
import { Cover } from './Cover';
import { Film } from './Film';
import { Preview } from './Preview';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Preview"
      component={Preview}
      durationInFrames={script.preview.endFrame - script.preview.startFrame}
      fps={script.fps}
      width={script.width}
      height={script.height}
      defaultProps={{ textOnly: false }}
    />
    {/* 只渲染文字层（黑底），用于自动检查禁字区、字幕区和大字区 */}
    <Composition
      id="PreviewTextOnly"
      component={Preview}
      durationInFrames={script.preview.endFrame - script.preview.startFrame}
      fps={script.fps}
      width={script.width}
      height={script.height}
      defaultProps={{ textOnly: true }}
    />
    <Composition
      id="Film"
      component={Film}
      durationInFrames={script.film.endFrame - script.film.startFrame}
      fps={script.fps}
      width={script.width}
      height={script.height}
      defaultProps={{ textOnly: false }}
    />
    <Composition
      id="FilmTextOnly"
      component={Film}
      durationInFrames={script.film.endFrame - script.film.startFrame}
      fps={script.fps}
      width={script.width}
      height={script.height}
      defaultProps={{ textOnly: true }}
    />
    {/* 3:4 封面 */}
    <Still id="Cover" component={Cover} width={1080} height={1440} />
  </>
);
