import React from 'react';
import {Composition} from 'remotion';
import {Film, type FilmProps} from './Film';
import {DURATION, FPS} from './data/beatmap';
import {screenById} from './lib/timeline';

// 预览: 开头 (屏 1-9) + 第一节实证 (屏 10-13)
export const PREVIEW_END = screenById(14).startFrame;

export const RemotionRoot: React.FC = () => (
	<>
		<Composition<any, FilmProps>
			id="Preview"
			component={Film}
			durationInFrames={PREVIEW_END}
			fps={FPS}
			width={1920}
			height={1080}
			defaultProps={{mode: 'normal'}}
		/>
		<Composition<any, FilmProps>
			id="Film"
			component={Film}
			durationInFrames={DURATION}
			fps={FPS}
			width={1920}
			height={1080}
			defaultProps={{mode: 'normal'}}
		/>
	</>
);
