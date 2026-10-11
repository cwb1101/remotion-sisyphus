/**
 * 字幕层（屏幕空间，最上层，不会被物件遮挡）。
 * 文字、重点词、起止帧全部来自 script.json。
 * - normal：思源黑体 72px，画面中部，逐字快速浮现，重点词朱红加粗+下划线
 * - slam：思源宋体特粗，整句从大到小砸下，重点词延后再砸一次，伴随冲击波与震屏
 * - title：主题词逐字砸下
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {screens, Screen, cue} from '../data/script';
import {C, FONT_SANS, FONT_SERIF, SUB} from '../theme';
import {clamp, easeIn, easeOut, lerp, prog, springAt} from '../lib/anim';
import {pulseAt} from '../lib/pulse';

const EXIT = 6;

type Seg = {text: string; hi: boolean};
export const splitHighlights = (s: Screen): Seg[] => {
	const segs: Seg[] = [];
	let rest = s.text;
	for (const h of s.highlights) {
		const i = rest.indexOf(h);
		if (i < 0) throw new Error(`highlight "${h}" not found in screen ${s.id}`);
		if (i > 0) segs.push({text: rest.slice(0, i), hi: false});
		segs.push({text: h, hi: true});
		rest = rest.slice(i + h.length);
	}
	if (rest) segs.push({text: rest, hi: false});
	return segs;
};

/** 估算可视宽度（全角=1，拉丁字母≈0.6） */
export const visualLen = (t: string) =>
	Array.from(t).reduce((n, ch) => n + (/[\x00-\x7F]/.test(ch) ? 0.6 : 1), 0);

const halo = (c: string, k = 1) =>
	[
		`0 0 ${6 * k}px ${c}`,
		`0 0 ${14 * k}px ${c}`,
		`0 0 ${28 * k}px ${c}`,
		`0 0 ${42 * k}px ${c}`,
	].join(', ');

const Normal: React.FC<{s: Screen; frame: number}> = ({s, frame}) => {
	const local = frame - s.start;
	const segs = splitHighlights(s);
	const exit = prog(frame, s.end - EXIT, s.end, easeIn);
	const beat = s.pulse && s.pulse.vol > 0.5 ? pulseAt(frame) : 0;
	let idx = 0;
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: SUB.normalY - SUB.normalSize * 0.7,
				textAlign: 'center',
				fontFamily: FONT_SANS,
				fontWeight: 700,
				fontSize: SUB.normalSize,
				lineHeight: 1.4,
				color: C.text,
				letterSpacing: '0.04em',
				opacity: 1 - exit,
				transform: `translateY(${-10 * exit}px) scale(${1 + beat * 0.025})`,
				textShadow: halo('rgba(0,0,0,0.92)'),
			}}
		>
			{segs.map((seg, si) => {
				const startIdx = idx;
				const els = Array.from(seg.text).map((ch, ci) => {
					const i = idx++;
					const t = clamp((local - i * 0.7) / 6);
					const e = easeOut(t);
					const pop = seg.hi ? springAt(frame, s.start + i * 0.7 + 2, {damping: 16, stiffness: 240}) : 1;
					const sc = seg.hi ? lerp(1.25, 1, pop) : 1;
					return (
						<span
							key={ci}
							style={{
								display: 'inline-block',
								opacity: e,
								transform: `translateY(${(1 - e) * 22}px) scale(${sc})`,
								color: seg.hi ? C.hi : undefined,
								fontWeight: seg.hi ? 900 : 700,
							}}
						>
							{ch}
						</span>
					);
				});
				if (!seg.hi) return <React.Fragment key={si}>{els}</React.Fragment>;
				const u = clamp((frame - (s.start + startIdx * 0.7 + 5)) / 8);
				return (
					<span key={si} style={{position: 'relative', display: 'inline-block'}}>
						{els}
						<span
							style={{
								position: 'absolute',
								left: '4%',
								right: '4%',
								bottom: 2,
								height: 8,
								borderRadius: 4,
								background: C.hi,
								opacity: 0.85,
								transform: `scaleX(${easeOut(u)})`,
								transformOrigin: 'left center',
								boxShadow: 'none',
							}}
						/>
					</span>
				);
			})}
		</div>
	);
};

/** 冲击波 + 闪白（屏幕空间） */
const Impact: React.FC<{frame: number; at: number; strength?: number; color?: string}> = ({
	frame,
	at,
	strength = 1,
	color = C.hi,
}) => {
	const dt = frame - at;
	if (dt < 0 || dt > 26) return null;
	const t = dt / 26;
	const r = lerp(60, 1250, easeOut(t));
	return (
		<AbsoluteFill>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				<circle
					cx={960}
					cy={SUB.slamY}
					r={r}
					fill="none"
					stroke={color}
					strokeWidth={lerp(26, 1, t) * strength}
					opacity={(1 - t) * 0.75}
				/>
				<circle
					cx={960}
					cy={SUB.slamY}
					r={r * 0.72}
					fill="none"
					stroke="#ffffff"
					strokeWidth={lerp(8, 0.5, t) * strength}
					opacity={(1 - t) * 0.35}
				/>
			</svg>
			<AbsoluteFill style={{background: '#EAF3FF', opacity: Math.max(0, 0.3 - dt * 0.06) * strength}} />
		</AbsoluteFill>
	);
};

