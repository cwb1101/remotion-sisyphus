import React from 'react';
import {Html5Audio, Sequence, staticFile} from 'remotion';

export type SfxName =
  | 'thump' | 'impact' | 'tick' | 'grind' | 'roll' | 'bell' | 'bell_low' | 'shatter' | 'sizzle'
  | 'whoosh' | 'riser' | 'ping' | 'slide' | 'zap' | 'swell' | 'chain' | 'lock' | 'whine'
  | 'snap' | 'sub_drop' | 'arp' | 'rumble' | 'dissonant_hit';

/** 所有音效的总增益：几个音效叠在同一帧时不削波 */
const MASTER = 0.62;

/** 在第 at 帧播放一个合成音效（public/sfx/<name>.wav，由 scripts/synth-sfx.mjs 生成） */
export const Sfx: React.FC<{name: SfxName; at: number; volume?: number; rate?: number}> = ({name, at, volume = 1, rate = 1}) => (
  <Sequence from={Math.round(at)} layout="none" name={`sfx:${name}`}>
    <Html5Audio src={staticFile(`sfx/${name}.wav`)} volume={volume * MASTER} playbackRate={rate} />
  </Sequence>
);
