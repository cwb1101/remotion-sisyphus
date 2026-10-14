import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/noto-sans-sc/chinese-simplified-500.css';
import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-900.css';
import '@fontsource/noto-sans-sc/latin-500.css';
import '@fontsource/noto-sans-sc/latin-700.css';
import {FULL_DURATION, SCREENS, screen} from './data/script';
import {Background} from './components/Background';
import {Subtitles} from './components/Subtitles';
import {Motes} from './components/Particles';
import {TearDefs} from './components/tear/Tear';
import {WaterLine} from './components/tear/WaterLine';
import {Watermark, WATERMARK_TEXT} from './components/Watermark';
import {Opening, openingSplashes, waterOrigin} from './sections/Opening';
import {NotADiagnosis, section2Splashes} from './sections/NotADiagnosis';
import {FastLane, fastLaneSplashes} from './sections/FastLane';
import {WhyFaster} from './sections/WhyFaster';
import {NotLosing} from './sections/NotLosing';
import {LivingWithIt, LivingWithItOverlay} from './sections/LivingWithIt';
import {Ending, endingSplashes} from './sections/Ending';
import {actorSplashes} from './sections/ActorsView';
import {camera, lighting, WATER_Y} from './shot';
import {prog} from './lib/anim';
import {C} from './theme';

const useFonts = () => {
	const [handle] = useState(() => delayRender('Noto Sans SC'));
	useEffect(() => {
		const text = SCREENS.map((s) => s.text).join('') + '想清楚组织语言开口给我一分钟123';
		Promise.all([
			document.fonts.load(`700 66px "Noto Sans SC"`, text),
			document.fonts.load(`900 180px "Noto Sans SC"`, text),
			document.fonts.load(`500 22px "Noto Sans SC"`, WATERMARK_TEXT),
		])
			.then(() => continueRender(handle))
			.catch((e) => {
				console.error(e);
				continueRender(handle);
			});
	}, [handle]);
};

let splashCache: ReturnType<typeof openingSplashes> | null = null;
const allSplashes = () => {
	if (!splashCache) {
		splashCache = [...openingSplashes(), ...section2Splashes(), ...fastLaneSplashes(), ...actorSplashes(), ...endingSplashes()];
	}
	return splashCache;
};

/** 完整片：一镜到底，各节之间用推、拉、摇和光过渡，不黑场 */
export const Full: React.FC = () => {
	useFonts();
	const f = useCurrentFrame();
	const cam = camera(f, true);
	const light = lighting(f, true);
	const halfW = 960 / cam.zoom + 300;
	const fadeOut = prog(f, FULL_DURATION - 18, FULL_DURATION - 1);
	const drainAt = screen(9).cues.rise as number + screen(9).startFrame;
	const visible = allSplashes().filter((s) => Math.abs(s.x - cam.cx) < halfW + 800 && f >= s.frame && f < s.frame + 140);
	return (
		<AbsoluteFill style={{backgroundColor: C.bg}}>
			<Background frame={f} {...light} />
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				<defs>
					<TearDefs />
				</defs>
				<g transform={`translate(960,540) scale(${cam.zoom}) translate(${-cam.cx * 0.5 - 480},${-cam.cy})`}>
					<Motes frame={f} x0={-400} x1={8200} count={150} />
				</g>
				<g transform={`translate(960,540) scale(${cam.zoom}) translate(${-cam.cx},${-cam.cy})`}>
					<WaterLine
						frame={f}
						y={WATER_Y}
						x0={Math.floor((cam.cx - halfW) / 10) * 10}
						x1={Math.ceil((cam.cx + halfW) / 10) * 10}
						origin={waterOrigin()}
						splashes={visible}
						body={light.under}
					/>
					<Opening frame={f} />
					<NotADiagnosis frame={f} drainAt={drainAt} />
					<FastLane frame={f} />
					<WhyFaster frame={f} />
					<NotLosing frame={f} />
					<LivingWithIt frame={f} />
					<Ending frame={f} />
				</g>
			</svg>
			<LivingWithItOverlay frame={f} />
			{/* 进门时的光：铺满画面再退去（不是黑场） */}
			<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 50%, #E6F6FF 0%, #BFE6FF 55%, #8FC4E8 100%)', opacity: light.flood}} />
			<Subtitles lastFrame={FULL_DURATION} />
			<Watermark />
			<AbsoluteFill style={{backgroundColor: C.bg, opacity: fadeOut}} />
			<Audio src={staticFile('audio/full.wav')} />
		</AbsoluteFill>
	);
};
