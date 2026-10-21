import React from 'react';
import {AbsoluteFill, interpolateColors, useCurrentFrame} from 'remotion';
import {BigWord} from '../components/BigWord';
import {Door} from '../components/Door';
import {Debris, Dust} from '../components/Particles';
import {Person} from '../components/Person';
import {Room, roomCeilingY} from '../components/Room';
import {Backdrop, Floor, World} from '../components/Stage';
import {cue, highlight, screen, sectionRange} from '../data/script';
import {EASE, EASE_OUT, Key, lerp, ramp, track, visible} from '../lib/anim';
import {worldToScreen} from '../lib/camera';
import {figure, idleCrouch, jointWorld} from '../lib/figure';
import {CROUCH, fitUnder, FLOORSIT, HUDDLE, mixPose, SIT, withPose} from '../lib/pose';
import {C, CEILING, ROOM} from '../theme';
import {HANDOFF, headroom, warmCenter} from './continuity';

// 第四节（第 17–23 屏）：同一间屋子里的两种处境——
// 坐在桌前打字、回头看一眼门又转回去；和另一个人之间，光点一直从他身上流走；
// 捶墙、又亲手把砖塞回去；最后靠墙坐下，屋子像台灯一样暖，门外的未知暗了下去。

const DESK = {l: 520, r: 650, top: 650};
const STOOL = {x: 722, top: 660};
const WALL_HIT = {x: 428, y: 606};
const OTHER_X = 990;

