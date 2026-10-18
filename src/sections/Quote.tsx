// 第 7 节 金句 (屏 42-44): 卧室里主角起身 转身, 捧着七分满的金缮杯 (倒空自己的爱 不叫浓 叫渴)
// 然后走出卧室, 回到开头那间屋子, 对方站在桌边; 两人各捧一只七分满的杯, 停在快要相碰的位置
import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, type CharacterProps} from '../components/Character';
import {Cup, cupSide} from '../components/Cup';
import {screenById, travel} from '../lib/timeline';
import {COLORS} from '../theme';
import {HERO_KEYS, HERO_LOOK, PARTNER_LOOK, PLACES, heroState, lightFor, partnerState} from './cast';

const S = (id: number) => screenById(id);
export const QUOTE_START = S(42).startFrame;
export const QUOTE_END = S(45).startFrame;
export const HOME_HERO = -95;
export const HOME_PARTNER = 95;

export const quoteHeroX = (f: number) =>
	f < S(44).startFrame ? PLACES.bedEdge + 10 : travel(HERO_KEYS, f, PLACES.bedEdge + 10, HOME_HERO, S(44).startFrame, QUOTE_END);

/** 双手捧杯在胸前时两只手的 IK 目标 */
export const holdTargets = (cup: {x: number; y: number; scale?: number; tilt?: number}, facing: number) => {
	const sideF = cupSide(cup, facing === 1 ? -1 : 1, 0.45);
	const sideB = cupSide(cup, facing === 1 ? 1 : -1, 0.5);
	return {ikF: {x: sideF.x + facing * 14, y: sideF.y}, ikB: {x: (sideB.x + sideF.x) / 2 - facing * 4, y: sideB.y}};
};

export const Quote: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	if (f < QUOTE_START || f >= QUOTE_END) return null;
	const hx = quoteHeroX(f);
	const hs = heroState(f, fps);
	const facing = hs.facing >= 0 ? 1 : -1;
	const walking = f >= S(44).startFrame && hs.key.pose === 'walk';
	const cup = {x: hx + facing * 54, y: walking ? -236 : -250, scale: 0.82};
	const heroProps: CharacterProps = {
		...HERO_LOOK, x: hx, y: 0, state: hs, light: hx < -950 ? [0.6, -0.8] : lightFor(hx), vx: hx - quoteHeroX(f - 1),
		...holdTargets(cup, facing),
	} as CharacterProps;
	const inRoom = f >= S(44).startFrame;
	const ps = partnerState(f, fps);
	const pcup = {x: HOME_PARTNER - 54, y: -250, scale: 0.82};
	const partnerProps: CharacterProps = {
		...PARTNER_LOOK, x: HOME_PARTNER, y: 0, state: ps, light: lightFor(HOME_PARTNER), ...holdTargets(pcup, -1),
	} as CharacterProps;
	return (
		<g>
			{inRoom ? <Character {...partnerProps} between={<Cup id="q-partner" {...pcup} fill={0.7} liquid={COLORS.liquidPartner} wobble={0.2} />} /> : null}
			<Character {...heroProps} between={<Cup id="q-hero" {...cup} fill={0.72} liquid={COLORS.liquidHero} kintsugi={1} wobble={walking ? 0.5 : 0.2} />} />
		</g>
	);
};
