/**
 * 风格样张：同一时刻（第 7 屏「TA明明在乎，」）的三种人物画风 + 深色环境背景。
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Person, PAL, Bubble, Pose} from './Person';
import {FONT_SANS} from '../theme';
import {rand} from '../lib/anim';
import '../fonts';

const FLOOR = 830;
const partnerPose: Pose = {lean: 7, legBack: {a: -22, b: 14}, legFront: {a: 20, b: -2}, armFront: {a: 64, b: 14, k: 0.9}, armBack: {a: -28, b: 18}};
// 背过身、低头、双手插兜：封闭的姿态
const protPose: Pose = {lean: -2, head: 18, armFront: {a: -4, b: 34, k: 0.5}, armBack: {a: -10, b: 30, k: 0.5}, legBack: {a: -3, b: 0}, legFront: {a: 5, b: 0}};

const Sub: React.FC<{dark?: boolean}> = () => (
	<div
		style={{
			position: 'absolute',
			left: 0,
			right: 0,
			top: 540 - 50,
			textAlign: 'center',
			fontFamily: FONT_SANS,
			fontWeight: 700,
			fontSize: 72,
			color: '#F6F1E9',
			letterSpacing: '0.04em',
			textShadow: '0 0 10px rgba(0,0,0,0.9), 0 0 26px rgba(0,0,0,0.8), 0 4px 30px rgba(0,0,0,0.7)',
		}}
	>
		TA明明
		<span style={{color: '#FF5A45', fontWeight: 900, borderBottom: '8px solid #FF5A45'}}>在乎</span>，
	</div>
);

const Grain: React.FC = () => (
	<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.25}}>
		<filter id="g">
			<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={3} />
			<feColorMatrix type="saturate" values="0" />
		</filter>
		<rect width={1920} height={1080} filter="url(#g)" />
	</svg>
);

/** A · 夜色剪影：深夜房间，大落地窗外是城市夜景，人物是带轮廓光的剪影，只有心是亮的 */
export const StyleA: React.FC = () => {
	const buildings = Array.from({length: 26}, (_, i) => {
		const w = 40 + rand(i) * 70;
		const h = 120 + rand(i + 9) * 300;
		const x = 260 + (i / 26) * 1400 + rand(i + 3) * 20;
		return {x, w, h};
	});
	return (
		<AbsoluteFill style={{background: 'linear-gradient(#060912, #0c1322 70%, #05070c)'}}>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				<defs>
					<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#0f1a33" />
						<stop offset="75%" stopColor="#2c4772" />
						<stop offset="100%" stopColor="#4a6a9a" />
					</linearGradient>
					<radialGradient id="moon">
						<stop offset="0%" stopColor="#e8f0ff" stopOpacity={0.9} />
						<stop offset="20%" stopColor="#bcd0f5" stopOpacity={0.35} />
						<stop offset="100%" stopColor="#bcd0f5" stopOpacity={0} />
					</radialGradient>
					<linearGradient id="floorLight" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="#5c7fb8" stopOpacity={0.35} />
						<stop offset="100%" stopColor="#5c7fb8" stopOpacity={0} />
					</linearGradient>
					<filter id="blur8"><feGaussianBlur stdDeviation="8" /></filter>
				</defs>
				{/* 窗外 */}
				<rect x={260} y={110} width={1400} height={FLOOR - 110} fill="url(#sky)" />
				<circle cx={1380} cy={250} r={260} fill="url(#moon)" />
				<circle cx={1380} cy={250} r={34} fill="#eef3ff" opacity={0.9} />
				{buildings.map((b, i) => (
					<g key={i}>
						<rect x={b.x} y={FLOOR - b.h} width={b.w} height={b.h} fill={i % 3 ? '#0b1222' : '#0e1830'} />
						{Array.from({length: 14}, (_, k) => {
							const wx = b.x + 6 + (k % 3) * (b.w / 3.2);
							const wy = FLOOR - b.h + 14 + Math.floor(k / 3) * 26;
							return rand(i * 31 + k) > 0.55 && wy < FLOOR - 20 ? (
								<rect key={k} x={wx} y={wy} width={7} height={10} fill="#ffd27a" opacity={0.35 + rand(k + i) * 0.5} />
							) : null;
						})}
					</g>
				))}
				{/* 玻璃上的散景 */}
				{Array.from({length: 22}, (_, i) => (
					<circle key={i} cx={300 + rand(i + 40) * 1320} cy={150 + rand(i + 60) * 520} r={10 + rand(i + 80) * 26} fill={i % 3 ? '#ffcf7a' : '#8fb8ff'} opacity={0.12} filter="url(#blur8)" />
				))}
				{/* 窗框 */}
				<g fill="#04060a">
					<rect x={240} y={95} width={1440} height={22} />
					<rect x={240} y={95} width={22} height={FLOOR - 95} />
					<rect x={1658} y={95} width={22} height={FLOOR - 95} />
					<rect x={949} y={95} width={18} height={FLOOR - 95} />
					<rect x={240} y={430} width={1440} height={12} />
				</g>
				{/* 地板与窗光 */}
				<rect x={0} y={FLOOR} width={1920} height={1080 - FLOOR} fill="#06080e" />
				<polygon points={`262,${FLOOR} 1658,${FLOOR} 1900,1080 20,1080`} fill="url(#floorLight)" />
				<Person x={500} y={FLOOR} scale={1.3} pose={partnerPose} palette={PAL.warm} variant="silhouette" rim="#ffb98a" heart={0.6} />
				<Bubble x={1420} y={FLOOR - 230} r={250} frost={0.7} />
				<Person x={1420} y={FLOOR} scale={1.3} pose={protPose} palette={PAL.cool} variant="silhouette" rim="#9fc3ff" heart={1.1} heartGlow={1.4} />
			</svg>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.65) 100%)'}} />
			<Grain />
			<Sub />
		</AbsoluteFill>
	);
};

