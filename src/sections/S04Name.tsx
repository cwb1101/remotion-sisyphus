import React from 'react';
import {AbsoluteFill, interpolateColors, random, useCurrentFrame} from 'remotion';
import {BigWord} from '../components/BigWord';
import {Door} from '../components/Door';
import {Caption, WorldLabel} from '../components/Labels';
import {Dust} from '../components/Particles';
import {Person} from '../components/Person';
import {Room, roomCeilingY} from '../components/Room';
import {Backdrop, Floor, World} from '../components/Stage';
import {cue, highlight, screen, sectionRange} from '../data/script';
import {clamp, EASE, EASE_OUT, lerp, ramp, track, visible} from '../lib/anim';
import {worldToScreen} from '../lib/camera';
import {idleCrouch, LOOP, loopWalker} from '../lib/figure';
import {mixPose} from '../lib/pose';
import {C, ROOM} from '../theme';
import {CLOCK, HANDOFF, warmCenter} from './continuity';

// 第三节（第 12–16 屏）：镜头拉到极远，房间缩成左上角的小图标；“现状偏差”砸下；
// 摇到 1988 年的论文；再拉开——房间成了五个并排选项里那个被设成“现状”的，人点纷纷落进它。

const OPTIONS = [-2, -1, 1, 2].map((k) => ROOM.left + 340 + 820 * k);
const ROOM_CX = (ROOM.left + ROOM.right) / 2;
const ROOM_CY = (ROOM.top + ROOM.floor) / 2;
const DOTS = 64;

