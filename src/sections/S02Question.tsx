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
import {EASE_OUT, lerp, ramp, track, visible} from '../lib/anim';
import {addPose, CROUCH, fitUnder, HOLD, mixPose, PUSH, walkPose, withPose} from '../lib/pose';
import {C, ROOM} from '../theme';
import {HANDOFF, headroom} from './continuity';

// 第一节（第 4–6 屏）：拉远露出右侧的门；人去推墙，墙纹丝不动；
// 压力条涨到承受线下方就停住；“还不够痛”被一刀劈成两半。

export const S02Question: React.FC = () => {
	const frame = useCurrentFrame();
	const {start, end} = sectionRange('question');
	if (frame < start || frame >= end) {
		return null;
	}
	const s4 = screen(4);
	const s5 = screen(5);
	const s6 = screen(6);
	const inn = HANDOFF.hookToQuestion;
	const out = HANDOFF.questionToChoice;
	const ceiling = inn.ceiling;
	const ceilY = roomCeilingY(ceiling);
	const room = headroom(ceiling);

	// ---------- 人物 ----------
	const release = ramp(frame, s4.start, s4.start + 10);
	const facing = track(frame, [
		[s4.start + 6, 1],
		[s4.start + 16, -1],
		[s5.start + 8, -1],
		[s5.start + 18, 1],
	]);
	const pushAt = s4.start + 58;
	const x = track(frame, [
		[s4.start + 14, inn.personX],
		[pushAt, 560],
		[s5.start + 18, 560],
		[s5.start + 60, out.personX],
	]);
	const walking = (frame > s4.start + 14 && frame < pushAt) || (frame > s5.start + 18 && frame < s5.start + 60);
	const phase = (Math.abs(x - inn.personX) / 62) * Math.PI;
	const pushing = ramp(frame, pushAt - 6, pushAt + 6) * (1 - ramp(frame, s5.start, s5.start + 10));
	const strain = Math.sin(frame / 3.2) * pushing;
	const brush = visible(frame, s5.start + 62, s5.start + 90, 4, 4);
	const breathe = Math.sin(frame / 14);

	// 刚进入本节时还保持着托举的姿势
	let pose = withPose(mixPose(HOLD, CROUCH, release), {torso: lerp(HOLD.torso, CROUCH.torso, release) + 1.5 * breathe});
	if (walking) {
		pose = addPose(pose, walkPose(phase, 0.55));
	}
	pose = addPose(pose, PUSH, pushing * 0.9);
	pose = withPose(pose, {
		armF: pose.armF + 26 * brush * Math.sin(frame * 0.9),
		armB: pose.armB - 26 * brush * Math.sin(frame * 0.9),
		torso: pose.torso + 3 * strain,
	});
	pose = fitUnder(pose, mixPose(HOLD, CROUCH, release), room);

	// 刚进入本节时双手仍托着天花板，然后放下
	const holdW = 1 - release;
	const wallX = ROOM.left + 14; // 手掌圆头刚好贴住墙内侧

	// ---------- 门、地面、压力条 ----------
	const doorIn = ramp(frame, cue(4, 'door'), cue(4, 'door') + 24);
	const gaugeValue = track(frame, [
		[cue(5, 'rise'), 0],
		[cue(5, 'stall'), out.gauge.value, EASE_OUT],
	]) + (frame > cue(5, 'stall') ? 0.006 * Math.sin(frame / 3) : 0);
	const dim = track(frame, [
		[s6.start, 1],
		[s6.start + 16, 0.5],
		[s6.end - 14, 0.5],
		[s6.end, 1],
	]);

	const word = highlight(5);

	return (
		<AbsoluteFill>
			<Backdrop
				warm={track(frame, [[start, 1], [end, out.backdrop.warm]])}
				cool={doorIn * out.backdrop.cool}
				dark={track(frame, [[start, 0.4], [s6.start, 0.4], [s6.start + 16, 0.7], [end, out.backdrop.dark]])}
			/>
			<World frame={frame}>
				<Floor y={ROOM.floor} l={80} r={1860} opacity={ramp(frame, s4.start + 10, s4.start + 40)} />
				<Door frame={frame} open={out.door.open} light={out.door.light} fog={out.door.fog} spill={out.door.spill} opacity={doorIn} />
				<Gauge
					x={out.gauge.x}
					bottom={ROOM.floor}
					height={out.gauge.height}
					value={gaugeValue}
					threshold={out.gauge.threshold}
					frame={frame}
					opacity={ramp(frame, s5.start, s5.start + 14)}
				/>
				<g opacity={dim}>
					<Room
						frame={frame}
						ceiling={ceiling}
						warmth={track(frame, [[start, inn.warmth], [end, out.warmth]])}
						ceilingGlow={track(frame, [[start, inn.ceilingGlow], [end, out.ceilingGlow]])}
						crack={1}
					/>
					<Dust frame={frame} seed="question" color={C.amber} box={{l: ROOM.left + 12, t: ceilY + 10, r: ROOM.right - 12, b: ROOM.floor - 8}} />
					<Person
						x={x + 2.5 * strain}
						groundY={ROOM.floor}
						pose={pose}
						facing={facing}
						reachF={
							pushing > 0
								? {x: wallX, y: 600, w: pushing}
								: {x: inn.personX + inn.hands.front, y: ceilY + 10, w: holdW}
						}
						reachB={pushing > 0 ? {x: wallX, y: 650, w: pushing} : {x: inn.personX + inn.hands.back, y: ceilY + 10, w: holdW}}
						rim={{color: C.cyan, strength: 0.35 * doorIn * (facing > 0 ? 1 : 0.5), side: 1}}
					/>
				</g>
			</World>
			<BigWord
				frame={frame}
				text={word.word}
				color={word.color}
				left={220}
				top={150}
				size={150}
				from={cue(5, 'stall') - 10}
				to={s6.end - 2}
				variant="drop"
				slashAt={cue(6, 'slash')}
			/>
		</AbsoluteFill>
	);
};
