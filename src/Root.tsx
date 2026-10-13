import React from 'react';
import {Composition} from 'remotion';
import {FPS} from './data/script';
import {previewDuration} from './data/timeline';
import {Film, filmDuration} from './Film';
import {Preview} from './Preview';

export const Root: React.FC = () => (
  <>
    <Composition id="Film" component={Film} durationInFrames={filmDuration()} fps={FPS} width={1920} height={1080} />
    <Composition id="Preview" component={Preview} durationInFrames={previewDuration()} fps={FPS} width={1920} height={1080} />
  </>
);
