/**
 * 代码绘制的人物（SVG 骨骼）：头、头发、躯干、四肢（圆头粗线）、手、鞋，胸口一颗会跳的心。
 * 角度单位：度；0 = 竖直向下，正值 = 朝人物面向的方向抬起。
 * 原点在双脚中点（地面）。facing = 1 朝右，-1 朝左。
 */
import React, {useId} from 'react';

export type Limb = {a: number; b: number; k?: number}; // 上段角度、下段相对角度、下段长度系数（透视缩短）
export type Pose = {
	lean?: number; // 躯干前倾
	head?: number; // 头部俯仰（正 = 低头）
	armBack?: Limb;
	armFront?: Limb;
	legBack?: Limb;
	legFront?: Limb;
	bob?: number; // 整体上下（呼吸/走路）
};
export type Palette = {
	skin: string;
	skinShade: string;
	hair: string;
	shirt: string;
	shirtShade: string;
	pants: string;
	pantsShade: string;
	shoes: string;
};
export type Variant = 'flat' | 'silhouette';

const ADULT = {thigh: 80, shin: 78, torso: 118, neck: 14, headR: 33, upper: 64, fore: 60, hipW: 30, shW: 36, limbW: 22, armW: 18};
const CHILD = {thigh: 46, shin: 44, torso: 72, neck: 8, headR: 30, upper: 38, fore: 36, hipW: 20, shW: 24, limbW: 16, armW: 13};

const rad = (d: number) => (d * Math.PI) / 180;
const seg = (x: number, y: number, ang: number, len: number) => ({x: x + Math.sin(rad(ang)) * len, y: y + Math.cos(rad(ang)) * len});

