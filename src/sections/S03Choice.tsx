import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BigWord} from '../components/BigWord';
import {Door} from '../components/Door';
import {Gauge} from '../components/Gauge';
import {Dust, Scatter} from '../components/Particles';
import {Person} from '../components/Person';
import {Room, roomCeilingY} from '../components/Room';
import {Backdrop, Floor, World} from '../components/Stage';
import {cue, highlight, screen, sectionRange} from '../data/script';
import {clamp, EASE, EASE_OUT, lerp, ramp, track, visible} from '../lib/anim';
import {addPose, CROUCH, fitUnder, LOOK_UP, mixPose, STAND, walkPose, withPose} from '../lib/pose';
import {C, DOOR, FONT, ROOM} from '../theme';
import {HANDOFF, headroom} from './continuity';

// 第二节（第 7–11 屏）：房间和门各自变成天平两端的圆；翻面后门散成雾回到右侧；
// 人走出房间到门口抬头看光，又退回去；最后在屋里踩着同一串脚印来回走。

const PIVOT = {x: 960, y: 612};
const ARM = {dx: 300, dy: -162};
const CLOCK = {x: 900, y: 360, r: 46};

/** holdUntil：作为预览的最后一节时，让画面在字幕结束后多停一会儿再淡出 */
export const S03Choice: React.FC<{holdUntil?: number}> = ({holdUntil}) => {
	const frame = useCurrentFrame();
	const {start, end} = sectionRange('choice');
	if (frame < start || frame >= Math.max(end, holdUntil ?? end)) {
		return null;
	}
	const s7 = screen(7);
	const s8 = screen(8);
	const s9 = screen(9);
	const s10 = screen(10);
	const s11 = screen(11);
	const inn = HANDOFF.questionToChoice;
	const ceiling = inn.ceiling;
	const ceilY = roomCeilingY(ceiling);

	// ---------- 天平：房间与门变形成两端的圆 ----------
	const morph = track(frame, [
		[s7.start, 0],
		[s7.start + 34, 1],
		[s9.start, 1],
		[s9.start + 22, 0],
	]);
	const beamVis = ramp(frame, s7.start + 22, s7.start + 42) * (1 - ramp(frame, cue(8, 'flip'), cue(8, 'flip') + 18));
	const theta = ((4.5 * Math.sin(((frame - s7.start) / 80) * Math.PI * 2) * Math.PI) / 180) * clamp((frame - s7.start - 20) / 30);
	const rot = (dx: number, dy: number) => ({
		x: PIVOT.x + dx * Math.cos(theta) - dy * Math.sin(theta),
		y: PIVOT.y + dx * Math.sin(theta) + dy * Math.cos(theta),
	});
	const leftC = rot(-ARM.dx, ARM.dy);
	const rightC = rot(ARM.dx, ARM.dy);
	const flipP = ramp(frame, cue(8, 'flip'), cue(8, 'flip') + 18, (t) => t);
	const flip = Math.max(0.03, Math.abs(Math.cos(Math.PI * flipP)));
	const backSide = flipP > 0.5;
	const labelVis = ramp(frame, s7.start + 30, s7.start + 44) * (backSide ? 0 : 1);

	// ---------- 门：变圆 → 翻面散成雾 → 回到右侧并打开 ----------
	const scatter = cue(8, 'scatter');
	const doorBack = s9.start + 6;
	const doorVisible = frame < scatter + 12 ? 1 - ramp(frame, scatter - 2, scatter + 12) : ramp(frame, scatter + 26, doorBack);
	const doorMorph = frame < scatter + 12 ? morph : 0;
	const doorOpen = ramp(frame, s9.start + 4, s9.start + 30);
	const doorLight = track(frame, [
		[s7.start, inn.door.light],
		[s7.start + 30, 0.9],
		[s9.start, 1],
		[s10.start, 1],
		[s10.start + 24, 0.45],
		[s11.start, 0.4],
	]);
	const doorSpill = track(frame, [
		[s7.start, inn.door.spill],
		[s7.start + 20, 0],
		[s9.start + 4, 0],
		[s9.start + 30, 1],
		[s10.start, 1],
		[s10.start + 24, 0.45],
	]);
	const doorFog = track(frame, [
		[s7.start, inn.door.fog],
		[s9.start, 1],
		[s10.start, 1],
		[s10.start + 24, 0.6],
	]);

	// ---------- 人物 ----------
	const walk1 = s9.start + 14;
	const exitX = 1120;
	const stopX = 1450;
	const stopAt = s9.start + 76;
	const turnAt = cue(10, 'turn');
	const loopStart = s11.start;
	const step = 15; // 与第 11 屏的钟摆音效同步：每 15 帧一步
	const stride = 84;
	const footprints = new Array(6).fill(0).map((_, k) => 1060 - stride * k);
	const loopTurn = loopStart + step * 5;

	let x: number;
	let phase: number;
	if (frame < s9.start) {
		// 第 7 屏：缩进房间里，随房间一起变成圆
		x = lerp(inn.personX, leftC.x, ramp(frame, s7.start, s7.start + 30));
		phase = 0;
	} else if (frame < loopStart) {
		x = track(frame, [
			[walk1, inn.personX],
			[s9.start + 44, exitX, (t) => t],
			[stopAt, stopX, EASE_OUT],
			[s10.start + 2, stopX],
			[s10.start + 18, 1380],
			[turnAt + 10, 1380],
			[loopStart, 1060, (t) => t],
		]);
		phase = (Math.abs(x - inn.personX) / 70) * Math.PI;
		if (frame >= s10.start) {
			phase = ((stopX - x) / 70) * Math.PI + 2;
		}
	} else {
		const t = frame - loopStart;
		x = t <= step * 5 ? 1060 - (stride / step) * t : footprints[5] + (stride / step) * Math.max(0, t - step * 5 - 10);
		phase = (Math.PI * t) / step;
	}
	const facing = track(frame, [
		[turnAt, 1],
		[turnAt + 10, -1],
		[loopTurn, -1],
		[loopTurn + 10, 1],
	]);
	const moving =
		(frame > walk1 && frame < stopAt) ||
		(frame > s10.start + 2 && frame < s10.start + 18) ||
		(frame > turnAt + 10 && frame < loopTurn) ||
		frame > loopTurn + 10;

	// 屋里要弯腰，出了房间才能站直
	const outside = clamp((x - exitX) / 90);
	const maxH = lerp(headroom(ceiling), 400, outside);
	const lookUp = ramp(frame, stopAt - 4, stopAt + 10) * (1 - ramp(frame, s10.start, s10.start + 10));
	let base = mixPose(withPose(CROUCH, {torso: CROUCH.torso + 1.5 * Math.sin(frame / 14)}), STAND, outside);
	if (moving) {
		base = addPose(base, walkPose(phase, lerp(0.55, 1, outside)));
	}
	base = mixPose(base, LOOK_UP, lookUp);
	const pose = fitUnder(base, addPose(CROUCH, walkPose(phase, moving ? 0.5 : 0)), maxH);
	const personVis = frame < s9.start ? 1 - ramp(frame, s7.start, s7.start + 22) : ramp(frame, s9.start + 6, s9.start + 18);
	const personScale = frame < s9.start ? lerp(1, 0.55, ramp(frame, s7.start, s7.start + 22)) : 1;
	const rim = clamp((x - 1150) / 300) * doorLight;

	const wallOpen = track(frame, [
		[s9.start + 18, 0],
		[s9.start + 32, 1],
		[loopStart + 4, 1],
		[loopStart + 20, 0],
	]);
	const warmth = track(frame, [
		[s7.start, inn.warmth],
		[s9.start, 1],
		[s10.start, 1],
		[s10.start + 30, 1.35],
		[s11.start + 30, 1.5],
	]);

	// 第 11 屏：钟一格一格走，脚印被踩亮
	const ticks = Math.max(0, frame - loopStart);
	const clockAngle = 30 * (Math.floor(ticks / step) + EASE(clamp((ticks % step) / 4)));
	const loopVis = ramp(frame, loopStart - 6, loopStart + 10);

	const w9a = highlight(9, 0);
	const w9b = highlight(9, 1);
	const w11 = highlight(11);
	const roomCircle = {cx: leftC.x, cy: leftC.y, r: 150};

	return (
		<AbsoluteFill>
			<Backdrop
				warm={track(frame, [[s7.start, inn.backdrop.warm], [s7.start + 30, 0.4], [s9.start, 0.4], [s9.start + 20, 1], [s10.start + 20, 1.2], [s11.start + 30, 1.45]])}
				cool={track(frame, [[s7.start, inn.backdrop.cool], [s7.start + 30, 0.45], [s9.start + 20, 1], [s10.start + 24, 0.45], [s11.start + 30, 0.2]])}
				dark={track(frame, [[s7.start, inn.backdrop.dark], [s7.start + 30, 0.85], [s9.start, 0.85], [s9.start + 20, 0.3], [s11.start + 30, 0.35]])}
				warmX={track(frame, [[s11.start, 42], [s11.start + 45, 40]])}
			/>
			<World frame={frame}>
				<Floor y={ROOM.floor} l={80} r={1860} opacity={1 - ramp(frame, s7.start, s7.start + 20) + ramp(frame, s9.start, s9.start + 20)} />
				<Gauge
					x={inn.gauge.x}
					bottom={ROOM.floor}
					height={inn.gauge.height}
					value={inn.gauge.value}
					threshold={inn.gauge.threshold}
					frame={frame}
					opacity={1 - ramp(frame, s7.start, s7.start + 16)}
				/>

				{/* 天平横梁与支点 */}
				<g opacity={beamVis}>
					<line x1={rot(-ARM.dx - 40, 0).x} y1={rot(-ARM.dx - 40, 0).y} x2={rot(ARM.dx + 40, 0).x} y2={rot(ARM.dx + 40, 0).y} stroke={C.grey} strokeWidth={5} strokeLinecap="round" />
					<polygon points={`${PIVOT.x},${PIVOT.y + 4} ${PIVOT.x - 30},${PIVOT.y + 58} ${PIVOT.x + 30},${PIVOT.y + 58}`} fill={C.line} stroke={C.grey} strokeWidth={3} />
					<text
						x={PIVOT.x}
						y={PIVOT.y - 90}
						textAnchor="middle"
						fontFamily={FONT}
						fontWeight={900}
						fontSize={72}
						fill={C.text}
						opacity={0.85}
						transform={`rotate(${(theta * 360) / Math.PI} ${PIVOT.x} ${PIVOT.y - 60})`}
					>
						？
					</text>
				</g>

				<Door
					frame={frame}
					open={doorOpen}
					light={doorLight}
					fog={doorFog}
					spill={doorSpill}
					morph={doorMorph}
					circle={{cx: rightC.x, cy: rightC.y, r: 150}}
					flip={frame < scatter + 12 ? flip : 1}
					opacity={doorVisible}
				/>
				<Scatter
					frame={frame}
					start={scatter}
					end={doorBack}
					from={{cx: rightC.x, cy: rightC.y, r: 150}}
					to={{l: DOOR.cx - 60, t: DOOR.top + 30, r: DOOR.cx + 60, b: DOOR.floor - 30}}
					color={C.cyan}
					seed="choice-scatter"
				/>

				<Room
					frame={frame}
					ceiling={ceiling}
					morph={morph}
					circle={roomCircle}
					flip={frame < s9.start ? flip : 1}
					icon={backSide ? morph : 0}
					warmth={warmth}
					ceilingGlow={inn.ceilingGlow}
					crack={1}
					wallOpen={wallOpen}
				/>
				{/* 两端的标签 */}
				<g opacity={labelVis} fontFamily={FONT} fontWeight={700} fontSize={56} fill={C.text} textAnchor="middle">
					<text x={leftC.x} y={leftC.y + 20} transform={`translate(${leftC.x} 0) scale(${flip} 1) translate(${-leftC.x} 0)`}>
						痛苦
					</text>
					<text x={rightC.x} y={rightC.y + 20} transform={`translate(${rightC.x} 0) scale(${flip} 1) translate(${-rightC.x} 0)`}>
						改变
					</text>
				</g>

				{/* 第 11 屏：同一串脚印、同一只钟 */}
				<g opacity={loopVis}>
					<ellipse cx={850} cy={ROOM.floor + 2} rx={250} ry={9} fill="none" stroke={C.amber} strokeOpacity={0.3} strokeWidth={2} strokeDasharray="8 10" />
					{footprints.map((fx, k) => {
						const lit = ramp(frame, loopStart + step * k - 1, loopStart + step * k + 3);
						return <rect key={k} x={fx - 4} y={ROOM.floor - 5} width={30} height={9} rx={4.5} fill={C.amber} opacity={0.22 + 0.6 * lit} />;
					})}
					<circle cx={CLOCK.x} cy={CLOCK.y} r={CLOCK.r} fill={C.bgDeep} stroke={C.grey} strokeWidth={4} />
					<line
						x1={CLOCK.x}
						y1={CLOCK.y}
						x2={CLOCK.x + (CLOCK.r - 12) * Math.sin((clockAngle * Math.PI) / 180)}
						y2={CLOCK.y - (CLOCK.r - 12) * Math.cos((clockAngle * Math.PI) / 180)}
						stroke={C.amber}
						strokeWidth={4}
						strokeLinecap="round"
					/>
				</g>

				{frame >= s9.start ? (
					<Dust frame={frame} seed="choice" color={C.amber} opacity={1 - morph} box={{l: ROOM.left + 12, t: ceilY + 10, r: ROOM.right - 12, b: ROOM.floor - 8}} />
				) : null}
				<Person
					x={x}
					groundY={frame < s9.start ? lerp(ROOM.floor, leftC.y + 60, ramp(frame, s7.start, s7.start + 30)) : ROOM.floor}
					pose={pose}
					facing={facing}
					scale={personScale}
					opacity={personVis}
					rim={{color: C.cyan, strength: 0.25 + 0.75 * rim, side: 1}}
				/>
			</World>
			<BigWord frame={frame} text={w9a.word} color={w9a.color} left={300} top={250} size={120} from={cue(9, 'word1')} to={s9.end - 2} />
			<BigWord frame={frame} text={w9b.word} color={w9b.color} left={980} top={250} size={120} from={cue(9, 'word2')} to={s9.end - 2} />
			<BigWord frame={frame} text={w11.word} color={w11.color} left={250} top={140} size={130} from={cue(11, 'word')} to={s11.end} />
		</AbsoluteFill>
	);
};
