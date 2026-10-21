import React from 'react';
import {Composition} from 'remotion';
import {FPS, HEIGHT, PREVIEW_END_FRAME, TOTAL_FRAMES, WIDTH} from './data/script';
import {Film} from './Film';

export const RemotionRoot: React.FC = () => (
	<>
		{/* 预览：开头 + 第一节 + 第二节到实验结束（约 31 秒） */}
		<Composition
			id="Preview"
			component={Film}
			durationInFrames={PREVIEW_END_FRAME}
			fps={FPS}
			width={WIDTH}
			height={HEIGHT}
			defaultProps={{fadeOutFrom: PREVIEW_END_FRAME - 12, fadeOutTo: PREVIEW_END_FRAME}}
		/>
		{/* 全片（目前只完成前两节画面，其余小节只有背景和字幕） */}
		<Composition id="Full" component={Film} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} defaultProps={{}} />
	</>
);
