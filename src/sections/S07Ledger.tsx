import React from 'react';
import {AbsoluteFill, interpolateColors, useCurrentFrame} from 'remotion';
import {BigWord} from '../components/BigWord';
import {Door} from '../components/Door';
import {Tag, WorldLabel} from '../components/Labels';
import {Dust} from '../components/Particles';
import {Person} from '../components/Person';
import {Balance, Ledger, plateCenter, SandStream} from '../components/Props';
import {Room, roomCeilingY} from '../components/Room';
import {Backdrop, Floor, World} from '../components/Stage';
import {cue, highlight, screen, sectionRange} from '../data/script';
import {clamp, DROP, EASE, EASE_OUT, Key, lerp, ramp, track, visible} from '../lib/anim';
import {worldToScreen} from '../lib/camera';
import {figure, jointWorld} from '../lib/figure';
import {addPose, CROUCH, fitUnder, mixPose, STAND, walkPose, withPose} from '../lib/pose';
import {C, CEILING, ROOM} from '../theme';
import {HANDOFF, headroom, warmCenter} from './continuity';

// 第六节（第 27–35 屏）：“懒、软弱、没行动力”三块标签砸在他肩上，把他压回屋里；
// 面前摊开一本只写了一页的账本，账本变成天平：改变的代价是一块块看得见的青色方块，
// 留下的代价是一粒粒落下的沙——沙越积越多，最后把天平压向了另一边。

const TAGS = ['懒', '软弱', '没行动力'];
const STAND_X = 470;
const BLOCK = {w: 56, h: 26};

