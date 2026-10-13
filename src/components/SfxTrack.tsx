/**
 * 音效轨：所有 wav 由 `npm run sfx` 用代码合成（scripts/synth-sfx.ts），
 * 放置的帧号全部来自 script.ts —— 每屏的 sfx cue + 每个场景的环境底噪。
 */
import React from 'react';
import {Html5Audio, Sequence, staticFile} from 'remotion';
import {SCENES, SCREENS, SceneId} from '../data/script';
import {cueFrames, sceneRange} from '../data/timeline';

export const SfxTrack: React.FC<{scenes: SceneId[]; overlap: number}> = ({scenes, overlap}) => {
  const items: React.ReactNode[] = [];
  for (const id of scenes) {
    const sc = SCENES.find((s) => s.id === id)!;
    const r = sceneRange(id);
    if (sc.bed) {
      items.push(
        <Sequence key={`bed-${id}`} from={Math.max(0, r.start - overlap)} durationInFrames={r.end - r.start + overlap * 2} layout="none">
          <Html5Audio src={staticFile(`sfx/${sc.bed}.wav`)} volume={0.9} />
        </Sequence>,
      );
    }
    for (const s of SCREENS.filter((x) => x.scene === id)) {
      for (const [ci, c] of (s.sfx ?? []).entries()) {
        cueFrames(s, c).forEach((f, k) => {
          items.push(
            <Sequence key={`${s.id}-${ci}-${k}`} from={f} layout="none">
              <Html5Audio src={staticFile(`sfx/${c.id}.wav`)} volume={c.volume ?? 1} />
            </Sequence>,
          );
        });
      }
    }
  }
  return <>{items}</>;
};
