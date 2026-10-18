// 3:4 封面 (1080x1440): 用片中同一套人物 杯子 配色
// 画面: 开头那一幕 主角把自己那杯倒给对方, 自己的杯见底; 上方大字是主线问题
// 文字不用标点, 重点字 渴 染金放在左侧; 右上角水印与正片同样式
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/500.css';
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender} from 'remotion';
import {Character, solveSkeleton, type CharacterProps} from './components/Character';
import {Cup, cupLip, cupSide, PourStream} from './components/Cup';
import {poseAt} from './data/poses';
import {COLORS, FONTS} from './theme';
import {HERO_LOOK, PARTNER_LOOK} from './sections/cast';

const CW = 1080;
const CH = 1440;
const TEXT = '倒得越多越渴追求高浓度的爱为什么总觉得不够肆号静匣Logos';

const useFonts = () => {
	const [handle] = useState(() => delayRender('cover-fonts'));
	useEffect(() => {
		Promise.all([document.fonts.load(`900 160px "Noto Serif SC"`, TEXT), document.fonts.load(`500 40px "Noto Sans SC"`, TEXT), document.fonts.load(`400 22px "Noto Sans SC"`, TEXT)])
			.then(() => continueRender(handle))
			.catch(() => continueRender(handle));
	}, [handle]);
};

// 世界坐标 -> 封面: 桌子在 x 0, 地面 y 0; 放大 2.3 倍, 桌面落在封面 70% 高度
const ZOOM = 2.3;
const CX = 0;
const CY = -250;
const world = `translate(${CW / 2} ${CH * 0.68}) scale(${ZOOM}) translate(${-CX} ${-CY})`;

