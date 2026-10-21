import React from 'react';
import {Html5Audio, Sequence, staticFile} from 'remotion';
import {FPS} from '../data/script';
import {SFX, type SfxCue} from './catalog';

/** 按时间轴摆放合成音效 */
export const SfxTrack: React.FC<{cues: SfxCue[]; until?: number}> = ({cues, until = Infinity}) => (
	<>
		{cues
			.filter((c) => c.f < until)
			.map((c, i) => (
				<Sequence key={`${c.name}-${c.f}-${i}`} from={c.f} durationInFrames={Math.ceil(SFX[c.name].seconds * FPS) + 2} layout="none" name={`sfx ${c.name}`}>
					<Html5Audio src={staticFile(`sfx/${c.name}.wav`)} volume={c.volume ?? 1} />
				</Sequence>
			))}
	</>
);
