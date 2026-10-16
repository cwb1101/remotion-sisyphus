import React from 'react';
import { Composition } from 'remotion';
import { SCRIPT } from './data/script';
import { Film } from './Film';
import { PersonRig } from './PersonRig';

export const Root: React.FC = () => (
  <>
    {/* 预览：开头 + 第一节（屏 1–15，0–36 秒） */}
    <Composition
      id="Preview"
      component={Film}
      durationInFrames={SCRIPT.previewEnd}
      fps={SCRIPT.fps}
      width={SCRIPT.width}
      height={SCRIPT.height}
      defaultProps={{ end: SCRIPT.previewEnd, audio: 'audio/preview.wav' }}
    />
    {/* 人物骨骼演示（不进正片） */}
    <Composition id="PersonRig" component={PersonRig} durationInFrames={240} fps={SCRIPT.fps} width={SCRIPT.width} height={SCRIPT.height} />
  </>
);
