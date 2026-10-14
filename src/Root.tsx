import React from 'react';
import {Composition} from 'remotion';
import {FPS, HEIGHT, PREVIEW_DURATION, WIDTH} from './data/script';
import {Preview} from './Preview';

export const RemotionRoot: React.FC = () => (
	<Composition
		id="Preview"
		component={Preview}
		durationInFrames={PREVIEW_DURATION}
		fps={FPS}
		width={WIDTH}
		height={HEIGHT}
	/>
);
