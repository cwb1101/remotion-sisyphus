import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BigWord} from '../components/BigWord';
import {Door} from '../components/Door';
import {Gauge} from '../components/Gauge';
import {Dust} from '../components/Particles';
import {Person} from '../components/Person';
import {Room, roomCeilingY} from '../components/Room';
import {Backdrop, Floor, World} from '../components/Stage';
import {cue, highlight, screen, sectionRange} from '../data/script';
import {clamp, EASE, EASE_IN, EASE_OUT, ramp, track} from '../lib/anim';
import {worldToScreen} from '../lib/camera';
import {figure} from '../lib/figure';
import {FLOORSIT, mixPose, withPose} from '../lib/pose';
import {C, CEILING, ROOM} from '../theme';
import {HANDOFF, warmCenter} from './continuity';

// 第五节（第 24–26 屏）：开头那根压力条又出现了，一点点涨；冲过承受线的那一刻，墙裂开、人猛地站起；
// 他走出房间来到门前——门外的雾一点没变清楚，是身后的房间一节一节塌成了轮廓。

export const S06Threshold: React.FC = () => {
	const frame = useCurrentFrame();
	const {start, end} = sectionRange('threshold');
	if (frame < start || frame >= end) {
		return null;
	}
	const s25 = screen(25);
	const s26 = screen(26);
	const inn = HANDOFF.examplesToThreshold;
	const out = HANDOFF.thresholdToLedger;
	const gauge = HANDOFF.questionToChoice.gauge;
	const cross = cue(25, 'cross');
	const ceiling = CEILING.slam;
	const ceilY = roomCeilingY(ceiling);

	// ---------- 人物：越缩越紧 → 猛地站起 → 走出去 ----------
	const curl = ramp(frame, start, s25.start);
	const seated = withPose(FLOORSIT, {neck: FLOORSIT.neck + 10 + 8 * curl, torso: FLOORSIT.torso + 12 * curl});
	const standW = ramp(frame, cross, cross + 12, EASE_OUT);
	const fig = figure(frame, {
		xKeys: [
			[s26.start + 3, inn.personX],
			[s26.start + 57, ROOM.right, (t) => t],
			[s26.start + 93, out.personX, EASE_OUT],
		],
		ceiling,
	});
	const pose = mixPose(seated, fig.pose, standW);

	const gaugeValue = track(frame, [
		[start + 5, gauge.value],
		[s25.start, 0.9, EASE],
		[cross - 4, 0.9],
		[cross + 2, 1, EASE_IN],
	]);
	const roomDraw = track(frame, [
		[s26.start + 25, 1],
		[s26.start + 87, out.roomDraw],
	]);
	const crackDraw = ramp(frame, cross, cross + 12);

	const warmPos = worldToScreen(frame, 760, 530);
	const wc = warmCenter(warmPos.x, warmPos.y);
	const word = highlight(25);

	return (
		<AbsoluteFill>
			<Backdrop
				warm={track(frame, [[start, inn.backdrop.warm], [s26.start, 1.1], [end, out.backdrop.warm]])}
				cool={track(frame, [[start, inn.backdrop.cool], [s26.start, inn.backdrop.cool], [end, out.backdrop.cool]])}
				dark={track(frame, [[start, inn.backdrop.dark], [end, out.backdrop.dark]])}
				warmX={wc.warmX}
				warmY={wc.warmY}
			/>
			<World frame={frame}>
				<Floor y={ROOM.floor} l={80} r={1860} opacity={1} />
				<Door
					frame={frame}
					open={track(frame, [[s26.start + 5, inn.door.open], [s26.start + 55, out.door.open]])}
					light={track(frame, [[s26.start + 5, inn.door.light], [s26.start + 55, out.door.light]])}
					fog={inn.door.fog}
					spill={track(frame, [[s26.start + 5, inn.door.spill], [s26.start + 55, out.door.spill]])}
				/>
				<Gauge
					x={gauge.x}
					bottom={ROOM.floor}
					height={gauge.height}
					value={gaugeValue}
					threshold={gauge.threshold}
					frame={frame}
					flash={frame >= cross ? 1 : 0}
					opacity={ramp(frame, start + 5, start + 20) * (1 - ramp(frame, s26.start + 5, s26.start + 25))}
				/>
				{/* 房间塌掉以后剩下的虚线轮廓 */}
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
					opacity={0.4 * (1 - roomDraw)}
				/>
				<Room
					frame={frame}
					ceiling={ceiling}
					warmth={track(frame, [[start, inn.warmth], [s25.start, 1.2], [s26.start, 1]])}
					ceilingGlow={track(frame, [[start, 0.35], [cross, 0.9], [s26.start, 0.5]])}
					crack={1}
					draw={roomDraw}
					wallOpen={ramp(frame, s26.start + 3, s26.start + 17)}
				/>
				{/* 上一节的台灯暖光慢慢退去 */}
				<ellipse cx={760} cy={660} rx={320} ry={72} fill={C.amber} opacity={0.1 * (1 - ramp(frame, start, start + 40)) * (1 + 0.15 * Math.sin(frame / 18))} />
				{/* 右墙从上到下裂开 */}
				<path
					d={`M ${ROOM.right - 2} ${ceilY + 4} l -16 40 l 18 36 l -20 44 l 16 40 l -14 46`}
					fill="none"
					stroke={C.amber}
					strokeWidth={3.5}
					strokeLinejoin="round"
					pathLength={1}
					strokeDasharray="1"
					strokeDashoffset={1 - crackDraw}
					opacity={roomDraw}
				/>
				<Dust frame={frame} seed="choice" color={C.amber} opacity={roomDraw} box={{l: ROOM.left + 12, t: ceilY + 10, r: ROOM.right - 12, b: ROOM.floor - 8}} />
				<Person
					x={fig.x}
					groundY={ROOM.floor}
					pose={pose}
					facing={1}
					rim={{color: C.cyan, strength: 0.3 + 0.7 * clamp((fig.x - ROOM.right) / 200), side: 1}}
				/>
			</World>
			<BigWord frame={frame} text={word.word} color={word.color} left={220} top={150} size={115} from={cross + 2} to={s25.end - 2} variant="drop" />
		</AbsoluteFill>
	);
};
