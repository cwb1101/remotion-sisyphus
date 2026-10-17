import React from 'react';
import {enter} from '../../lib/anim';
import {COLORS, FONTS, LAYOUT} from '../../theme';

// 画面信息层的小部件 固定在左侧 x 60 到 350 不进右侧禁字区
const box = (y: number, h: number, appear: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
	position: 'absolute',
	left: LAYOUT.info.left,
	top: y,
	width: LAYOUT.info.width,
	height: h,
	opacity: appear,
	transform: `translateX(${(1 - appear) * -28}px)`,
	...extra,
});

const labelStyle: React.CSSProperties = {
	fontFamily: FONTS.sans,
	fontSize: 22,
	color: 'rgba(255,255,255,0.78)',
	letterSpacing: 2,
};

// 只出现在画面上的视觉 计算 enter 和 exit 的不透明度
export const life = (frame: number, inAt: number, outAt = Infinity, dur = 8) =>
	Math.min(enter(frame, inAt, dur), Number.isFinite(outAt) ? 1 - enter(frame, outAt, 6) : 1);

export const InfoCard: React.FC<{y: number; text: string; color?: string; appear: number; width?: number; size?: number}> = ({
	y,
	text,
	color = COLORS.text,
	appear,
	width = 168,
	size = 30,
}) => (
	<div
		style={box(y, 54, appear, {
			width,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			border: '1px solid rgba(255,255,255,0.26)',
			background: 'rgba(255,255,255,0.05)',
			borderRadius: 6,
		})}
	>
		<span className="txt" style={{fontFamily: FONTS.sansHeavy, fontSize: size, color, letterSpacing: 6}}>
			{text}
		</span>
	</div>
);

// 用几何图形画的等号和乘号 不打字符
export const MathSign: React.FC<{y: number; kind: 'eq' | 'mul'; appear: number; x?: number; size?: number; color?: string}> = ({
	y,
	kind,
	appear,
	x = LAYOUT.info.left + 84,
	size = 22,
	color = 'rgba(255,255,255,0.75)',
}) => {
	const bar = (rot: number, dy: number) => (
		<div
			style={{
				position: 'absolute',
				left: -size / 2,
				top: dy - size * 0.09,
				width: size,
				height: size * 0.18,
				borderRadius: size * 0.09,
				background: color,
				transform: `rotate(${rot}deg)`,
			}}
		/>
	);
	return (
		<div style={{position: 'absolute', left: x, top: y, opacity: appear, transform: `scale(${0.6 + 0.4 * appear})`}}>
			{kind === 'eq' ? (
				<>
					{bar(0, -size * 0.22)}
					{bar(0, size * 0.22)}
				</>
			) : (
				<>
					{bar(45, 0)}
					{bar(-45, 0)}
				</>
			)}
		</div>
	);
};

export const Counter: React.FC<{
	y: number;
	prefix?: string;
	suffix?: string;
	value: number;
	color: string;
	appear: number;
	flash?: number;
}> = ({y, prefix, suffix, value, color, appear, flash = 0}) => (
	<div style={box(y, 70, appear, {display: 'flex', alignItems: 'baseline', gap: 12})}>
		{prefix ? (
			<span className="txt" style={labelStyle}>
				{prefix}
			</span>
		) : null}
		<span
			className="txt"
			style={{
				fontFamily: FONTS.smiley,
				fontSize: 58,
				color,
				display: 'inline-block',
				transform: `scale(${1 + flash * 0.3})`,
				transformOrigin: 'left bottom',
				textShadow: flash ? `0 0 ${18 * flash}px ${color}` : 'none',
			}}
		>
			{Math.round(value)}
		</span>
		{suffix ? (
			<span className="txt" style={labelStyle}>
				{suffix}
			</span>
		) : null}
	</div>
);

export const Meter: React.FC<{y: number; label: string; value: number; color: string; appear: number; shake?: number; showValue?: boolean; valuePrefix?: string}> = ({
	y,
	label,
	value,
	color,
	appear,
	shake = 0,
	showValue = true,
	valuePrefix,
}) => (
	<div style={box(y, 56, appear)}>
		<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', height: 30}}>
			<span className="txt" style={labelStyle}>
				{label}
			</span>
			{showValue ? (
				<span className="txt" style={{fontFamily: FONTS.smiley, fontSize: 30, color}}>
					{valuePrefix}
					{Math.round(value)}
				</span>
			) : null}
		</div>
		<div style={{height: 10, marginTop: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 5, overflow: 'hidden'}}>
			<div
				style={{
					width: `${Math.max(0, Math.min(100, value))}%`,
					height: '100%',
					background: color,
					borderRadius: 5,
					transform: `translateX(${Math.sin(shake * 40) * shake * 4}px)`,
					boxShadow: `0 0 10px ${color}`,
				}}
			/>
		</div>
	</div>
);

