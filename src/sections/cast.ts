// 主角和对方: 外形 站位 走位, 各节共用, 保证跨节连续
import {poseAt, type PoseState} from '../data/poses';
import {keysFor, screenById, travel, velocity} from '../lib/timeline';
import {COLORS} from '../theme';
import type {CharacterProps} from '../components/Character';

export const HERO_LOOK: Partial<CharacterProps> = {color: COLORS.silhouette, feature: 'scarf', hair: 'bob', seed: 3, build: 0.94};
export const PARTNER_LOOK: Partial<CharacterProps> = {color: '#14100C', feature: 'none', hair: 'crop', seed: 7, build: 1.12, heightK: 1.04};

export const PLACES = {
	heroChair: -200,
	partnerChair: 200,
	tableTop: -185,
	tableX: 135,
	heroCupHome: {x: -75, y: -185},
	partnerCupHome: {x: 70, y: -185},
	lamp: {x: 0, y: -600},
	roomRight: 640,
	heroStage: 780,
	heroCrowdEdge: 1160,
	partnerStage: 1000,
	spot: {x: 1000, y: -1100},
};

export const HERO_KEYS = keysFor('hero');
export const PARTNER_KEYS = keysFor('partner');

const S12 = screenById(12).startFrame;
/** 主角: 椅子 -> 舞台 (屏 9-10), 屏 12 再走到人群边上 */
export const heroX = (f: number) =>
	f < S12 ? travel(HERO_KEYS, f, PLACES.heroChair, PLACES.heroStage, 0, S12) : travel(HERO_KEYS, f, PLACES.heroStage, PLACES.heroCrowdEdge, S12, screenById(14).startFrame);
export const partnerX = (f: number) => travel(PARTNER_KEYS, f, PLACES.partnerChair, PLACES.partnerStage, 0, 1146);
export const heroVx = (f: number) => velocity(heroX, f);
export const partnerVx = (f: number) => velocity(partnerX, f);

export const heroState = (f: number, fps: number): PoseState => poseAt(HERO_KEYS, f, fps, 0, 1);
export const partnerState = (f: number, fps: number): PoseState => poseAt(PARTNER_KEYS, f, fps, 0.25, -1);

/** 人物头部指向光源的方向: 房间里是吊灯, 走出房间是舞台的聚光灯 */
export const lightFor = (x: number, headY = -330): [number, number] => {
	const src = x < PLACES.roomRight ? PLACES.lamp : PLACES.spot;
	const dx = src.x - x;
	const dy = src.y - headY;
	const l = Math.hypot(dx, dy) || 1;
	return [dx / l, dy / l];
};
