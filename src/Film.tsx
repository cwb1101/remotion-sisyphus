// 全片: 镜头层 (世界) + 氛围层 + 字幕层 + 水印层 + 声音
// 水印在镜头层外面, 不随镜头动
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, useVideoConfig} from 'remotion';
import {Atmosphere} from './components/Atmosphere';
import {CameraLayer} from './components/Camera';
import {RenderModeContext, type RenderMode} from './components/Character';
import {SoundLayer} from './components/SoundLayer';
import {Subtitles} from './components/Subtitles';
import {Watermark} from './components/Watermark';
import {CREDITS, SCREENS} from './data/subtitles';
import {Evidence} from './sections/Evidence';
import {Hook} from './sections/Hook';
import {COLORS} from './theme';

const ALL_TEXT = [...SCREENS.map((s) => s.text + (s.note ?? '')), ...CREDITS, '肆号静匣Logos', '陪伴倾听安全感成长意义理解回应全部'].join('');

const useFonts = () => {
	const [handle] = useState(() => delayRender('fonts'));
	useEffect(() => {
		Promise.all([
			document.fonts.load(`900 72px "Noto Serif SC"`, ALL_TEXT),
			document.fonts.load(`400 26px "Noto Sans SC"`, ALL_TEXT),
			document.fonts.load(`500 20px "Noto Sans SC"`, ALL_TEXT),
		])
			.then(() => continueRender(handle))
			.catch((e) => {
				console.error(e);
				continueRender(handle);
			});
	}, [handle]);
};

export type FilmProps = {mode: RenderMode};

export const Film: React.FC<FilmProps> = ({mode}) => {
	useFonts();
	const {durationInFrames} = useVideoConfig();
	const bg = mode === 'normal' ? COLORS.bg : '#000';
	return (
		<RenderModeContext.Provider value={mode}>
			<AbsoluteFill style={{background: bg}}>
				<CameraLayer>
					{mode === 'normal' ? <rect x={-6000} y={-4000} width={14000} height={9000} fill={COLORS.bg} /> : null}
					<Hook />
					<Evidence />
				</CameraLayer>
				<Atmosphere />
				<Subtitles />
				<Watermark />
				{mode === 'normal' ? <SoundLayer durationInFrames={durationInFrames} /> : null}
			</AbsoluteFill>
		</RenderModeContext.Provider>
	);
};