// 半圆仪表 指针角度对应 0 到 100
export const Gauge: React.FC<{x: number; y: number; label: string; value: number; color: string; appear: number}> = ({x, y, label, value, color, appear}) => {
	const a = Math.PI * (1 - value / 100);
	const r = 52;
	return (
		<div style={{position: 'absolute', left: x, top: y, width: 130, height: 120, opacity: appear, transform: `scale(${0.85 + 0.15 * appear})`}}>
			<svg width={130} height={80} style={{overflow: 'visible'}}>
				<path d={`M${65 - r},70 A${r},${r} 0 0 1 ${65 + r},70`} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={8} strokeLinecap="round" />
				<path
					d={`M${65 - r},70 A${r},${r} 0 0 1 ${65 + r},70`}
					fill="none"
					stroke={color}
					strokeWidth={8}
					strokeLinecap="round"
					pathLength={100}
					strokeDasharray={`${value} 100`}
				/>
				<line x1={65} y1={70} x2={65 + Math.cos(a) * (r - 10)} y2={70 - Math.sin(a) * (r - 10)} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
				<circle cx={65} cy={70} r={5} fill="#FFFFFF" />
			</svg>
			<div style={{display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'baseline'}}>
				<span className="txt" style={{...labelStyle, fontSize: 18}}>
					{label}
				</span>
				<span className="txt" style={{fontFamily: FONTS.smiley, fontSize: 26, color}}>
					{Math.round(value)}
				</span>
			</div>
		</div>
	);
};

// 库伯学习圈 四个节点顺时针 经验 反思 概念 尝试
export const KolbRing: React.FC<{
	cx: number;
	cy: number;
	r: number;
	labels: string[];
	lit: number[];
	appear: number;
	dot?: {angle: number; color: string; opacity: number};
	labelSize?: number;
}> = ({cx, cy, r, labels, lit, appear, dot, labelSize = 22}) => {
	const angleOf = (i: number) => -Math.PI / 2 + (i * Math.PI) / 2;
	return (
		<div style={{position: 'absolute', left: 0, top: 0, opacity: appear}}>
			<svg width={10} height={10} style={{position: 'absolute', overflow: 'visible'}}>
				<circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={Math.max(2, r / 40)} strokeDasharray={`${r / 8} ${r / 14}`} />
				{labels.map((_, i) => {
					const a = angleOf(i);
					return (
						<circle
							key={i}
							cx={cx + Math.cos(a) * r}
							cy={cy + Math.sin(a) * r}
							r={Math.max(6, r / 12)}
							fill={lit[i] ? COLORS.cool : '#3A3631'}
							stroke={lit[i] ? '#E8FFF8' : 'rgba(255,255,255,0.3)'}
							strokeWidth={2}
							opacity={0.4 + 0.6 * lit[i]}
						/>
					);
				})}
				{dot && dot.opacity > 0 ? (
					<circle
						cx={cx + Math.cos(dot.angle) * r}
						cy={cy + Math.sin(dot.angle) * r}
						r={Math.max(7, r / 10)}
						fill={dot.color}
						opacity={dot.opacity}
						style={{filter: `drop-shadow(0 0 ${r / 10}px ${dot.color})`}}
					/>
				) : null}
			</svg>
			{labels.map((t, i) => {
				const a = angleOf(i);
				const lx = cx + Math.cos(a) * (r + labelSize * 1.6);
				const ly = cy + Math.sin(a) * (r + labelSize * 1.2);
				return (
					<span
						key={i}
						className="txt"
						style={{
							position: 'absolute',
							left: lx,
							top: ly,
							transform: 'translate(-50%, -50%)',
							fontFamily: FONTS.sans,
							fontSize: labelSize,
							color: lit[i] ? COLORS.cool : 'rgba(255,255,255,0.55)',
							whiteSpace: 'nowrap',
						}}
					>
						{t}
					</span>
				);
			})}
		</div>
	);
};
