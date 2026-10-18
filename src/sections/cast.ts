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
	// 卧室 (第 4 节 屏 41-44)
	bed: {x0: -1630, x1: -1210, top: -110},
	viewerLie: -1410,
	bedEdge: -1260,
	nightstand: {x: -1070, top: -150},
	window: {x: -1370, y: -560},
	tally: {x: -1190, y: -490},
	bedroomWall: {x0: -2000, x1: -950},
	moon: {x: -1320, y: -620},
	// 冷光空地 (第 5-6 节)
	mHeroChair: 3900,
	mPartnerChair: 4400,
	mLight: {x: 4150, y: -1100},
};

export const VIEWER_LOOK: Partial<CharacterProps> = {color: '#100E0D', feature: 'hood', hair: 'short', seed: 21, build: 1.02};
export const FRIEND_LOOK: Partial<CharacterProps> = {color: '#120F0C', feature: 'none', hair: 'long', seed: 41, build: 0.92, heightK: 0.96};
export const BUDDY_LOOK: Partial<CharacterProps> = {color: '#0F0D0B', feature: 'none', hair: 'bun', seed: 57, build: 1.0, heightK: 1.02};

export const HERO_KEYS = keysFor('hero');
export const PARTNER_KEYS = keysFor('partner');
export const VIEWER_KEYS = keysFor('viewer');
export const FRIEND_KEYS = keysFor('oldFriend');
export const BUDDY_KEYS = keysFor('buddy');

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
