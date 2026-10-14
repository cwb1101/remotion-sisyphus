import React from 'react';
import {Composition} from 'remotion';
import {FPS, FULL_DURATION, HEIGHT, PREVIEW_DURATION, WIDTH} from './data/script';
import {Preview} from './Preview';
import {Full} from './Full';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="Full" component={Full} durationInFrames={FULL_DURATION} fps={FPS} width={WIDTH} height={HEIGHT} />
		<Composition
			id="Preview"
			component={Preview}
			durationInFrames={PREVIEW_DURATION}
			fps={FPS}
			width={WIDTH}
			height={HEIGHT}
		/>
	</>
);
