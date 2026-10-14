import React from 'react';

/**
 * 贯穿物件 · 泪滴本体。
 * (x, y) 是圆底的圆心；r 为圆底半径；stretch > 1 时沿竖直方向拉长（下落）。
 * 配色依赖 <TearDefs/> 里定义的渐变与发光滤镜。
 */
export const tearPath = (r: number) =>
	`M 0 ${-2.1 * r} C ${0.55 * r} ${-1.25 * r} ${r} ${-0.55 * r} ${r} 0 A ${r} ${r} 0 0 1 ${-r} 0 C ${-r} ${-0.55 * r} ${-0.55 * r} ${-1.25 * r} 0 ${-2.1 * r} Z`;

export const Tear: React.FC<{
	x: number;
	y: number;
	r: number;
	stretch?: number;
	opacity?: number;
	glow?: boolean;
	rotate?: number;
	/** 深色泪滴（憋着的委屈） */
	dark?: boolean;
}> = ({x, y, r, stretch = 1, opacity = 1, glow = true, rotate = 0, dark = false}) => {
	if (r <= 0.2 || opacity <= 0) {
		return null;
	}
	return (
		<g
			transform={`translate(${x},${y}) rotate(${rotate}) scale(${1 / Math.sqrt(stretch)},${stretch})`}
			opacity={opacity}
		>
			{glow ? (
				<path d={tearPath(r * 1.5)} fill="#5CC8FF" opacity={0.35} filter="url(#softGlow)" />
			) : null}
			<path d={tearPath(r)} fill={dark ? 'url(#tearDark)' : 'url(#tearFill)'} />
			<ellipse cx={-r * 0.35} cy={-r * 0.25} rx={r * 0.18} ry={r * 0.32} fill="#FFFFFF" opacity={0.75} />
		</g>
	);
};

/** 共享的渐变与滤镜，放在顶层 <svg><defs> 中 */
export const TearDefs: React.FC = () => (
	<>
		<radialGradient id="tearFill" cx="0.4" cy="0.65" r="0.75">
			<stop offset="0" stopColor="#D8F3FF" />
			<stop offset="0.45" stopColor="#5CC8FF" />
			<stop offset="1" stopColor="#2A7FB8" />
		</radialGradient>
		<radialGradient id="tearDark" cx="0.4" cy="0.65" r="0.75">
			<stop offset="0" stopColor="#8FB3D9" />
			<stop offset="0.5" stopColor="#3B5F86" />
			<stop offset="1" stopColor="#1C2C40" />
		</radialGradient>
		<filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
			<feGaussianBlur stdDeviation="6" />
		</filter>
		<filter id="bigGlow" x="-50%" y="-50%" width="200%" height="200%">
			<feGaussianBlur stdDeviation="14" />
		</filter>
		<filter id="lineGlow" x="-5%" y="-200%" width="110%" height="500%">
			<feGaussianBlur stdDeviation="5" />
		</filter>
		<linearGradient id="waterBody" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stopColor="#5CC8FF" stopOpacity="0.16" />
			<stop offset="0.35" stopColor="#2A7FB8" stopOpacity="0.07" />
			<stop offset="1" stopColor="#0E1A2B" stopOpacity="0" />
		</linearGradient>
		<linearGradient id="vesselWater" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stopColor="#5CC8FF" stopOpacity="0.55" />
			<stop offset="1" stopColor="#2A7FB8" stopOpacity="0.35" />
		</linearGradient>
	</>
);

/**
 * 一颗按时间自动“凝结 → 下落 → 落地”的泪滴。
 * formStart..detach 期间在 (x, y0) 处长大，detach..land 期间加速落到 groundY。
 */
export const FallingTear: React.FC<{
	frame: number;
	x: number;
	y0: number;
	groundY: number;
	r: number;
	formStart: number;
	detach: number;
	land: number;
	/** 悬挂时圆心相对挂点的下垂量（按 r 计） */
	hang?: number;
	dark?: boolean;
	/** 下落时的水平终点（默认竖直下落） */
	x1?: number;
}> = ({frame, x, y0, groundY, r, formStart, detach, land, hang = 1.1, dark = false, x1}) => {
	if (frame < formStart || frame > land + 1) {
		return null;
	}
	if (frame < detach) {
		const t = (frame - formStart) / (detach - formStart);
		const rr = r * Math.sqrt(Math.max(0, t));
		const wobble = 1 + 0.06 * Math.sin(frame * 0.9) * t;
		return <Tear x={x} y={y0 + rr * hang} r={rr} stretch={wobble} dark={dark} />;
	}
	const t = (frame - detach) / (land - detach);
	const startY = y0 + r * hang;
	const y = startY + (groundY - r - startY) * t * t;
	const xx = x1 === undefined ? x : x + (x1 - x) * t;
	return <Tear x={xx} y={y} r={r} stretch={1 + 0.35 * t} dark={dark} />;
};