const Slam: React.FC<{s: Screen; frame: number}> = ({s, frame}) => {
	const impact = cue(s.id, 'hit', 7);
	const impact2 = cue(s.id, 'hit2', 16);
	const segs = splitHighlights(s);
	const size = Math.min(SUB.slamMax, Math.floor(SUB.maxWidth / (visualLen(s.text) * 1.04)));
	const tIn = clamp((frame - s.start) / Math.max(1, impact - s.start));
	const scaleIn = lerp(2.6, 1, easeIn(tIn));
	const settle = springAt(frame, impact, {damping: 10, stiffness: 260});
	const bounce = frame >= impact ? 1 + (1 - settle) * -0.06 : scaleIn;
	const exit = prog(frame, s.end - EXIT, s.end, easeIn);
	const beat = s.pulse ? pulseAt(frame) * Math.min(1, s.pulse.vol) : 0;
	const blur = frame < impact ? (1 - tIn) * 10 : 0;
	return (
		<>
			<Impact frame={frame} at={impact} />
			<Impact frame={frame} at={impact2} strength={0.55} />
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: SUB.slamY - size * 0.68,
					textAlign: 'center',
					fontFamily: FONT_SERIF,
					fontWeight: 900,
					fontSize: size,
					lineHeight: 1.36,
					color: C.text,
					whiteSpace: 'nowrap',
					opacity: clamp(tIn * 3) * (1 - exit),
					filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
					transform: `scale(${bounce * (1 - exit * 0.08) * (1 + beat * 0.035)})`,
					textShadow: halo('rgba(0,0,0,0.95)', 1.2),
				}}
			>
				{segs.map((seg, si) => {
					if (!seg.hi) return <span key={si}>{seg.text}</span>;
					const t2 = clamp((frame - (impact2 - 5)) / 5);
					const sp = springAt(frame, impact2, {damping: 9, stiffness: 240});
					const sc = frame < impact2 ? lerp(3.2, 1.12, easeIn(t2)) : 1.12 + (1 - sp) * -0.1;
					return (
						<span
							key={si}
							style={{
								display: 'inline-block',
								color: frame >= impact2 - 5 ? C.hi : C.text,
								opacity: frame < impact2 - 5 ? 0 : clamp(t2 * 2),
								transform: `scale(${sc}) translateY(${-size * 0.02}px)`,
								margin: `0 ${size * (0.04 + (seg.text.length > 2 ? 0.12 * seg.text.length * 0.5 : 0))}px`,
							}}
						>
							{seg.text}
						</span>
					);
				})}
			</div>
		</>
	);
};

const Title: React.FC<{s: Screen; frame: number}> = ({s, frame}) => {
	const boom = cue(s.id, 'boom', 4);
	const list = Array.from(s.text);
	return (
		<>
			<Impact frame={frame} at={boom} strength={1.4} color={C.red} />
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: SUB.slamY - SUB.titleSize * 0.68,
					textAlign: 'center',
					fontFamily: FONT_SERIF,
					fontWeight: 900,
					fontSize: SUB.titleSize,
					lineHeight: 1.36,
					letterSpacing: '0.08em',
					color: C.text,
					whiteSpace: 'nowrap',
					textShadow: halo('rgba(0,0,0,0.95)', 1.6),
				}}
			>
				{list.map((ch, i) => {
					const at = boom + i * 3;
					const t = clamp((frame - (at - 5)) / 5);
					const sp = springAt(frame, at, {damping: 10, stiffness: 260});
					const sc = frame < at ? lerp(3.4, 1, easeIn(t)) : 1 + (1 - sp) * -0.07;
					return (
						<span
							key={i}
							style={{
								display: 'inline-block',
								opacity: clamp(t * 2.5),
								transform: `scale(${sc})`,
								color: i >= 3 ? C.hi : C.text,
							}}
						>
							{ch}
						</span>
					);
				})}
			</div>
		</>
	);
};

const Note: React.FC<{s: Screen; frame: number}> = ({s, frame}) => (
	<div
		style={{
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 70,
			textAlign: 'center',
			fontFamily: FONT_SANS,
			fontWeight: 400,
			fontSize: 30,
			color: C.dim,
			opacity: prog(frame, s.start, s.start + 10) * (1 - prog(frame, s.end - EXIT, s.end)),
		}}
	>
		{s.text}
	</div>
);

export const Subtitles: React.FC<{frame: number; sectionIds?: string[]}> = ({frame, sectionIds}) => {
	const s = screens.find(
		(x) => frame >= x.start && frame < x.end && (!sectionIds || sectionIds.includes(x.section))
	);
	if (!s) return null;
	const style = s.style ?? 'normal';
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			{style === 'normal' && <Normal s={s} frame={frame} />}
			{style === 'slam' && <Slam s={s} frame={frame} />}
			{style === 'title' && <Title s={s} frame={frame} />}
			{style === 'note' && <Note s={s} frame={frame} />}
		</AbsoluteFill>
	);
};