export const Person: React.FC<{
	x: number;
	y: number;
	scale?: number;
	facing?: 1 | -1;
	pose?: Pose;
	palette: Palette;
	variant?: Variant;
	child?: boolean;
	face?: 'neutral' | 'down' | 'smile' | 'none';
	heart?: number; // 心跳强度 0..1.2，<0 不画
	heartGlow?: number;
	rim?: string; // 剪影的轮廓光颜色
	opacity?: number;
}> = ({x, y, scale = 1, facing = 1, pose = {}, palette, variant = 'flat', child = false, face = 'neutral', heart = 0.5, heartGlow = 1, rim = '#9fc3ff', opacity = 1}) => {
	const id = useId().replace(/:/g, '');
	const P = child ? CHILD : ADULT;
	const {lean = 0, head = 0, bob = 0} = pose;
	const armBack = pose.armBack ?? {a: -8, b: 10};
	const armFront = pose.armFront ?? {a: 8, b: 12};
	const legBack = pose.legBack ?? {a: -4, b: 0};
	const legFront = pose.legFront ?? {a: 4, b: 0};

	const hip = {x: 0, y: -(P.thigh + P.shin) + bob};
	const sh = seg(hip.x, hip.y, 180 - lean, P.torso); // 躯干向上
	const neckTop = seg(sh.x, sh.y, 180 - lean - head * 0.3, P.neck);
	const headC = seg(neckTop.x, neckTop.y, 180 - lean - head, P.headR * 0.95);

	const leg = (l: Limb) => {
		const k = seg(hip.x, hip.y, l.a, P.thigh);
		const f = seg(k.x, k.y, l.a + l.b, P.shin);
		return {k, f};
	};
	const arm = (l: Limb) => {
		const s = seg(sh.x, sh.y, 0, 10);
		const e = seg(s.x, s.y, l.a, P.upper);
		const h = seg(e.x, e.y, l.a + l.b, P.fore * (l.k ?? 1));
		return {s, e, h};
	};
	const lb = leg(legBack);
	const lf = leg(legFront);
	const ab = arm(armBack);
	const af = arm(armFront);

	const sil = variant === 'silhouette';
	const C = sil
		? {skin: '#07090e', skinShade: '#07090e', hair: '#07090e', shirt: '#07090e', shirtShade: '#07090e', pants: '#07090e', pantsShade: '#07090e', shoes: '#07090e'}
		: palette;

	// 躯干：肩宽→胯宽的圆角四边形（沿脊柱方向）
	const dir = {x: sh.x - hip.x, y: sh.y - hip.y};
	const L = Math.hypot(dir.x, dir.y);
	const n = {x: -dir.y / L, y: dir.x / L};
	const torsoPts = [
		{x: sh.x + n.x * P.shW * 0.5 - (dir.x / L) * -4, y: sh.y + n.y * P.shW * 0.5},
		{x: sh.x - n.x * P.shW * 0.62, y: sh.y - n.y * P.shW * 0.62},
		{x: hip.x - n.x * P.hipW * 0.6, y: hip.y - n.y * P.hipW * 0.6 + 6},
		{x: hip.x + n.x * P.hipW * 0.6, y: hip.y + n.y * P.hipW * 0.6 + 6},
	];
	const torsoD = `M ${torsoPts.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;

	const heartPos = {x: sh.x + (hip.x - sh.x) * 0.3 + 6, y: sh.y + (hip.y - sh.y) * 0.3};
	const hb = Math.max(0, heart);
	const hs = (child ? 7 : 9) * (1 + 0.28 * hb);
	const heartD = `M 0 ${hs * 0.35} C ${-hs * 1.1} ${-hs * 0.4}, ${-hs * 0.45} ${-hs * 1.15}, 0 ${-hs * 0.45} C ${hs * 0.45} ${-hs * 1.15}, ${hs * 1.1} ${-hs * 0.4}, 0 ${hs * 0.35} Z`;

	const limb = (pts: {x: number; y: number}[], w: number, color: string) => (
		<polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
	);

	const hairD = (() => {
		const r = P.headR;
		const cx = headC.x;
		const cy = headC.y;
		// 头顶 + 后脑（朝右时后脑在左）：从额头经头顶绕到后颈
		return `M ${cx + r * 0.78} ${cy - r * 0.42}
			A ${r * 1.06} ${r * 1.06} 0 1 0 ${cx - r * 0.62} ${cy + r * 0.86}
			L ${cx - r * 0.2} ${cy + r * 0.62}
			Q ${cx - r * 0.12} ${cy + r * 0.05} ${cx + r * 0.2} ${cy - r * 0.22}
			Q ${cx + r * 0.55} ${cy - r * 0.18} ${cx + r * 0.78} ${cy - r * 0.42} Z`;
	})();

	const faceEls =
		sil || face === 'none' ? null : (
			<g>
				{face === 'down' ? (
					<path d={`M ${headC.x + P.headR * 0.38} ${headC.y + 2} q 6 3 11 0`} stroke="#2a1d18" strokeWidth={3} fill="none" strokeLinecap="round" />
				) : (
					<circle cx={headC.x + P.headR * 0.48} cy={headC.y - 1} r={3.6} fill="#2a1d18" />
				)}
				{face === 'smile' && (
					<path d={`M ${headC.x + P.headR * 0.42} ${headC.y + P.headR * 0.42} q 8 6 15 -2`} stroke="#2a1d18" strokeWidth={3} fill="none" strokeLinecap="round" />
				)}
				{face !== 'smile' && (
					<path d={`M ${headC.x + P.headR * 0.5} ${headC.y + P.headR * 0.5} l 10 0`} stroke="#2a1d18" strokeWidth={2.6} strokeLinecap="round" opacity={0.7} />
				)}
				<circle cx={headC.x + P.headR * 0.2} cy={headC.y + P.headR * 0.35} r={6} fill="#ff8a7a" opacity={0.25} />
			</g>
		);

	const body = (dx = 0, dy = 0, override?: string) => {
		const c = (k: keyof Palette) => override ?? C[k];
		return (
			<g transform={`translate(${dx} ${dy})`}>
				{limb([hip, lb.k, lb.f], P.limbW, c('pantsShade'))}
				<ellipse cx={lb.f.x + 7} cy={lb.f.y - 3} rx={child ? 10 : 15} ry={child ? 6 : 8} fill={c('shoes')} />
				{limb([ab.s, ab.e, ab.h], P.armW, c('shirtShade'))}
				<circle cx={ab.h.x} cy={ab.h.y} r={P.armW * 0.5} fill={c('skinShade')} />
				{limb([hip, lf.k, lf.f], P.limbW, c('pants'))}
				<ellipse cx={lf.f.x + 7} cy={lf.f.y - 3} rx={child ? 10 : 15} ry={child ? 6 : 8} fill={c('shoes')} />
				<path d={torsoD} fill={c('shirt')} stroke={c('shirt')} strokeWidth={14} strokeLinejoin="round" />
				{limb([sh, neckTop], P.armW * 0.9, c('skinShade'))}
				<circle cx={headC.x} cy={headC.y} r={P.headR} fill={c('skin')} />
				<path d={hairD} fill={c('hair')} />
				<ellipse cx={headC.x - P.headR * 0.05} cy={headC.y + P.headR * 0.12} rx={P.headR * 0.16} ry={P.headR * 0.22} fill={c('skinShade')} />
				{limb([af.s, af.e, af.h], P.armW, c('shirt'))}
				<circle cx={af.h.x} cy={af.h.y} r={P.armW * 0.5} fill={c('skin')} />
			</g>
		);
	};

	return (
		<g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`} opacity={opacity}>
			<defs>
				<radialGradient id={`hg-${id}`}>
					<stop offset="0%" stopColor="#ff5a45" stopOpacity={0.85} />
					<stop offset="40%" stopColor="#ff3b2a" stopOpacity={0.28} />
					<stop offset="100%" stopColor="#ff3b2a" stopOpacity={0} />
				</radialGradient>
			</defs>
			{sil && body(-3.5, -2, rim)}
			{body()}
			{faceEls}
			{heart >= 0 && (
				<g transform={`translate(${heartPos.x} ${heartPos.y})`}>
					<circle r={(child ? 40 : 55) * heartGlow * (1 + 0.4 * hb)} fill={`url(#hg-${id})`} opacity={0.5 + 0.5 * Math.min(1, hb)} />
					<path d={heartD} fill="#ff4433" />
				</g>
			)}
		</g>
	);
};

