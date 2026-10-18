// 第 1 节 钩子 (屏 1-9): 暖光吊灯下的一张桌子
// 主角把自己那杯倒给对方 -> 举着空杯 -> 凑去喝对方的 -> 为什么 倒得越多 越渴
// 屏 9 之后两人起身往右走出房间, 镜头跟着带到第 2 节的舞台
import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Character, solveSkeleton, useRenderMode, type CharacterProps} from '../components/Character';
import {Cup, cupLip, cupSide, Drop, PourStream, type CupProps} from '../components/Cup';
import {plusBeats} from '../data/beatmap';
import {cueFrame, screenById} from '../lib/timeline';
import {COLORS} from '../theme';
import {HERO_LOOK, PARTNER_LOOK, PLACES, heroState, heroVx, heroX, lightFor, partnerState, partnerVx, partnerX} from './cast';

const S = (id: number) => screenById(id);
export const HOOK_END = S(10).startFrame;

const ease = Easing.bezier(0.45, 0, 0.2, 1);
export const CUP_SCALE = 0.82;
const io = (f: number, a: number, b: number, from: number, to: number) =>
	interpolate(f, [a, b], [from, to], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease});

// ---------- 时间点: 全部从字幕稿推出来 ----------
const T = {
	land: 0,
	lift: S(2).startFrame,
	pour: cueFrame(S(2), 0.5),
	pourEnd: S(4).startFrame,
	lastDrop: cueFrame(S(4), 3),
	back: S(5).startFrame,
	reach: cueFrame(S(6), 0.5),
	setDown: S(7).startFrame,
	ask: S(8).startFrame,
	slam: S(9).startFrame,
	partnerUp: cueFrame(S(9), 2),
	heroUp: cueFrame(S(9), 4),
};

