import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-900.css';
import {PREVIEW_DURATION, SCREENS} from './data/script';
import {Background} from './components/Background';
import {Subtitles} from './components/Subtitles';
import {Motes} from './components/Particles';
import {TearDefs} from './components/tear/Tear';
import {WaterLine} from './components/tear/WaterLine';
import {Opening, openingSplashes, waterOrigin} from './sections/Opening';
import {NotADiagnosis, section2Splashes} from './sections/NotADiagnosis';
import {camera, lighting, WATER_Y} from './shot';
import {prog} from './lib/anim';
import {C} from './theme';

/** 等思源黑体加载完再渲染，避免首帧回退字体 */
const useFonts = () => {
	const [handle] = useState(() => delayRender('Noto Sans SC'));
	useEffect(() => {
		const text = SCREENS.map((s) => s.text).join('');
		Promise.all([
			document.fonts.load(`700 66px "Noto Sans SC"`, text),
			document.fonts.load(`900 180px "Noto Sans SC"`, text),
		])
			.then(() => continueRender(handle))
			.catch((e) => {
				console.error(e);
				continueRender(handle);
			});
	}, [handle]);
};

export const Preview: React.FC = () => {
	useFonts();
	const f = useCurrentFrame();
	const cam = camera(f);
	const light = lighting(f);
	const splashes = [...openingSplashes(), ...section2Splashes()];
	const fadeOut = prog(f, PREVIEW_DURATION - 18, PREVIEW_DURATION - 1);
	return (
		<AbsoluteFill style={{backgroundColor: C.bg}}>
			<Background frame={f} {...light} />
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				<defs>
					<TearDefs />
				</defs>
				{/* 远景微光：0.5 倍视差 */}
				<g transform={`translate(960,540) scale(${cam.zoom}) translate(${-cam.cx * 0.5 - 480},${-cam.cy})`}>
					<Motes frame={f} x0={-400} x1={3400} count={70} />
				</g>
				{/* 世界：整片一个连续镜头 */}
				<g transform={`translate(960,540) scale(${cam.zoom}) translate(${-cam.cx},${-cam.cy})`}>
					<WaterLine
						frame={f}
						y={WATER_Y}
						x0={-1200}
						x1={5400}
						origin={waterOrigin()}
						splashes={splashes}
						body={light.under}
					/>
					<Opening frame={f} />
					<NotADiagnosis frame={f} />
				</g>
			</svg>
			<Subtitles lastFrame={PREVIEW_DURATION} />
			<AbsoluteFill style={{backgroundColor: C.bg, opacity: fadeOut}} />
			<Audio src={staticFile('audio/preview.wav')} />
		</AbsoluteFill>
	);
};
