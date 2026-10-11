/**
 * 预览成片：钩子 + 抛出问题 + 第一节（它长什么样）。
 * 层次：舞台雾 → 各节世界层（同一台摄像机）→ 暗角颗粒 → 章节角标 → 字幕 → 音轨
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {PREVIEW_END, PREVIEW_SECTIONS, sectionRange} from './data/script';
import {C} from './theme';
import {cameraAt, registerCamera} from './lib/camera';
import {prog} from './lib/anim';
import {Atmosphere, Haze} from './components/Stage';
import {Subtitles} from './components/Subtitles';
import {ChapterTag} from './components/Hud';
import {SoundTrack} from './components/SoundTrack';
import {Hook, hookCamera} from './sections/Hook';
import {Question, questionCamera} from './sections/Question';
import {WhatItLooksLike, whatCamera} from './sections/WhatItLooksLike';
import './fonts';

registerCamera([...hookCamera, ...questionCamera, ...whatCamera]);

const LAST = sectionRange(PREVIEW_SECTIONS[PREVIEW_SECTIONS.length - 1]).end;

export const Preview: React.FC = () => {
	const frame = useCurrentFrame();
	const cam = cameraAt(frame);
	return (
		<AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
			<Haze frame={frame} />
			<Hook frame={frame} cam={cam} />
			<Question frame={frame} cam={cam} />
			<WhatItLooksLike frame={frame} cam={cam} />
			<Atmosphere frame={frame} />
			<ChapterTag frame={frame} />
			<Subtitles frame={frame} sectionIds={PREVIEW_SECTIONS} />
			<AbsoluteFill style={{background: C.bg, opacity: prog(frame, LAST + 4, PREVIEW_END - 2)}} />
			<SoundTrack end={PREVIEW_END} sectionIds={PREVIEW_SECTIONS} />
		</AbsoluteFill>
	);
};
