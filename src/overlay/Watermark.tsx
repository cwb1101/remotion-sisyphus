import React from 'react';
import {SCRIPT} from '../data/script';
import {FONTS, LAYOUT} from '../theme';

// 右上角固定水印 细空心方框 透明度 35%
export const Watermark: React.FC = () => (
	<div
		className="txt"
		style={{
			position: 'absolute',
			right: LAYOUT.watermark.right,
			top: LAYOUT.watermark.top,
			padding: '5px 14px 6px',
			border: '1px solid #FFFFFF',
			color: '#FFFFFF',
			fontFamily: FONTS.sans,
			fontSize: 22,
			lineHeight: 1.2,
			letterSpacing: 2,
			opacity: 0.35,
		}}
	>
		{SCRIPT.meta.watermark}
	</div>
);
