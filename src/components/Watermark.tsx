import React from 'react';
import {AbsoluteFill} from 'remotion';
import {FONT} from '../theme';

export const WATERMARK_TEXT = '肆号静匣Logos';

/**
 * 右上角固定水印：在镜头之外，全程同一位置、不缩放。
 * 字号 22px、1px 细空心方框、透明度 35%。
 */
export const Watermark: React.FC = () => (
	<AbsoluteFill style={{pointerEvents: 'none'}}>
		<div
			style={{
				position: 'absolute',
				top: 40,
				right: 44,
				padding: '5px 12px 6px',
				border: '1px solid #FFFFFF',
				color: '#FFFFFF',
				fontFamily: FONT,
				fontWeight: 500,
				fontSize: 22,
				lineHeight: 1.2,
				letterSpacing: '0.04em',
				opacity: 0.35,
				whiteSpace: 'nowrap',
			}}
		>
			{WATERMARK_TEXT}
		</div>
	</AbsoluteFill>
);
