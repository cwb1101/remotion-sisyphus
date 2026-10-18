// 第 8 节 回到开头 (屏 45-48): 同一张桌 同一个机位 同一声放杯
// 这一次杯子是金缮过的 七分满, 放下只轻轻一晃; 对方放下手机抬头看主角; 主角提起杯 停在倾倒前 没有倒
// 桌上多了老朋友和搭子的杯, 光从几个方向来; 最后两人举杯 碰杯 都笑了
import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, useRenderMode, type CharacterProps} from '../components/Character';
import {Cup} from '../components/Cup';
import {Phone} from '../components/Props';
import {cueFrame, screenById} from '../lib/timeline';
import {COLORS} from '../theme';
import {HERO_LOOK, PARTNER_LOOK, PLACES, heroState, lightFor, partnerState} from './cast';
import {HOME_HERO, HOME_PARTNER, holdTargets} from './Quote';

const S = (id: number) => screenById(id);
export const CALLBACK_START = S(45).startFrame;
export const CALLBACK_END = S(49).startFrame;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const io = (f: number, a: number, b: number, from: number, to: number) => interpolate(f, [a, b], [from, to], {...clamp, easing: ease});

const T = {
	sit: S(45).startFrame,
	land: cueFrame(S(45), 1),
	look: S(46).startFrame,
	lift: cueFrame(S(46), 2),
	almost: cueFrame(S(46), 4),
	back: S(47).startFrame,
	friends: cueFrame(S(47), 2),
	clink: S(48).startFrame,
	leave: S(49).startFrame,
};

const lerpP = (a: {x: number; y: number}, b: {x: number; y: number}, t: number) => ({x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t});

/** 两只杯在第 8 节的位置: 由几个时间点串起来 */
export const callbackCups = (f: number) => {
	const home = PLACES.heroCupHome;
	const pHome = PLACES.partnerCupHome;
	const heroHeld = {x: HOME_HERO + 54, y: -250};
	const pHeld = {x: HOME_PARTNER - 54, y: -250};
	let hero = lerpP(heroHeld, home, io(f, T.sit, T.land, 0, 1));
	let tilt = 0;
	hero = lerpP(hero, {x: -24, y: -262}, io(f, T.lift, T.lift + 14, 0, 1));
	tilt = io(f, T.lift + 14, T.almost, 0, 16) - io(f, T.almost + 6, T.back, 0, 16);
	hero = lerpP(hero, home, io(f, T.back, T.back + 14, 0, 1));
	let partner = lerpP(pHeld, pHome, io(f, T.sit, T.land + 4, 0, 1));
	// 碰杯: 两只杯在桌子正上方相遇, 正好落在拍上
	const meet = io(f, T.clink - 7, T.clink, 0, 1);
	hero = lerpP(hero, {x: -27, y: -300}, meet);
	partner = lerpP(partner, {x: 27, y: -300}, meet);
	return {hero, partner, tilt};
};

export const Callback: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const mode = useRenderMode();
	if (f < CALLBACK_START || f >= CALLBACK_END) return null;
	const hs = heroState(f, fps);
	const ps = partnerState(f, fps);
	const sitK = io(f, T.sit, T.sit + 14, 0, 1);
	const hx = HOME_HERO + (PLACES.heroChair - HOME_HERO) * sitK;
	const px = HOME_PARTNER + (PLACES.partnerChair - HOME_PARTNER) * sitK;
	const {hero, partner, tilt} = callbackCups(f);
	const landWobble = f >= T.land ? Math.max(0, 1 - (f - T.land) / 24) * 0.5 : 0;
	const clinkFlash = f >= T.clink && f < T.clink + 14 ? 1 - (f - T.clink) / 14 : 0;

	// 对方: 坐下后像开头一样拿着手机, 屏 46 放下手机抬头
	const phoneDown = io(f, T.look, T.look + 12, 0, 1);
	const phoneHeld = {x: px - 52, y: -258};
	const phoneTable = {x: 150, y: PLACES.tableTop - 3};
	const phone = lerpP(phoneHeld, phoneTable, phoneDown);
	const partnerHolds = f >= T.clink - 10;
	const heroOnCup = f < T.land || (f >= T.lift - 4 && f < T.back + 14) || f >= T.clink - 10;
	const heroProps: CharacterProps = {
		...HERO_LOOK, x: hx, y: 0, state: hs, light: lightFor(hx),
		...(heroOnCup ? holdTargets({...hero, scale: 0.82, tilt}, 1) : {ikF: {x: -112, y: PLACES.tableTop - 6}, ikB: {x: -126, y: PLACES.tableTop - 4}}),
	} as CharacterProps;
	const partnerProps: CharacterProps = {
		...PARTNER_LOOK, x: px, y: 0, state: ps, light: lightFor(px),
		...(partnerHolds
			? holdTargets({...partner, scale: 0.82}, -1)
			: f < T.look + 6
				? {ikF: {x: phone.x - 4, y: phone.y + 10}, ikB: {x: phone.x + 6, y: phone.y + 14}}
				: {ikF: {x: 112, y: PLACES.tableTop - 6}, ikB: {x: 126, y: PLACES.tableTop - 4}}),
	} as CharacterProps;
	const friendsIn = (d: number) => io(f, T.friends + d, T.friends + d + 10, 0, 1);

	return (
		<g>
			{mode === 'normal' ? (
				<>
					<defs>
						<radialGradient id="cb-warm">
							<stop offset="0" stopColor={COLORS.gold} stopOpacity={0.25} />
							<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
						</radialGradient>
					</defs>
					{/* 屏 47 起光从几个方向来 */}
					<circle cx={-420} cy={-320} r={420} fill="url(#cb-warm)" opacity={friendsIn(0)} />
					<circle cx={420} cy={-320} r={420} fill="url(#cb-warm)" opacity={friendsIn(16)} />
				</>
			) : null}
			<Character {...partnerProps} between={partnerHolds ? <Cup id="cb-partner" {...partner} scale={0.82} fill={0.7} liquid={COLORS.liquidPartner} wobble={0.2} /> : null} />
			{!partnerHolds ? <Cup id="cb-partner-t" {...partner} scale={0.82} fill={0.7} liquid={COLORS.liquidPartner} wobble={0.15} /> : null}
			<Phone id="cb-phone" x={phone.x} y={phone.y} rot={phoneDown * 90} light={1 - phoneDown} faceDown={phoneDown > 0.9} />
			<Cup id="cb-friend1" x={-8} y={PLACES.tableTop} scale={0.55} fill={0.6} liquid={COLORS.ivory} opacity={friendsIn(0)} glint={friendsIn(0) * (1 - friendsIn(8))} />
			<Cup id="cb-friend2" x={28} y={PLACES.tableTop} scale={0.55} fill={0.6} liquid={COLORS.gold} opacity={friendsIn(16)} glint={friendsIn(16) * (1 - friendsIn(24))} />
			<Character {...heroProps} between={heroOnCup ? <Cup id="cb-hero" {...hero} scale={0.82} tilt={tilt} fill={0.72} liquid={COLORS.liquidHero} kintsugi={1} wobble={0.2 + landWobble} glint={clinkFlash} /> : null} />
			{!heroOnCup ? <Cup id="cb-hero-t" {...hero} scale={0.82} fill={0.72} liquid={COLORS.liquidHero} kintsugi={1} wobble={0.15 + landWobble} /> : null}
		</g>
	);
};
