import React from 'react';
import {useCurrentFrame} from 'remotion';
import {px, useCamera} from '../camera/Camera';
import {palette} from '../theme';

/** 点亮时的轻弹：0 → 1.18 → 1 */
export const popScale = (frame: number, appear: number, dur = 12) => {
	const t = (frame - appear) / dur;
	if (t <= 0) return 0;
	if (t >= 1) return 1;
	return t < 0.55 ? (t / 0.55) * 1.18 : 1.18 - 0.18 * ((t - 0.55) / 0.45);
};

/** 光点节点：亮核 + 一圈淡光（外层光晕由 Glow 提供） */
export const LightNode: React.FC<{
	x: number;
	y: number;
	/** 屏幕像素半径 */
	r?: number;
	appear?: number;
	brightness?: number;
	color?: string;
	core?: string;
	scale?: number;
}> = ({x, y, r = 4, appear = -999, brightness = 1, color = palette.gold, core = palette.goldHi, scale = 1}) => {
	const frame = useCurrentFrame();
	const cam = useCamera();
	const s = popScale(frame, appear) * scale;
	if (s <= 0.001 || brightness <= 0.001) return null;
	const rr = px(cam, r, 0.35) * s;
	return (
		<g opacity={Math.min(1, brightness)}>
			<circle cx={x} cy={y} r={rr * 2.6} fill={color} opacity={0.18} />
			<circle cx={x} cy={y} r={rr * 1.5} fill={color} opacity={0.45} />
			<circle cx={x} cy={y} r={rr} fill={core} />
		</g>
	);
};
