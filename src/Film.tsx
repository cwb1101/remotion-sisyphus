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
import {Callback} from './sections/Callback';
import {Evidence} from './sections/Evidence';
import {Fusion} from './sections/Fusion';
import {Hook} from './sections/Hook';
import {Mechanism, OpenGround} from './sections/Mechanism';
import {EndCard, Outro} from './sections/Outro';
import {Quote} from './sections/Quote';
import {Turn} from './sections/Turn';
import {Bedroom, You} from './sections/You';
import {COLORS} from './theme';

const ALL_TEXT = [...SCREENS.map((s) => s.text + (s.note ?? '')), ...CREDITS, '肆号静匣Logos', '陪伴倾听安全感成长意义理解回应全部', '爱的浓度科普内容不构成心理诊断', '睡了吗你还爱我吗爱在吗你在忙吗回我在不在嗯'].join('');

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
					<Hook layer="back" />
					<Evidence />
					<Fusion />
					<Bedroom />
					<You />
					<OpenGround />
					<Mechanism />
					<Turn />
					<Quote />
					<Callback />
					<Outro />
					<Hook layer="front" />
				</CameraLayer>
				<Atmosphere />
				<Subtitles />
				<EndCard />
				<Watermark />
				{mode === 'normal' ? <SoundLayer durationInFrames={durationInFrames} /> : null}
			</AbsoluteFill>
		</RenderModeContext.Provider>
	);
};
