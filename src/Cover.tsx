import '@fontsource/noto-sans-sc/chinese-simplified-700.css';
import '@fontsource/noto-sans-sc/chinese-simplified-900.css';
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, random} from 'remotion';
import {BlackStone} from './components/BlackStone';
import {Figure, POSES} from './components/Figure';
import {LightRays} from './components/Overlays';
import {STONE_SEED} from './sections/Opening';
import {C, FONT_FAMILY} from './theme';

// 3:4 封面（1080×1440）：片中的标志性画面——甲推着裂开透光的黑石上坡。
// 上方：主线问题 + 片名；下方 160px 留空（平台会在这里叠播放量/点赞）。
export const COVER = {w: 1080, h: 1440};

const KICKER = '同样被生活击垮';
const TITLE = '黑色生命力';
const HOOK = [
	{t: '有人'},
	{t: '越陷越深', c: C.blue},
	{t: '，有人'},
	{t: '更有力量', c: C.gold},
];

const groundY = (x: number) => 1250 - 0.2 * x;

const useFonts = () => {
	const [handle] = useState(() => delayRender('cover fonts'));
	useEffect(() => {
		const sample = KICKER + TITLE + HOOK.map((h) => h.t).join('') + '肆号静匣Logos';
		Promise.all([document.fonts.load(`700 52px ${FONT_FAMILY}`, sample), document.fonts.load(`900 170px ${FONT_FAMILY}`, sample)])
			.then(() => continueRender(handle))
			.catch(() => continueRender(handle));
	}, [handle]);
};

export const Cover: React.FC = () => {
	useFonts();
	const r = 250;
	const sx = 640;
	const sy = groundY(sx) - r * 0.95;
	const jx = sx - r - 118;
	return (
		<AbsoluteFill style={{backgroundColor: C.skyTop}}>
			<svg width={COVER.w} height={COVER.h}>
				<defs>
					<linearGradient id="cv-sky" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#0B0F19" />
						<stop offset="0.6" stopColor={C.skyBottom} />
						<stop offset="1" stopColor="#30344A" />
					</linearGradient>
					<radialGradient id="cv-sun" cx="930" cy="560" r="760" gradientUnits="userSpaceOnUse">
						<stop offset="0" stopColor={C.gold} stopOpacity={0.5} />
						<stop offset="0.25" stopColor={C.gold} stopOpacity={0.16} />
						<stop offset="1" stopColor="#000" stopOpacity={0} />
					</radialGradient>
					<linearGradient id="cv-ground" x1="0" y1="900" x2="0" y2="1440" gradientUnits="userSpaceOnUse">
						<stop offset="0" stopColor={C.slope} />
						<stop offset="1" stopColor="#0A0C14" />
					</linearGradient>
					<linearGradient id="cv-top" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#000" stopOpacity={0.55} />
						<stop offset="1" stopColor="#000" stopOpacity={0} />
					</linearGradient>
				</defs>
				<rect width={COVER.w} height={COVER.h} fill="url(#cv-sky)" />
				<rect width={COVER.w} height={COVER.h} fill="url(#cv-sun)" />
				{/* 远山 */}
				<path d="M 0 1000 L 120 930 L 260 960 L 420 880 L 560 930 L 720 860 L 880 910 L 1080 840 L 1080 1440 L 0 1440 Z" fill={C.hillFar} />
				<path d="M 0 1080 L 180 1010 L 340 1040 L 520 980 L 700 1020 L 900 960 L 1080 990 L 1080 1440 L 0 1440 Z" fill={C.hillNear} />
				{/* 光束和坡面 */}
				<LightRays cx={sx} cy={sy} amount={0.85} frame={40} len={1300} />
				<path d={`M 0 ${groundY(0)} L 1080 ${groundY(1080)} L 1080 1440 L 0 1440 Z`} fill="url(#cv-ground)" />
				<line x1={0} y1={groundY(0)} x2={1080} y2={groundY(1080)} stroke={C.slopeEdge} strokeWidth={3} opacity={0.8} />
				{/* 金色脚印 */}
				{[0, 1, 2, 3].map((i) => {
					const x = jx - 90 - i * 70;
					return <ellipse key={i} cx={x} cy={groundY(x) + 5} rx={14} ry={5} fill={C.gold} opacity={0.7 - i * 0.15} />;
				})}
				<BlackStone id="cover" cx={sx} cy={sy} r={r} rot={-18} seed={STONE_SEED} crack={1} crackGlow={1} rim={0.9} rimColor={C.gold} />
				<Figure x={jx} y={groundY(jx)} pose={{...POSES.push, head: -20}} color={C.jia} scale={1.55} heart={1.4} rim={0.6} />
				{/* 金尘 */}
				{Array.from({length: 70}).map((_, i) => {
					const x = sx + (random(`cvx${i}`) - 0.5) * 700;
					const y = sy - 80 - random(`cvy${i}`) * 520;
					return <circle key={i} cx={x} cy={y} r={1.5 + random(`cvr${i}`) * 3} fill={C.gold} opacity={0.25 + random(`cvo${i}`) * 0.6} />;
				})}
				{/* 上方压暗，保证标题可读 */}
				<rect width={COVER.w} height={640} fill="url(#cv-top)" />
			</svg>

			<div style={{position: 'absolute', left: 0, right: 0, top: 150, textAlign: 'center', fontFamily: FONT_FAMILY}}>
				<div style={{fontSize: 56, fontWeight: 700, color: '#FFFFFF', letterSpacing: 6, textShadow: '0 3px 14px rgba(0,0,0,0.7)'}}>{KICKER}</div>
				<div
					style={{
						marginTop: 18,
						fontSize: 172,
						lineHeight: 1.1,
						fontWeight: 900,
						color: C.gold,
						letterSpacing: 8,
						textShadow: `0 0 40px rgba(255,194,74,0.55), 0 6px 22px rgba(0,0,0,0.7)`,
					}}
				>
					{TITLE}
				</div>
				<div style={{marginTop: 26, fontSize: 52, fontWeight: 700, color: '#FFFFFF', letterSpacing: 2, textShadow: '0 3px 14px rgba(0,0,0,0.75)'}}>
					{HOOK.map((h, i) => (
						<span key={i} style={h.c ? {color: h.c} : undefined}>
							{h.t}
						</span>
					))}
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					top: 40,
					right: 44,
					padding: '5px 12px',
					border: '1px solid #FFFFFF',
					color: '#FFFFFF',
					fontFamily: FONT_FAMILY,
					fontWeight: 700,
					fontSize: 24,
					letterSpacing: 2,
					opacity: 0.45,
				}}
			>
				肆号静匣Logos
			</div>
		</AbsoluteFill>
	);
};
