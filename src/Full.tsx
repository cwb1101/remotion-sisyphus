import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-900.css';
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile} from 'remotion';
import {Watermark} from './components/Overlays';
import {Subtitles} from './components/Subtitles';
import {onscreen, SCRIPT} from './data/script';
import {FilmModeContext} from './film';
import {Opening} from './sections/Opening';
import {Section1} from './sections/Section1';
import {Section2} from './sections/Section2';
import {Section3} from './sections/Section3';
import {Section4} from './sections/Section4';
import {Section5} from './sections/Section5';
import {Section6} from './sections/Section6';
import {FONT_FAMILY} from './theme';

const useFonts = () => {
	const [handle] = useState(() => delayRender('Loading Noto Sans SC'));
	useEffect(() => {
		const extra = SCRIPT.screens
			.map((s) => {
				const o = onscreen(s.id);
				return [o.label, o.sublabel, o.card, ...(o.words ?? []), ...(o.bubbles ?? [])].join('');
			})
			.join('');
		const sample = SCRIPT.screens.map((s) => s.text + (s.impact?.text ?? '')).join('') + extra + '肆号静匣Logos';
		Promise.all([document.fonts.load(`700 64px ${FONT_FAMILY}`, sample), document.fonts.load(`900 190px ${FONT_FAMILY}`, sample)])
			.then(() => continueRender(handle))
			.catch((e) => {
				console.error(e);
				continueRender(handle);
			});
	}, [handle]);
};

// 完整片：六节连续镜头 + 底部字幕 + 右上角固定水印 + 整片音轨
// withAudio=false 用于分段渲染（画面分段，音轨在拼接后一次性封装，避免接缝爆音/断音）
export const Full: React.FC<{withAudio?: boolean}> = ({withAudio = true}) => {
	useFonts();
	return (
		<FilmModeContext.Provider value="full">
			<AbsoluteFill style={{backgroundColor: '#000000'}}>
				<Opening />
				<Section1 />
				<Section2 />
				<Section3 />
				<Section4 />
				<Section5 />
				<Section6 />
				<Subtitles screens={SCRIPT.screens} />
				<Watermark />
				{withAudio ? <Audio src={staticFile('audio/full-mix.wav')} /> : null}
			</AbsoluteFill>
		</FilmModeContext.Provider>
	);
};
