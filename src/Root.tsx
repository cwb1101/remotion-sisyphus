import React from 'react';
import {Composition, Still} from 'remotion';
import './fonts';
import {FILM_END, FPS, screen} from './data/script';
import {Cover, COVER} from './Cover';
import {Film, Preview} from './Film';
import {H, W} from './theme';

// 预览：开头 + 第一节（第 1–11 屏），字幕结束后留 0.5 秒淡出
const PREVIEW_END = screen(11).end;
const PREVIEW_DURATION = PREVIEW_END + 15;

export const RemotionRoot: React.FC = () => (
	<>
		<Still id="Cover" component={Cover} width={COVER.width} height={COVER.height} />
		<Composition id="Film" component={Film} durationInFrames={FILM_END} fps={FPS} width={W} height={H} />
		<Composition
			id="Preview"
			component={Preview}
			durationInFrames={PREVIEW_DURATION}
			fps={FPS}
			width={W}
			height={H}
			defaultProps={{endFrame: PREVIEW_END, durationInFrames: PREVIEW_DURATION}}
		/>
	</>
);
