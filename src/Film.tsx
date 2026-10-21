import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Subtitle} from './components/Subtitle';
import {ramp} from './lib/anim';
import {S01Hook} from './sections/S01Hook';
import {S02Question} from './sections/S02Question';
import {S03Choice} from './sections/S03Choice';
import {C} from './theme';

// 整片：各节按数据文件里的帧区间依次接力，同一条镜头轨道；字幕层在最上面，不跟镜头。

export const Preview: React.FC<{endFrame: number; durationInFrames: number}> = ({endFrame, durationInFrames}) => {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill style={{backgroundColor: C.bg}}>
			<S01Hook />
			<S02Question />
			<S03Choice holdUntil={durationInFrames} />
			<Subtitle frame={frame} />
			<AbsoluteFill style={{backgroundColor: '#000', opacity: ramp(frame, endFrame, durationInFrames)}} />
			<Audio src={staticFile('audio/sfx.wav')} />
		</AbsoluteFill>
	);
};
