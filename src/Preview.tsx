import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-900.css';
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Subtitles} from './components/Subtitles';
import {PREVIEW_DURATION, PREVIEW_SCREENS} from './data/script';
import {Opening} from './sections/Opening';
import {Section1} from './sections/Section1';
import {Section2} from './sections/Section2';
import {FONT_FAMILY} from './theme';

// 字体加载完再出帧，避免字幕用回退字体渲染
const useFonts = () => {
	const [handle] = useState(() => delayRender('Loading Noto Sans SC'));
	useEffect(() => {
		const sample = PREVIEW_SCREENS.map((s) => s.text + (s.impact?.text ?? '')).join('');
		Promise.all([
			document.fonts.load(`700 64px ${FONT_FAMILY}`, sample),
			document.fonts.load(`900 190px ${FONT_FAMILY}`, sample),
		])
			.then(() => continueRender(handle))
			.catch((e) => {
				console.error(e);
				continueRender(handle);
			});
	}, [handle]);
};

// 预览：开头 + 第一节 + 第二节前四屏，整片是一个连续镜头
export const Preview: React.FC = () => {
	useFonts();
	const frame = useCurrentFrame();
	const endFade = interpolate(frame, [PREVIEW_DURATION - 22, PREVIEW_DURATION - 1], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});
	return (
		<AbsoluteFill style={{backgroundColor: '#000000'}}>
			<Opening />
			<Section1 />
			<Section2 />
			<AbsoluteFill style={{backgroundColor: '#000000', opacity: endFade}} />
			<Subtitles screens={PREVIEW_SCREENS} />
			<Audio src={staticFile('audio/preview-mix.wav')} />
		</AbsoluteFill>
	);
};
