// 水印: 右上角固定, 在镜头层之外, 不随镜头运动或缩放
import React from 'react';
import {COLORS, FONTS, WATERMARK_BOX} from '../theme';
import {useRenderMode} from './Character';

export const Watermark: React.FC = () => {
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	return (
		<div
			style={{
				position: 'absolute',
				right: 1920 - WATERMARK_BOX.x - WATERMARK_BOX.w + 18,
				top: WATERMARK_BOX.y + 14,
				padding: '5px 12px',
				border: `1px solid ${COLORS.ivory}`,
				color: COLORS.ivory,
				opacity: 0.35,
				fontFamily: FONTS.sans,
				fontWeight: 400,
				fontSize: 22,
				lineHeight: 1.3,
				letterSpacing: 1,
			}}
		>
			肆号静匣Logos
		</div>
	);
};
