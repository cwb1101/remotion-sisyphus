import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {Subtitle} from './components/Subtitle';
import {Watermark} from './components/Watermark';
import {ramp} from './lib/anim';
import {S01Hook} from './sections/S01Hook';
import {S02Question} from './sections/S02Question';
import {S03Choice} from './sections/S03Choice';
import {S04Name} from './sections/S04Name';
import {S05Examples} from './sections/S05Examples';
import {S06Threshold} from './sections/S06Threshold';
import {S07Ledger} from './sections/S07Ledger';
import {S08Installment} from './sections/S08Installment';
import {S09Close} from './sections/S09Close';
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

/** 完整片：九节接力；水印与字幕都在镜头之外 */
export const Film: React.FC = () => {
	const frame = useCurrentFrame();
	return (
		<AbsoluteFill style={{backgroundColor: C.bg}}>
			<S01Hook />
			<S02Question />
			<S03Choice />
			<S04Name />
			<S05Examples />
			<S06Threshold />
			<S07Ledger />
			<S08Installment />
			<S09Close />
			<Subtitle frame={frame} />
			<Watermark />
			<Audio src={staticFile('audio/sfx.wav')} />
		</AbsoluteFill>
	);
};
