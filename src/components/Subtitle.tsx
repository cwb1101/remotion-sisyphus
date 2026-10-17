import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Highlight, Screen, screenAt} from '../data/script';
import {lerp} from '../lib/anim';
import {COLORS, FONTS, LAYOUT} from '../theme';

const BASE = LAYOUT.subtitle.fontSize;
const LETTER = 2;
const SPACE = 30;
const LINE_HEIGHT = 1.3;
// 字幕切换 3 帧完成
const SWITCH = 3;

// 三种可复用的高亮处理 字号倍率和字体
export const HIGHLIGHT_SCALE: Record<Highlight['style'], number> = {
	songUnderline: 1.35,
	outlineScale: 1.25,
	numberSweep: 1.3,
};
const HIGHLIGHT_FONT: Record<Highlight['style'], string> = {
	songUnderline: FONTS.serifHeavy,
	outlineScale: FONTS.sansHeavy,
	numberSweep: FONTS.smiley,
};

type Run = {text: string; highlight?: Highlight};
export type LayoutChar = {char: string; x: number; y: number; size: number};

const splitRuns = (text: string, highlights: Highlight[]): Run[] => {
	const runs: Run[] = [];
	let rest = text;
	while (rest.length) {
		let best: {i: number; h: Highlight} | undefined;
		for (const h of highlights) {
			const i = rest.indexOf(h.word);
			if (i >= 0 && (!best || i < best.i)) best = {i, h};
		}
		if (!best) {
			runs.push({text: rest});
			break;
		}
		if (best.i > 0) runs.push({text: rest.slice(0, best.i)});
		runs.push({text: best.h.word, highlight: best.h});
		rest = rest.slice(best.i + best.h.word.length);
	}
	return runs;
};

const charWidth = (char: string, h?: Highlight) =>
	char === ' ' ? SPACE : BASE * (h ? HIGHLIGHT_SCALE[h.style] : 1) + LETTER;

const runWidth = (r: Run) =>
	[...r.text].reduce((w, c) => w + charWidth(c, r.highlight), 0);

// 一行放不下 1200px 就在最靠近中间的空格处断成两行
const toLines = (runs: Run[]): Run[][] => {
	const total = runs.reduce((w, r) => w + runWidth(r), 0);
	const maxWidth = LAYOUT.subtitle.right - LAYOUT.subtitle.left;
	if (total <= maxWidth) return [runs];
	let acc = 0;
	let best = {dist: Infinity, run: -1, idx: -1};
	runs.forEach((r, ri) => {
		[...r.text].forEach((c, ci) => {
			if (c === ' ' && !r.highlight) {
				const dist = Math.abs(acc - total / 2);
				if (dist < best.dist) best = {dist, run: ri, idx: ci};
			}
			acc += charWidth(c, r.highlight);
		});
	});
	if (best.run < 0) return [runs];
	const r = runs[best.run];
	const head = r.text.slice(0, best.idx);
	const tail = r.text.slice(best.idx + 1);
	return [
		[...runs.slice(0, best.run), ...(head ? [{text: head}] : [])],
		[...(tail ? [{text: tail}] : []), ...runs.slice(best.run + 1)],
	];
};

// 估算每个字在画面上的位置 供字幕变物件的镜头使用
export const layoutSubtitle = (screen: Screen): LayoutChar[] => {
	const lines = toLines(splitRuns(screen.text, screen.highlights));
	const lineH = BASE * 1.35 * LINE_HEIGHT;
	const out: LayoutChar[] = [];
	lines.forEach((line, li) => {
		const width = line.reduce((w, r) => w + runWidth(r), 0);
		let x = (LAYOUT.subtitle.left + LAYOUT.subtitle.right) / 2 - width / 2;
		const y = LAYOUT.subtitle.bottom - (lines.length - li - 0.5) * lineH;
		for (const r of line) {
			for (const c of r.text) {
				const w = charWidth(c, r.highlight);
				if (c !== ' ') out.push({char: c, x: x + w / 2, y, size: w - LETTER});
				x += w;
			}
		}
	});
	return out;
};

