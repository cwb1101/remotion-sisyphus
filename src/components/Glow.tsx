import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {glow} from '../theme';

/** 外层光晕的呼吸强度：0.7–1.1 之间缓慢正弦起伏（不闪烁） */
export const useBreath = (phase = 0) => {
	const frame = useCurrentFrame();
	const {fps} = useVideoConfig();
	const {strengthMin, strengthMax, periodSec} = glow.outer;
	const s = Math.sin((2 * Math.PI * frame) / (periodSec * fps) + phase);
	return strengthMin + ((strengthMax - strengthMin) * (s + 1)) / 2;
};

type GlowProps = {
	children: React.ReactNode;
	/** 整体发光强度倍数（光变暗 = 失控 / 消耗） */
	strength?: number;
	/** false = 远景：只有核心和内层光晕 */
	outer?: boolean;
	/** 外层光晕是否呼吸 */
	breathe?: boolean;
	/** 呼吸相位，让不同元素不同步 */
	phase?: number;
	/** 整体透明度 */
	opacity?: number;
	/** 内层光晕强度（大面积文字用较低值，避免填充发白） */
	inner?: number;
	/** 光晕扩散倍数（落地闪光用它，而不是提高亮度） */
	spread?: number;
	/** true：铺满画面的图层；false：跟随内容尺寸（小标签用） */
	fill?: boolean;
	style?: React.CSSProperties;
};

/**
 * 通用柔光：核心 + 内层高斯光晕 + 外层高斯光晕，三层以 screen 叠加，交叉处自然变亮
 * 所有金色元素都包在它里面
 */
export const Glow: React.FC<GlowProps> = ({
	children,
	strength = 1,
	outer = true,
	breathe = true,
	phase = 0,
	opacity = 1,
	inner = glow.inner.strength,
	spread = 1,
	fill = true,
	style,
}) => {
	const breath = useBreath(phase);
	// 外层强度始终落在 0.7–1.1 的设定内（乘以 strength 只会让光变弱）
	const outerStrength = Math.min(glow.outer.strengthMax, (breathe ? breath : (glow.outer.strengthMin + glow.outer.strengthMax) / 2) * strength);
	const innerStrength = inner * Math.min(1, strength);
	if (opacity <= 0.001) {
		return null;
	}
	const layer: React.CSSProperties = fill
		? {position: 'absolute', inset: 0}
		: {position: 'absolute', left: 0, top: 0, right: 0, bottom: 0};
	return (
		<div
			style={{
				position: fill ? 'absolute' : 'relative',
				inset: fill ? 0 : undefined,
				display: fill ? undefined : 'inline-block',
				mixBlendMode: 'screen',
				opacity,
				pointerEvents: 'none',
				...style,
			}}
		>
			{outer && outerStrength > 0.01 ? (
				<div style={{...layer, filter: `blur(${glow.outer.blur * spread}px) brightness(${outerStrength})`, mixBlendMode: 'screen'}}>
					{children}
				</div>
			) : null}
			{innerStrength > 0.01 ? (
				<div style={{...layer, filter: `blur(${glow.inner.blur * Math.sqrt(spread)}px)`, opacity: Math.min(1, innerStrength), mixBlendMode: 'screen'}}>
					{children}
				</div>
			) : null}
			<div style={fill ? {...layer, mixBlendMode: 'screen'} : {position: 'relative', mixBlendMode: 'screen'}}>{children}</div>
		</div>
	);
};
