import React from 'react';
import {AbsoluteFill} from 'remotion';
import {easeInOut, lerp} from '../lib/anim';
import {LAYOUT} from '../theme';

// 镜头关键帧 x y 是画面中心对准的世界坐标 s 是缩放 dur 是到达该关键帧的过渡帧数
export type CamKey = {f: number; x: number; y: number; s: number; r?: number; dur?: number; ease?: (t: number) => number};

export const cameraAt = (frame: number, keys: CamKey[]) => {
	let cam = {x: keys[0].x, y: keys[0].y, s: keys[0].s, r: keys[0].r ?? 0};
	for (let i = 1; i < keys.length; i++) {
		const k = keys[i];
		const dur = k.dur ?? 14;
		if (frame < k.f - dur) break;
		const t = lerp(frame, k.f - dur, k.f, 0, 1, k.ease ?? easeInOut);
		// 按目标点在画面上的位置插值 推近时目标点平稳地移到画面中心 不会被缩放甩出画外
		const s = cam.s * Math.pow(k.s / cam.s, t);
		const sx = (k.x - cam.x) * cam.s * (1 - t);
		const sy = (k.y - cam.y) * cam.s * (1 - t);
		cam = {
			x: k.x - sx / s,
			y: k.y - sy / s,
			s,
			r: cam.r + ((k.r ?? 0) - cam.r) * t,
		};
	}
	// 持续的微小漂移 保证画面不会静止
	const drift = {
		x: Math.sin(frame / 37) * 9,
		y: Math.sin(frame / 51) * 6,
		s: 1 + Math.sin(frame / 47) * 0.014 + frame * 0.00006,
	};
	return {x: cam.x + drift.x, y: cam.y + drift.y, s: cam.s * drift.s, r: cam.r};
};

export const World: React.FC<{
	cam: {x: number; y: number; s: number; r: number};
	offset?: {x: number; y: number};
	children: React.ReactNode;
}> = ({cam, offset = {x: 0, y: 0}, children}) => (
	<AbsoluteFill
		style={{
			transformOrigin: '0 0',
			transform: `translate(${LAYOUT.width / 2 + offset.x}px, ${LAYOUT.height / 2 + offset.y}px) rotate(${cam.r}deg) scale(${cam.s}) translate(${-cam.x}px, ${-cam.y}px)`,
		}}
	>
		{children}
	</AbsoluteFill>
);

// 世界坐标转画面坐标 用来做字幕飞进物件等需要对齐的镜头
export const toScreen = (p: {x: number; y: number}, cam: {x: number; y: number; s: number}) => ({
	x: LAYOUT.width / 2 + (p.x - cam.x) * cam.s,
	y: LAYOUT.height / 2 + (p.y - cam.y) * cam.s,
});
export const toWorld = (p: {x: number; y: number}, cam: {x: number; y: number; s: number}) => ({
	x: cam.x + (p.x - LAYOUT.width / 2) / cam.s,
	y: cam.y + (p.y - LAYOUT.height / 2) / cam.s,
});