/** B · 夜晚房间扁平插画：一半暖灯一半冷月光，人物有五官和衣服颜色 */
export const StyleB: React.FC = () => (
	<AbsoluteFill style={{background: 'linear-gradient(#1b2142, #262d58 75%)'}}>
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
			<defs>
				<pattern id="wall" width={60} height={60} patternUnits="userSpaceOnUse">
					<path d="M30 0 L60 30 L30 60 L0 30 Z" fill="none" stroke="#ffffff" strokeOpacity={0.035} strokeWidth={2} />
				</pattern>
				<radialGradient id="lamp" cx="0.5" cy="0.5" r="0.5">
					<stop offset="0%" stopColor="#ffbe73" stopOpacity={0.55} />
					<stop offset="100%" stopColor="#ffbe73" stopOpacity={0} />
				</radialGradient>
				<linearGradient id="moonbeam" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#8fc1ff" stopOpacity={0.28} />
					<stop offset="100%" stopColor="#8fc1ff" stopOpacity={0} />
				</linearGradient>
			</defs>
			<rect width={1920} height={FLOOR} fill="url(#wall)" />
			{/* 右上窗户（冷光来源） */}
			<rect x={1500} y={110} width={300} height={360} rx={10} fill="#121a3a" stroke="#0d1230" strokeWidth={16} />
			<rect x={1515} y={125} width={270} height={330} fill="#24407a" />
			<circle cx={1700} cy={200} r={34} fill="#e9f1ff" />
			{Array.from({length: 14}, (_, i) => (
				<circle key={i} cx={1525 + rand(i) * 250} cy={135 + rand(i + 5) * 300} r={1.5 + rand(i + 9) * 2} fill="#fff" opacity={0.7} />
			))}
			<line x1={1650} y1={118} x2={1650} y2={462} stroke="#0d1230" strokeWidth={10} />
			<polygon points={`1500,470 1800,470 1720,${FLOOR + 200} 1120,${FLOOR + 200}`} fill="url(#moonbeam)" />
			{/* 墙上画框 */}
			<rect x={760} y={170} width={220} height={160} rx={6} fill="#2f376a" stroke="#141938" strokeWidth={10} />
			<path d="M780 310 L840 240 L890 290 L920 260 L960 310 Z" fill="#46518f" />
			<rect x={1010} y={200} width={110} height={130} rx={6} fill="#2f376a" stroke="#141938" strokeWidth={10} />
			{/* 左侧落地灯（暖光来源） */}
			<circle cx={260} cy={360} r={520} fill="url(#lamp)" />
			<line x1={260} y1={350} x2={260} y2={FLOOR} stroke="#141833" strokeWidth={10} />
			<path d="M190 350 L330 350 L295 270 L225 270 Z" fill="#f4b46a" />
			<ellipse cx={260} cy={FLOOR} rx={60} ry={10} fill="#141833" />
			{/* 植物 */}
			<g transform={`translate(110 ${FLOOR})`}>
				<path d="M-30 0 L30 0 L22 -60 L-22 -60 Z" fill="#7b4a3a" />
				{[-40, -15, 10, 35].map((a, i) => (
					<ellipse key={i} cx={Math.sin((a * Math.PI) / 180) * 50} cy={-110 - i * 6} rx={18} ry={52} fill={i % 2 ? '#2f7a63' : '#3c9476'} transform={`rotate(${a} ${Math.sin((a * Math.PI) / 180) * 50} ${-110 - i * 6})`} />
				))}
			</g>
			{/* 沙发（主角身后） */}
			<g transform={`translate(1560 ${FLOOR})`}>
				<rect x={-200} y={-170} width={330} height={120} rx={30} fill="#3a4378" />
				<rect x={-230} y={-90} width={390} height={80} rx={24} fill="#47518d" />
				<rect x={-240} y={-140} width={50} height={130} rx={20} fill="#3a4378" />
			</g>
			{/* 地板 + 地毯 */}
			<rect x={0} y={FLOOR} width={1920} height={1080 - FLOOR} fill="#14182f" />
			<ellipse cx={960} cy={FLOOR + 70} rx={720} ry={70} fill="#1f2547" />
			<ellipse cx={500} cy={FLOOR + 8} rx={110} ry={14} fill="#000" opacity={0.3} />
			<ellipse cx={1420} cy={FLOOR + 8} rx={90} ry={14} fill="#000" opacity={0.3} />
			<Person x={500} y={FLOOR} scale={1.3} pose={partnerPose} palette={PAL.warm} face="smile" heart={0.6} />
			<Bubble x={1420} y={FLOOR - 230} r={250} frost={0.7} />
			<Person x={1420} y={FLOOR} scale={1.3} pose={protPose} palette={PAL.cool} face="down" heart={1.1} heartGlow={1.4} />
		</svg>
		<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.5) 100%)'}} />
		<Grain />
		<Sub />
	</AbsoluteFill>
);