export const S07Ledger: React.FC = () => {
	const frame = useCurrentFrame();
	const {start, end} = sectionRange('ledger');
	if (frame < start || frame >= end) {
		return null;
	}
	const [s27, s28, s29, s30, s31, s32, s33, s34, s35] = [27, 28, 29, 30, 31, 32, 33, 34, 35].map(screen);
	const inn = HANDOFF.thresholdToLedger;
	const out = HANDOFF.ledgerToInstallment;
	const ceiling = CEILING.slam;
	const ceilY = roomCeilingY(ceiling);
	const tagAt = [cue(27, 'tag1'), cue(27, 'tag2'), cue(27, 'tag3')];
	const drops = [cue(29, 'drop'), cue(31, 'drop'), cue(33, 'drop')];
	const tip = cue(35, 'tip');

	// ---------- 走位：被标签压着走回屋里 ----------
	const turnBack = s27.start + 55;
	const xKeys: Key[] = [
		[turnBack + 10, inn.personX],
		[s28.start + 45, STAND_X, EASE],
		[tip, STAND_X],
		[tip + 8, out.personX, EASE_OUT],
	];
	const facingKeys: Key[] = [
		[turnBack, 1],
		[turnBack + 10, -1],
		[s28.start + 47, -1],
		[s28.start + 57, 1],
	];
	const fig = figure(frame, {xKeys, facingKeys, ceiling});
	const loopOn = visible(frame, s32.start, s32.start + 90, 8, 8);
	let x = fig.x;
	let facing = fig.facing;
	let pose = fig.pose;
	// 第 32 屏：在天平旁的同一串脚印上来回走
	if (frame >= s32.start && frame < s32.start + 90) {
		const t = frame - s32.start;
		x = STAND_X + 30 * Math.sin((t / 90) * Math.PI * 2);
		facing = clamp(Math.cos((t / 90) * Math.PI * 2) * 4, -1, 1);
		const phase = (Math.PI * t) / 15;
		pose = fitUnder(addPose(pose, walkPose(phase, 0.5 * loopOn)), addPose(CROUCH, walkPose(phase, 0.45 * loopOn)), headroom(ceiling));
	}
	// 被标签压弯
	const tagWeight = ramp(frame, tagAt[0], tagAt[2] + 10) * (1 - ramp(frame, s27.end - 15, s27.end + 10));
	pose = withPose(pose, {torso: pose.torso + 22 * tagWeight * fig.outside, neck: pose.neck + 18 * tagWeight});
	// 低头看账本、看托盘
	const lookDown = ramp(frame, s28.start + 50, s28.start + 62) * (1 - ramp(frame, tip, tip + 6));
	pose = withPose(pose, {neck: pose.neck + 14 * lookDown});
	// 第 35 屏：被翘起的天平吓得往后一仰
	const startle = ramp(frame, tip, tip + 5, EASE_OUT) * (1 - ramp(frame, tip + 20, tip + 40));
	pose = withPose(pose, {torso: pose.torso - 26 * startle, armF: pose.armF + 50 * startle, armB: pose.armB + 40 * startle, neck: pose.neck - 10 * startle});
	pose = fitUnder(pose, CROUCH, lerp(headroom(ceiling), 400, fig.outside));
	// 第 34 屏：变淡、变薄
	const fade = ramp(frame, s34.start, s35.start);
	const personColor = interpolateColors(fade * (1 - ramp(frame, tip + 20, end)), [0, 1], [C.person, '#7D8492']);
	const personBack = interpolateColors(fade * (1 - ramp(frame, tip + 20, end)), [0, 1], [C.personBack, '#646B78']);
	const personOpacity = 1 - 0.32 * fade * (1 - ramp(frame, tip + 20, end));

	// ---------- 标签 ----------
	const shoulder = jointWorld(x, ROOM.floor, mixPose(pose, STAND, 0), facing, 'shoulder');
	const tagOffsets = [
		{dx: -10, dy: -40, rot: -6},
		{dx: 26, dy: -88, rot: 5},
		{dx: -6, dy: -138, rot: -3},
	];
	const tagFall = ramp(frame, s27.end - 20, s27.end + 4);

	// ---------- 账本 → 天平 ----------
	const bookVis = visible(frame, s28.start + 50, s29.start + 16, 12, 14);
	const balanceDraw = ramp(frame, s29.start + 3, s29.start + 23);
	const theta = track(frame, [
		[drops[0], 0],
		[drops[0] + 10, 10, DROP],
		[drops[1], 10],
		[drops[1] + 8, 14, DROP],
		[drops[2], 14],
		[drops[2] + 8, 18, DROP],
		[s34.start, 18],
		[s35.start - 5, 0, EASE],
		[tip, 0],
		[tip + 8, out.theta, DROP],
	]);
	const pop = Math.max(0, Math.sin(clamp((frame - tip) / 14) * Math.PI)) * 24;

	// 青色方块：第一块从手里放上去，后两块从天花板掉下来
	const leftPlate = plateCenter(-1, theta);
	const blocks = drops.map((d, k) => {
		const rest = {x: leftPlate.x - 28 + 28 * k, y: leftPlate.y - BLOCK.h / 2 - (k === 1 ? BLOCK.h : 0) - pop};
		if (k === 0) {
			const hold = {x: STAND_X + 92, y: 612};
			const t = ramp(frame, d - 10, d);
			return {vis: ramp(frame, s29.start, s29.start + 10), x: lerp(hold.x, rest.x, t), y: lerp(hold.y, rest.y, t)};
		}
		const t = clamp((frame - (d - 10)) / 10);
		return {vis: frame >= d - 10 ? 1 : 0, x: rest.x, y: lerp(ceilY + 10, rest.y, t * t)};
	});
	const handTarget = (() => {
		for (let k = 0; k < 3; k++) {
			const w = k === 0 ? ramp(frame, s29.start, s29.start + 8) * (1 - ramp(frame, drops[0] + 4, drops[0] + 12)) : ramp(frame, drops[k] - 6, drops[k]) * (1 - ramp(frame, drops[k] + 8, drops[k] + 16));
			if (w > 0) {
				return {x: blocks[k].x - 12, y: blocks[k].y, w};
			}
		}
		return null;
	})();

	// 沙：一粒一粒落进右盘，越积越多
	const rightPlate = plateCenter(1, theta);
	const sand = track(frame, [
		[s30.start, 0],
		[s31.start, 0.15],
		[s34.start, 0.35],
		[s35.start, 1],
	]);
	const moundH = 4 + 22 * sand;

	const axisVis = visible(frame, s30.start + 10, end + 30, 14, 1);
	const roomDraw = track(frame, [[turnBack, inn.roomDraw], [turnBack + 55, 1]]);
	const warmPos = worldToScreen(frame, 760, 530);
	const wc = warmCenter(warmPos.x, warmPos.y);
	const h29 = highlight(29);
	const h30 = highlight(30);
	const h32 = highlight(32);
	const h34a = highlight(34, 0);
	const h34b = highlight(34, 1);
	const h35 = highlight(35);

	return (
		<AbsoluteFill>
			<Backdrop
				warm={track(frame, [[start, inn.backdrop.warm], [s28.start + 30, 1.1], [end, out.backdrop.warm]])}
				cool={track(frame, [[start, inn.backdrop.cool], [s28.start + 30, 0.3], [end, out.backdrop.cool]])}
				dark={track(frame, [[start, inn.backdrop.dark], [end, out.backdrop.dark]])}
				warmX={wc.warmX}
				warmY={wc.warmY}
			/>
			<World frame={frame}>
				<Floor y={ROOM.floor} l={80} r={1860} opacity={1} />
				<Door
					frame={frame}
					open={inn.door.open}
					light={inn.door.light}
					fog={inn.door.fog}
					spill={track(frame, [[start, inn.door.spill], [s28.start + 30, out.door.spill]])}
				/>
				<rect
					x={ROOM.left}
					y={ROOM.top}
					width={ROOM.right - ROOM.left}
					height={ROOM.floor - ROOM.top}
					rx={14}
					fill="none"
					stroke={C.amber}
					strokeWidth={2.5}
					strokeDasharray="12 14"
					opacity={0.4 * (1 - ramp(frame, turnBack, turnBack + 50))}
				/>
				<Room
					frame={frame}
					ceiling={ceiling}
					warmth={track(frame, [[start, 1], [s28.start + 30, out.warmth]])}
					ceilingGlow={0.5}
					crack={1}
					draw={roomDraw}
					wallOpen={1 - ramp(frame, s28.start + 40, s28.start + 55)}
				/>
				<Dust frame={frame} seed="choice" color={C.amber} opacity={roomDraw} box={{l: ROOM.left + 12, t: ceilY + 10, r: ROOM.right - 12, b: ROOM.floor - 8}} />
				<RightWallCrack opacity={roomDraw} />

				{/* 时间轴：今天 → 以后 */}
				<g opacity={axisVis * (1 - ramp(frame, end - 1, end))}>
					<LedgerAxis frame={frame} dash={frame >= s32.start ? -(frame - s32.start) * 2 : 0} opacity={axisVis} />
				</g>

				{/* 第 32 屏的脚印 */}
				<g opacity={loopOn}>
					<ellipse cx={STAND_X} cy={ROOM.floor + 2} rx={60} ry={8} fill="none" stroke={C.amber} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="8 10" />
					{[-36, 0, 36].map((d) => (
						<rect key={d} x={STAND_X + d - 12} y={ROOM.floor - 5} width={26} height={9} rx={4.5} fill={C.amber} opacity={0.6} />
					))}
				</g>

				<Ledger x={STAND_X + 150} y={630} open={ramp(frame, s28.start + 55, s28.start + 72)} left={1} right={0} opacity={bookVis} scale={lerp(1, 0.6, ramp(frame, s29.start, s29.start + 16))} />
				<Balance theta={theta} draw={balanceDraw} opacity={clamp(balanceDraw * 4)} />
				{/* 右盘上的沙堆 */}
				{sand > 0 ? (
					<path
						d={`M ${rightPlate.x - 54} ${rightPlate.y} Q ${rightPlate.x} ${rightPlate.y - moundH * 2} ${rightPlate.x + 54} ${rightPlate.y} Z`}
						fill={C.amber}
						opacity={0.9}
					/>
				) : null}
				<SandStream frame={frame} start={s30.start} end={s34.start} x={rightPlate.x} fromY={ceilY + 4} toY={rightPlate.y - moundH} density={0.5} seed="sand-a" />
				<SandStream frame={frame} start={s34.start} end={s35.start + 10} x={rightPlate.x} fromY={ceilY + 4} toY={rightPlate.y - moundH} density={2.4} seed="sand-b" />
				{blocks.map((b, k) =>
					b.vis > 0 ? <rect key={k} x={b.x - BLOCK.w / 2} y={b.y - BLOCK.h / 2} width={BLOCK.w} height={BLOCK.h} rx={4} fill={C.cyan} opacity={0.9 * b.vis * balanceDraw ** 0.3} /> : null,
				)}

				<Person
					x={x}
					groundY={ROOM.floor}
					pose={pose}
					facing={facing}
					color={personColor}
					backColor={personBack}
					opacity={personOpacity}
					reachF={handTarget}
					reachB={handTarget ? {...handTarget, x: handTarget.x - 24} : null}
					rim={{color: C.cyan, strength: 0.3 + 0.7 * clamp((x - ROOM.right) / 200), side: 1}}
				/>
				{TAGS.map((t, k) => {
					const land = tagAt[k];
					const fallT = clamp((frame - (land - 12)) / 12);
					const o = tagOffsets[k];
					const restX = shoulder.x + o.dx * facing;
					const restY = shoulder.y + o.dy * (1 - 0.35 * (1 - fig.outside));
					const y = lerp(restY - 160, restY, fallT * fallT) + tagFall * 90;
					return frame >= land - 12 ? <Tag key={t} frame={frame} x={restX} y={y} text={t} rotate={o.rot + tagFall * 40 * (k % 2 ? 1 : -1)} opacity={Math.min(1, fallT * 3) * (1 - tagFall)} /> : null;
				})}
			</World>
			<BigWord frame={frame} text={h29.word} color={h29.color} left={240} top={150} size={120} from={drops[0] - 4} to={s29.end - 2} variant="drop" />
			<BigWord frame={frame} text={h30.word} color={h30.color} left={240} top={150} size={120} from={s30.start + 6} to={s30.end - 2} variant="drop" />
			<BigWord frame={frame} text={h32.word} color={h32.color} left={240} top={150} size={120} from={s32.start + 8} to={s32.end - 2} variant="drop" />
			<BigWord frame={frame} text={h34a.word} color={h34a.color} left={240} top={150} size={120} from={s34.start + 8} to={s34.end - 2} variant="drop" />
			<BigWord frame={frame} text={h34b.word} color={h34b.color} left={540} top={150} size={120} from={s34.start + 40} to={s34.end - 2} variant="drop" />
			<BigWord frame={frame} text={h35.word} color={h35.color} left={240} top={150} size={160} from={tip + 2} to={end - 2} variant="slam" impact />
		</AbsoluteFill>
	);
};

