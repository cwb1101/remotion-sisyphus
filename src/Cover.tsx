import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import '@fontsource/noto-sans-sc/chinese-simplified-500.css';
import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-900.css';
import '@fontsource/noto-sans-sc/latin-500.css';
import {Figure, headCenter, pose} from './components/Figure';
import {Tear, TearDefs} from './components/tear/Tear';
import {Watermark, WATERMARK_TEXT} from './components/Watermark';
import {C, FONT} from './theme';

/**
 * 3:4 竖版封面（1080×1440）。沿用正片的视觉方向 A：
 * 开场构图（两人对立、气泡里只有省略号）+ 比话先落下的泪滴 + 发光水位线。
 * 文字只放在中上部，避开右上角水印和底部的平台信息栏。
 */
export const COVER = {w: 1080, h: 1440};
export const COVER_TEXT = {
	kicker: '明明不想哭',
	title: '泪失禁体质',
	hook: '为什么眼泪总比话先到？',
};

const WATER_Y = 1130;
/** 泪滴：落在两人之间的空当，正下方是涟漪中心 */
const TEAR_X = 470;
const TEAR_Y = 960;
const A = {x: 330, h: 380, pose: pose({pitch: -15, lean: -3, shoulderF: 24, elbowF: 46})};
const B = {x: 790, h: 440, pose: pose({pitch: 8, lean: 3})};

const useFonts = () => {
	const [handle] = useState(() => delayRender('Noto Sans SC'));
	useEffect(() => {
		const text = Object.values(COVER_TEXT).join('');
		Promise.all([
			document.fonts.load(`900 170px "Noto Sans SC"`, text),
			document.fonts.load(`700 60px "Noto Sans SC"`, text),
			document.fonts.load(`500 22px "Noto Sans SC"`, WATERMARK_TEXT),
		]).finally(() => continueRender(handle));
	}, [handle]);
};

const waterPath = () => {
	const pts: string[] = [];
	for (let x = -20; x <= COVER.w + 20; x += 10) {
		const d = Math.abs(x - TEAR_X);
		const ripple = d < 520 ? 7 * Math.exp(-d / 260) * Math.sin(d * 0.05) : 0;
		pts.push(`${x},${(WATER_Y + 2 * Math.sin(x * 0.013) + ripple).toFixed(1)}`);
	}
	return `M ${pts.join(' L ')}`;
};

export const Cover: React.FC = () => {
	useFonts();
	const [hx, hy] = headCenter({x: A.x, y: WATER_Y, height: A.h, facing: 1}, A.pose);
	const line = waterPath();
	return (
		<AbsoluteFill style={{backgroundColor: C.bg}}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 760px 620px at 50% 34%, ${C.bgGlowHi} 0%, ${C.bgGlow} 45%, rgba(14,26,43,0) 100%)`,
				}}
			/>
			<AbsoluteFill
				style={{
					background: 'radial-gradient(ellipse 900px 360px at 42% 100%, rgba(92,200,255,0.22) 0%, rgba(14,26,43,0) 100%)',
				}}
			/>
			<svg width={COVER.w} height={COVER.h} style={{position: 'absolute'}}>
				<defs>
					<TearDefs />
				</defs>
				{/* 远处的微光 */}
				{Array.from({length: 46}).map((_, i) => {
					const r1 = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
					const r2 = Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1;
					return <circle key={i} cx={r1 * COVER.w} cy={60 + r2 * 1000} r={1.5 + (i % 3)} fill="#BFE6FF" opacity={0.18 + (i % 4) * 0.06} />;
				})}
				{/* 水体与水位线 */}
				<rect x={0} y={WATER_Y} width={COVER.w} height={COVER.h - WATER_Y} fill="url(#waterBody)" />
				<path d={line} fill="none" stroke="#5CC8FF" strokeWidth={12} opacity={0.5} filter="url(#lineGlow)" />
				<path d={line} fill="none" stroke="#9EDFFF" strokeWidth={3.5} />
				{/* 泪滴落点的涟漪 */}
				{[0, 1, 2].map((i) => (
					<ellipse key={i} cx={TEAR_X} cy={WATER_Y} rx={46 + i * 58} ry={(46 + i * 58) * 0.16} fill="none" stroke="#9EDFFF" strokeWidth={2.5} opacity={0.75 - i * 0.22} />
				))}
				{/* 人物：和正片开场同一个构图 */}
				<Figure x={B.x} y={WATER_Y} height={B.h} facing={-1} pose={B.pose} color={C.figureDeep} rim="#6F8FB3" />
				<Figure x={A.x} y={WATER_Y} height={A.h} facing={1} pose={A.pose} color={C.figure} backColor="#27405E" rim={C.figureRim} />
				{/* 话还没出口：气泡里只有省略号 */}
				<g transform={`translate(${hx + 96},${hy - 112})`}>
					<path d="M -40 40 L -74 84 L -12 48 Z" fill="#1B3350" stroke={C.figureRim} strokeWidth={3} strokeLinejoin="round" />
					<ellipse cx={0} cy={0} rx={98} ry={62} fill="#1B3350" stroke={C.figureRim} strokeWidth={3} />
					<path d="M -38 44 L -16 47" stroke="#1B3350" strokeWidth={7} />
					{[-32, 0, 32].map((dx, i) => (
						<circle key={dx} cx={dx} cy={-4 * (i === 1 ? 1 : 0)} r={9} fill={C.figureRim} />
					))}
				</g>
				{/* 主角：比话先落下的泪滴 */}
				{/* 从脸边落下的轨迹 */}
				{[0.18, 0.34, 0.5, 0.66].map((t, i) => (
					<circle
						key={t}
						cx={hx + 34 + (TEAR_X - hx - 34) * Math.sqrt(t)}
						cy={hy + 24 + (TEAR_Y - 70 - hy - 24) * t}
						r={3 + i * 1.2}
						fill="#9EDFFF"
						opacity={0.25 + i * 0.12}
					/>
				))}
				<Tear x={TEAR_X} y={TEAR_Y} r={26} stretch={1.3} />
			</svg>
			{/* 文字区：中上部 */}
			<div
				style={{
					position: 'absolute',
					top: 150,
					left: 70,
					right: 70,
					textAlign: 'center',
					fontFamily: FONT,
					color: C.white,
				}}
			>
				<div style={{fontSize: 58, fontWeight: 700, letterSpacing: '0.06em', textShadow: '0 2px 10px rgba(0,0,0,0.6)'}}>
					{COVER_TEXT.kicker}
				</div>
				<div
					style={{
						marginTop: 6,
						fontSize: 176,
						fontWeight: 900,
						lineHeight: 1.12,
						color: C.blue,
						textShadow: '0 0 34px rgba(92,200,255,0.55), 0 4px 18px rgba(0,0,0,0.5)',
					}}
				>
					{COVER_TEXT.title}
				</div>
				<div style={{marginTop: 22, fontSize: 60, fontWeight: 700, textShadow: '0 2px 10px rgba(0,0,0,0.6)'}}>
					{COVER_TEXT.hook}
				</div>
			</div>
			<Watermark />
		</AbsoluteFill>
	);
};