/** 主角的杯子 */
export const heroCup = (f: number, heroHandB?: {x: number; y: number}): Omit<CupProps, 'id'> => {
	const home = PLACES.heroCupHome;
	if (f >= T.heroUp + 4 && heroHandB) {
		// 起身后杯子拿在远侧手里
		return {x: heroHandB.x + 4, y: heroHandB.y + 26, fill: 0, stain: 1, scale: CUP_SCALE, tilt: 0};
	}
	const bounce = f < 8 ? -26 * Math.max(0, 1 - f / 2) + (f >= 2 ? -5 * Math.exp(-(f - 2) / 2) * Math.abs(Math.sin((f - 2) * 1.2)) : 0) : 0;
	let x = home.x;
	let y = home.y + bounce;
	let tilt = 0;
	let fill = 0.86;
	let wobble = f < 40 ? Math.max(0, 1 - f / 40) : 0;
	let stain = 0;
	if (f >= T.lift) {
		const up = io(f, T.lift, plusBeats(T.lift, 1), 0, 1);
		x = interpolate(up, [0, 1], [home.x, -6]);
		y = interpolate(up, [0, 1], [home.y, -292]);
		tilt = io(f, T.pour - 4, plusBeats(T.pour, 1), 0, 78);
		fill = interpolate(f, [T.pour, T.pourEnd - 6], [0.86, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		wobble = 0.5;
		// 屏 3: 越举越高
		y -= io(f, S(3).startFrame, T.pourEnd, 0, 30);
		tilt += io(f, S(3).startFrame, T.pourEnd, 0, 42);
		stain = fill < 0.1 ? 1 : 0;
	}
	if (f >= T.pourEnd) {
		// 屏 4: 倒扣着抖最后一滴
		x = interpolate(f, [T.pourEnd, T.pourEnd + 10], [-6, 18], {extrapolateRight: 'clamp'});
		y = -312;
		tilt = 150 + 7 * Math.sin((f - T.pourEnd) * 0.9) * Math.max(0, 1 - (f - T.pourEnd) / 50);
		fill = 0;
		stain = 1;
	}
	if (f >= T.back) {
		const t = io(f, T.back, T.back + 20, 0, 1);
		x = interpolate(t, [0, 1], [18, -102]);
		y = interpolate(t, [0, 1], [-312, -198]);
		tilt = interpolate(t, [0, 1], [150, 0]);
	}
	if (f >= T.reach) {
		const t = io(f, T.reach - 4, T.reach + 14, 0, 1);
		x = interpolate(t, [0, 1], [-102, -34]);
		y = interpolate(t, [0, 1], [-198, -262]);
		tilt = interpolate(t, [0, 1], [0, 8]);
	}
	if (f >= T.setDown) {
		const t = io(f, T.setDown, T.setDown + 14, 0, 1);
		// 放在桌子中间偏左, 主角探身时头在杯子左边, 不被杯子挡住脸
		x = interpolate(t, [0, 1], [-34, -22]);
		y = interpolate(t, [0, 1], [-262, home.y]);
		tilt = interpolate(t, [0, 1], [8, 0]);
	}
	return {x, y, tilt, fill, wobble, stain, scale: CUP_SCALE};
};

const partnerCupFill = (f: number) =>
	interpolate(f, [T.pour + 4, T.pourEnd - 10], [0.18, 1.06], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

const Room: React.FC<{f: number}> = ({f}) => {
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	const dim = interpolate(f, [T.back, T.back + 30, T.slam, T.slam + 3, T.slam + 40, T.heroUp + 60], [1, 0.72, 0.72, 1.35, 0.85, 0.55], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const swing = f >= T.slam ? 5 * Math.exp(-(f - T.slam) / 45) * Math.sin((f - T.slam) * 0.16) : 0;
	const lamp = PLACES.lamp;
	return (
		<g>
			<defs>
				<radialGradient id="room-wall" cx="50%" cy="60%" r="60%">
					<stop offset="0" stopColor="#2A2016" />
					<stop offset="1" stopColor="#120D09" />
				</radialGradient>
				<linearGradient id="room-floor" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor="#21180F" />
					<stop offset="1" stopColor="#0C0907" />
				</linearGradient>
				<linearGradient id="lamp-cone" x1="0" x2="0" y1="0" y2="1">
					<stop offset="0" stopColor={COLORS.gold} stopOpacity={0.34} />
					<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
				</linearGradient>
				<radialGradient id="lamp-bulb">
					<stop offset="0" stopColor="#FFE9B8" stopOpacity={0.95} />
					<stop offset="0.25" stopColor={COLORS.gold} stopOpacity={0.45} />
					<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
				</radialGradient>
				<linearGradient id="room-edge" x1="0" x2="1">
					<stop offset="0" stopColor={COLORS.bg} stopOpacity={0} />
					<stop offset="1" stopColor={COLORS.bg} stopOpacity={1} />
				</linearGradient>
			</defs>
			<rect x={-900} y={-1200} width={1540} height={1200} fill="url(#room-wall)" opacity={0.55 + 0.45 * Math.min(1, dim)} />
			<rect x={-900} y={0} width={1540} height={700} fill="url(#room-floor)" />
			{Array.from({length: 9}, (_, i) => (
				<line key={i} x1={-900} x2={640} y1={18 + i * i * 7} y2={18 + i * i * 7} stroke="#000" strokeOpacity={0.25} strokeWidth={2} />
			))}
			<rect x={380} y={-1200} width={260} height={1900} fill="url(#room-edge)" />
			<g transform={`rotate(${swing} ${lamp.x} -1200)`}>
				<line x1={lamp.x} x2={lamp.x} y1={-1200} y2={lamp.y - 30} stroke="#000" strokeWidth={4} />
				<polygon points={`${lamp.x - 22},${lamp.y - 34} ${lamp.x + 22},${lamp.y - 34} ${lamp.x + 62},${lamp.y + 6} ${lamp.x - 62},${lamp.y + 6}`} fill="#0A0806" stroke={COLORS.goldDim} strokeWidth={2} />
				<polygon
					points={`${lamp.x - 58},${lamp.y + 6} ${lamp.x + 58},${lamp.y + 6} ${lamp.x + 380},0 ${lamp.x - 380},0`}
					fill="url(#lamp-cone)"
					opacity={dim}
				/>
				<circle cx={lamp.x} cy={lamp.y + 8} r={120} fill="url(#lamp-bulb)" opacity={Math.min(1, dim)} />
			</g>
			<ellipse cx={0} cy={4} rx={360} ry={30} fill={COLORS.gold} opacity={0.07 * dim} />
		</g>
	);
};

const Chair: React.FC<{x: number; dir: 1 | -1}> = ({x, dir}) => {
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	const back = x - dir * 42;
	return (
		<g fill={COLORS.wood} stroke={COLORS.goldDim} strokeWidth={1.2} strokeOpacity={0.6}>
			<rect x={Math.min(back, x + dir * 48) - 2} y={-94} width={94} height={10} rx={3} />
			<rect x={back - 5} y={-300} width={10} height={300} />
			<rect x={x + dir * 42 - 4} y={-86} width={8} height={86} />
			<rect x={back - 9} y={-300} width={18} height={10} rx={3} />
		</g>
	);
};

const Table: React.FC<{f: number}> = ({f}) => {
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	const top = PLACES.tableTop;
	const X = PLACES.tableX;
	const spill = interpolate(f, [S(3).startFrame, T.back], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<g>
			<rect x={-X} y={top} width={X * 2} height={13} fill={COLORS.woodLit} />
			<rect x={-X} y={top} width={X * 2} height={2.5} fill={COLORS.gold} opacity={0.55} />
			<rect x={-X + 8} y={top + 13} width={X * 2 - 16} height={16} fill={COLORS.wood} />
			<rect x={-X + 14} y={top + 13} width={11} height={-top - 13} fill={COLORS.wood} />
			<rect x={X - 25} y={top + 13} width={11} height={-top - 13} fill={COLORS.wood} />
			{spill > 0 ? (
				<>
					<ellipse cx={PLACES.partnerCupHome.x + 18 * spill} cy={top + 1} rx={20 + 70 * spill} ry={3 + 2 * spill} fill={COLORS.liquidHero} opacity={0.85} />
					<path
						d={`M ${X - 4} ${top + 2} q 4 ${30 * spill} 0 ${80 * spill}`}
						stroke={COLORS.liquidHero}
						strokeWidth={4}
						fill="none"
						opacity={spill > 0.5 ? 0.85 : 0}
					/>
				</>
			) : null}
		</g>
	);
};

const Phone: React.FC<{at: {x: number; y: number}; opacity: number; facing: number}> = ({at, opacity, facing}) => {
	const mode = useRenderMode();
	if (mode !== 'normal' || opacity <= 0) return null;
	return (
		<g transform={`translate(${at.x} ${at.y}) rotate(${facing * 30})`} opacity={opacity}>
			<defs>
				<radialGradient id="phone-glow">
					<stop offset="0" stopColor={COLORS.ivory} stopOpacity={0.22} />
					<stop offset="1" stopColor={COLORS.ivory} stopOpacity={0} />
				</radialGradient>
			</defs>
			<rect x={-10} y={-17} width={20} height={34} rx={3} fill="#050404" stroke={COLORS.goldDim} strokeWidth={1} />
			<rect x={-8} y={-14} width={16} height={27} rx={2} fill={COLORS.ivory} opacity={0.75} />
			<circle cx={0} cy={0} r={40} fill="url(#phone-glow)" />
		</g>
	);
};

export const Hook: React.FC = () => {
	const f = useCurrentFrame();
	const {fps} = useVideoConfig();
	const showCast = f < HOOK_END;

	const hx = heroX(f);
	const px = partnerX(f);
	const hs = heroState(f, fps);
	const ps = partnerState(f, fps);
	const base = (x: number, s: typeof hs, look: Partial<CharacterProps>, vx: number): CharacterProps => ({
		...look, x, y: 0, state: s, light: lightFor(x), vx,
	});

	// 主角双手扶杯 (屏 1-6), 屏 7-8 前手伸向对方的杯, 远侧手按在桌上
	const cupPre = heroCup(f);
	// 屏 9 猛抬头之后双手按在桌沿上 (不落进字幕区), 起身时再松开
	const ikWeight = io(f, T.heroUp - 6, T.heroUp + 4, 1, 0);
	const leaning = f >= T.setDown && f < T.slam;
	const onEdge = f >= T.slam;
	// 近侧手扶在杯身朝镜头的一面 (画在杯子前面), 远侧手在杯子另一边 (被杯子挡住)
	const onFace = cupSide(cupPre, -1, 0.42);
	const edgeF = {x: -112, y: PLACES.tableTop - 6};
	const edgeB = {x: -126, y: PLACES.tableTop - 4};
	const ikF = onEdge ? edgeF : leaning ? cupSide({...PLACES.partnerCupHome, scale: CUP_SCALE}, -1, 0.5) : {x: onFace.x + 16 * CUP_SCALE, y: onFace.y};
	// 远侧手的腕关节收进杯身一点, 手掌末端才刚好贴在杯边, 不会像在指东西
	// 远侧手的腕关节放在杯身中线附近, 手掌刚好伸到杯边, 整只手藏在杯子后面
	const mid = cupSide(cupPre, 1, 0.5);
	const ctr = cupSide(cupPre, -1, 0.5);
	const ikB = onEdge ? edgeB : leaning ? {x: -70, y: PLACES.tableTop - 8} : {x: (mid.x + ctr.x) / 2 - 4, y: (mid.y + ctr.y) / 2};
	const heroProps: CharacterProps = {
		...base(hx, hs, HERO_LOOK, heroVx(f)),
		ikF: f < T.heroUp + 4 ? ikF : null,
		ikB: f < T.heroUp + 4 ? ikB : null,
		ikWeight,
	};
	const heroSk = solveSkeleton(heroProps, f, fps);
	const cup = heroCup(f, heroSk.armB.H);
	const heroCupNode = <Cup id="hero" {...cup} liquid={COLORS.liquidHero} />;

	// 对方: 坐着看手机, 屏 9 起身 转身 往舞台走
	const phoneW = io(f, T.partnerUp - 2, T.partnerUp + 8, 1, 0);
	const pfacing = ps.facing >= 0 ? 1 : -1;
	const phoneAt = {x: px + pfacing * 52, y: -258};
	const partnerProps: CharacterProps = {
		...base(px, ps, PARTNER_LOOK, partnerVx(f)),
		ikF: phoneW > 0 ? {x: phoneAt.x + pfacing * 4, y: phoneAt.y + 10} : null,
		ikB: phoneW > 0 ? {x: phoneAt.x - pfacing * 6, y: phoneAt.y + 14} : null,
		ikWeight: phoneW,
	};

	const pourFlow = f >= T.pour && f < T.pourEnd ? interpolate(f, [T.pour, T.pour + 6, T.pourEnd - 12, T.pourEnd - 2], [0, 1, 0.5, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 0;
	const lip = cupLip(cup);
	const pc = PLACES.partnerCupHome;
	const dropT = interpolate(f, [T.lastDrop - 9, T.lastDrop], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	const lip4 = cupLip(heroCup(T.lastDrop - 9));

	return (
		<g>
			<Room f={f} />
			<Chair x={PLACES.heroChair} dir={1} />
			<Chair x={PLACES.partnerChair} dir={-1} />
			{showCast ? (
				<>
					<Character {...partnerProps} />
					<Phone at={phoneAt} opacity={phoneW} facing={pfacing} />
					<Character {...heroProps} between={f < T.setDown ? heroCupNode : null} />
				</>
			) : null}
			<Table f={f} />
			<Cup id="partner" x={pc.x} y={pc.y} scale={CUP_SCALE} fill={partnerCupFill(f)} liquid={COLORS.liquidHero} wobble={pourFlow > 0 ? 0.6 : 0.15} />
			{showCast && f >= T.setDown ? heroCupNode : null}
			<PourStream from={lip} to={{x: pc.x + 6, y: pc.y - 52}} flow={pourFlow} />
			{f >= T.lastDrop - 9 && f <= T.lastDrop ? (
				<Drop x={interpolate(dropT, [0, 1], [lip4.x, pc.x + 4])} y={interpolate(dropT, [0, 1], [lip4.y, pc.y - 54], {easing: Easing.in(Easing.quad)})} r={5} />
			) : null}
		</g>
	);
};
