/**
 * 代码绘制的人物（SVG 骨骼）：头、头发、耳朵、躯干、四肢（圆头粗线）、手、鞋，胸口一颗会跳的心。
 * 角度：度；0 = 竖直向下，正值 = 朝人物面向的方向抬起。原点在双脚中点（地面 y=0）。
 * facing：1 朝右，-1 朝左；介于两者之间时横向压扁，用来做「转身」。
 * age：0 = 小孩比例，1 = 成人比例，中间连续插值（「长大」）。
 */
import React, {useId} from 'react';
import {lerp} from '../lib/anim';

export type Limb = {a: number; b: number; k?: number};
export type Pose = {
	lean?: number;
	head?: number;
	armBack?: Limb;
	armFront?: Limb;
	legBack?: Limb;
	legFront?: Limb;
	bob?: number;
	crouch?: number; // 0..1 屈膝下蹲
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
export type Face = 'neutral' | 'down' | 'smile' | 'flat' | 'sad' | 'none';

const ADULT = {thigh: 80, shin: 78, torso: 118, neck: 14, headR: 33, upper: 64, fore: 60, hipW: 30, shW: 38, limbW: 22, armW: 18, heart: 9};
const CHILD = {thigh: 46, shin: 44, torso: 72, neck: 8, headR: 30, upper: 38, fore: 36, hipW: 22, shW: 26, limbW: 16, armW: 13, heart: 7.5};
type Prop = typeof ADULT;
const props = (age: number): Prop => {
	const o = {} as Prop;
	(Object.keys(ADULT) as (keyof Prop)[]).forEach((k) => (o[k] = lerp(CHILD[k], ADULT[k], age)));
	return o;
};

/** 人物总高（不含缩放），用于构图 */
export const personHeight = (age = 1) => {
	const P = props(age);
	return P.thigh + P.shin + P.torso + P.neck + P.headR * 2;
};
/** 胸口（心脏）相对脚底的高度 */
export const heartHeight = (age = 1) => {
	const P = props(age);
	return P.thigh + P.shin + P.torso * 0.7;
};

const rad = (d: number) => (d * Math.PI) / 180;
const seg = (x: number, y: number, ang: number, len: number) => ({x: x + Math.sin(rad(ang)) * len, y: y + Math.cos(rad(ang)) * len});

export const Person: React.FC<{
	x: number;
	y?: number;
	scale?: number;
	facing?: number;
	pose?: Pose;
	palette: Palette;
	age?: number;
	face?: Face;
	heart?: number; // 心跳强度 0..1.2；<0 不画心
	heartGlow?: number;
	heartScale?: number; // 心形放大（特写时让心填满画面）
	tone?: string; // 单色（人群剪影/幽灵）
	opacity?: number;
}> = ({x, y = 0, scale = 1, facing = 1, pose = {}, palette, age = 1, face = 'neutral', heart = 0.5, heartGlow = 1, heartScale = 1, tone, opacity = 1}) => {
	const id = useId().replace(/:/g, '');
	const P = props(age);
	const {lean = 0, head = 0, bob = 0, crouch = 0} = pose;
	const armBack = pose.armBack ?? {a: -6, b: 8};
	const armFront = pose.armFront ?? {a: 6, b: 10};
	const legBack = pose.legBack ?? {a: -4 - crouch * 40, b: crouch * 80};
	const legFront = pose.legFront ?? {a: 4 + crouch * 40, b: -crouch * 80};

	const legLen = (P.thigh + P.shin) * (1 - crouch * 0.28);
	const hip = {x: 0, y: -legLen + bob};
	const sh = seg(hip.x, hip.y, 180 - lean, P.torso);
	const neckTop = seg(sh.x, sh.y, 180 - lean - head * 0.3, P.neck);
	const headC = seg(neckTop.x, neckTop.y, 180 - lean - head, P.headR * 0.95);

	const leg = (l: Limb) => {
		const k = seg(hip.x, hip.y, l.a, P.thigh);
		const f = seg(k.x, k.y, l.a + l.b, P.shin);
		return {k, f: {x: f.x, y: Math.min(0, f.y)}};
	};
	const arm = (l: Limb) => {
		const s = seg(sh.x, sh.y, -lean, 10);
		const e = seg(s.x, s.y, l.a, P.upper);
		const h = seg(e.x, e.y, l.a + l.b, P.fore * (l.k ?? 1));
		return {s, e, h};
	};
	const lb = leg(legBack);
	const lf = leg(legFront);
	const ab = arm(armBack);
	const af = arm(armFront);

	const C: Palette = tone
		? {skin: tone, skinShade: tone, hair: tone, shirt: tone, shirtShade: tone, pants: tone, pantsShade: tone, shoes: tone}
		: palette;

	const dir = {x: sh.x - hip.x, y: sh.y - hip.y};
	const L = Math.hypot(dir.x, dir.y);
	const n = {x: -dir.y / L, y: dir.x / L};
	const torsoPts = [
		{x: sh.x + n.x * P.shW * 0.5, y: sh.y + n.y * P.shW * 0.5},
		{x: sh.x - n.x * P.shW * 0.62, y: sh.y - n.y * P.shW * 0.62},
		{x: hip.x - n.x * P.hipW * 0.62, y: hip.y - n.y * P.hipW * 0.62 + 6},
		{x: hip.x + n.x * P.hipW * 0.62, y: hip.y + n.y * P.hipW * 0.62 + 6},
	];
	const torsoD = `M ${torsoPts.map((p) => `${p.x} ${p.y}`).join(' L ')} Z`;

	const heartPos = {x: sh.x + (hip.x - sh.x) * 0.3 + 6, y: sh.y + (hip.y - sh.y) * 0.3};
	const hb = Math.max(0, heart);
	const hs = P.heart * heartScale * (1 + 0.3 * hb);
	const heartD = `M 0 ${hs * 0.35} C ${-hs * 1.1} ${-hs * 0.4}, ${-hs * 0.45} ${-hs * 1.15}, 0 ${-hs * 0.45} C ${hs * 0.45} ${-hs * 1.15}, ${hs * 1.1} ${-hs * 0.4}, 0 ${hs * 0.35} Z`;

	const limb = (pts: {x: number; y: number}[], w: number, color: string) => (
		<polyline points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
	);

	const r = P.headR;
	const cx = headC.x;
	const cy = headC.y;
	const hairD = `M ${cx + r * 0.78} ${cy - r * 0.42}
		A ${r * 1.06} ${r * 1.06} 0 1 0 ${cx - r * 0.62} ${cy + r * 0.86}
		L ${cx - r * 0.2} ${cy + r * 0.62}
		Q ${cx - r * 0.12} ${cy + r * 0.05} ${cx + r * 0.2} ${cy - r * 0.22}
		Q ${cx + r * 0.55} ${cy - r * 0.18} ${cx + r * 0.78} ${cy - r * 0.42} Z`;

	const ink = '#2a1d18';
	const eyeX = cx + r * 0.48;
	const eyeY = cy - 1;
	const mouthX = cx + r * 0.45;
	const mouthY = cy + r * 0.48;
	const faceEls =
		tone || face === 'none' ? null : (
			<g>
				{face === 'down' || face === 'flat' ? (
					<path d={`M ${eyeX - 6} ${eyeY + 1} q 6 ${face === 'down' ? 4 : 0} 11 0`} stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />
				) : (
					<circle cx={eyeX} cy={eyeY} r={3.6} fill={ink} />
				)}
				{face === 'smile' && <path d={`M ${mouthX - 4} ${mouthY - 2} q 8 6 15 -2`} stroke={ink} strokeWidth={3} fill="none" strokeLinecap="round" />}
				{face === 'sad' && <path d={`M ${mouthX - 2} ${mouthY + 2} q 6 -5 12 0`} stroke={ink} strokeWidth={2.8} fill="none" strokeLinecap="round" />}
				{(face === 'neutral' || face === 'down' || face === 'flat') && (
					<path d={`M ${mouthX} ${mouthY} l 10 0`} stroke={ink} strokeWidth={2.6} strokeLinecap="round" opacity={0.75} />
				)}
				<circle cx={cx + r * 0.2} cy={cy + r * 0.35} r={6} fill="#ff8a7a" opacity={0.25} />
			</g>
		);

	const sx = facing === 0 ? 0.001 : facing;
	return (
		<g transform={`translate(${x} ${y}) scale(${scale * sx} ${scale})`} opacity={opacity}>
			<defs>
				<radialGradient id={`hg-${id}`}>
					<stop offset="0%" stopColor="#ff5a45" stopOpacity={0.85} />
					<stop offset="40%" stopColor="#ff3b2a" stopOpacity={0.28} />
					<stop offset="100%" stopColor="#ff3b2a" stopOpacity={0} />
				</radialGradient>
			</defs>
			{limb([hip, lb.k, lb.f], P.limbW, C.pantsShade)}
			<ellipse cx={lb.f.x + 7} cy={lb.f.y - 3} rx={P.limbW * 0.68} ry={P.limbW * 0.36} fill={C.shoes} />
			{limb([ab.s, ab.e, ab.h], P.armW, C.shirtShade)}
			<circle cx={ab.h.x} cy={ab.h.y} r={P.armW * 0.5} fill={C.skinShade} />
			{limb([hip, lf.k, lf.f], P.limbW, C.pants)}
			<ellipse cx={lf.f.x + 7} cy={lf.f.y - 3} rx={P.limbW * 0.68} ry={P.limbW * 0.36} fill={C.shoes} />
			<path d={torsoD} fill={C.shirt} stroke={C.shirt} strokeWidth={14} strokeLinejoin="round" />
			{limb([sh, neckTop], P.armW * 0.9, C.skinShade)}
			<circle cx={cx} cy={cy} r={r} fill={C.skin} />
			<path d={hairD} fill={C.hair} />
			<ellipse cx={cx - r * 0.05} cy={cy + r * 0.12} rx={r * 0.16} ry={r * 0.22} fill={C.skinShade} />
			{faceEls}
			{limb([af.s, af.e, af.h], P.armW, C.shirt)}
			<circle cx={af.h.x} cy={af.h.y} r={P.armW * 0.5} fill={C.skin} />
			{heart >= 0 && !tone && (
				<g transform={`translate(${heartPos.x} ${heartPos.y})`}>
					<circle r={55 * heartGlow * Math.sqrt(heartScale) * (1 + 0.4 * hb) * (P.heart / 9)} fill={`url(#hg-${id})`} opacity={0.5 + 0.5 * Math.min(1, hb)} />
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
	kid: {skin: '#F3CBAA', skinShade: '#DCAE8C', hair: '#1E1A1C', shirt: '#6FA6C4', shirtShade: '#5288A6', pants: '#33405A', pantsShade: '#273147', shoes: '#14161C'},
} satisfies Record<string, Palette>;
