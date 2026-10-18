// 第 3 节 融合 (屏 14-18): 还在平原上, 人群暗下去, 镜头推成两人中景, 光变暖
// 主角转回身面对对方, 对方放下杯塔; 两人各捧一杯 -> 两股液体在半空合流 -> 合成一股浑浊的暗橙 (融合)
// -> 主角被拽得跪倒 -> 对方一皱眉主角就抱头 -> 两个剪影重叠, 从合流的那只杯穿进下一节
import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, solveSkeleton, useRenderMode, type CharacterProps} from '../components/Character';
import {Cup, cupLip, cupSide, Drop, PourStream} from '../components/Cup';
import {cueFrame, screenById, travel} from '../lib/timeline';
import {COLORS} from '../theme';
import {HERO_KEYS, HERO_LOOK, PARTNER_LOOK, heroState, lightFor, partnerState} from './cast';
import {heroCup} from './Hook';

const S = (id: number) => screenById(id);
export const FUSION_START = S(14).startFrame;
export const FUSION_END = S(19).startFrame;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const io = (f: number, a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], {...clamp, easing: ease});

const T = {
	start: FUSION_START,
	cupsIn: cueFrame(S(14), 1),
	tilt: S(15).startFrame,
	merge: S(16).startFrame,
	frown: S(17).startFrame,
	overlap: S(18).startFrame,
	end: FUSION_END,
};
const PARTNER_X = 1000;
const HERO_X0 = 1160;
const HERO_X1 = 1085;
const STACK_X = 905;
const STACK_N = 8;
const STACK_CUP = 0.64;
const NEEDS = ['陪伴', '倾听', '安全感', '成长', '意义', '理解', '回应', '全部'];

export const fusionHeroX = (f: number) => (f < T.overlap ? HERO_X0 : travel(HERO_KEYS, f, HERO_X0, HERO_X1, T.overlap, T.end));

