import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import {PREVIEW_END, SCRIPT} from './data/script';
import './fonts';

const {fps, width, height} = SCRIPT.meta;

export const Root: React.FC = () => (
	<>
		<Composition
			id="Preview"
			component={Film}
			durationInFrames={PREVIEW_END}
			fps={fps}
			width={width}
			height={height}
			defaultProps={{textOnly: false, audio: 'audio/preview.wav'}}
		/>
		<Composition
			id="PreviewTextAudit"
			component={Film}
			durationInFrames={PREVIEW_END}
			fps={fps}
			width={width}
			height={height}
			defaultProps={{textOnly: true}}
		/>
	</>
);
