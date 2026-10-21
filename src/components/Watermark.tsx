import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT} from '../theme';

// 右上角固定水印：在镜头之外，全程不动、不缩放

export const WATERMARK = {text: '肆号静匣Logos', right: 44, top: 36, size: 22};

export const Watermark: React.FC = () => (
	<AbsoluteFill style={{pointerEvents: 'none'}}>
		<div
			style={{
				position: 'absolute',
				right: WATERMARK.right,
				top: WATERMARK.top,
				padding: '6px 12px',
				border: '1px solid #FFFFFF',
				fontFamily: FONT,
				fontWeight: 700,
				fontSize: WATERMARK.size,
				lineHeight: 1.2,
				letterSpacing: '0.06em',
				color: '#FFFFFF',
				opacity: 0.35,
				whiteSpace: 'nowrap',
			}}
		>
			{WATERMARK.text}
		</div>
	</AbsoluteFill>
);