const mixColor = (a: string, b: string, t: number) => {
	const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
	const [x, y] = [p(a), p(b)];
	return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

export const Fusion: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const mode = useRenderMode();
	if (f < T.start - 2 || f >= T.end + 2) return null;

	const hx = fusionHeroX(f);
	const hs = heroState(f, fps);
	const ps = partnerState(f, fps);
	const murk = io(f, T.merge - 2, T.merge + 6, 0, 1);

	// 两只杯的位置: 捧在胸前, 屏 15 互相倾斜, 屏 16 主角跪下杯子跟着往下, 屏 17 主角抱头时杯子放在地上
	const kneelDrop = io(f, T.merge - 4, T.merge + 6, 0, 1);
	const onFloor = f >= T.frown;
	const heroCupPos = onFloor
		? {x: hx - 78, y: 0}
		: {x: hx - 56 - io(f, T.tilt, T.tilt + 24, 0, 18), y: -250 + kneelDrop * 92};
	const partnerCupPos = {x: PARTNER_X + 56 + io(f, T.tilt, T.tilt + 24, 0, 14), y: -250 + io(f, T.merge, T.merge + 10, 0, -12)};
	const tiltIn = io(f, T.tilt, T.tilt + 30, 0, 56) * (1 - io(f, T.merge, T.merge + 12, 0, 1));
	const heroFill = f < T.cupsIn ? 0 : io(f, T.cupsIn, T.tilt, 0.15, 0.62) - io(f, T.tilt + 10, T.merge, 0, 0.12);
	const partnerFill = io(f, T.cupsIn, T.cupsIn + 12, 0, 0.62) - io(f, T.tilt + 10, T.merge, 0, 0.12);
	const heroLiquid = mixColor(COLORS.liquidHero, COLORS.murky, murk);
	const partnerLiquid = mixColor(COLORS.liquidPartner, COLORS.murky, murk);

	// 转身前, 杯子还挂在主角远侧手里; 转过来以后双手捧到胸前
	const heroProbe: CharacterProps = {...HERO_LOOK, x: hx, y: 0, state: hs} as CharacterProps;
	const handB = solveSkeleton(heroProbe, f, fps).armB.H;
	const carried = heroCup(f, handB);
	const grab = io(f, T.start, T.cupsIn, 0, 1);
	const heroCupNow = {
		x: carried.x + (heroCupPos.x - carried.x) * grab,
		y: carried.y + (heroCupPos.y - carried.y) * grab,
		tilt: -tiltIn,
		fill: heroFill,
		scale: 0.82,
	};
	const holding = !onFloor;
	const face = cupSide(heroCupNow, 1, 0.45);
	const back = cupSide(heroCupNow, -1, 0.5);
	const heroProps: CharacterProps = {
		...HERO_LOOK, x: hx, y: 0, state: hs, light: lightFor(hx), vx: hx - fusionHeroX(f - 1),
		ikF: holding && grab > 0.5 ? {x: face.x - 14, y: face.y} : null,
		ikB: holding && grab > 0.5 ? {x: (back.x + face.x) / 2 + 4, y: back.y} : null,
		ikWeight: grab,
		rim: 1 - 0.5 * io(f, T.overlap, T.end, 0, 1),
	} as CharacterProps;

	const pFace = cupSide({...partnerCupPos, tilt: tiltIn, scale: 0.82}, -1, 0.45);
	const pBack = cupSide({...partnerCupPos, tilt: tiltIn, scale: 0.82}, 1, 0.5);
	const pIn = io(f, T.cupsIn - 6, T.cupsIn + 4, 0, 1);
	const partnerProps: CharacterProps = {
		...PARTNER_LOOK, x: PARTNER_X, y: 0, state: ps, light: lightFor(PARTNER_X),
		ikF: pIn > 0 ? {x: pFace.x + 14, y: pFace.y} : null,
		ikB: pIn > 0 ? {x: (pBack.x + pFace.x) / 2 - 4, y: pBack.y} : null,
		ikWeight: pIn,
		rim: 1 - 0.5 * io(f, T.overlap, T.end, 0, 1),
	} as CharacterProps;

	// 杯塔: 从对方怀里滑到地上, 之后就立在那里
	const pSk = solveSkeleton({...PARTNER_LOOK, x: PARTNER_X, y: 0, state: partnerState(T.start, fps)} as CharacterProps, T.start, fps);
	const armsBase = {x: (pSk.armF.W.x + pSk.armB.W.x) / 2 - 10, y: (pSk.armF.W.y + pSk.armB.W.y) / 2 + 8};
	const down = io(f, T.start, T.start + 12, 0, 1);
	const step = 70 * STACK_CUP - 4;

	const heroLip = cupLip(heroCupNow);
	const partnerLip = cupLip({...partnerCupPos, tilt: tiltIn, scale: 0.82});
	const meet = {x: (heroLip.x + partnerLip.x) / 2, y: Math.min(heroLip.y, partnerLip.y) - 26};
	const bridge = f >= T.tilt + 8 && f < T.merge ? io(f, T.tilt + 8, T.tilt + 22, 0, 1) : 0;
	const blobR = f < T.merge ? io(f, T.tilt + 14, T.merge, 0, 16) : 16 * (1 - io(f, T.merge, T.merge + 6, 0, 1));
	const wash = f >= T.merge ? Math.max(0, 1 - (f - T.merge) / 30) : 0;
	const glow = io(f, T.start, T.start + 40, 0, 1);

	return (
		<g>
			{mode === 'normal' ? (
				<>
					<defs>
						<radialGradient id="fusion-glow">
							<stop offset="0" stopColor={COLORS.gold} stopOpacity={0.3} />
							<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
						</radialGradient>
						<radialGradient id="fusion-murk">
							<stop offset="0" stopColor={COLORS.murky} stopOpacity={0.35} />
							<stop offset="1" stopColor={COLORS.murky} stopOpacity={0} />
						</radialGradient>
					</defs>
					<ellipse cx={1070} cy={-240} rx={520} ry={420} fill="url(#fusion-glow)" opacity={glow * (1 - 0.6 * murk)} />
					<ellipse cx={1070} cy={-240} rx={620} ry={480} fill="url(#fusion-murk)" opacity={murk} />
				</>
			) : null}
			{Array.from({length: STACK_N}, (_, i) => {
				const from = {x: armsBase.x, y: armsBase.y - i * step};
				const to = {x: STACK_X, y: -i * step};
				return (
					<Cup key={i} id={`fstack-${i}`} x={from.x + (to.x - from.x) * down} y={from.y + (to.y - from.y) * down} scale={STACK_CUP} fill={0} label={NEEDS[i]} labelSize={22} opacity={0.85} />
				);
			})}
			<Character
				{...partnerProps}
				between={
					<Cup id="fusion-partner" {...partnerCupPos} tilt={tiltIn} scale={0.82} fill={partnerFill} liquid={partnerLiquid} wobble={f >= T.frown && f < T.frown + 30 ? 1 : 0.3} opacity={pIn} glint={io(f, T.cupsIn - 6, T.cupsIn, 0, 1) - io(f, T.cupsIn, T.cupsIn + 8, 0, 1)} />
				}
			/>
			<Character
				{...heroProps}
				between={holding ? <Cup id="fusion-hero" {...heroCupNow} liquid={heroLiquid} stain={heroFill < 0.05 ? 1 : 0} wobble={0.4} /> : null}
			/>
			{onFloor ? <Cup id="fusion-hero-floor" {...heroCupPos} scale={0.82} fill={0.5} liquid={COLORS.murky} wobble={f < T.frown + 24 ? 1.2 : 0.3} /> : null}
			<PourStream from={heroLip} to={meet} flow={bridge * 0.8} color={COLORS.liquidHero} />
			<PourStream from={partnerLip} to={meet} flow={bridge * 0.8} color={COLORS.liquidPartner} />
			{blobR > 0.5 && mode === 'normal' ? <circle cx={meet.x} cy={meet.y} r={blobR} fill={mixColor(COLORS.liquidHero, COLORS.murky, io(f, T.tilt + 14, T.merge, 0, 0.8))} /> : null}
			{f >= T.merge && f < T.merge + 24
				? Array.from({length: 10}, (_, i) => {
						const t = (f - T.merge) / 24;
						const a = (i / 10) * Math.PI * 2;
						return <Drop key={i} x={meet.x + Math.cos(a) * 160 * t} y={meet.y + Math.sin(a) * 90 * t + 200 * t * t} r={6} color={COLORS.murky} />;
					})
				: null}
			{wash > 0 && mode === 'normal' ? <rect x={-2000} y={-3000} width={8000} height={6000} fill={COLORS.murky} opacity={0.32 * wash} /> : null}
		</g>
	);
};
