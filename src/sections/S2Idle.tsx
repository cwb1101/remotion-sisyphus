import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Boulder} from '../components/Boulder';
import {CamKey, World, cameraAt, toScreen} from '../components/Camera';
import {Burst, Dust, Shockwave} from '../components/Dust';
import {Counter, Gauge, KolbRing, MathSign, Meter, life} from '../components/info/Info';
import {layoutSubtitle} from '../components/Subtitle';
import {LABELS, screenById} from '../data/script';
import {easeIn, easeOut, lerp, pulse, rand, shake, track} from '../lib/anim';
import {COLORS, FONTS, LAYOUT} from '../theme';

const L = LABELS.s2;

// 全片帧号 与 script.json 第 7 到 14 屏对齐
const T = {
	start: 316,
	circuit: 320,
	pipe: 366,
	overheat: 412,
	formula: 482,
	zero: 544,
	slam: 552,
	collapse: 556,
	zeroOut: 562,
	zeroBack: 572,
	zeroLand: 580,
	shatter: 604,
	kolbIn: 610,
	kolbStage: 664,
	stack: 736,
	drop: 762,
	land: 774,
};

const ZERO = {x: 900, y: 450};
const GROUND_Y = 742;

const CAM: CamKey[] = [
	{f: T.start, x: 760, y: 470, s: 3.4},
	{f: T.start + 8, x: 900, y: 520, s: 1, dur: 8, ease: easeOut},
	{f: 344, x: 860, y: 505, s: 1.05, dur: 18},
	{f: 362, x: 840, y: 495, s: 1.08, dur: 18},
	{f: 380, x: 1000, y: 500, s: 1, dur: 14},
	{f: 428, x: 880, y: 480, s: 1.12, dur: 16},
	{f: 498, x: 960, y: 540, s: 1, dur: 16},
	{f: 618, x: 960, y: 560, s: 0.92, dur: 16},
	{f: 680, x: 960, y: 540, s: 1, dur: 16},
	{f: 742, x: 960, y: 520, s: 1.02, dur: 14},
];

const STACK_CHARS = 12;

const stoneTrack = (f: number) => {
	const arrived = Math.max(0, Math.min(STACK_CHARS, Math.floor((f - T.stack - 10) / 2) + 1));
	const x = track(f, [
		[T.start, 760],
		[T.formula, 760],
		[498, 1500],
		[606, 1500],
		[622, 820],
		[T.kolbStage, 820],
		[680, 1450],
		[726, 1450],
		[742, 800],
	]);
	const y =
		track(f, [
			[T.start, 470],
			[T.formula, 470],
			[498, 480],
			[606, 480],
			[622, 430],
			[T.kolbStage, 430],
			[680, 470],
			[726, 470],
			[742, 400],
			[T.drop, 400],
			[T.land, 470, easeIn],
		]) +
		track(f, [
			[630, 0],
			[636, 44, easeIn],
			[650, 0],
		]) +
		(f > 606 && f < 664 ? Math.sin(f / 7) * 8 : 0);
	const size =
		track(f, [
			[T.start, 290],
			[T.formula, 290],
			[498, 200],
			[606, 200],
			[622, 260],
			[T.kolbStage, 260],
			[680, 180],
			[726, 180],
			[742, 240],
		]) + (f >= T.stack ? arrived * 5 : 0);
	return {x, y, size, arrived: f >= T.stack ? arrived : 0};
};

// 电路光点的流动相位 第 9 屏开始加速空转
const phaseAt = (f: number) => {
	const base = 0.012 * (f - T.start);
	const ramp = Math.max(0, Math.min(f, 440) - T.overheat);
	const fast = Math.max(0, f - 440);
	return base + (0.048 * ramp * ramp) / 56 + 0.048 * fast * (f < 498 ? 1 : 0.2);
};

