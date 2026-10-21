import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BigWord} from '../components/BigWord';
import {Door} from '../components/Door';
import {Dust} from '../components/Particles';
import {Person} from '../components/Person';
import {MiniClock} from '../components/Props';
import {Room, roomCeilingY} from '../components/Room';
import {Backdrop, Floor, World} from '../components/Stage';
import {highlight, screen, sectionRange} from '../data/script';
import {clamp, DROP, EASE, EASE_OUT, Key, lerp, ramp, track, visible} from '../lib/anim';
import {worldToScreen} from '../lib/camera';
import {figure, jointWorld} from '../lib/figure';
import {fitUnder, HUDDLE, LOOK_UP, mixPose, STAND, withPose} from '../lib/pose';
import {C, CEILING, ROOM} from '../theme';
import {HANDOFF, headroom, warmCenter} from './continuity';
import {LedgerLeftovers, RightWallCrack} from './S07Ledger';

// 第七节（第 36–43 屏）：两面墙往里收、天花板再压低，他侧身、弯腰、缩进角落，熟练得像早就习惯；
// 一把青色的尺从原来的天花板量下来——这才看清丢掉了多少空间；
// 房间底下一块块掉出琥珀色的“分期”，变成一只只小钟；时间轴尽头，未来的自己替他背起了更大的一块。

const AXIS = {y: 790, l: 560, r: 1460};
const RULER_X = 920;
const GHOST_X = 1380;