/** C · 黑色舞台：两束聚光（暖/冷），光柱里有尘埃，人物站在各自的光里 */
export const StyleC: React.FC = () => (
	<AbsoluteFill style={{background: '#040404'}}>
		<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
			<defs>
				<linearGradient id="beamW" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#ffc58a" stopOpacity={0.05} />
					<stop offset="100%" stopColor="#ffc58a" stopOpacity={0.3} />
				</linearGradient>
				<linearGradient id="beamC" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#9cc8ff" stopOpacity={0.05} />
					<stop offset="100%" stopColor="#9cc8ff" stopOpacity={0.26} />
				</linearGradient>
				<radialGradient id="poolW">
					<stop offset="0%" stopColor="#ffcf9a" stopOpacity={0.55} />
					<stop offset="100%" stopColor="#ffcf9a" stopOpacity={0} />
				</radialGradient>
				<radialGradient id="poolC">
					<stop offset="0%" stopColor="#a8d0ff" stopOpacity={0.45} />
					<stop offset="100%" stopColor="#a8d0ff" stopOpacity={0} />
				</radialGradient>
				<linearGradient id="stage" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" stopColor="#141414" />
					<stop offset="100%" stopColor="#070707" />
				</linearGradient>
				<filter id="soft"><feGaussianBlur stdDeviation="14" /></filter>
			</defs>
			<rect x={0} y={FLOOR - 40} width={1920} height={1080} fill="url(#stage)" />
			{/* 舞台地板木纹 */}
			{Array.from({length: 9}, (_, i) => (
				<line key={i} x1={0} y1={FLOOR - 20 + i * i * 4.5} x2={1920} y2={FLOOR - 20 + i * i * 4.5} stroke="#1d1d1d" strokeWidth={2} />
			))}
			<polygon points="400,-20 600,-20 800,880 200,880" fill="url(#beamW)" filter="url(#soft)" />
			<polygon points="1330,-20 1510,-20 1700,880 1140,880" fill="url(#beamC)" filter="url(#soft)" />
			<ellipse cx={500} cy={FLOOR + 10} rx={300} ry={60} fill="url(#poolW)" />
			<ellipse cx={1420} cy={FLOOR + 10} rx={280} ry={56} fill="url(#poolC)" />
			{Array.from({length: 80}, (_, i) => {
				const left = i % 2 === 0;
				const t = rand(i + 7);
				const cx = (left ? 500 : 1420) + (rand(i) - 0.5) * (100 + t * 420);
				return <circle key={i} cx={cx} cy={t * 860} r={1 + rand(i + 3) * 2.2} fill={left ? '#ffe0b8' : '#d6e8ff'} opacity={0.15 + rand(i + 5) * 0.4} />;
			})}
			{/* 冰面环：主角脚下的防御 */}
			<ellipse cx={1420} cy={FLOOR + 6} rx={230} ry={40} fill="none" stroke="#bfe0ff" strokeOpacity={0.6} strokeWidth={4} />
			<ellipse cx={1420} cy={FLOOR + 6} rx={260} ry={46} fill="none" stroke="#bfe0ff" strokeOpacity={0.25} strokeWidth={2} strokeDasharray="10 12" />
			<Person x={500} y={FLOOR} scale={1.3} pose={partnerPose} palette={PAL.warm} face="smile" heart={0.6} />
			<Person x={1420} y={FLOOR} scale={1.3} pose={protPose} palette={PAL.cool} face="down" heart={1.1} heartGlow={1.4} />
			{/* 倒影 */}
			<g opacity={0.12} transform={`translate(0 ${2 * FLOOR}) scale(1 -1)`}>
				<Person x={500} y={FLOOR} scale={1.3} pose={partnerPose} palette={PAL.warm} face="none" heart={-1} />
				<Person x={1420} y={FLOOR} scale={1.3} pose={protPose} palette={PAL.cool} face="none" heart={-1} />
			</g>
		</svg>
		<Grain />
		<Sub />
	</AbsoluteFill>
);
