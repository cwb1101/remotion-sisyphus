// 整片一个连续镜头: 世界坐标里的推 拉 摇 移
// 运动从小节线开始, 用缓入缓出落定在之后的底鼓上; 读字时保留缓慢漂移, 不会完全静止超过 3 秒
// 重卡点: 镜头冲一下 (zoom punch) + 震动
import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {CAMERA_MOVES, HEAVY_FRAMES, PORTALS, PORTAL_PULL, PORTAL_PUSH} from '../lib/timeline';
import type {Shot} from '../data/shots';
import {H, W} from '../theme';

export type CamState = {x: number; y: number; zoom: number; rot: number};

const ease = Easing.bezier(0.45, 0, 0.2, 1);
const PORTAL_ZOOM = 2.5;

const mix = (a: Shot | CamState, b: Shot | CamState, t: number): CamState => ({
	x: a.x + (b.x - a.x) * t,
	// 推拉用对数插值, 速度感更均匀
	zoom: Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * t),
	y: a.y + (b.y - a.y) * t,
	rot: (a.rot ?? 0) + ((b.rot ?? 0) - (a.rot ?? 0)) * t,
});

export const cameraAt = (frame: number): CamState => {
	let state: CamState = {...CAMERA_MOVES[0].from, rot: CAMERA_MOVES[0].from.rot ?? 0};
	for (let i = 0; i < CAMERA_MOVES.length; i++) {
		const m = CAMERA_MOVES[i];
		if (frame < m.start) break;
		const from = state;
		const prog = (f: number) => (m.end <= m.start ? (f >= m.start ? 1 : 0) : interpolate(f, [m.start, m.end], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
		const t = prog(frame);
		const next = CAMERA_MOVES[i + 1];
		// 下一段开始时, 以这一段在那一帧的位置为起点
		const evalAt = next && frame >= next.start ? prog(next.start) : t;
		state = mix(from, m.to, ease(evalAt));
	}
	// 穿过物件换场: 换场前推近 portalFrom, 换场后从 portalTo 拉出
	for (const p of PORTALS) {
		const before = p.frame - frame;
		if (before > 0 && before <= PORTAL_PUSH) {
			const k = ease(1 - before / PORTAL_PUSH);
			state = {...state, x: state.x + (p.from.x - state.x) * k, y: state.y + (p.from.y - state.y) * k, zoom: state.zoom * (1 + PORTAL_ZOOM * k * k)};
		}
		const after = frame - p.frame;
		if (after >= 0 && after < PORTAL_PULL) {
			const k = ease(1 - after / PORTAL_PULL);
			state = {...state, x: state.x + (p.to.x - state.x) * k, y: state.y + (p.to.y - state.y) * k, zoom: state.zoom * (1 + PORTAL_ZOOM * k * k)};
		}
	}
	const sec = frame / 30;
	// 呼吸般的漂移
	state = {
		...state,
		x: state.x + (7 * Math.sin(sec * 0.31) + 3 * Math.sin(sec * 0.83)) / state.zoom,
		y: state.y + (4 * Math.sin(sec * 0.27 + 1)) / state.zoom,
		zoom: state.zoom * (1 + 0.012 * Math.sin(sec * 0.19)),
	};
	for (const h of HEAVY_FRAMES) {
		const d = frame - h;
		if (d >= -1 && d < 18) {
			const k = Math.pow(1 - Math.max(0, d) / 18, 2);
			state = {
				...state,
				zoom: state.zoom * (1 + 0.06 * k),
				x: state.x + (14 * k * Math.sin(frame * 2.1)) / state.zoom,
				y: state.y + (10 * k * Math.cos(frame * 2.7)) / state.zoom,
			};
		}
	}
	return state;
};

export const camTransform = (c: CamState) => `translate(${W / 2} ${H / 2}) rotate(${c.rot}) scale(${c.zoom}) translate(${-c.x} ${-c.y})`;

/** 世界 -> 屏幕 */
export const toScreen = (c: CamState, p: {x: number; y: number}) => ({x: W / 2 + (p.x - c.x) * c.zoom, y: H / 2 + (p.y - c.y) * c.zoom});

export const CameraLayer: React.FC<{children: React.ReactNode}> = ({children}) => {
	const frame = useCurrentFrame();
	const cam = cameraAt(frame);
	return (
		<svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
			<g transform={camTransform(cam)}>{children}</g>
		</svg>
	);
};
