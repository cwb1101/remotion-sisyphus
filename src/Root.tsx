import React from 'react';
import {Composition} from 'remotion';
import {FPS, FULL_END, HEIGHT, PREVIEW_END, WIDTH} from './data/script';
import {Preview} from './Preview';
import {Full} from './Full';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="Preview" component={Preview} durationInFrames={PREVIEW_END} fps={FPS} width={WIDTH} height={HEIGHT} />
		<Composition id="Full" component={Full} durationInFrames={FULL_END} fps={FPS} width={WIDTH} height={HEIGHT} />
	</>
);