const BigCard: React.FC<{x: number; y: number; label: string; value: number; color: string; scale: number; opacity: number}> = ({
	x,
	y,
	label,
	value,
	color,
	scale,
	opacity,
}) => (
	<div
		style={{
			position: 'absolute',
			left: x - 150,
			top: y - 150,
			width: 300,
			height: 300,
			borderRadius: 18,
			border: `3px solid ${color}`,
			background: 'rgba(20,19,15,0.72)',
			display: 'flex',
			flexDirection: 'column',
			alignItems: 'center',
			justifyContent: 'center',
			transform: `scale(${scale})`,
			opacity,
			boxShadow: `0 0 50px ${color}33`,
		}}
	>
		<span className="txt" style={{fontFamily: FONTS.sansHeavy, fontSize: 40, color: COLORS.text, letterSpacing: 8}}>
			{label}
		</span>
		<span className="txt" style={{fontFamily: FONTS.smiley, fontSize: 150, lineHeight: 1.05, color}}>
			{Math.round(value)}
		</span>
	</div>
);

export const S2Idle: React.FC = () => {
	const f = useCurrentFrame();
	const cam = cameraAt(f, CAM);
	const impact = shake(f, T.slam, 7, 16);
	const landShake = shake(f, T.land, 6, 9);
	const offset = {x: impact.x + landShake.x, y: impact.y + landShake.y};
	const stone = stoneTrack(f);
	const squash = 1 - pulse(f, T.land, 10) * 0.14;
	const heat = track(f, [
		[T.overheat, 0],
		[440, 1],
		[T.formula, 1],
		[498, 0.25],
		[T.drop, 0.25],
		[T.land, 0],
	]);

	// 第 10 11 屏 公式卡片 乘号砸下 坍缩成 0
	const formulaIn = (at: number) => life(f, at, T.collapse + 4, 8);
	const cogScale = track(f, [
		[T.slam, 1],
		[T.collapse + 2, 1.8],
		[T.zeroOut, 0.2, easeIn],
	]);
	const expScale = track(f, [
		[T.slam, 1],
		[T.collapse, 0.05],
	]);
	const cogX = track(f, [
		[T.slam, 560],
		[T.collapse + 2, 620],
		[T.zeroOut, ZERO.x, easeIn],
	]);
	const mulY = track(f, [
		[546, 450],
		[549, 250],
		[T.slam, 450, easeIn],
	]);
	const expValue = track(f, [
		[T.zero, 5],
		[T.zero + 6, 0],
	]);
	const zeroAppear = lerp(f, T.collapse, T.collapse + 6, 0, 1);
	const zeroScale = track(f, [
		[T.collapse, 0.2],
		[T.collapse + 6, 1.08],
		[T.collapse + 9, 1],
	]);
	const zeroY =
		track(f, [
			[T.zeroOut, ZERO.y],
			[T.zeroOut + 8, -560, easeIn],
			[T.zeroBack, -560],
			[T.zeroLand, ZERO.y, easeIn],
		]) -
		Math.abs(Math.sin(lerp(f, T.zeroLand, T.zeroLand + 14, 0, Math.PI * 2, (t) => t))) *
			lerp(f, T.zeroLand, T.zeroLand + 14, 70, 0, (t) => t);
	const zeroOpacity = Math.min(zeroAppear, lerp(f, T.shatter, T.shatter + 4, 1, 0));
	const zeroSquash = 1 - pulse(f, T.zeroLand, 6) * 0.18;

	// 第 13 屏 学习圈从信息层移到舞台中央
	const kolbK = lerp(f, T.kolbStage, T.kolbStage + 14, 0, 1);
	const kolbOut = lerp(f, 726, 734, 1, 0);
	const kolb = {
		cx: 205 + (620 - 205) * kolbK,
		cy: 620 + (450 - 620) * kolbK,
		r: 80 + (230 - 80) * kolbK,
		labelSize: 20 + 18 * kolbK,
	};
	const dotAngle =
		Math.PI / 2 +
		track(f, [
			[680, 0],
			[696, 0.62 * (Math.PI / 2)],
			[702, 0.62 * (Math.PI / 2)],
			[714, 0],
		]) +
		(f > 696 && f < 702 ? Math.sin(f * 3) * 0.04 : 0);

	// 第 14 屏 字幕里的字飞进石头 变成岩层
	const ghosts = layoutSubtitle(screenById(14)).slice(0, STACK_CHARS);
	const stoneScreen = toScreen({x: stone.x, y: stone.y}, cam);

	const groundIn = lerp(f, T.drop - 2, T.drop + 4, 0, 1);

	return (
		<AbsoluteFill style={{background: COLORS.bgDeep}}>
			<World cam={cam} offset={offset}>
				<div
					style={{
						position: 'absolute',
						left: stone.x - 900,
						top: stone.y - 700,
						width: 1800,
						height: 1400,
						borderRadius: '50%',
						background: `radial-gradient(ellipse at center, ${COLORS.cool}30 0%, ${COLORS.cool}0C 35%, transparent 65%)`,
					}}
				/>
				<Dust frame={f} seed={23} count={56} color={COLORS.cool} opacity={0.7} />
				{/* 第 8 屏 经验输入管 只有零星光点 */}
				<svg width={10} height={10} style={{position: 'absolute', overflow: 'visible', opacity: life(f, T.pipe, T.formula, 8)}}>
					<path
						id="pipe"
						d="M2100,240 C1700,220 1350,420 1020,436"
						fill="none"
						stroke={`${COLORS.warm}55`}
						strokeWidth={16}
						strokeLinecap="round"
						pathLength={1}
						strokeDasharray={1}
						strokeDashoffset={1 - lerp(f, T.pipe, T.pipe + 8, 0, 1)}
					/>
					<path d="M2100,240 C1700,220 1350,420 1020,436" fill="none" stroke="#1A1713" strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - lerp(f, T.pipe, T.pipe + 8, 0, 1)} />
					{[0, 1, 2].map((i) => {
						const p = (((f - T.pipe - 8) * 0.007 + i * 0.37) % 1 + 1) % 1;
						const show = f > T.pipe + 8 && f < T.overheat + 4 ? 1 : 0;
						const bx = (1 - p) ** 3 * 2100 + 3 * (1 - p) ** 2 * p * 1700 + 3 * (1 - p) * p * p * 1350 + p ** 3 * 1020;
						const by = (1 - p) ** 3 * 240 + 3 * (1 - p) ** 2 * p * 220 + 3 * (1 - p) * p * p * 420 + p ** 3 * 436;
						return <circle key={i} cx={bx} cy={by} r={6} fill="#FFE2B0" opacity={show * 0.9} style={{filter: `drop-shadow(0 0 8px ${COLORS.warm})`}} />;
					})}
				</svg>
				{/* 过热时冒出的热气 */}
				<svg width={10} height={10} style={{position: 'absolute', overflow: 'visible', opacity: heat}}>
					{Array.from({length: 26}, (_, i) => {
						const t = ((f * (0.02 + rand(i) * 0.02) + rand(i * 3)) % 1 + 1) % 1;
						const px = stone.x + (rand(i * 5) - 0.5) * stone.size * 1.4 + Math.sin(f / 6 + i) * 10;
						const py = stone.y - stone.size * 0.7 - t * 260;
						return <circle key={i} cx={px} cy={py} r={2 + rand(i * 7) * 3} fill={COLORS.cool} opacity={(1 - t) * 0.8} />;
					})}
				</svg>
				{/* 第 12 屏 悬空 没有落脚的地方 碎屑往下掉 */}
				<svg width={10} height={10} style={{position: 'absolute', overflow: 'visible', opacity: life(f, 606, 664, 8)}}>
					{Array.from({length: 18}, (_, i) => {
						const t = (((f - 606) * 0.025 + rand(i * 9)) % 1 + 1) % 1;
						return (
							<rect
								key={i}
								x={stone.x + (rand(i) - 0.5) * stone.size}
								y={stone.y + stone.size * 0.8 + t * 420}
								width={4}
								height={4}
								fill="#8A7B66"
								opacity={(1 - t) * 0.8}
								transform={`rotate(${f * 4 + i * 30} ${stone.x} ${stone.y})`}
							/>
						);
					})}
				</svg>
				{/* 第 14 屏 落地的地面 */}
				<div style={{position: 'absolute', left: -800, top: GROUND_Y, width: 3600, height: 2, background: `${COLORS.warm}99`, opacity: groundIn, boxShadow: `0 0 16px ${COLORS.warm}`}} />
				<div style={{position: 'absolute', left: -800, top: GROUND_Y + 2, width: 3600, height: 600, background: '#100E0B', opacity: groundIn}} />
				<Boulder
					x={stone.x}
					y={stone.y}
					size={stone.size * (1 + pulse(f, T.shatter + 12, 8) * 0.06)}
					seed={7}
					facets={15}
					rotation={Math.sin(f / 40) * 6}
					glow={0.25 + pulse(f, T.shatter + 12, 12) * 0.6 + stone.arrived * 0.03}
					crack={0.7}
					circuit={lerp(f, T.circuit, T.circuit + 12, 0, 1)}
					circuitPhase={phaseAt(f)}
					heat={heat}
					strata={stone.arrived}
					squash={squash}
					coolLight={0.7}
				/>
				{/* 碎片吸回石头 */}
				<svg width={10} height={10} style={{position: 'absolute', overflow: 'visible'}}>
					{f >= T.shatter && f < T.shatter + 16
						? Array.from({length: 22}, (_, i) => {
								const delay = rand(i) * 4;
								const t = lerp(f, T.shatter + delay, T.shatter + delay + 10, 0, 1, easeIn);
								const sx = ZERO.x + (rand(i * 3) - 0.5) * 300;
								const sy = ZERO.y + (rand(i * 5) - 0.5) * 380;
								const px = sx + (stone.x - sx) * t;
								const py = sy + (stone.y - sy) * t - Math.sin(t * Math.PI) * 80;
								return (
									<polygon
										key={i}
										points="0,-12 10,8 -10,8"
										transform={`translate(${px} ${py}) rotate(${f * 12 + i * 40}) scale(${1 - t * 0.6})`}
										fill={i % 2 ? COLORS.warm : '#6A5F51'}
										opacity={1 - t * 0.5}
									/>
								);
							})
						: null}
				</svg>
				<Burst frame={f} at={T.land} x={stone.x} y={GROUND_Y} spread={1.3} />
				<Shockwave frame={f} at={T.land} x={stone.x} y={GROUND_Y - 10} size={700} flat={0.16} color="#B8A58A" />

				{/* 第 10 11 屏 公式卡片 */}
				<BigCard x={cogX} y={450} label={L.cognition} value={95} color={COLORS.cool} scale={cogScale} opacity={formulaIn(484)} />
				<div style={{position: 'absolute', left: 0, top: 0, opacity: formulaIn(490)}}>
					<MathSign x={820} y={mulY} kind="mul" appear={1} size={110 * (1 + pulse(f, T.slam, 8) * 0.4)} color={COLORS.text} />
				</div>
				<BigCard x={1080} y={450} label={L.exp} value={expValue} color={COLORS.warm} scale={expScale} opacity={formulaIn(496)} />
				<Shockwave frame={f} at={T.slam} x={820} y={600} size={1300} flat={0.16} />
				<div
					style={{
						position: 'absolute',
						left: ZERO.x - 400,
						top: ZERO.y - 360,
						width: 800,
						height: 720,
						borderRadius: '50%',
						background: `radial-gradient(ellipse at center, ${COLORS.warm}${Math.round(pulse(f, T.slam, 26) * 120).toString(16).padStart(2, '0')} 0%, transparent 65%)`,
					}}
				/>
				{zeroOpacity > 0 ? (
					<div
						className="txt"
						style={{
							position: 'absolute',
							left: ZERO.x - 300,
							top: zeroY - 300,
							width: 600,
							height: 600,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							fontFamily: FONTS.serifHeavy,
							fontSize: 520,
							lineHeight: 1,
							color: COLORS.warm,
							opacity: zeroOpacity,
							transform: `scale(${zeroScale}) scaleY(${zeroSquash})`,
							transformOrigin: '50% 85%',
							textShadow: `0 0 60px ${COLORS.warm}77`,
						}}
					>
						0
					</div>
				) : null}
			</World>

			{/* 第 13 屏的学习圈 从信息层放大到舞台 */}
			<KolbRing
				cx={kolb.cx}
				cy={kolb.cy}
				r={kolb.r}
				labels={L.kolb}
				lit={[0, 0, 1, 0]}
				appear={Math.min(life(f, T.kolbIn, Infinity, 8), kolbOut)}
				labelSize={kolb.labelSize}
				dot={{angle: dotAngle, color: COLORS.cool, opacity: lerp(f, 676, 680, 0, 1) * kolbOut}}
			/>

			{/* 第 14 屏 字飞向石头 */}
			{ghosts.map((g, i) => {
				const at = T.stack + i * 2;
				if (f < at || f > at + 12) return null;
				const t = lerp(f, at, at + 11, 0, 1, easeIn);
				const tx = stoneScreen.x + (rand(i * 3) - 0.5) * stone.size * 0.8;
				const ty = stoneScreen.y + (rand(i * 5) - 0.5) * stone.size * 0.6;
				const x = g.x + (tx - g.x) * t;
				const y = g.y + (ty - g.y) * t - Math.sin(t * Math.PI) * 160;
				return (
					<div
						key={i}
						className="txt"
						style={{
							position: 'absolute',
							left: x - 40,
							top: y - 40,
							width: 80,
							height: 80,
							textAlign: 'center',
							lineHeight: '80px',
							fontFamily: FONTS.sans,
							fontSize: 64,
							color: t > 0.5 ? '#C9B79E' : COLORS.text,
							transform: `scale(${1 - t * 0.55}) rotate(${t * 40 * (i % 2 ? 1 : -1)}deg)`,
							opacity: 1 - Math.max(0, t - 0.85) * 6,
						}}
					>
						{g.char}
					</div>
				);
			})}

			{/* 左侧信息层 */}
			<AbsoluteFill>
				<Meter y={220} label={L.cognition} value={lerp(f, 322, 332, 0, 95)} color={COLORS.cool} appear={life(f, 322, 602)} />
				<Meter y={290} label={L.exp} value={f < T.zero ? lerp(f, 372, 378, 0, 5) : expValue} color={COLORS.warm} appear={life(f, 370, 602)} shake={pulse(f, 400, 10)} />
				<div style={{position: 'absolute', left: 0, top: 0, opacity: life(f, 416, T.formula)}}>
					<Gauge x={LAYOUT.info.left - 6} y={384} label={L.load} value={lerp(f, 416, 430, 0, 100)} color={COLORS.cool} appear={1} />
					<Gauge x={LAYOUT.info.left + 150} y={384} label={L.input} value={Math.abs(Math.sin(f / 3)) * 2} color={COLORS.warm} appear={1} />
				</div>
				<Meter y={400} label={L.sum} value={lerp(f, 500, 508, 0, 100)} color={COLORS.cool} appear={life(f, 500, 602)} />
				<Meter
					y={470}
					label={L.mul}
					value={f < T.slam ? lerp(f, 506, 514, 0, 5) : lerp(f, T.slam, T.slam + 4, 5, 0)}
					valuePrefix={f < T.slam ? L.about : undefined}
					color={COLORS.warm}
					appear={life(f, 506, 602)}
					shake={pulse(f, T.slam, 12)}
				/>
				<Counter y={220} prefix={L.tries} value={0} color={COLORS.warm} appear={life(f, 668, 726)} flash={pulse(f, 698, 10)} />
				<Counter y={220} prefix={L.layers} value={stone.arrived} color={COLORS.warm} appear={life(f, 732, Infinity)} flash={pulse(f, T.stack + 10 + Math.max(0, stone.arrived - 1) * 2, 6)} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
