import React from 'react';
import {Composition} from 'remotion';
import '@fontsource/noto-sans-sc/500.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/noto-serif-sc/900.css';
import {DURATION, FPS, HEIGHT, WIDTH} from './data/script';
import {Preview} from './Preview';

export const RemotionRoot: React.FC = () => (
  <Composition id="Preview" component={Preview} durationInFrames={DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
);
