// 场景小物件: 手机 消息气泡 壶 茶壶 液面曲线 脚印 床 床头柜 窗 计数刻痕
// 全部在世界坐标里画, 遮罩模式下不画
import React from 'react';
import {COLORS, FONTS} from '../theme';
import {useRenderMode} from './Character';

const useNormal = () => useRenderMode() === 'normal';

/** 手机: light 屏幕亮度 0..1, faceDown 扣着放, ad 显示一条广告色块 */
export const Phone: React.FC<{x: number; y: number; rot?: number; light?: number; faceDown?: boolean; ad?: number; scale?: number; id: string}> = ({
	x, y, rot = 0, light = 0.75, faceDown, ad = 0, scale = 1, id,
}) => {
	if (!useNormal()) return null;
	return (
		<g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
			<defs>
				<radialGradient id={`pg-${id}`}>
					<stop offset="0" stopColor={COLORS.ivory} stopOpacity={0.3} />
					<stop offset="1" stopColor={COLORS.ivory} stopOpacity={0} />
				</radialGradient>
			</defs>
			{!faceDown && light > 0.02 ? <circle r={70} fill={`url(#pg-${id})`} opacity={light} /> : null}
			<rect x={-10} y={-17} width={20} height={34} rx={3} fill="#050404" stroke={COLORS.goldDim} strokeWidth={1} />
			{!faceDown ? <rect x={-8} y={-14} width={16} height={27} rx={2} fill={COLORS.ivory} opacity={0.12 + 0.75 * light} /> : null}
			{ad > 0 ? <rect x={-7} y={-4} width={14} height={7} rx={1.5} fill={COLORS.vermilion} opacity={ad} /> : null}
		</g>
	);
};

/** 消息气泡 (文字不带标点), tail 指向说话的人 */
export const Bubble: React.FC<{x: number; y: number; text: string; t: number; tail?: 1 | -1; gold?: boolean; scale?: number}> = ({x, y, text, t, tail = -1, gold, scale = 1}) => {
	if (!useNormal() || t <= 0) return null;
	const w = 24 + text.length * 24;
	const k = Math.min(1, t) * scale;
	return (
		<g transform={`translate(${x} ${y}) scale(${k})`} opacity={Math.min(1, t * 1.5)}>
			<rect x={-w / 2} y={-22} width={w} height={44} rx={22} fill={gold ? COLORS.gold : COLORS.ivory} />
			<polygon points={`${tail * 10},18 ${tail * 26},34 ${tail * 22},14`} fill={gold ? COLORS.gold : COLORS.ivory} />
			<text y={8} textAnchor="middle" fontFamily={FONTS.sans} fontWeight={500} fontSize={22} fill="#2A2018">
				{text}
			</text>
		</g>
	);
};

/** 壶 (对方 朋友倒水用), tilt 倾斜角 */
export const Jug: React.FC<{x: number; y: number; tilt?: number; color?: string; scale?: number; flip?: boolean}> = ({x, y, tilt = 0, color = COLORS.goldDim, scale = 1, flip}) => {
	if (!useNormal()) return null;
	return (
		<g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${flip ? -scale : scale} ${scale})`}>
			<path d="M -18 0 Q -24 -30 -14 -52 L 14 -52 Q 24 -30 18 0 Z" fill={color} stroke={COLORS.gold} strokeWidth={1.2} />
			<path d="M 14 -48 L 28 -56 L 16 -40" fill={color} stroke={COLORS.gold} strokeWidth={1.2} />
			<path d="M -16 -44 Q -34 -34 -18 -16" fill="none" stroke={COLORS.gold} strokeWidth={3} />
		</g>
	);
};

/** 茶壶 (主角给自己倒) */
export const Teapot: React.FC<{x: number; y: number; tilt?: number; scale?: number; flip?: boolean}> = ({x, y, tilt = 0, scale = 1, flip}) => {
	if (!useNormal()) return null;
	return (
		<g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${flip ? -scale : scale} ${scale})`}>
			<ellipse cx={0} cy={-20} rx={26} ry={20} fill={COLORS.cup} stroke={COLORS.cupShade} strokeWidth={1.5} />
			<path d="M 22 -24 Q 40 -30 44 -44" stroke={COLORS.cup} strokeWidth={6} fill="none" strokeLinecap="round" />
			<path d="M -24 -30 Q -40 -22 -24 -10" stroke={COLORS.cupShade} strokeWidth={4} fill="none" />
			<rect x={-8} y={-44} width={16} height={6} rx={3} fill={COLORS.gold} />
		</g>
	);
};

/** 液面高度曲线 (数据线): values 0..1, 画在杯子上方 */
export const LevelGraph: React.FC<{x: number; y: number; w: number; h: number; values: number[]; opacity?: number}> = ({x, y, w, h, values, opacity = 1}) => {
	if (!useNormal() || values.length < 2) return null;
	const pts = values.map((v, i) => `${x + (i / (values.length - 1)) * w},${y - v * h}`).join(' ');
	return (
		<g opacity={opacity}>
			<line x1={x} x2={x + w} y1={y} y2={y} stroke={COLORS.ivory} strokeOpacity={0.25} strokeWidth={1.5} />
			<polyline points={pts} fill="none" stroke={COLORS.vermilion} strokeWidth={3} strokeLinejoin="round" />
		</g>
	);
};

