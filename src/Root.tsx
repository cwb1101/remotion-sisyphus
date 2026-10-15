import React from 'react';
import {Composition} from 'remotion';
import {Full} from './Full';
import {Preview} from './Preview';
import {FULL_DURATION, PREVIEW_DURATION, SCRIPT} from './data/script';

export const Root: React.FC = () => (
	<>
		<Composition
			id="Preview"
			component={Preview}
			durationInFrames={PREVIEW_DURATION}
			fps={SCRIPT.fps}
			width={SCRIPT.width}
			height={SCRIPT.height}
		/>
		<Composition
			id="Full"
			component={Full}
			durationInFrames={FULL_DURATION}
			fps={SCRIPT.fps}
			width={SCRIPT.width}
			height={SCRIPT.height}
			defaultProps={{withAudio: true}}
		/>
	</>
);
