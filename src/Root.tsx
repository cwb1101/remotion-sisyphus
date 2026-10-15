import React from 'react';
import {Composition} from 'remotion';
import {Preview} from './Preview';
import {PREVIEW_DURATION, SCRIPT} from './data/script';

export const Root: React.FC = () => (
	<Composition
		id="Preview"
		component={Preview}
		durationInFrames={PREVIEW_DURATION}
		fps={SCRIPT.fps}
		width={SCRIPT.width}
		height={SCRIPT.height}
	/>
);