export const S08Installment: React.FC = () => {
	const frame = useCurrentFrame();
	const {start, end} = sectionRange('installment');
	if (frame < start || frame >= end) {
		return null;
	}
	const [s36, s37, s38, s39, s40, s41, s42, s43] = [36, 37, 38, 39, 40, 41, 42, 43].map(screen);
	const inn = HANDOFF.ledgerToInstallment;
	const out = HANDOFF.installmentToClose;
	const squeeze = track(frame, [
		[s36.start + 10, 0],
		[s37.start, out.squeeze, EASE],
	]);
	const ceiling = track(frame, [
		[s36.start + 20, CEILING.slam],
		[s37.start, out.ceiling, EASE],
	]);
	const ceilY = roomCeilingY(ceiling);

	// ---------- 人物：躲开往里收的墙 → 缩进角落 → 抬头 ----------
	const xKeys: Key[] = [
		[s36.start + 2, inn.personX],
		[s36.start + 36, 700, EASE],
		[s37.start + 5, 700],
		[s37.start + 25, out.personX, EASE],
	];
	const facingKeys: Key[] = [
		[s37.start + 3, 1],
		[s37.start + 11, -1],
		[s37.start + 25, -1],
		[s37.start + 33, 1],
	];
	const fig = figure(frame, {xKeys, facingKeys, ceiling, roomRight: ROOM.right - squeeze});
	const room = headroom(ceiling);
	const huddle = ramp(frame, s37.start + 25, s37.start + 45);
	const shrug = ramp(frame, s36.start + 30, s37.start);
	let pose = withPose(fig.pose, {armF: fig.pose.armF * (1 - 0.6 * shrug), armB: fig.pose.armB * (1 - 0.6 * shrug)});
	pose = mixPose(pose, withPose(HUDDLE, {torso: HUDDLE.torso + 2 * Math.sin(frame / 16)}), huddle);
	const look = ramp(frame, s39.start + 4, s39.start + 18) * (1 - ramp(frame, s40.start + 10, s40.start + 30));
	const watch = ramp(frame, s42.start + 10, s42.start + 30);
	const rise = ramp(frame, s43.start + 30, end);
	pose = withPose(pose, {neck: pose.neck + (LOOK_UP.neck - pose.neck) * 0.75 * look - 22 * watch, torso: pose.torso - 10 * rise});
	pose = fitUnder(pose, HUDDLE, room);

	// ---------- 尺子：从原来的天花板量到现在的天花板 ----------
	const rulerVis = visible(frame, s39.start, s40.start + 20, 10, 16);
	const marker = lerp(ROOM.top, ceilY, ramp(frame, s39.start + 6, s39.start + 50, EASE_OUT));

	// ---------- 分期：一块块掉出来，变成小钟 ----------
	const axisDraw = ramp(frame, s40.start, s40.start + 25);
	const axisVis = 1; // 交给下一节淡出
	const installments = new Array(8).fill(0).map((_, k) => {
		const born = s40.start + 15 * k;
		const t = clamp((frame - born) / 14);
		const slotX = 820 + 72 * k;
		const x = lerp(760, slotX, EASE(clamp((frame - born - 6) / 10)));
		const y = lerp(ROOM.floor - 10, AXIS.y - 14, Math.min(1, t * 1.6) ** 2);
		const morph = ramp(frame, s41.start + 4 * k, s41.start + 4 * k + 10);
		return {vis: frame >= born ? 1 : 0, x, y, morph, angle: (frame - s41.start) * 9 + k * 40};
	});

	// ---------- 未来的自己 ----------
	const ghostVis = visible(frame, s42.start + 5, end + 30, 25, 1);
	const load = s43.start + 20;
	const ghostBend = ramp(frame, load, load + 10, EASE_OUT);
	const ghostPose = mixPose(STAND, withPose(HUDDLE, {torso: 64, hipB: 30, kneeB: 40, hipF: 34, kneeF: 44}), ghostBend);
	const ghostBack = jointWorld(GHOST_X, ROOM.floor, ghostPose, -1, 'shoulder');
	const loadY = frame < load ? lerp(ROOM.top - 200, ghostBack.y - 40, clamp((frame - (load - 14)) / 14) ** 2) : ghostBack.y - 44;
	const loadX = frame < load ? GHOST_X + 10 : ghostBack.x + 20;

	const warmPos = worldToScreen(frame, 760, 560);
	const wc = warmCenter(warmPos.x, warmPos.y);
	const h37a = highlight(37, 0);
	const h37b = highlight(37, 1);
	const h39 = highlight(39);
	const h41 = highlight(41);
	const morph = s37.start + 45;

	return (
		<AbsoluteFill>
			<Backdrop
				warm={track(frame, [[start, inn.backdrop.warm], [s37.start, 1.3], [s40.start, 1.3], [end, out.backdrop.warm]])}
				cool={track(frame, [[start, inn.backdrop.cool], [s39.start, 0.2], [s39.start + 20, 0.45], [s40.start + 20, 0.2], [end, out.backdrop.cool]])}
				dark={track(frame, [[start, inn.backdrop.dark], [s38.start, 0.55], [s39.start, 0.55], [end, out.backdrop.dark]])}
				warmX={wc.warmX}
				warmY={wc.warmY}
			/>
			<World frame={frame}>
				<Floor y={ROOM.floor} l={80} r={1860} opacity={1} />
				<Door frame={frame} open={inn.door.open} light={inn.door.light} fog={inn.door.fog} spill={inn.door.spill} />
				<Room frame={frame} ceiling={ceiling} squeeze={squeeze} warmth={track(frame, [[start, inn.warmth], [s38.start, 1.5 + 0.2 * Math.sin(frame / 20)], [end, 1.3]])} ceilingGlow={0.5 + 0.3 * ramp(frame, s36.start, s37.start)} crack={1} />
				<RightWallCrack opacity={1 - ramp(frame, start, start + 30)} />
				<LedgerLeftovers frame={frame} opacity={1 - ramp(frame, start, start + 10)} />
				<Dust frame={frame} seed="choice" color={C.amber} box={{l: ROOM.left + 12 + squeeze, t: ceilY + 10, r: ROOM.right - 12 - squeeze, b: ROOM.floor - 8}} />

				{/* 尺子 */}
				<g opacity={rulerVis}>
					<line x1={RULER_X} y1={ROOM.top} x2={RULER_X} y2={ceilY} stroke={C.cyan} strokeWidth={3} strokeDasharray="6 8" />
					<line x1={RULER_X} y1={ceilY} x2={RULER_X} y2={ROOM.floor} stroke={C.cyan} strokeWidth={3} />
					{new Array(28).fill(0).map((_, k) => {
						const y = ROOM.top + k * 20;
						const lost = y < ceilY;
						const lit = lost && y <= marker;
						return <line key={k} x1={RULER_X - (k % 5 === 0 ? 18 : 10)} y1={y} x2={RULER_X} y2={y} stroke={C.cyan} strokeWidth={2.5} opacity={lost ? (lit ? 1 : 0.3) : 0.7} />;
					})}
					<polygon points={`${RULER_X + 4},${marker} ${RULER_X + 22},${marker - 9} ${RULER_X + 22},${marker + 9}`} fill={C.cyan} />
					<rect x={RULER_X - 24} y={ROOM.top} width={24} height={Math.max(0, marker - ROOM.top)} fill={C.cyan} opacity={0.12} />
				</g>

				{/* 分期时间轴 */}
				<g opacity={axisVis}>
					<line x1={AXIS.l} y1={AXIS.y} x2={lerp(AXIS.l, AXIS.r, axisDraw)} y2={AXIS.y} stroke={C.grey} strokeWidth={2.5} strokeDasharray="10 10" />
					{installments.map((b, k) =>
						b.vis ? (
							<g key={k}>
								<rect x={b.x - 12} y={b.y - 12} width={24} height={24} rx={4} fill={C.amber} opacity={0.9 * (1 - b.morph)} />
								<MiniClock x={b.x} y={b.y} r={15} angle={b.angle} opacity={b.morph} />
							</g>
						) : null,
					)}
				</g>

				{/* 未来的自己与压在他背上的那一块 */}
				<Person x={GHOST_X} groundY={ROOM.floor} pose={ghostPose} facing={-1} color={C.personLight} backColor={C.personLight} opacity={0.32 * ghostVis} />
				{frame >= load - 14 ? <rect x={loadX - 55} y={loadY - 35} width={110} height={70} rx={6} fill={C.amber} opacity={0.85 * ghostVis} transform={`rotate(${-10 * ghostBend} ${loadX} ${loadY})`} /> : null}

				<Person x={fig.x} groundY={ROOM.floor} pose={pose} facing={fig.facing} rim={{color: C.cyan, strength: 0.3 + 0.4 * look, side: 1}} />
			</World>
			<BigWord frame={frame} text={h37a.word} color={h37a.color} left={240} top={150} size={130} from={s37.start + 6} to={morph + 2} variant="drop" />
			<BigWord frame={frame} text={h37b.word} color={h37b.color} left={240} top={150} size={130} from={morph - 4} to={s37.end - 2} variant="drop" />
			<BigWord frame={frame} text={h39.word} color={h39.color} left={240} top={150} size={120} from={s39.start + 8} to={s39.end - 2} variant="drop" />
			<BigWord frame={frame} text={h41.word} color={h41.color} left={240} top={150} size={130} from={s41.start + 8} to={s41.end - 2} variant="drop" />
		</AbsoluteFill>
	);
};