export const Cover: React.FC = () => {
	useFonts();
	const fps = 30;
	const heroState = poseAt([{frame: 0, pose: 'pour', lower: 'sit', expr: 'sad'}], 0, fps, 0, 1);
	const partnerState = poseAt([{frame: 0, pose: 'phone', lower: 'sit', facing: -1}], 0, fps, 0.25, -1);
	const cup = {x: -6, y: -300, tilt: 112, scale: 0.82};
	const lip = cupLip(cup);
	const face = cupSide(cup, -1, 0.42);
	const back = cupSide(cup, 1, 0.5);
	const hero: CharacterProps = {
		...HERO_LOOK, x: -200, y: 0, state: heroState, light: [0.5, -0.85],
		ikF: {x: face.x + 13, y: face.y}, ikB: {x: (back.x + face.x) / 2 - 4, y: back.y},
	} as CharacterProps;
	const phone = {x: 148, y: -258};
	const partner: CharacterProps = {
		...PARTNER_LOOK, x: 200, y: 0, state: partnerState, light: [-0.5, -0.85],
		ikF: {x: phone.x - 4, y: phone.y + 10}, ikB: {x: phone.x + 6, y: phone.y + 14},
	} as CharacterProps;
	solveSkeleton(hero, 0, fps);

	return (
		<AbsoluteFill style={{background: COLORS.bg}}>
			<svg width={CW} height={CH} style={{position: 'absolute', inset: 0}}>
				<defs>
					<linearGradient id="c-cone" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0" stopColor={COLORS.gold} stopOpacity={0.38} />
						<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
					</linearGradient>
					<radialGradient id="c-bulb">
						<stop offset="0" stopColor="#FFE9B8" stopOpacity={0.95} />
						<stop offset="0.3" stopColor={COLORS.gold} stopOpacity={0.4} />
						<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
					</radialGradient>
					<radialGradient id="c-vig" cx="50%" cy="55%" r="75%">
						<stop offset="0.5" stopColor="#000" stopOpacity={0} />
						<stop offset="1" stopColor="#000" stopOpacity={0.8} />
					</radialGradient>
					<radialGradient id="c-dust">
						<stop offset="0" stopColor={COLORS.gold} stopOpacity={1} />
						<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
					</radialGradient>
				</defs>
				<g transform={world}>
					<rect x={-900} y={-1200} width={1800} height={1200} fill="#1B140E" />
					<rect x={-900} y={0} width={1800} height={600} fill="#120D09" />
					{/* 灯在画面上方之外, 只留一束光, 不压标题 */}
					<polygon points="-70,-720 70,-720 380,0 -380,0" fill="url(#c-cone)" />
					{/* 椅子 */}
					<g fill={COLORS.wood} stroke={COLORS.goldDim} strokeWidth={1.2} strokeOpacity={0.6}>
						<rect x={-244} y={-94} width={94} height={10} rx={3} />
						<rect x={-247} y={-300} width={10} height={300} />
						<rect x={150} y={-94} width={94} height={10} rx={3} />
						<rect x={237} y={-300} width={10} height={300} />
					</g>
					<Character {...partner} />
					<rect x={phone.x - 10} y={phone.y - 17} width={20} height={34} rx={3} fill="#050404" stroke={COLORS.goldDim} strokeWidth={1} transform={`rotate(-30 ${phone.x} ${phone.y})`} />
					<rect x={phone.x - 8} y={phone.y - 14} width={16} height={27} rx={2} fill={COLORS.ivory} opacity={0.8} transform={`rotate(-30 ${phone.x} ${phone.y})`} />
					<Character {...hero} between={<Cup id="cv-hero" {...cup} fill={0} liquid={COLORS.liquidHero} stain={1} />} />
					{/* 桌子 */}
					<rect x={-135} y={-185} width={270} height={13} fill={COLORS.woodLit} />
					<rect x={-135} y={-185} width={270} height={2.5} fill={COLORS.gold} opacity={0.55} />
					<rect x={-121} y={-172} width={11} height={172} fill={COLORS.wood} />
					<rect x={110} y={-172} width={11} height={172} fill={COLORS.wood} />
					<ellipse cx={92} cy={-184} rx={70} ry={4} fill={COLORS.liquidHero} opacity={0.85} />
					<path d="M 131 -183 q 4 30 0 70" stroke={COLORS.liquidHero} strokeWidth={4} fill="none" opacity={0.85} />
					<Cup id="cv-partner" x={70} y={-185} scale={0.82} fill={1.06} liquid={COLORS.liquidHero} wobble={0.5} />
					<PourStream from={lip} to={{x: 76, y: -237}} flow={0.55} />
				</g>
				{Array.from({length: 26}, (_, i) => {
					const x = (i * 397) % CW;
					const y = (i * 613) % CH;
					const r = 3 + ((i * 7) % 18);
					return <circle key={i} cx={x} cy={y} r={r} fill="url(#c-dust)" opacity={0.08 + ((i * 13) % 20) / 100} />;
				})}
				<rect width={CW} height={CH} fill="url(#c-vig)" />
			</svg>

			{/* 标题: 主线问题, 渴 染金 */}
			<div style={{position: 'absolute', left: 84, top: 120, fontFamily: FONTS.serif, fontWeight: 900, color: COLORS.ivory, lineHeight: 1.05}}>
				<div style={{fontSize: 156, letterSpacing: 10, textShadow: '0 4px 30px rgba(0,0,0,0.75)'}}>倒得越多</div>
				<div style={{fontSize: 156, letterSpacing: 10, textShadow: '0 4px 30px rgba(0,0,0,0.75)'}}>
					越<span style={{color: COLORS.gold, fontSize: 210, textShadow: '0 0 60px rgba(221,189,116,0.55)'}}>渴</span>
				</div>
			</div>
			<div style={{position: 'absolute', left: 92, top: 520, fontFamily: FONTS.sans, fontWeight: 500, fontSize: 42, letterSpacing: 4, color: COLORS.ivory, opacity: 0.88}}>
				<div>追求高浓度的爱</div>
				<div style={{marginTop: 10}}>为什么总觉得不够</div>
				<div style={{marginTop: 26, width: 120, height: 3, background: COLORS.gold, opacity: 0.8}} />
			</div>
			<div
				style={{
					position: 'absolute', right: 40, top: 36, padding: '5px 12px', border: `1px solid ${COLORS.ivory}`,
					color: COLORS.ivory, opacity: 0.35, fontFamily: FONTS.sans, fontSize: 22, lineHeight: 1.3, letterSpacing: 1,
				}}
			>
				肆号静匣Logos
			</div>
		</AbsoluteFill>
	);
};

export const COVER_SIZE = {width: CW, height: CH};
