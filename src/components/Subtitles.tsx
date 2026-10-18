// 主字幕 (屏幕空间, 不跟镜头动): 画面下部居中, 字的底边在 86% 高度
// 普通屏: 逐字由虚变实; 重卡点: 整行砸下来; 重点词染金; 钉住的重点词飞到左上角
// 附着注释: 左侧 字幕上方, 小字
import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {SCREENS} from '../data/subtitles';
import {COLORS, FONTS, H, SUBTITLE, W} from '../theme';
import {useRenderMode} from './Character';

const lineStyle: React.CSSProperties = {
	position: 'absolute',
	left: (W - SUBTITLE.maxWidth) / 2,
	width: SUBTITLE.maxWidth,
	bottom: SUBTITLE.bottom,
	textAlign: 'center',
	fontFamily: FONTS.serif,
	fontWeight: 900,
	fontSize: SUBTITLE.size,
	lineHeight: 1.2,
	letterSpacing: 6,
	whiteSpace: 'nowrap',
};

export const Subtitles: React.FC = () => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const mode = useRenderMode();
	if (mode === 'chars') return null;
	const mask = mode === 'subs';
	const s = SCREENS.find((x) => x.text && frame >= x.startFrame && frame < x.endFrame);

	const pinned = SCREENS.filter((x) => x.pinUntil && x.keyword).map((x) => {
		const until = SCREENS.find((y) => y.id === x.pinUntil)?.startFrame ?? Infinity;
		return {x, until};
	});

	return (
		<>
			{pinned.map(({x, until}, slot) => {
				// 等砸下来的字站稳后, 从字幕行里那个重点词的位置飞到左上角
				const from = x.startFrame + 16;
				if (frame < from || frame >= until) return null;
				const t = spring({frame: frame - from, fps, config: {damping: 15, stiffness: 120}});
				const kwLeft = (text: string, kw: string) => {
					const adv = (c: string) => (c === ' ' ? 28 : SUBTITLE.size + 6);
					const chars = [...text];
					const total = chars.reduce((a, c) => a + adv(c), 0);
					return W / 2 - total / 2 + chars.slice(0, text.indexOf(kw)).reduce((a, c) => a + adv(c), 0);
				};
				const lineTop = H - SUBTITLE.bottom - SUBTITLE.size * 1.2;
				// 第几个钉住的词就排在第几行, 都在左上
				const pinTop = 96 + slot * 150;
				const pinSize = slot === 0 ? 120 : 100;
				let left = interpolate(t, [0, 1], [kwLeft(x.text, x.keyword!), 120]);
				let top = interpolate(t, [0, 1], [lineTop, pinTop]);
				let size = interpolate(t, [0, 1], [SUBTITLE.size, pinSize]);
				let fade =
					interpolate(frame, [from, from + 5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) *
					interpolate(frame, [from + 30, from + 90], [1, 0.42], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				// 收回: 下一次出现这个词的那一屏开始前 14 帧, 从左上角落回字幕行; 否则淡出
				const target = SCREENS.find((y) => y.id === x.pinUntil);
				if (until - frame <= 14) {
					const k = 1 - (until - frame) / 14;
					if (target && target.keyword === x.keyword) {
						const e = k * k;
						left = interpolate(e, [0, 1], [120, kwLeft(target.text, x.keyword!)]);
						top = interpolate(e, [0, 1], [pinTop, lineTop]);
						size = interpolate(e, [0, 1], [pinSize, SUBTITLE.size]);
						fade = interpolate(k, [0, 1], [0.42, 1]);
					} else {
						fade *= 1 - k;
					}
				}
				return (
					<div
						key={x.id}
						style={{
							position: 'absolute', left, top, fontFamily: FONTS.serif, fontWeight: 900, fontSize: size, lineHeight: 1,
							// 遮罩里用灰色, 质检能把它和主字幕分开
							color: mask ? '#aaa' : COLORS.gold, opacity: mask ? 1 : fade,
							textShadow: mask ? undefined : '0 0 40px rgba(221,189,116,0.35)',
						}}
					>
						{x.keyword}
					</div>
				);
			})}
			{s ? <Line key={s.id} frame={frame} fps={fps} mask={mask} /> : null}
			{SCREENS.filter((x) => x.note && frame >= x.startFrame && frame < x.endFrame).map((x) => (
				<div
					key={`note-${x.id}`}
					style={{
						position: 'absolute', left: 96, bottom: SUBTITLE.bottom + 128, fontFamily: FONTS.sans, fontWeight: 400,
						fontSize: 26, letterSpacing: 2, color: mask ? '#8c8c8c' : COLORS.ivory,
						opacity: (mask ? 1 : 0.62) * interpolate(frame, [x.startFrame + 8, x.startFrame + 20, x.endFrame - 6, x.endFrame], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
						borderLeft: `2px solid ${mask ? '#8c8c8c' : COLORS.gold}`, paddingLeft: 14,
					}}
				>
					{x.note}
				</div>
			))}
		</>
	);
};

const Line: React.FC<{frame: number; fps: number; mask: boolean}> = ({frame, fps, mask}) => {
	const s = SCREENS.find((x) => x.text && frame >= x.startFrame && frame < x.endFrame)!;
	const chars = [...s.text];
	const kwStart = s.keyword ? s.text.indexOf(s.keyword) : -1;
	const kwEnd = kwStart >= 0 ? kwStart + s.keyword!.length : -1;
	const local = frame - s.startFrame;
	const out = interpolate(frame, [s.endFrame - 5, s.endFrame], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

	if (s.heavy) {
		// 砸: 整行从大到小落进字幕行, 带一点过冲
		const t = spring({frame: local + 3, fps, config: {damping: 11, stiffness: 260, mass: 0.8}});
		const scale = interpolate(t, [0, 1], [1.6, 1]);
		const y = interpolate(t, [0, 1], [-70, 0]);
		const glow = interpolate(local, [0, 14], [1, 0], {extrapolateRight: 'clamp'});
		return (
			<div style={{...lineStyle, transform: `translateY(${y}px) scale(${scale})`, transformOrigin: '50% 80%', opacity: out * Math.min(1, t * 1.6)}}>
				{chars.map((c, i) => {
					const kw = i >= kwStart && i < kwEnd;
					return (
						<span
							key={i}
							style={{
								color: mask ? '#fff' : kw ? COLORS.gold : COLORS.ivory,
								textShadow: mask ? undefined : `0 2px 18px rgba(0,0,0,0.7), 0 0 ${30 * glow}px rgba(221,189,116,${0.8 * glow})`,
							}}
						>
							{c}
						</span>
					);
				})}
			</div>
		);
	}

	return (
		<div style={{...lineStyle, opacity: out}}>
			{chars.map((c, i) => {
				const a = i * 2;
				const op = interpolate(local, [a, a + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				const blur = interpolate(local, [a, a + 10], [14, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				const kw = i >= kwStart && i < kwEnd;
				return (
					<span
						key={i}
						style={{
							display: 'inline-block',
							opacity: mask ? (op > 0.3 ? 1 : 0) : op,
							filter: mask || blur < 0.2 ? undefined : `blur(${blur}px)`,
							color: mask ? '#fff' : kw ? COLORS.gold : COLORS.ivory,
							textShadow: mask ? undefined : '0 2px 18px rgba(0,0,0,0.7)',
							minWidth: c === ' ' ? SUBTITLE.size * 0.45 : undefined,
						}}
					>
						{c}
					</span>
				);
			})}
		</div>
	);
};
