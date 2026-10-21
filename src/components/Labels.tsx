import React from 'react';
import {AbsoluteFill} from 'remotion';
import {worldToScreen} from '../lib/camera';
import {C, FONT, SAFE} from '../theme';

// 画面里的小字（世界坐标标签、屏幕说明字）。都带安全区检查：
// 只要可见，就不能进入右侧禁字区 / 水印区，也不能压到底部字幕区；越界直接报错。

const SUBTITLE_TOP = 800;

const textWidth = (text: string, size: number) =>
	[...text].reduce((w, ch) => w + (/[\u0000-ÿ]/.test(ch) ? 0.58 : 1.02) * size, 0);

const guard = (text: string, l: number, t: number, r: number, b: number) => {
	if (l < 0 || r > SAFE.textMaxX || t < 0 || b > SUBTITLE_TOP) {
		throw new Error(`画面文字「${text}」越出安全区：x ${Math.round(l)}–${Math.round(r)}, y ${Math.round(t)}–${Math.round(b)}`);
	}
};

/** 世界坐标里的文字：随镜头运动；按当前镜头换算到屏幕后做安全区检查 */
export const WorldLabel: React.FC<{
	frame: number;
	x: number;
	y: number; // 基线
	text: string;
	size: number;
	color?: string;
	weight?: number;
	anchor?: 'start' | 'middle' | 'end';
	opacity?: number;
	transform?: string;
}> = ({frame, x, y, text, size, color = C.text, weight = 700, anchor = 'start', opacity = 1, transform}) => {
	if (opacity <= 0.005) {
		return null;
	}
	if (!transform) {
		const w = textWidth(text, size);
		const x0 = anchor === 'start' ? x : anchor === 'middle' ? x - w / 2 : x - w;
		const a = worldToScreen(frame, x0, y - size);
		const b = worldToScreen(frame, x0 + w, y + size * 0.2);
		guard(text, a.x, a.y, b.x, b.y);
	}
	return (
		<text x={x} y={y} textAnchor={anchor} fontFamily={FONT} fontWeight={weight} fontSize={size} fill={color} opacity={opacity} transform={transform}>
			{text}
		</text>
	);
};

/** 屏幕坐标的小说明字（不随镜头） */
export const Caption: React.FC<{text: string; left: number; top: number; size: number; color?: string; opacity: number; letterSpacing?: string}> = ({
	text,
	left,
	top,
	size,
	color = C.grey,
	opacity,
	letterSpacing = '0.08em',
}) => {
	guard(text, left, top, left + textWidth(text, size) * 1.1, top + size * 1.3);
	if (opacity <= 0.005) {
		return null;
	}
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div style={{position: 'absolute', left, top, fontFamily: FONT, fontWeight: 700, fontSize: size, color, opacity, letterSpacing, whiteSpace: 'nowrap'}}>{text}</div>
		</AbsoluteFill>
	);
};

/** 落在人肩上的标签：灰底圆角块 + 白字 */
export const Tag: React.FC<{frame: number; x: number; y: number; text: string; rotate?: number; opacity?: number}> = ({frame, x, y, text, rotate = 0, opacity = 1}) => {
	const size = 34;
	const w = textWidth(text, size) + 30;
	const h = size + 22;
	if (opacity <= 0.005) {
		return null;
	}
	const a = worldToScreen(frame, x - w / 2 - 10, y - h / 2 - 10);
	const b = worldToScreen(frame, x + w / 2 + 10, y + h / 2 + 10);
	guard(text, a.x, a.y, b.x, b.y);
	return (
		<g opacity={opacity} transform={`rotate(${rotate} ${x} ${y})`}>
			<rect x={x - w / 2} y={y - h / 2} width={w} height={h} rx={10} fill="#3A3F4B" stroke={C.grey} strokeWidth={2} />
			<text x={x} y={y + size * 0.36} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={size} fill={C.text}>
				{text}
			</text>
		</g>
	);
};
