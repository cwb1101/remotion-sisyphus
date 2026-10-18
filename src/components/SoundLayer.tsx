// 声音: BGM + 合成音效. 音效时间全部来自 subtitles.ts 的 sfx 和走路关键帧
// BGM 比音效低; 重音效响起时 BGM 压低 6dB 约 0.5 秒
import React from 'react';
import {Audio, interpolate, Sequence, staticFile} from 'remotion';
import {HEAVY_FRAMES, SOUND_EVENTS} from '../lib/timeline';

// 0.28: 留出余量, 让重卡点的重音效 (slam) 成为全片听感最响的时刻
export const BGM_GAIN = 0.28;
export const DUCK_DB = -6;

/** BGM 在某一帧的音量: 重音效前 2 帧开始压, 保持 13 帧, 再用 6 帧放回 (共约 0.5 秒) */
export const bgmVolume = (f: number) => {
	let duck = 1;
	const low = Math.pow(10, DUCK_DB / 20);
	for (const h of HEAVY_FRAMES) {
		const k = interpolate(f, [h - 2, h, h + 13, h + 19], [1, low, low, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		duck = Math.min(duck, k);
	}
	return BGM_GAIN * duck;
};

export const SoundLayer: React.FC<{durationInFrames: number}> = ({durationInFrames}) => (
	<>
		<Audio src={staticFile('audio/bgm.wav')} volume={bgmVolume} />
		{SOUND_EVENTS.filter((e) => e.frame < durationInFrames).map((e, i) => (
			<Sequence key={i} from={Math.max(0, e.frame)} durationInFrames={Math.min(150, durationInFrames - e.frame)} layout="none">
				<Audio src={staticFile(`sfx/${e.name}.wav`)} volume={Math.min(1, e.gain * (e.heavy ? 1 : 0.85))} />
			</Sequence>
		))}
	</>
);