export const PAL = {
	cool: {skin: '#F1C7A6', skinShade: '#D9A988', hair: '#1E1A1C', shirt: '#3F7FA0', shirtShade: '#2E6280', pants: '#2A3142', pantsShade: '#1F2533', shoes: '#14161C'},
	warm: {skin: '#F3C9A4', skinShade: '#DBAA84', hair: '#4A2A1E', shirt: '#E9895F', shirtShade: '#C96E47', pants: '#3D3550', pantsShade: '#2E283D', shoes: '#1A1520'},
	mom: {skin: '#EFC3A0', skinShade: '#D6A582', hair: '#2B1C18', shirt: '#B45A6A', shirtShade: '#944756', pants: '#38304A', pantsShade: '#2A2438', shoes: '#16131C'},
} satisfies Record<string, Palette>;

/** 「壳」：包住人物的冷色玻璃泡，带霜和高光 */
export const Bubble: React.FC<{x: number; y: number; r: number; frost?: number; opacity?: number; tint?: string}> = ({
	x,
	y,
	r,
	frost = 0.5,
	opacity = 1,
	tint = '#9fd4ff',
}) => {
	const id = useId().replace(/:/g, '');
	const ticks = Array.from({length: 48}, (_, i) => {
		const a = (i / 48) * Math.PI * 2;
		const len = (6 + ((i * 37) % 11)) * frost;
		return (
			<line
				key={i}
				x1={x + Math.cos(a) * (r + 4)}
				y1={y + Math.sin(a) * (r + 4)}
				x2={x + Math.cos(a) * (r + 4 + len)}
				y2={y + Math.sin(a) * (r + 4 + len)}
				stroke={tint}
				strokeWidth={2}
				opacity={0.35 * frost}
			/>
		);
	});
	return (
		<g opacity={opacity}>
			<defs>
				<radialGradient id={`bb-${id}`}>
					<stop offset="70%" stopColor={tint} stopOpacity={0.03} />
					<stop offset="94%" stopColor={tint} stopOpacity={0.16} />
					<stop offset="100%" stopColor={tint} stopOpacity={0.4} />
				</radialGradient>
			</defs>
			<circle cx={x} cy={y} r={r} fill={`url(#bb-${id})`} stroke={tint} strokeOpacity={0.55} strokeWidth={2.5} />
			<path d={`M ${x - r * 0.7} ${y - r * 0.45} A ${r * 0.85} ${r * 0.85} 0 0 1 ${x - r * 0.1} ${y - r * 0.82}`} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={5} fill="none" strokeLinecap="round" />
			{ticks}
		</g>
	);
};
