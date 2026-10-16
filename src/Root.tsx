import React from 'react';
import { Composition, Still } from 'remotion';
import { SCRIPT } from './data/script';
import { Film } from './Film';
import { PersonRig } from './PersonRig';
import { Cover, COVER } from './Cover';

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
    {/* 完整片：屏 1–51，0–126 秒 */}
    <Composition
      id="Film"
      component={Film}
      durationInFrames={SCRIPT.cues[SCRIPT.cues.length - 1].end}
      fps={SCRIPT.fps}
      width={SCRIPT.width}
      height={SCRIPT.height}
      defaultProps={{ end: SCRIPT.cues[SCRIPT.cues.length - 1].end, audio: 'audio/full.wav' }}
    />
    {/* 3:4 封面 */}
    <Still id="Cover" component={Cover} width={COVER.width} height={COVER.height} />
    {/* 人物骨骼演示（不进正片） */}
    <Composition id="PersonRig" component={PersonRig} durationInFrames={240} fps={SCRIPT.fps} width={SCRIPT.width} height={SCRIPT.height} />
  </>
);