/** 脚印 */
export const Footprints: React.FC<{xs: number[]; y: number}> = ({xs, y}) => {
	if (!useNormal()) return null;
	return (
		<g fill={COLORS.ivory} opacity={0.18}>
			{xs.map((x, i) => (
				<ellipse key={i} cx={x} cy={y + (i % 2) * 6} rx={14} ry={4} />
			))}
		</g>
	);
};

export const Bed: React.FC<{x0: number; x1: number; top: number}> = ({x0, x1, top}) => {
	if (!useNormal()) return null;
	return (
		<g>
			<rect x={x0 - 20} y={top - 120} width={18} height={-top + 120} fill={COLORS.wood} stroke={COLORS.goldDim} strokeWidth={1} strokeOpacity={0.5} />
			<rect x={x0} y={top} width={x1 - x0} height={-top - 24} fill={COLORS.wood} />
			<rect x={x0 + 6} y={-24} width={10} height={24} fill={COLORS.wood} />
			<rect x={x1 - 16} y={-24} width={10} height={24} fill={COLORS.wood} />
			<path d={`M ${x0} ${top + 4} Q ${(x0 + x1) / 2} ${top - 16} ${x1} ${top + 2} L ${x1} ${top + 40} L ${x0} ${top + 40} Z`} fill="#2B2420" />
			<path d={`M ${x0} ${top + 4} Q ${(x0 + x1) / 2} ${top - 16} ${x1} ${top + 2}`} fill="none" stroke={COLORS.ivory} strokeOpacity={0.18} strokeWidth={2} />
			<ellipse cx={x0 + 46} cy={top - 6} rx={42} ry={14} fill="#3A322C" />
		</g>
	);
};

export const Nightstand: React.FC<{x: number; top: number}> = ({x, top}) => {
	if (!useNormal()) return null;
	return (
		<g>
			<rect x={x - 40} y={top} width={80} height={-top} fill={COLORS.wood} stroke={COLORS.goldDim} strokeWidth={1} strokeOpacity={0.5} />
			<rect x={x - 40} y={top} width={80} height={3} fill={COLORS.gold} opacity={0.35} />
			<line x1={x - 30} x2={x + 30} y1={top / 2} y2={top / 2} stroke="#000" strokeOpacity={0.4} strokeWidth={2} />
		</g>
	);
};

/** 窗 + 月亮 */
export const NightWindow: React.FC<{x: number; y: number; w: number; h: number; glow?: number}> = ({x, y, w, h, glow = 1}) => {
	if (!useNormal()) return null;
	return (
		<g>
			<defs>
				<radialGradient id="moon-glow">
					<stop offset="0" stopColor={COLORS.ivory} stopOpacity={0.5} />
					<stop offset="1" stopColor={COLORS.ivory} stopOpacity={0} />
				</radialGradient>
			</defs>
			<rect x={x - w / 2} y={y - h / 2} width={w} height={h} fill="#0E1116" stroke={COLORS.goldDim} strokeWidth={3} />
			<circle cx={x + w * 0.18} cy={y - h * 0.15} r={70} fill="url(#moon-glow)" opacity={glow} />
			<circle cx={x + w * 0.18} cy={y - h * 0.15} r={22} fill={COLORS.ivory} opacity={0.85} />
			<line x1={x} x2={x} y1={y - h / 2} y2={y + h / 2} stroke={COLORS.goldDim} strokeWidth={3} />
			<line x1={x - w / 2} x2={x + w / 2} y1={y} y2={y} stroke={COLORS.goldDim} strokeWidth={3} />
		</g>
	);
};

/** 墙上的计数刻痕: 每 5 道一组, 第 5 道斜着划过 */
export const Tally: React.FC<{x: number; y: number; n: number; fresh?: number}> = ({x, y, n, fresh = 0}) => {
	if (!useNormal() || n <= 0) return null;
	return (
		<g stroke={COLORS.ivory} strokeWidth={4} strokeLinecap="round">
			{Array.from({length: n}, (_, i) => {
				const g = Math.floor(i / 5);
				const k = i % 5;
				const gx = x + g * 90;
				const op = i === n - 1 ? 0.5 + 0.5 * fresh : 0.75;
				if (k === 4) return <line key={i} x1={gx - 8} x2={gx + 62} y1={y + 34} y2={y - 2} opacity={op} />;
				return <line key={i} x1={gx + k * 16} x2={gx + k * 16} y1={y} y2={y + 40} opacity={op} />;
			})}
		</g>
	);
};

/** 壶嘴 / 茶壶嘴在世界里的位置 (flip 时壶嘴朝左) */
export const spoutOf = (kind: 'jug' | 'teapot', x: number, y: number, tilt: number, flip: boolean) => {
	const [sx, sy] = kind === 'jug' ? [28, -56] : [44, -44];
	const lx = flip ? -sx : sx;
	const a = (tilt * Math.PI) / 180;
	return {x: x + lx * Math.cos(a) - sy * Math.sin(a), y: y + lx * Math.sin(a) + sy * Math.cos(a)};
};
