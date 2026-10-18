// BGM + 代码合成音效。BGM 比音效低；重音效响起时 BGM 压低 DUCK_DB，持续约 0.5 秒。
import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { clamp } from '../film/anim';

export interface SfxCue {
  name: string;
  /** 音效从哪一帧开始播 */
  at: number;
  /** 线性音量 */
  gain?: number;
  /** 重音效：触发 BGM 压低 */
  heavy?: boolean;
  /** 只播放前多少帧（rev_swell 这类要在 drop 前切断的） */
  frames?: number;
}

// 混音总线留 3 dB 余量：重卡点上 boom + 下沉低音 + BGM 叠加时不削波（响度在 render_full.py 里统一拉到 -14 LUFS）
const MASTER = 0.7;
const BGM_GAIN = 0.5 * MASTER; // BGM 比音效低：音效默认 0.8–1.0
const DUCK_DB = 5;
const DUCK_HOLD = 15; // 0.5 秒
const DUCK_ATTACK = 2;
const DUCK_RELEASE = 8;

const duckAt = (f: number, cues: SfxCue[]) => {
  let depth = 0;
  for (const c of cues) {
    if (!c.heavy) continue;
    const d = f - c.at;
    let k = 0;
    if (d >= -DUCK_ATTACK && d < 0) k = 1 + d / DUCK_ATTACK;
    else if (d >= 0 && d < DUCK_HOLD) k = 1;
    else if (d >= DUCK_HOLD && d < DUCK_HOLD + DUCK_RELEASE) k = 1 - (d - DUCK_HOLD) / DUCK_RELEASE;
    depth = Math.max(depth, k);
  }
  return Math.pow(10, (-DUCK_DB * depth) / 20);
};

export const Soundtrack: React.FC<{ cues: SfxCue[]; durationInFrames: number; fadeOutFrames?: number; bgmOnly?: boolean }> = ({
  cues,
  durationInFrames,
  fadeOutFrames = 0,
  bgmOnly = false,
}) => (
  <>
    <Audio
      src={staticFile('audio/bgm.wav')}
      volume={(f) => {
        const tail = fadeOutFrames > 0 ? clamp((durationInFrames - f) / fadeOutFrames) : 1;
        return BGM_GAIN * duckAt(f, cues) * tail;
      }}
    />
    {/* bgmOnly：自查用，只出 BGM（含压低），用来直接量压低曲线 */}
    {(bgmOnly ? [] : cues).map((c, i) => (
      <Sequence key={i} from={c.at} durationInFrames={c.frames} layout="none">
        <Audio src={staticFile(`sfx/${c.name}.wav`)} volume={(c.gain ?? 0.9) * MASTER} />
      </Sequence>
    ))}
  </>
);