/** 第 43 屏结束时的时间轴、小钟与未来的自己，下一节从这里淡出 */
export const InstallmentLeftovers: React.FC<{frame: number; opacity: number}> = ({frame, opacity}) => {
	const s41 = screen(41);
	const ghostPose = withPose(HUDDLE, {torso: 64, hipB: 30, kneeB: 40, hipF: 34, kneeF: 44});
	const back = jointWorld(GHOST_X, ROOM.floor, ghostPose, -1, 'shoulder');
	return (
		<g opacity={opacity}>
			<line x1={AXIS.l} y1={AXIS.y} x2={AXIS.r} y2={AXIS.y} stroke={C.grey} strokeWidth={2.5} strokeDasharray="10 10" />
			{new Array(8).fill(0).map((_, k) => (
				<MiniClock key={k} x={820 + 72 * k} y={AXIS.y - 14} r={15} angle={(frame - s41.start) * 9 + k * 40} />
			))}
			<Person x={GHOST_X} groundY={ROOM.floor} pose={ghostPose} facing={-1} color={C.personLight} backColor={C.personLight} opacity={0.32} />
			<rect x={back.x + 20 - 55} y={back.y - 44 - 35} width={110} height={70} rx={6} fill={C.amber} opacity={0.85} transform={`rotate(-10 ${back.x + 20} ${back.y - 44})`} />
		</g>
	);
};
