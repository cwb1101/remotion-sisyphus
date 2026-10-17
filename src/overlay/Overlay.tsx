import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Subtitle} from '../components/Subtitle';
import {ProgressBar} from './ProgressBar';
import {TopicBadge} from './TopicBadge';
import {Watermark} from './Watermark';

// 固定覆盖层 不受镜头运动影响
export const Overlay: React.FC = () => (
	<AbsoluteFill style={{pointerEvents: 'none'}}>
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				bottom: 0,
				height: 400,
				background:
					'linear-gradient(to top, rgba(12,11,9,0.82) 0%, rgba(12,11,9,0.55) 40%, rgba(12,11,9,0) 100%)',
			}}
		/>
		<Subtitle />
		<TopicBadge />
		<Watermark />
		<ProgressBar />
	</AbsoluteFill>
);
