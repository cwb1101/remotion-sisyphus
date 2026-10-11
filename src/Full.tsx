/**
 * 完整片：八节连续一个镜头。
 * 前三节直接复用预览的组件与机位（第 1215 帧之前的画面与预览逐帧一致），
 * 之后的机位从预览机位在第 18 屏开始处的位置接续。
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FULL_END, sectionRange, sections} from './data/script';
import {C} from './theme';
import {createCamera} from './lib/camera';
import {Atmosphere, Haze} from './components/Stage';
import {Subtitles} from './components/Subtitles';
import {ChapterTag} from './components/Hud';
import {SoundTrack} from './components/SoundTrack';
import {Watermark} from './components/Props';
import {Hook, hookCamera} from './sections/Hook';
import {Question, questionCamera} from './sections/Question';
import {WhatItLooksLike, whatCamera} from './sections/WhatItLooksLike';
import {Origin, originCamera} from './sections/Origin';
import {Express, expressCamera} from './sections/Express';
import {Cycle, cycleCamera} from './sections/Cycle';
import {Change, changeCamera} from './sections/Change';
import {Ending, endingCamera} from './sections/Ending';
import './fonts';

const SPLIT = sectionRange('what').end;
const camA = createCamera([...hookCamera, ...questionCamera, ...whatCamera]);
const camB = createCamera([camA.keyAt(SPLIT), ...originCamera, ...expressCamera, ...cycleCamera, ...changeCamera, ...endingCamera]);
const cameraAt = (f: number) => (f < SPLIT ? camA.cameraAt(f) : camB.cameraAt(f));
const ALL = sections.map((s) => s.id);

export const Full: React.FC = () => {
	const frame = useCurrentFrame();
	const cam = cameraAt(frame);
	return (
		<AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
			<Haze frame={frame} />
			<Hook frame={frame} cam={cam} />
			<Question frame={frame} cam={cam} />
			<WhatItLooksLike frame={frame} cam={cam} tail={0} />
			<Origin frame={frame} cam={cam} />
			<Express frame={frame} cam={cam} />
			<Cycle frame={frame} cam={cam} />
			<Change frame={frame} cam={cam} />
			<Ending frame={frame} cam={cam} />
			<Atmosphere frame={frame} />
			<ChapterTag frame={frame} />
			<Watermark />
			<Subtitles frame={frame} sectionIds={ALL} />
			<SoundTrack end={FULL_END} sectionIds={ALL} />
		</AbsoluteFill>
	);
};
