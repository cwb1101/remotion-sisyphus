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
}> = ({frame, stage, spot, under, flash}) => {
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
			<AbsoluteFill
				style={{
					background: `radial-gradient(circle at 42% 56%, rgba(190,235,255,0.55) 0%, rgba(92,200,255,0.18) 35%, rgba(14,26,43,0) 75%)`,
					opacity: flash,
				}}
			/>
		</AbsoluteFill>
	);
};
