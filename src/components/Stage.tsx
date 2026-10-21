import React from 'react';
import {AbsoluteFill} from 'remotion';
import {cameraTransform} from '../lib/camera';
import {C, H, W} from '../theme';

// 世界层：所有随镜头运动的元素都画在这里

export const World: React.FC<{frame: number; children: React.ReactNode}> = ({frame, children}) => (
	<AbsoluteFill>
		<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{fontFamily: 'inherit'}}>
			<g transform={cameraTransform(frame)}>{children}</g>
		</svg>
	</AbsoluteFill>
);

/** 屏幕层背景光：暖、冷、暗三种光按节切换，叠在底色上 */
export const Backdrop: React.FC<{warm: number; cool: number; dark: number; warmX?: number; warmY?: number}> = ({
	warm,
	cool,
	dark,
	warmX = 42,
	warmY = 58,
}) => (
	<AbsoluteFill style={{backgroundColor: C.bg}}>
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse 60% 70% at ${warmX}% ${warmY}%, rgba(255,181,71,${0.13 * warm}) 0%, rgba(255,181,71,0) 70%)`,
			}}
		/>
		<AbsoluteFill
			style={{
				background: `radial-gradient(ellipse 45% 80% at 92% 55%, rgba(92,225,230,${0.12 * cool}) 0%, rgba(92,225,230,0) 70%)`,
			}}
		/>
		<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)', opacity: 0.6 + 0.4 * dark}} />
	</AbsoluteFill>
);

/** 地面线 */
export const Floor: React.FC<{y: number; l: number; r: number; opacity: number}> = ({y, l, r, opacity}) => (
	<line x1={l} y1={y} x2={r} y2={y} stroke={C.line} strokeWidth={3} opacity={opacity} />
);
