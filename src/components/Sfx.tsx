import React from 'react';
import {Html5Audio, Sequence, staticFile} from 'remotion';

export type SfxName =
  | 'thump' | 'impact' | 'tick' | 'grind' | 'roll' | 'bell' | 'bell_low' | 'shatter' | 'sizzle'
  | 'whoosh' | 'riser' | 'ping' | 'slide' | 'zap' | 'swell' | 'chain' | 'lock' | 'whine'
  | 'snap' | 'sub_drop' | 'arp' | 'rumble' | 'dissonant_hit'
  | 'pulse' | 'heartbeat' | 'chord' | 'pad' | 'wind' | 'step';

/** 所有音效的总增益：几个音效叠在同一帧时不削波 */
const MASTER = 0.55;
/** 全片音量统一：除了关键句的冲击声（impact），其他音效的音量都不超过这个上限，保证关键句最响 */
const CAP = 0.6;
/** 低频很重的音效听感更响，再单独压一档 */
const TRIM: Partial<Record<SfxName, number>> = {sub_drop: 0.5, rumble: 0.55, grind: 0.7, pad: 0.65, swell: 0.75, bell_low: 0.75, roll: 0.8, snap: 0.75, heartbeat: 0.8, whoosh: 0.55, riser: 0.7};

/** 在第 at 帧播放一个合成音效（public/sfx/<name>.wav，由 scripts/synth-sfx.mjs 生成） */
export const Sfx: React.FC<{name: SfxName; at: number; volume?: number; rate?: number}> = ({name, at, volume = 1, rate = 1}) => (
  <Sequence from={Math.round(at)} layout="none" name={`sfx:${name}`}>
    <Html5Audio src={staticFile(`sfx/${name}.wav`)} volume={(name === 'impact' ? volume : Math.min(volume, CAP) * (TRIM[name] ?? 1)) * MASTER} playbackRate={rate} />
  </Sequence>
);