export const S05Examples: React.FC = () => {
	const frame = useCurrentFrame();
	const {start, end} = sectionRange('examples');
	if (frame < start || frame >= end) {
		return null;
	}
	const [s17, s18, s19, s20, s21, s22, s23] = [17, 18, 19, 20, 21, 22, 23].map(screen);
	const inn = HANDOFF.nameToExamples;
	const out = HANDOFF.examplesToThreshold;
	const ceiling = CEILING.slam;
	const ceilY = roomCeilingY(ceiling);
	const sit = cue(17, 'sit');
	const type = cue(17, 'type');
	const flow = cue(19, 'flow');
	const punch = cue(21, 'punch');
	const patch = cue(21, 'patch');

	// ---------- 走位 ----------
	const xKeys: Key[] = [
		[s17.start + 2, inn.personX],
		[s17.start + 12, inn.personX],
		[sit - 2, 720],
		[s19.start + 15, 720],
		[s19.start + 35, 600],
		[s20.start + 20, 600],
		[s20.start + 35, 650],
		[s20.start + 52, 650],
		[s20.start + 75, 600],
		[s21.start + 12, 600],
		[punch - 5, 540],
		[s22.start + 10, 540],
		[s22.start + 23, out.personX],
	];
	const facingKeys: Key[] = [
		[s17.start + 2, 1],
		[s17.start + 12, -1],
		[s18.start + 18, -1],
		[s18.start + 28, 1],
		[s18.start + 58, 1],
		[s18.start + 68, -1],
		[s19.start + 35, -1],
		[s19.start + 45, 1],
		[s21.start + 2, 1],
		[s21.start + 12, -1],
		[s22.start, -1],
		[s22.start + 10, 1],
	];
	const fig = figure(frame, {xKeys, facingKeys, ceiling});

	const sitW = ramp(frame, sit, sit + 16) * (1 - ramp(frame, s19.start, s19.start + 15));
	const slump = ramp(frame, type, s19.start);
	const typeW = ramp(frame, type - 5, type + 3) * (1 - ramp(frame, s18.start + 8, s18.start + 15)) + ramp(frame, s18.start + 68, s18.start + 76) * (1 - ramp(frame, s19.start - 2, s19.start + 6));
	const floorW = ramp(frame, s22.start + 23, s22.start + 43);
	const punchW = ramp(frame, punch - 4, punch, EASE_OUT) * (1 - ramp(frame, punch + 6, punch + 14));
	const bendW = ramp(frame, punch + 16, punch + 26) * (1 - ramp(frame, patch - 1, patch + 11));
	const curl = ramp(frame, s23.start, end);

	let pose = mixPose(fig.pose, withPose(SIT, {torso: SIT.torso + 6 * slump, neck: SIT.neck + 6 * slump}), sitW);
	pose = mixPose(pose, HUDDLE, bendW * 0.8);
	pose = withPose(pose, {torso: pose.torso + 10 * punchW});
	pose = fitUnder(pose, CROUCH, headroom(ceiling));
	pose = mixPose(pose, withPose(FLOORSIT, {neck: FLOORSIT.neck + 10 * curl}), floorW);

	// 砖：捶出来 → 掉在地上 → 捡起来 → 塞回墙里
	const brick = (() => {
		if (frame < punch) {
			return null;
		}
		const floorPos = {x: 472, y: 724};
		if (frame < punch + 18) {
			const t = (frame - punch) / 18;
			return {x: lerp(WALL_HIT.x, floorPos.x, t), y: lerp(WALL_HIT.y, floorPos.y, t * t), rot: 160 * t};
		}
		if (frame < patch - 3) {
			return {...floorPos, rot: 160};
		}
		const t = EASE(ramp(frame, patch - 3, patch + 13, (v) => v));
		return {x: lerp(floorPos.x, WALL_HIT.x, t), y: lerp(floorPos.y, WALL_HIT.y, t), rot: lerp(160, 360, t)};
	})();
	const pickW = ramp(frame, punch + 20, punch + 28) * (1 - ramp(frame, patch + 15, patch + 25));
	const crackDraw = ramp(frame, punch, punch + 6) * (1 - ramp(frame, patch + 13, patch + 25));

	const reachF =
		punchW > 0
			? {x: WALL_HIT.x + 8, y: WALL_HIT.y, w: punchW}
			: pickW > 0 && brick
				? {x: brick.x, y: brick.y, w: pickW}
				: {x: 652 + 4 * Math.sin(frame * 1.3), y: DESK.top - 4, w: typeW};
	const reachB = {x: 640 + 4 * Math.sin(frame * 1.1 + 1), y: DESK.top - 2, w: typeW};

	// ---------- 关系：另一个人、连线、流走的光点 ----------
	const otherVis = visible(frame, s19.start + 10, s21.start + 16, 18, 16);
	const otherPose = idleCrouch(frame + 30);
	const myColor = interpolateColors(frame, [flow, s21.start, s21.start + 20, s21.start + 50], [C.person, '#8E95A3', '#8E95A3', C.person]);
	const myBack = interpolateColors(frame, [flow, s21.start, s21.start + 20, s21.start + 50], [C.personBack, '#6F7684', '#6F7684', C.personBack]);
	const myChest = jointWorld(fig.x, ROOM.floor, pose, fig.facing, 'shoulder');
	const otherChest = jointWorld(OTHER_X, ROOM.floor, otherPose, -1, 'shoulder');
	const linkVis = visible(frame, flow - 10, s21.start + 10, 14, 12);

	// ---------- 门 ----------
	const doorVis = ramp(frame, s18.start + 5, s18.start + 30);
	const doorLight = track(frame, [
		[s18.start, 0.3],
		[s23.start, 0.3],
		[s23.start + 15, 0.45],
		[s23.start + 25, 0.18],
		[s23.start + 35, 0.32],
		[end - 20, out.door.light],
	]);

	const desk = visible(frame, s17.start + 10, s19.start + 18, 16, 16);
	const lamp = ramp(frame, s22.start + 5, s22.start + 40);
	const warmPos = worldToScreen(frame, 760, 530);
	const wc = warmCenter(warmPos.x, warmPos.y);
	const w21a = highlight(21, 0);
	const w21b = highlight(21, 1);
	const w23 = highlight(23);

	return (
		<AbsoluteFill>
			<Backdrop
				warm={track(frame, [[start, inn.backdrop.warm], [s17.start + 45, 1.2], [s18.start, 1.2], [s18.start + 35, 0.9], [s22.start, 0.9], [s22.start + 35, 1.5], [end, out.backdrop.warm]])}
				cool={track(frame, [[s18.start, 0], [s18.start + 35, 0.35], [s23.start, 0.35], [end, out.backdrop.cool]])}
				dark={track(frame, [[start, inn.backdrop.dark], [end, out.backdrop.dark]])}
				warmX={wc.warmX}
				warmY={wc.warmY}
			/>
			<World frame={frame}>
				<Floor y={ROOM.floor} l={80} r={1860} opacity={doorVis} />
				<Door
					frame={frame}
					open={track(frame, [[s20.start + 5, 1], [s20.start + 40, out.door.open]])}
					light={doorLight}
					fog={out.door.fog}
					spill={track(frame, [[s18.start, 0.25], [s20.start + 5, 0.25], [s20.start + 40, out.door.spill]])}
					opacity={doorVis}
				/>
				<Room
					frame={frame}
					ceiling={ceiling}
					warmth={track(frame, [[start, inn.warmth], [s22.start, inn.warmth], [s22.start + 35, 2], [s23.start, 2], [end, out.warmth]])}
					ceilingGlow={0.35}
					crack={1}
				/>
				{/* 台灯一样的暖光 */}
				<ellipse cx={760} cy={660} rx={320} ry={72} fill={C.amber} opacity={0.1 * lamp * (1 + 0.15 * Math.sin(frame / 18))} />

				{/* 桌子、显示器、凳子 */}
				<g opacity={desk}>
					<rect x={DESK.l} y={DESK.top} width={DESK.r - DESK.l} height={8} rx={3} fill={C.grey} />
					<line x1={DESK.l + 10} y1={DESK.top + 8} x2={DESK.l + 10} y2={ROOM.floor} stroke={C.grey} strokeWidth={5} />
					<line x1={DESK.r - 10} y1={DESK.top + 8} x2={DESK.r - 10} y2={ROOM.floor} stroke={C.grey} strokeWidth={5} />
					<rect x={545} y={582} width={84} height={58} rx={4} fill="#1B1E25" stroke={C.grey} strokeWidth={3} />
					<line x1={587} y1={640} x2={587} y2={DESK.top} stroke={C.grey} strokeWidth={4} />
					{new Array(4).fill(0).map((_, k) => {
						const len = 20 + ((frame * (typeW > 0.5 ? 2.2 : 0.2) + k * 17) % 46);
						return <line key={k} x1={553} y1={593 + k * 11} x2={553 + len} y2={593 + k * 11} stroke={C.cyan} strokeWidth={3} strokeLinecap="round" opacity={0.55} />;
					})}
					<rect x={STOOL.x - 24} y={STOOL.top} width={48} height={8} rx={3} fill={C.grey} />
					<line x1={STOOL.x} y1={STOOL.top + 8} x2={STOOL.x} y2={ROOM.floor} stroke={C.grey} strokeWidth={5} />
				</g>

				{/* 墙上的裂缝与砖 */}
				{crackDraw > 0 ? (
					<path
						d={`M ${ROOM.left + 2} 560 l 22 30 l -14 32 l 20 36 l -10 34`}
						fill="none"
						stroke={C.amber}
						strokeWidth={3}
						strokeLinejoin="round"
						pathLength={1}
						strokeDasharray="1"
						strokeDashoffset={1 - crackDraw}
					/>
				) : null}
				<Debris frame={frame} start={punch} seed="wall-punch" color={C.amber} count={26} from={{l: ROOM.left + 4, r: ROOM.left + 40, y: WALL_HIT.y}} floor={ROOM.floor} />
				{brick ? (
					<rect x={brick.x - 17} y={brick.y - 9} width={34} height={18} rx={3} fill={C.amber} opacity={0.9 * (1 - ramp(frame, patch + 18, patch + 30))} transform={`rotate(${brick.rot} ${brick.x} ${brick.y})`} />
				) : null}

				<Dust frame={frame} seed="choice" color={C.amber} box={{l: ROOM.left + 12, t: ceilY + 10, r: ROOM.right - 12, b: ROOM.floor - 8}} />

				{/* 两人之间的连线与光点 */}
				<g opacity={linkVis}>
					<path
						d={`M ${myChest.x} ${myChest.y + 30} Q ${(myChest.x + otherChest.x) / 2} ${myChest.y + 52} ${otherChest.x} ${otherChest.y + 30}`}
						fill="none"
						stroke={C.grey}
						strokeWidth={2}
						opacity={0.7}
					/>
					{frame >= flow
						? new Array(7).fill(0).map((_, i) => {
								const p = (((frame - flow) / 45 + i / 7) % 1 + 1) % 1;
								const xx = lerp(myChest.x, otherChest.x, p);
								const yy = lerp(myChest.y + 30, otherChest.y + 30, p) + Math.sin(p * Math.PI) * 22;
								return <circle key={i} cx={xx} cy={yy} r={5} fill={C.amber} opacity={Math.sin(p * Math.PI)} />;
							})
						: null}
				</g>
				<Person x={OTHER_X} groundY={ROOM.floor} pose={otherPose} facing={-1} color="#8C93A3" backColor="#6E7584" opacity={otherVis} />
				<Person
					x={fig.x}
					groundY={ROOM.floor}
					pose={pose}
					facing={fig.facing}
					color={myColor}
					backColor={myBack}
					reachF={reachF}
					reachB={reachB}
					rim={{color: C.cyan, strength: 0.3 * doorVis * (fig.facing > 0 ? 1 : 0.5), side: 1}}
				/>
			</World>
			<BigWord frame={frame} text={w21a.word} color={w21a.color} left={240} top={150} size={130} from={punch + 2} to={s21.end - 3} variant="drop" />
			<BigWord frame={frame} text={w21b.word} color={w21b.color} left={620} top={150} size={130} from={patch + 2} to={s21.end - 3} variant="drop" />
			<BigWord frame={frame} text={w23.word} color={w23.color} left={1150} top={210} size={130} from={s23.start + 10} to={end - 2} variant="drop" />
		</AbsoluteFill>
	);
};
