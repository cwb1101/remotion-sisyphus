import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {BigWord} from '../components/BigWord';
import {Door} from '../components/Door';
import {Gauge} from '../components/Gauge';
import {WorldLabel} from '../components/Labels';
import {Dust} from '../components/Particles';
import {Person} from '../components/Person';
import {Ledger} from '../components/Props';
import {Room, roomCeilingY} from '../components/Room';
import {Backdrop, Floor, World} from '../components/Stage';
import {cue, FILM_END, highlight, screen, sectionRange} from '../data/script';
import {clamp, EASE, EASE_OUT, Key, lerp, ramp, track, visible} from '../lib/anim';
import {worldToScreen} from '../lib/camera';
import {figure} from '../lib/figure';
import {FLOORSIT, fitUnder, HUDDLE, mixPose, withPose} from '../lib/pose';
import {C, DOOR, ROOM} from '../theme';
import {HANDOFF, headroom, warmCenter} from './continuity';
import {InstallmentLeftovers} from './S08Installment';

// 第八节（第 44–51 屏），回收开头的问题：
// 房间和门并排亮起，留下也成了一个看得见的选项；他的影子先一步弯成了窄屋里的样子；
// 账本两页都写满后，镜头回到开头的构图——“第5年”，一间更窄的屋子的虚影；
// 最后回到第 4 屏的全景：当年推不动的是墙，这一次他推开的是门，走进光里。

const SEAT_X = 790;

