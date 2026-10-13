import React from 'react';
import {Composition} from 'remotion';
import {FPS} from './data/script';
import {previewDuration} from './data/timeline';
import {Preview} from './Preview';

export const Root: React.FC = () => (
  <Composition id="Preview" component={Preview} durationInFrames={previewDuration()} fps={FPS} width={1920} height={1080} />
);