export const S04Name: React.FC = () => {
	const frame = useCurrentFrame();
	const {start, end} = sectionRange('name');
	if (frame < start || frame >= end) {
		return null;
	}
	const s13 = screen(13);
	const s14 = screen(14);
	const s15 = screen(15);
	const s16 = screen(16);
	const inn = HANDOFF.choiceToName;
	const out = HANDOFF.nameToExamples;
	const slam = cue(13, 'slam');
	const ceilY = roomCeilingY(inn.ceiling);

	// ---------- 人物：接着第 11 屏的脚印来回走，镜头拉远后慢慢停在屋子中间 ----------
	const lw = loopWalker(frame, inn.ceiling);
	const settle = ramp(frame, s14.start + 5, s14.start + 65);
	const px = lerp(lw.x, out.personX, settle);
	const pFacing = lerp(lw.facing, 1, settle);
	const pose = mixPose(lw.pose, idleCrouch(frame), settle);

	// ---------- 第 11 屏留下的脚印和钟，随拉远淡出 ----------
	const leftovers = 1 - ramp(frame, start, start + 30);
	const ticks = frame - LOOP.start;
	const clockAngle = 30 * (Math.floor(ticks / LOOP.step) + EASE(clamp((ticks % LOOP.step) / 4)));

	// ---------- 名字砸下：光环从房间扩散 ----------
	const ringT = (frame - slam) / 36;
	const iconScreen = worldToScreen(frame, ROOM.right, ROOM_CY);
	const linkDraw = ramp(frame, slam + 6, slam + 22);

	// ---------- 1988 与两篇论文 ----------
	const paperIn = ramp(frame, s14.start + 8, s14.start + 40, EASE_OUT);
	const paperVis = paperIn * (1 - ramp(frame, s15.start, s15.start + 24));

	// ---------- 五个选项 ----------
	const optDraw = ramp(frame, s15.start + 6, s15.start + 36);
	const equal = ramp(frame, s16.start, s16.start + 45);
	const optScale = lerp(0.72, 1, equal);
	const optColor = interpolateColors(equal, [0, 1], ['#3A3F4B', C.grey]);
	const optVis = optDraw * (1 - ramp(frame, end - 20, end));

	// 人点：大部分落进“现状”那间
	const dots = new Array(DOTS).fill(0).map((_, i) => {
		const born = s15.start + 8 + i * 2.1;
		const t = clamp((frame - born) / 34);
		const toMain = random(`dot-main-${i}`) < 0.72;
		const opt = Math.floor(random(`dot-opt-${i}`) * 4);
		const cx = toMain ? ROOM_CX : OPTIONS[opt];
		const slot = toMain ? i % 14 : i % 5;
		const row = toMain ? Math.floor(i / 14) : Math.floor(i / 20);
		const tx = cx - 230 + slot * 34 + (row % 2) * 17;
		const ty = ROOM.floor - 14 - row * 26;
		const x0 = lerp(-1300, 2800, random(`dot-x-${i}`));
		const y0 = -700;
		return {x: lerp(x0, tx, EASE(t)), y: lerp(y0, ty, t * t) - Math.sin(t * Math.PI) * 120, vis: t > 0 ? 1 : 0};
	});
	const dotVis = 1 - ramp(frame, end - 25, end);

	const warmPos = worldToScreen(frame, ROOM_CX, ROOM_CY + 60);
	const wc = warmCenter(warmPos.x, warmPos.y);
	const toWarm = ramp(frame, start, start + 45);
	const name = highlight(13);

	return (
		<AbsoluteFill>
			<Backdrop
				warm={track(frame, [[start, inn.backdrop.warm], [s13.start, 0.75], [s15.start, 0.7], [end, out.backdrop.warm]])}
				cool={track(frame, [[start, inn.backdrop.cool], [s13.start, 0]])}
				dark={track(frame, [[start, inn.backdrop.dark], [s13.start, 0.6], [s14.start, 0.5], [end, out.backdrop.dark]])}
				warmX={lerp(inn.backdrop.warmX, wc.warmX, toWarm)}
				warmY={lerp(inn.backdrop.warmY, wc.warmY, toWarm)}
			/>
			<World frame={frame}>
				<Floor y={ROOM.floor} l={80} r={1860} opacity={1 - ramp(frame, start + 5, start + 45)} />
				<Door frame={frame} open={inn.door.open} light={inn.door.light} fog={inn.door.fog} spill={inn.door.spill} opacity={1 - ramp(frame, start + 5, start + 45)} />

				{/* 光环 */}
				{ringT > 0 && ringT < 1 ? (
					<circle cx={ROOM_CX} cy={ROOM_CY} r={300 + 2600 * EASE_OUT(ringT)} fill="none" stroke={C.amber} strokeWidth={16} opacity={0.7 * (1 - ringT)} />
				) : null}

				{/* 其他四个选项：先小而暗，第 16 屏长到一样大、一样亮 */}
				{OPTIONS.map((cx, k) => {
					const w = 680 * optScale;
					const h = 540 * optScale;
					const d = clamp(optDraw * 1.6 - k * 0.15);
					return (
						<g key={k} opacity={optVis}>
							<rect x={cx - w / 2} y={ROOM.floor - h} width={w} height={h} rx={14} fill="#17181D" opacity={0.6 * d} />
							<rect x={cx - w / 2} y={ROOM.floor - h} width={w} height={h} rx={14} fill="none" stroke={optColor} strokeWidth={6} pathLength={1} strokeDasharray="1" strokeDashoffset={1 - d} />
						</g>
					);
				})}

				<Room frame={frame} ceiling={inn.ceiling} warmth={track(frame, [[start, inn.warmth], [s13.start, 1.6], [s15.start, 1.6], [end, out.warmth]])} ceilingGlow={inn.ceilingGlow + 0.65 * Math.max(0, 1 - Math.abs(ringT) * 2)} crack={1} />

				{/* 第 11 屏的脚印与钟 */}
				<g opacity={leftovers}>
					<ellipse cx={850} cy={ROOM.floor + 2} rx={250} ry={9} fill="none" stroke={C.amber} strokeOpacity={0.3} strokeWidth={2} strokeDasharray="8 10" />
					{new Array(6).fill(0).map((_, k) => (
						<rect key={k} x={1060 - 84 * k - 4} y={ROOM.floor - 5} width={30} height={9} rx={4.5} fill={C.amber} opacity={0.82} />
					))}
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

				<Dust frame={frame} seed="choice" color={C.amber} box={{l: ROOM.left + 12, t: ceilY + 10, r: ROOM.right - 12, b: ROOM.floor - 8}} />
				<Person x={px} groundY={ROOM.floor} pose={pose} facing={pFacing} rim={{color: C.cyan, strength: 0.25 * (1 - toWarm), side: 1}} />

				{/* 人点 */}
				<g opacity={dotVis}>
					{dots.map((d, i) => (d.vis ? <circle key={i} cx={d.x} cy={d.y} r={12} fill={C.person} opacity={0.9} /> : null))}
				</g>

				{/* 1988 与论文 */}
				<g opacity={paperVis}>
					<WorldLabel frame={frame} x={1240} y={480} text="1988" size={190} color={C.grey} weight={900} opacity={paperVis} />
					{[0, 1].map((i) => (
						<g key={i} transform={`translate(${(1 - paperIn) * 260 + i * 70} ${i * -24}) rotate(${i ? 4 : -4} ${2010} ${470})`}>
							<rect x={1900} y={320} width={230} height={300} rx={8} fill="#22252D" stroke={C.grey} strokeWidth={3} />
							<rect x={1920} y={342} width={120} height={14} rx={4} fill={C.amber} opacity={0.8} />
							{new Array(9).fill(0).map((_, k) => (
								<line key={k} x1={1920} y1={384 + k * 24} x2={1920 + (k % 3 === 2 ? 120 : 190)} y2={384 + k * 24} stroke={C.grey} strokeWidth={4} strokeLinecap="round" opacity={0.6} />
							))}
						</g>
					))}
				</g>
			</World>

			{/* 房间图标连到名字 */}
			{linkDraw > 0 && frame < s13.end ? (
				<AbsoluteFill>
					<svg width={1920} height={1080}>
						<line
							x1={iconScreen.x + 6}
							y1={iconScreen.y}
							x2={lerp(iconScreen.x + 6, 600, linkDraw)}
							y2={lerp(iconScreen.y, 430, linkDraw)}
							stroke={C.amber}
							strokeWidth={2}
							opacity={0.7 * visible(frame, slam, s13.end, 6, 10)}
						/>
					</svg>
				</AbsoluteFill>
			) : null}
			<BigWord frame={frame} text={name.word} color={name.color} left={620} top={330} size={180} from={slam} to={s13.end - 2} variant="slam" impact />
			<Caption text="Status Quo Bias" left={628} top={560} size={38} opacity={visible(frame, slam + 12, s13.end - 2, 8, 10)} />
		</AbsoluteFill>
	);
};
