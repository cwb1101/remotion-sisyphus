import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BigWord} from '../components/BigWord';
import {Debris, Dust} from '../components/Particles';
import {Person} from '../components/Person';
import {Room, roomCeilingY} from '../components/Room';
import {Backdrop, World} from '../components/Stage';
import {cue, highlight, screen, sectionRange} from '../data/script';
import {DROP, EASE, EASE_IN, EASE_OUT, ramp, track, visible} from '../lib/anim';
import {CROUCH, fitUnder, HOLD, mixPose, STAND, withPose} from '../lib/pose';
import {C, CEILING, FONT, ROOM} from '../theme';
import {HANDOFF, headroom} from './continuity';

// 开头（第 1–3 屏）：天花板每年低一点，人从站直到弯腰，最后双手托住砸下来的天花板。

export const S01Hook: React.FC = () => {
	const frame = useCurrentFrame();
	const {start, end} = sectionRange('hook');
	if (frame < start || frame >= end) {
		return null;
	}
	const drops = [cue(1, 'drop1'), cue(1, 'drop2'), cue(1, 'drop3')];
	const raise = cue(2, 'raise');
	const slam = cue(3, 'slam');
	const out = HANDOFF.hookToQuestion;

	const ceiling = track(frame, [
		[start, 0],
		[drops[0], 0],
		[drops[0] + 9, CEILING.year1, DROP],
		[drops[1], CEILING.year1],
		[drops[1] + 9, CEILING.year2, DROP],
		[drops[2], CEILING.year2],
		[drops[2] + 9, CEILING.year3, DROP],
		[raise, CEILING.year3],
		[slam, CEILING.endure, EASE],
		[slam + 5, CEILING.slam + 14, EASE_IN],
		[slam + 13, CEILING.slam, EASE_OUT],
	]);
	const ceilY = roomCeilingY(ceiling);
	const ceilingGlow = track(frame, [
		[start, 0],
		[raise, 0.15],
		[slam - 4, 0.6],
		[slam + 2, 1],
		[end, out.ceilingGlow],
	]);
	const warmth = track(frame, [
		[start, 0.6],
		[start + 30, 1],
		[end, out.warmth],
	]);

	// 人物：每沉一次天花板就低一点头；第 2 屏举手托住；砸下后双手托举、发抖
	const bow = drops.reduce((acc, d) => acc + ramp(frame, d + 3, d + 15), 0);
	const breathe = Math.sin(frame / 14);
	const reachUp = ramp(frame, raise, raise + 16);
	const bothHands = ramp(frame, slam - 2, slam + 3);
	let pose = withPose(STAND, {neck: 9 * bow, torso: 2.5 * bow + 1.2 * breathe});
	pose = fitUnder(pose, mixPose(CROUCH, HOLD, bothHands), headroom(ceiling));
	const tremble = frame >= slam ? Math.sin(frame * 1.7) * 2.2 : 0;
	const x = out.personX;

	// 世界里的“还能忍”：被天花板压扁
	const wordBase = 530;
	const wordSize = 84;
	const wordVis = visible(frame, raise, slam + 24, 10, 16);
	const squash = Math.min(1, Math.max(0.12, (wordBase - ceilY - 4) / (wordSize * 0.92)));

	const yearLabel = (i: number) => {
		const a = drops[i];
		const b = i < 2 ? drops[i + 1] : raise + 10;
		return visible(frame, a + 2, b + 2, 6, 6);
	};

	const big = highlight(3);

	return (
		<AbsoluteFill>
			<Backdrop warm={track(frame, [[start, 0.5], [start + 30, 1]])} cool={0} dark={track(frame, [[start, 0.3], [slam, 0.3], [slam + 4, 0.75], [end, 0.4]])} />
			<World frame={frame}>
				<Room
					frame={frame}
					ceiling={ceiling}
					warmth={warmth}
					ceilingGlow={ceilingGlow}
					draw={ramp(frame, start, start + 18)}
					crack={ramp(frame, slam + 1, slam + 14)}
				/>
				{[0, 1, 2].map((i) => (
					<text key={i} x={ROOM.left + 28} y={ceilY + 46} fontFamily={FONT} fontWeight={700} fontSize={30} fill={C.grey} opacity={yearLabel(i)}>
						{`第${i + 1}年`}
					</text>
				))}
				<g opacity={wordVis} transform={`translate(0 ${wordBase}) scale(1 ${squash}) translate(0 ${-wordBase})`}>
					<text
						x={ROOM.left + 40}
						y={wordBase - 8 * (1 - ramp(frame, raise, raise + 12))}
						fontFamily={FONT}
						fontWeight={900}
						fontSize={wordSize}
						fill={C.amber}
					>
						{highlight(2).word}
					</text>
				</g>
				<Dust frame={frame} seed="hook" color={C.amber} box={{l: ROOM.left + 12, t: ceilY + 10, r: ROOM.right - 12, b: ROOM.floor - 8}} />
				<Debris frame={frame} start={slam + 3} seed="hook-debris" color={C.amber} from={{l: ROOM.left + 10, r: ROOM.right - 10, y: ceilY + 4}} floor={ROOM.floor} />
				<Person
					x={x}
					groundY={ROOM.floor}
					pose={pose}
					reachF={{x: x + out.hands.front + tremble, y: ceilY + 10, w: reachUp}}
					reachB={{x: x + out.hands.back - tremble, y: ceilY + 10, w: bothHands}}
				/>
			</World>
			<BigWord
				frame={frame}
				text={big.word}
				color={big.color}
				left={230}
				top={150}
				size={150}
				from={cue(3, 'word')}
				to={screen(3).end - 2}
				variant="slam"
				impact
			/>
		</AbsoluteFill>
	);
};
