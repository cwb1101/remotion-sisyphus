import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C} from '../theme';

/**
 * 屏幕空间的底色与光：不跟镜头缩放，只按场景切换光线。
 * stage = 开场人物背后的光；spot = 第二节顶光；under = 水面底光；flash = 大字砸下时的闪光。
 */
export const Background: React.FC<{
	frame: number;
	stage: number;
	spot: number;
	under: number;
	flash: number;
	flashX?: number;
	flashY?: number;
	/** 第三节：横贯画面的神经光带 */
	neural?: number;
	/** 第五节：人物背后的暖光 */
	warm?: number;
	/** 第六节：顶部渐亮的晨光 */
	dawn?: number;
	/** 第六节结尾：右侧门光 */
	door?: number;
}> = ({frame, stage, spot, under, flash, flashX = 42, flashY = 56, neural = 0, warm = 0, dawn = 0, door = 0}) => {
	const sway = Math.sin(frame * 0.02) * 30;
	return (
		<AbsoluteFill style={{backgroundColor: C.bg}}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 900px 650px at ${820 + sway}px 470px, ${C.bgGlowHi} 0%, ${C.bgGlow} 40%, rgba(14,26,43,0) 100%)`,
					opacity: 0.35 + 0.65 * stage,
				}}
			/>
			<AbsoluteFill
				style={{
					background: `linear-gradient(to bottom, #15304C 0%, rgba(14,26,43,0) 55%)`,
					opacity: spot,
				}}
			/>
			{/* 顶光光柱 */}
			<svg width={1920} height={1080} style={{position: 'absolute', opacity: spot}}>
				<defs>
					<linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#BFE6FF" stopOpacity="0.16" />
						<stop offset="1" stopColor="#BFE6FF" stopOpacity="0" />
					</linearGradient>
				</defs>
				{[
					[520, 0.9],
					[980, 0.6],
					[1380, 0.75],
				].map(([x, o], i) => {
					const dx = Math.sin(frame * 0.015 + i * 1.7) * 40;
					return (
						<polygon
							key={i}
							points={`${x - 70 + dx},0 ${x + 70 + dx},0 ${x + 260 + dx * 2},900 ${x - 260 + dx * 2},900`}
							fill="url(#beam)"
							opacity={o}
						/>
					);
				})}
			</svg>
			<AbsoluteFill
				style={{
					background: `radial-gradient(ellipse 1300px 420px at 50% 100%, rgba(92,200,255,0.20) 0%, rgba(14,26,43,0) 100%)`,
					opacity: under,
				}}
			/>
			{neural > 0 ? (
				<AbsoluteFill
					style={{
						background: `radial-gradient(ellipse 1100px 260px at ${960 + Math.sin(frame * 0.02) * 60}px 470px, rgba(92,200,255,0.16) 0%, rgba(30,61,94,0.35) 45%, rgba(14,26,43,0) 100%)`,
						opacity: neural,
					}}
				/>
			) : null}
			{warm > 0 ? (
				<AbsoluteFill
					style={{
						background: `radial-gradient(ellipse 760px 520px at ${880 + Math.sin(frame * 0.017) * 40}px 520px, rgba(255,181,71,0.10) 0%, rgba(58,53,80,0.35) 45%, rgba(14,26,43,0) 100%)`,
						opacity: warm,
					}}
				/>
			) : null}
			{dawn > 0 ? (
				<AbsoluteFill
					style={{
						background: `linear-gradient(to bottom, rgba(64,110,150,0.42) 0%, rgba(30,61,94,0.22) 35%, rgba(14,26,43,0) 70%)`,
						opacity: dawn * (0.9 + 0.1 * Math.sin(frame * 0.03)),
					}}
				/>
			) : null}
			{door > 0 ? (
				<AbsoluteFill
					style={{
						background: `radial-gradient(ellipse 900px 700px at 88% 52%, rgba(200,236,255,0.30) 0%, rgba(92,200,255,0.10) 40%, rgba(14,26,43,0) 100%)`,
						opacity: door,
					}}
				/>
			) : null}
			<AbsoluteFill
				style={{
					background: `radial-gradient(circle at ${flashX}% ${flashY}%, rgba(190,235,255,0.55) 0%, rgba(92,200,255,0.18) 35%, rgba(14,26,43,0) 75%)`,
					opacity: flash,
				}}
			/>
		</AbsoluteFill>
	);
};
