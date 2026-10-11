import React from 'react';
import {Composition, Still} from 'remotion';
import {FPS, HEIGHT, PREVIEW_END, WIDTH} from './data/script';
import {Preview} from './Preview';
import {StyleA, StyleB, StyleC} from './style/StyleFrames';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition id="Preview" component={Preview} durationInFrames={PREVIEW_END} fps={FPS} width={WIDTH} height={HEIGHT} />
		<Still id="StyleA" component={StyleA} width={WIDTH} height={HEIGHT} />
		<Still id="StyleB" component={StyleB} width={WIDTH} height={HEIGHT} />
		<Still id="StyleC" component={StyleC} width={WIDTH} height={HEIGHT} />
	</>
);