const HighlightRun: React.FC<{h: Highlight; local: number}> = ({h, local}) => {
	const size = BASE * HIGHLIGHT_SCALE[h.style];
	const pop = lerp(local, 0, 6, 1.18, 1);
	const common: React.CSSProperties = {
		position: 'relative',
		display: 'inline-block',
		fontFamily: HIGHLIGHT_FONT[h.style],
		fontSize: size,
		letterSpacing: LETTER,
		transform: `scale(${pop})`,
		transformOrigin: '50% 70%',
	};
	if (h.style === 'songUnderline') {
		const grow = lerp(local, 2, 10, 0, 1);
		return (
			<span className="txt" style={{...common, color: h.color}}>
				{h.word}
				<span
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						bottom: 2,
						height: 7,
						borderRadius: 4,
						background: h.color,
						transform: `scaleX(${grow})`,
						transformOrigin: 'left center',
						boxShadow: `0 0 8px ${h.color}88`,
					}}
				/>
			</span>
		);
	}
	if (h.style === 'outlineScale') {
		return (
			<span
				className="txt"
				style={{
					...common,
					color: 'transparent',
					WebkitTextStroke: `2.5px ${h.color}`,
					filter: `drop-shadow(0 0 10px ${h.color}66) drop-shadow(0 2px 6px rgba(0,0,0,0.8))`,
				}}
			>
				{h.word}
			</span>
		);
	}
	const sweep = lerp(local, 3, 13, 115, -15);
	return (
		<span
			className="txt"
			style={{
				...common,
				color: 'transparent',
				backgroundImage: `linear-gradient(100deg, ${h.color} 0%, ${h.color} 38%, #FFFFFF 50%, ${h.color} 62%, ${h.color} 100%)`,
				backgroundSize: '300% 100%',
				backgroundPosition: `${sweep}% 0`,
				WebkitBackgroundClip: 'text',
				backgroundClip: 'text',
				filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.8))',
			}}
		>
			{h.word}
		</span>
	);
};

export const SubtitleBlock: React.FC<{screen: Screen; local: number}> = ({screen, local}) => {
	const lines = toLines(splitRuns(screen.text, screen.highlights));
	const opacity = lerp(local, 0, SWITCH, 0, 1);
	const rise = lerp(local, 0, SWITCH, 16, 0);
	return (
		<div
			style={{
				position: 'absolute',
				left: LAYOUT.subtitle.left,
				width: LAYOUT.subtitle.right - LAYOUT.subtitle.left,
				bottom: LAYOUT.height - LAYOUT.subtitle.bottom,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				opacity,
				transform: `translateY(${rise}px)`,
			}}
		>
			{lines.map((line, i) => (
				<div
					key={i}
					style={{
						height: BASE * 1.35 * LINE_HEIGHT,
						display: 'flex',
						alignItems: 'center',
						whiteSpace: 'pre',
					}}
				>
					{line.map((r, k) =>
						r.highlight ? (
							<HighlightRun key={k} h={r.highlight} local={local} />
						) : (
							<span
								key={k}
								className="txt"
								style={{
									fontFamily: FONTS.sans,
									fontSize: BASE,
									letterSpacing: LETTER,
									color: COLORS.text,
									textShadow: '0 2px 10px rgba(0,0,0,0.75), 0 0 2px rgba(0,0,0,0.9)',
									wordSpacing: SPACE - BASE * 0.25,
								}}
							>
								{r.text}
							</span>
						),
					)}
				</div>
			))}
		</div>
	);
};

// 固定在底部的主字幕 不在镜头里 不跟随缩放平移
export const Subtitle: React.FC = () => {
	const frame = useCurrentFrame();
	const screen = screenAt(frame);
	if (!screen) return null;
	return <SubtitleBlock screen={screen} local={frame - screen.start} />;
};
