// 第 9 节 片尾 (屏 49): 两人一起起身, 并肩走出屋子; 镜头拉到很远, 人很小 世界很大
// 片名和出处在屏幕左侧淡入 (不放右边), 最后是 科普内容 不构成心理诊断
import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, useRenderMode, type CharacterProps} from '../components/Character';
import {Cup} from '../components/Cup';
import {CREDITS} from '../data/subtitles';
import {cueFrame, screenById, travel} from '../lib/timeline';
import {COLORS, FONTS} from '../theme';
import {HERO_KEYS, HERO_LOOK, PARTNER_KEYS, PARTNER_LOOK, PLACES, heroState, lightFor, partnerState} from './cast';
import {solveSkeleton} from '../components/Character';

const S = (id: number) => screenById(id);
export const OUTRO_START = S(49).startFrame;
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Outro: React.FC = () => {
	const f = useCurrentFrame();
	const {fps, durationInFrames} = useVideoConfig();
	if (f < OUTRO_START) return null;
	const hx = travel(HERO_KEYS, f, PLACES.heroChair, 560, OUTRO_START, durationInFrames + 200);
	const px = travel(PARTNER_KEYS, f, PLACES.partnerChair, 820, OUTRO_START, durationInFrames + 200);
	const hs = heroState(f, fps);
	const ps = partnerState(f, fps);
	const heroProps = {...HERO_LOOK, x: hx, y: 0, state: hs, light: lightFor(hx), vx: hx - travel(HERO_KEYS, f - 1, PLACES.heroChair, 560, OUTRO_START, durationInFrames + 200)} as CharacterProps;
	const partnerProps = {...PARTNER_LOOK, x: px, y: 0, state: ps, light: lightFor(px)} as CharacterProps;
	const hb = solveSkeleton(heroProps, f, fps).armB.H;
	const pb = solveSkeleton(partnerProps, f, fps).armB.H;
	return (
		<g>
			<Character {...partnerProps} />
			<Cup id="o-partner" x={pb.x + 4} y={pb.y + 26} scale={0.82} fill={0.7} liquid={COLORS.liquidPartner} />
			<Character {...heroProps} />
			<Cup id="o-hero" x={hb.x + 4} y={hb.y + 26} scale={0.82} fill={0.72} liquid={COLORS.liquidHero} kintsugi={1} />
		</g>
	);
};

/** 片名 + 出处 (屏幕空间) */
export const EndCard: React.FC = () => {
	const f = useCurrentFrame();
	const mode = useRenderMode();
	if (mode === 'chars' || f < OUTRO_START) return null;
	const mask = mode === 'subs';
	const title = interpolate(f, [cueFrame(S(49), 1), cueFrame(S(49), 2.5)], [0, 1], clamp);
	const credits = interpolate(f, [cueFrame(S(49), 2), cueFrame(S(49), 3.5)], [0, 1], clamp);
	const c = (normal: string) => (mask ? '#aaa' : normal);
	return (
		<div style={{position: 'absolute', left: 120, top: 150, width: 980}}>
			<div style={{fontFamily: FONTS.serif, fontWeight: 900, fontSize: 104, letterSpacing: 18, color: c(COLORS.ivory), opacity: title, textShadow: mask ? undefined : '0 0 40px rgba(221,189,116,0.35)'}}>
				爱的<span style={{color: c(COLORS.gold)}}>浓度</span>
			</div>
			<div style={{marginTop: 34, opacity: credits}}>
				{CREDITS.map((x) => (
					<div key={x} style={{fontFamily: FONTS.sans, fontSize: 21, lineHeight: 1.65, color: c(COLORS.ivory), opacity: mask ? 1 : 0.72}}>
						{x}
					</div>
				))}
				<div style={{marginTop: 18, fontFamily: FONTS.sans, fontSize: 22, color: c(COLORS.gold), opacity: mask ? 1 : 0.85}}>科普内容 不构成心理诊断</div>
			</div>
		</div>
	);
};
