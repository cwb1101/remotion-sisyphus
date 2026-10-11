import React from 'react';
import {Composition} from 'remotion';
import {FPS, HEIGHT, PREVIEW_END, WIDTH} from './data/script';
import {Preview} from './Preview';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="Preview" component={Preview} durationInFrames={PREVIEW_END} fps={FPS} width={WIDTH} height={HEIGHT} />
	</>
);
