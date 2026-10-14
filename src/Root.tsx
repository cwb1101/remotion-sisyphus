import React from 'react';
import {Composition, Still} from 'remotion';
import {FPS, FULL_DURATION, HEIGHT, PREVIEW_DURATION, WIDTH} from './data/script';
import {Preview} from './Preview';
import {Full} from './Full';
import {Cover, COVER} from './Cover';

export const RemotionRoot: React.FC = () => (
	<>
		<Still id="Cover3x4" component={Cover} width={COVER.w} height={COVER.h} />
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