/** 时间轴：今天 → 以后 */
export const LedgerAxis: React.FC<{frame: number; dash: number; opacity: number}> = ({frame, dash, opacity}) => (
	<g opacity={opacity}>
		<line x1={480} y1={752} x2={1040} y2={752} stroke={C.grey} strokeWidth={2.5} strokeDasharray="10 10" strokeDashoffset={dash} />
		<polygon points="1040,744 1056,752 1040,760" fill={C.grey} />
		<WorldLabel frame={frame} x={480} y={784} text="今天" size={28} color={C.grey} opacity={opacity} />
		<WorldLabel frame={frame} x={1040} y={784} text="以后" size={28} color={C.grey} anchor="end" opacity={opacity} />
	</g>
);

/** 上一节塌掉时右墙上的裂缝（房间重建后仍留着） */
export const RightWallCrack: React.FC<{opacity: number}> = ({opacity}) => (
	<path
		d={`M ${ROOM.right - 2} ${roomCeilingY(CEILING.slam) + 4} l -16 40 l 18 36 l -20 44 l 16 40 l -14 46`}
		fill="none"
		stroke={C.amber}
		strokeWidth={3.5}
		strokeLinejoin="round"
		opacity={opacity}
	/>
);

/** 第 35 屏结束时天平、方块、沙堆的样子，下一节从这里淡出 */
export const LedgerLeftovers: React.FC<{frame: number; opacity: number}> = ({frame, opacity}) => {
	const theta = HANDOFF.ledgerToInstallment.theta;
	const left = plateCenter(-1, theta);
	const right = plateCenter(1, theta);
	const moundH = 26;
	return (
		<g opacity={opacity}>
			<LedgerAxis frame={frame} dash={-(screen(35).end - screen(32).start) * 2} opacity={opacity} />
			<Balance theta={theta} />
			<path d={`M ${right.x - 54} ${right.y} Q ${right.x} ${right.y - moundH * 2} ${right.x + 54} ${right.y} Z`} fill={C.amber} opacity={0.9} />
			{[0, 1, 2].map((k) => (
				<rect
					key={k}
					x={left.x - 28 + 28 * k - BLOCK.w / 2}
					y={left.y - BLOCK.h / 2 - (k === 1 ? BLOCK.h : 0) - BLOCK.h / 2}
					width={BLOCK.w}
					height={BLOCK.h}
					rx={4}
					fill={C.cyan}
					opacity={0.9}
				/>
			))}
		</g>
	);
};
