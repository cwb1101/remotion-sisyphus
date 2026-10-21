import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {SCREENS, WIDTH, type Screen} from '../data/script';
import {fonts, palette, subtitleStyle} from '../theme';

type Seg = {t: string; hi: boolean};

/** 按重点词切分（最长优先） */
export const splitHighlights = (s: Screen): Seg[] => {
	const hs = [...s.highlights].sort((a, b) => b.length - a.length);
	const out: Seg[] = [];
	let i = 0;
	let buf = '';
	while (i < s.text.length) {
		const h = hs.find((x) => s.text.startsWith(x, i));
		if (h) {
			if (buf) out.push({t: buf, hi: false});
			buf = '';
			out.push({t: h, hi: true});
			i += h.length;
		} else {
			buf += s.text[i];
			i++;
		}
	}
	if (buf) out.push({t: buf, hi: false});
	return out;
};

/**
 * 字幕：思源黑体 Bold，暖白，重点词高光金；不描边不发光，只有一层淡阴影
 * 水平居中，单行宽度 ≤ 960（x 落在 480–1440，不进入右侧 1/4）
 */
export const Subtitles: React.FC = () => {
	const frame = useCurrentFrame();
	const s = SCREENS.find((x) => frame >= x.startFrame && frame < x.endFrame);
	if (!s) return null;
	const fin = Math.min(1, (frame - s.startFrame + 1) / subtitleStyle.fadeIn);
	const fout = Math.min(1, (s.endFrame - frame) / subtitleStyle.fadeOut);
	const segs = splitHighlights(s);
	return (
		<AbsoluteFill style={{pointerEvents: 'none'}}>
			<div
				style={{
					position: 'absolute',
					left: (WIDTH - subtitleStyle.maxWidth) / 2,
					width: subtitleStyle.maxWidth,
					bottom: subtitleStyle.bottom,
					textAlign: 'center',
					fontFamily: fonts.sansCn,
					fontWeight: 700,
					fontSize: subtitleStyle.fontSize,
					lineHeight: subtitleStyle.lineHeight,
					color: palette.text,
					textShadow: subtitleStyle.shadow,
					opacity: Math.min(fin, fout),
					wordBreak: 'keep-all',
					textWrap: 'balance',
					writingMode: 'horizontal-tb',
				}}
				data-subtitle={s.id}
			>
				{segs.map((g, i) => (
					<span key={i} style={g.hi ? {color: palette.goldHi} : undefined}>
						{g.t}
					</span>
				))}
			</div>
		</AbsoluteFill>
	);
};