export const S09Close: React.FC = () => {
	const frame = useCurrentFrame();
	const {start} = sectionRange('close');
	if (frame < start || frame >= FILM_END) {
		return null;
	}
	const [s44, s45, s46, s47, s48, s49, s50, s51] = [44, 45, 46, 47, 48, 49, 50, 51].map(screen);
	const inn = HANDOFF.installmentToClose;
	const {squeeze, ceiling} = inn;
	const ceilY = roomCeilingY(ceiling);
	const roomRight = ROOM.right - squeeze;
	const shadowAt = cue(46, 'shadow');
	const year = cue(48, 'year');
	const push = cue(51, 'push');

	// ---------- 人物 ----------
	const xKeys: Key[] = [
		[s44.start + 7, inn.personX],
		[s44.start + 35, 760, EASE],
		[s47.start + 2, 760],
		[s47.start + 15, SEAT_X],
		[s49.start + 28, SEAT_X],
		[s49.start + 70, roomRight - 20, (t) => t],
		[s51.start, 1530, EASE_OUT],
		[push + 5, 1530],
		[push + 50, 1770, (t) => t],
	];
	const facingKeys: Key[] = [
		[s44.start + 50, 1],
		[s44.start + 60, -1],
		[s44.start + 75, -1],
		[s44.start + 85, 1],
		[s45.start + 5, 1],
		[s45.start + 15, -1],
		[s45.start + 45, -1],
		[s45.start + 55, 1],
	];
	const fig = figure(frame, {xKeys, facingKeys, ceiling, roomRight});
	// 上一节结束时缩在角落、低头看着未来的自己
	const huddleEnd = fitUnder(withPose(HUDDLE, {torso: HUDDLE.torso + 2 * Math.sin(frame / 16) - 10, neck: HUDDLE.neck - 22}), HUDDLE, headroom(ceiling));
	const unhuddle = ramp(frame, start, start + 14);
	let pose = mixPose(huddleEnd, fitUnder(fig.pose, HUDDLE, lerp(headroom(ceiling), 400, fig.outside)), unhuddle);
	const lookShadow = ramp(frame, shadowAt, shadowAt + 12) * (1 - ramp(frame, s47.start, s47.start + 10));
	const seatW = ramp(frame, s47.start + 15, s47.start + 35) * (1 - ramp(frame, s49.start + 8, s49.start + 26));
	const readW = ramp(frame, s47.start + 30, s47.start + 40) * (1 - ramp(frame, year - 5, year + 10));
	const lookUpW = ramp(frame, year, year + 15) * (1 - ramp(frame, s49.start + 8, s49.start + 20));
	pose = withPose(pose, {neck: pose.neck + 24 * lookShadow});
	pose = mixPose(pose, withPose(FLOORSIT, {neck: FLOORSIT.neck + 18 * readW - 22 * lookUpW}), seatW);
	const pushW = ramp(frame, push - 9, push) * (1 - ramp(frame, push + 7, push + 17));
	const personOpacity = 1 - ramp(frame, push + 25, push + 53);
	const rim = 0.3 + 0.7 * clamp((fig.x - roomRight) / 300);

	// ---------- 影子：先一步弯成窄屋里的样子 ----------
	const shadowVis = ramp(frame, shadowAt, shadowAt + 12) * (1 - ramp(frame, s47.start, s47.start + 20));
	const shadowPose = withPose(HUDDLE, {torso: 60, neck: 40});
	const shadowGrow = ramp(frame, shadowAt, shadowAt + 30, EASE_OUT);

	// ---------- 门：亮起 → 被推开、光涌出来 ----------
	const doorOpen = track(frame, [[s44.start + 5, inn.door.open], [s44.start + 55, 1]]);
	const doorLight = track(frame, [[s44.start + 5, inn.door.light], [s44.start + 55, 0.75], [push, 0.85], [push + 30, 1]]);
	const doorFog = track(frame, [[s44.start + 5, inn.door.fog], [s44.start + 55, 0.7], [push, 0.7], [push + 25, 0]]);
	const doorSpill = track(frame, [[s44.start + 5, inn.door.spill], [s44.start + 55, 0.6], [push, 0.7], [push + 30, 1]]);
	const doorScreen = worldToScreen(frame, DOOR.cx, 480);
	const flood = ramp(frame, push, FILM_END, (t) => t);

	const choice = ramp(frame, s45.start + 5, s45.start + 25) * (1 - ramp(frame, s47.start + 5, s47.start + 25));
	const ghostRoom = visible(frame, year, s49.start + 20, 15, 20);
	const ghostGrow = 1 + 0.08 * ramp(frame, s49.start, s49.start + 20);
	const warmPos = worldToScreen(frame, 760, 560);
	const wc = warmCenter(warmPos.x, warmPos.y);
	const h45 = highlight(45);
	const h50 = highlight(50);
	const h51 = highlight(51);
	const flash = Math.max(0, 1 - (frame - shadowAt) / 10) * (frame >= shadowAt ? 1 : 0);

	return (
		<AbsoluteFill>
			<Backdrop
				warm={track(frame, [[start, 0.9], [s44.start + 55, 1], [s48.start + 40, 1.1], [s50.start, 0.9], [FILM_END, 0.4]])}
				cool={track(frame, [[start, inn.backdrop.cool], [s44.start + 55, 0.6], [s46.start, 0.6], [shadowAt + 10, 0.3], [s50.start, 0.6], [FILM_END, 1.6]])}
				dark={track(frame, [[start, inn.backdrop.dark], [shadowAt, 0.4], [shadowAt + 6, 0.7], [s47.start, 0.4], [s51.start, 0.3], [FILM_END, 0.1]])}
				warmX={wc.warmX}
				warmY={wc.warmY}
			/>
			<World frame={frame}>
				<Floor y={ROOM.floor} l={80} r={1860} opacity={1} />
				<Door frame={frame} open={doorOpen} light={doorLight} fog={doorFog} spill={doorSpill} />
				<InstallmentLeftovers frame={frame} opacity={1 - ramp(frame, start, start + 25)} />
				<Gauge
					x={HANDOFF.questionToChoice.gauge.x}
					bottom={ROOM.floor}
					height={HANDOFF.questionToChoice.gauge.height}
					value={track(frame, [[s50.start + 5, 0], [s50.start + 45, 0.5, EASE_OUT]]) + (frame > s50.start + 45 ? 0.004 * Math.sin(frame / 3) : 0)}
					threshold={HANDOFF.questionToChoice.gauge.threshold}
					frame={frame}
					opacity={ramp(frame, s50.start + 2, s50.start + 15) * (1 - ramp(frame, s50.end - 20, s50.end - 3))}
				/>
				<Room
					frame={frame}
					ceiling={ceiling}
					squeeze={squeeze}
					warmth={track(frame, [[start, 1.3], [s48.start + 40, 1.4], [s51.start, 1]])}
					ceilingGlow={0.8}
					crack={1}
					wallOpen={ramp(frame, s49.start + 45, s49.start + 62)}
					outline2={{color: C.cyan, amount: choice}}
				/>
				<Dust frame={frame} seed="choice" color={C.amber} box={{l: ROOM.left + 12 + squeeze, t: ceilY + 10, r: roomRight - 12, b: ROOM.floor - 8}} />

				{/* 影子：门光从右边照来，墙上先一步出现一个缩成一团的轮廓 */}
				<defs>
					<clipPath id="close-room-inside">
						<rect x={ROOM.left + squeeze} y={ceilY} width={roomRight - ROOM.left - squeeze} height={ROOM.floor - ceilY} />
					</clipPath>
				</defs>
				{shadowVis > 0 ? (
					<g clipPath="url(#close-room-inside)" opacity={shadowVis}>
						<g transform={`translate(${fig.x - 130} ${ROOM.floor}) scale(${lerp(0.8, 1.08, shadowGrow)}) translate(${-(fig.x - 130)} ${-ROOM.floor})`}>
							<Person x={fig.x - 130} groundY={ROOM.floor} pose={shadowPose} facing={1} color="#050608" backColor="#050608" opacity={0.9} rim={{color: C.amber, strength: 0.7, side: -1}} />
						</g>
					</g>
				) : null}

				{/* 第 5 年：一间更窄的屋子的虚影 */}
				<g opacity={ghostRoom * (0.6 + 0.15 * Math.sin(frame / 9))} transform={`translate(760 ${ROOM.floor}) scale(${ghostGrow}) translate(-760 ${-ROOM.floor})`}>
					<rect x={640} y={ROOM.top + 400} width={240} height={ROOM.floor - ROOM.top - 400} rx={10} fill="none" stroke={C.amber} strokeWidth={2.5} strokeDasharray="10 10" />
				</g>
				<WorldLabel frame={frame} x={ROOM.left + squeeze + 28} y={ceilY + 46} text="第5年" size={30} color={C.grey} opacity={visible(frame, year, s49.start + 2, 6, 10)} />

				<Ledger
					x={880}
					y={694}
					scale={0.7}
					open={ramp(frame, s47.start + 18, s47.start + 32) * (1 - ramp(frame, s48.start, s48.start + 13))}
					left={ramp(frame, s47.start + 22, s47.start + 55)}
					right={ramp(frame, s47.start + 55, s47.start + 95)}
					opacity={visible(frame, s47.start + 8, s48.start + 25, 12, 12)}
				/>

				<Person
					x={fig.x}
					groundY={ROOM.floor}
					pose={pose}
					facing={fig.facing}
					opacity={personOpacity}
					reachF={{x: DOOR.cx - DOOR.width / 2 + 4, y: 470, w: pushW}}
					reachB={{x: DOOR.cx - DOOR.width / 2 + 4, y: 540, w: pushW}}
					rim={{color: C.cyan, strength: rim, side: 1}}
				/>
			</World>

			{/* 第 46 屏：全屏一闪 */}
			{flash > 0 ? <AbsoluteFill style={{backgroundColor: C.amber, opacity: 0.12 * flash}} /> : null}
			{/* 门被推开：光从门口涌满画面，最后只留光 */}
			{flood > 0 ? (
				<>
					<AbsoluteFill
						style={{
							background: `radial-gradient(circle at ${doorScreen.x}px ${doorScreen.y}px, rgba(235,255,255,${0.95 * flood}) 0px, rgba(92,225,230,${0.75 * flood}) ${200 + 1500 * flood}px, rgba(92,225,230,0) ${400 + 2400 * flood}px)`,
						}}
					/>
					<AbsoluteFill style={{backgroundColor: '#DDFBFC', opacity: 0.8 * ramp(frame, s51.end - 10, FILM_END) * (0.96 + 0.04 * Math.sin(frame / 7))}} />
				</>
			) : null}
			<BigWord frame={frame} text={h45.word} color={h45.color} left={230} top={150} size={110} from={s45.start + 8} to={s45.end - 2} variant="drop" />
			<BigWord frame={frame} text={h50.word} color={h50.color} left={240} top={150} size={140} from={s50.start + 8} to={s50.end - 2} variant="drop" />
			<BigWord frame={frame} text={h51.word} color={h51.color} left={240} top={150} size={170} from={push + 2} to={s51.end - 2} variant="slam" />
		</AbsoluteFill>
	);
};
