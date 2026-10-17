import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Boulder} from '../components/Boulder';
import {CamKey, World, cameraAt} from '../components/Camera';
import {Burst, Dust, Shockwave} from '../components/Dust';
import {Figure, POSES, joints, poseAt} from '../components/Figure';
import {Counter, InfoCard, MathSign, Meter, life} from '../components/info/Info';
import {LABELS} from '../data/script';
import {easeIn, easeOut, lerp, pulse, shake, track} from '../lib/anim';
import {COLORS, FONTS, LAYOUT} from '../theme';

const L = LABELS.s1;

// 本节全部时间点 均为全片帧号 和 script.json 的屏对齐
const T = {
	slam: 7,
	diveStart: 52,
	diveEnd: 68,
	horizonIn: 62,
	figureIn: 100,
	stepsFlash: 110,
	pops: [160, 178, 196],
	treadStart: 216,
	treadEnd: 262,
	cardsIn: 266,
	flip: 279,
	cardsOut: 300,
	pushStart: 306,
	end: 316,
};

const FIG = {x: 1690, y: 760, h: 290};
const WORD = {x: 760, y: 440, size: 340};

const figurePose = (f: number) =>
	poseAt(f, [
		[0, POSES.holdUp],
		[166, POSES.lookDown, 10],
		[204, POSES.holdUp, 10],
		[240, POSES.heavy, 14],
	]);

const stoneSize = (f: number) =>
	track(f, [
		[0, 20],
		[160, 24],
		[178, 28],
		[196, 34],
		[216, 34],
		[252, 58],
	]);

const stoneAt = (f: number) => {
	const j = joints({x: FIG.x, y: FIG.y, height: FIG.h, facing: -1, pose: figurePose(f)});
	const size = stoneSize(f);
	return {x: j.handR.x, y: j.handR.y - size * 0.8, size};
};

const PUSH_TARGET = stoneAt(T.pushStart);

const HORIZON_CAM: CamKey[] = [
	{f: T.horizonIn, x: 960, y: 540, s: 1.3},
	{f: 76, x: 960, y: 540, s: 1, dur: 14, ease: easeOut},
	{f: 96, x: 1000, y: 548, s: 1.04, dur: 18},
	{f: 116, x: 1080, y: 560, s: 1.05, dur: 14},
	{f: 134, x: 1110, y: 565, s: 1.08, dur: 18},
	{f: 152, x: 1150, y: 570, s: 1.11, dur: 18},
	{f: 172, x: 1330, y: 590, s: 1.2, dur: 16},
	{f: 232, x: 1110, y: 560, s: 1, dur: 16},
	{f: 280, x: 1000, y: 545, s: 1.02, dur: 14},
	{f: T.end, x: PUSH_TARGET.x, y: PUSH_TARGET.y, s: 18, dur: 10, ease: easeIn},
];

const WORD_CAM: CamKey[] = [
	{f: 0, x: 960, y: 540, s: 1},
	{f: T.diveStart, x: 930, y: 520, s: 1.05, dur: 40},
	{f: T.diveEnd, x: WORD.x, y: WORD.y, s: 9, dur: 16, ease: easeIn},
];

const OrderRow: React.FC<{y: number; label: string; first: string; second: string; firstColor: string; secondColor: string; appear: number}> = ({
	y,
	label,
	first,
	second,
	firstColor,
	secondColor,
	appear,
}) => (
	<div
		style={{
			position: 'absolute',
			left: LAYOUT.info.left,
			top: y,
			display: 'flex',
			alignItems: 'center',
			gap: 14,
			opacity: appear,
			transform: `translateX(${(1 - appear) * -28}px)`,
		}}
	>
		<span className="txt" style={{fontFamily: FONTS.sans, fontSize: 22, color: 'rgba(255,255,255,0.78)', width: 52}}>
			{label}
		</span>
		<span className="txt" style={{fontFamily: FONTS.serifHeavy, fontSize: 34, color: firstColor}}>
			{first}
		</span>
		<svg width={60} height={20}>
			<line x1={2} y1={10} x2={48} y2={10} stroke="rgba(255,255,255,0.7)" strokeWidth={3} strokeLinecap="round" />
			<path d="M42,3 L54,10 L42,17" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
		</svg>
		<span className="txt" style={{fontFamily: FONTS.serifHeavy, fontSize: 34, color: secondColor}}>
			{second}
		</span>
	</div>
);

const BigCard: React.FC<{text: string; kind: 'think' | 'act'; x: number; y: number; spin: number; appear: number}> = ({text, kind, x, y, spin, appear}) => (
	<div
		style={{
			position: 'absolute',
			left: x - 125,
			top: y - 125,
			width: 250,
			height: 250,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: 14,
			border: `3px solid ${kind === 'think' ? COLORS.cool : COLORS.warm}`,
			background: kind === 'think' ? 'rgba(142,201,187,0.06)' : 'rgba(224,164,88,0.16)',
			transform: `perspective(900px) rotateY(${spin}deg) scale(${lerp(appear, 0, 1, 1.3, 1)})`,
			opacity: appear,
			boxShadow: kind === 'act' ? `0 0 40px ${COLORS.warm}44` : 'none',
		}}
	>
		<span
			className="txt"
			style={{
				fontFamily: FONTS.serifHeavy,
				fontSize: 190,
				lineHeight: 1,
				color: kind === 'think' ? 'transparent' : COLORS.warm,
				WebkitTextStroke: kind === 'think' ? `4px ${COLORS.cool}` : undefined,
			}}
		>
			{text}
		</span>
	</div>
);

export const S1Trap: React.FC = () => {
	const f = useCurrentFrame();

	// 第一屏 巨字砸下 镜头从两个字之间穿过去
	const wordCam = cameraAt(f, WORD_CAM);
	const wordShake = shake(f, T.slam, 6, 14);
	const slamScale = track(f, [
		[0, 1.6],
		[T.slam, 0.97],
		[T.slam + 3, 1],
	]);
	const wordOpacity = Math.min(lerp(f, 0, 2, 0, 1), lerp(f, 58, 63, 1, 0));
	const split = lerp(f, T.diveStart, T.diveEnd, 0, 260, easeIn);
	const impactGlow = pulse(f, T.slam, 24);

	// 地平线场景
	const cam = cameraAt(f, HORIZON_CAM);
	const horizonOpacity = lerp(f, T.horizonIn, T.horizonIn + 5, 0, 1);
	const basePose = figurePose(f);
	// 站着时的呼吸 胸口和头有一点起伏
	const pose = {...basePose, torso: basePose.torso + Math.sin(f / 9) * 1.5, head: basePose.head + Math.sin(f / 9 + 1) * 2};
	const figIn = lerp(f, T.figureIn, T.figureIn + 8, 0, 1);
	const stone = stoneAt(f);
	const popK = Math.max(...T.pops.map((p) => pulse(f, p, 8)));
	const facets = f < T.pops[0] ? 6 : f < T.pops[1] ? 9 : f < T.pops[2] ? 12 : 15;
	// 穿过巨字后地面横向飞掠再落定 第 5 屏地面像跑步机一样后退
	const treadShift =
		lerp(f, T.horizonIn, 106, 0, 1500, (t) => 1 - (1 - t) * (1 - t)) + lerp(f, T.treadStart, T.treadEnd, 0, 1380, (t) => t) + f * 0.4;

	const thinkX = track(f, [
		[T.flip, 560],
		[T.flip + 10, 880],
	]);
	const actX = track(f, [
		[T.flip, 880],
		[T.flip + 10, 560],
	]);
	const arc = Math.sin(lerp(f, T.flip, T.flip + 10, 0, Math.PI, (t) => t));
	const spin = lerp(f, T.flip, T.flip + 10, 0, 360);
	const cardsAppear = life(f, T.cardsIn, T.cardsOut, 8);

	const age = f < 220 ? track(f, [[156, 12], [160, 13, (t) => (t < 1 ? 0 : 1)], [178, 14, (t) => (t < 1 ? 0 : 1)], [196, 15, (t) => (t < 1 ? 0 : 1)]]) : lerp(f, 220, 250, 15, 30, (t) => t);

	return (
		<AbsoluteFill style={{background: COLORS.bg}}>
			{/* 地平线场景 暖光 远处一条路 */}
			<AbsoluteFill style={{opacity: horizonOpacity}}>
				<AbsoluteFill
					style={{
						background: `linear-gradient(to bottom, ${COLORS.bgDeep} 0%, ${COLORS.bg} 45%, #2E261D 68%, #15120E 69%, #100E0B 100%)`,
					}}
				/>
				<World cam={cam}>
					<div
						style={{
							position: 'absolute',
							left: -400,
							top: 600,
							width: 2200,
							height: 300,
							borderRadius: '50%',
							background: `radial-gradient(ellipse at center, ${COLORS.warm}55 0%, ${COLORS.warm}11 40%, transparent 70%)`,
							opacity: lerp(f, 64, 100, 0.25, 1),
							transform: `scaleX(${lerp(f, 64, 100, 0.6, 1)})`,
						}}
					/>
					{/* 穿过巨字后 地平线从画面中间向两侧亮开 */}
					<div
						style={{
							position: 'absolute',
							left: -1200,
							top: 739,
							width: 4400,
							height: 2,
							background: `${COLORS.warm}AA`,
							boxShadow: `0 0 18px ${COLORS.warm}`,
							transform: `scaleX(${lerp(f, 64, 92, 0.05, 1)})`,
							transformOrigin: '1960px 0',
						}}
					/>
					<div style={{position: 'absolute', left: -1200, top: 741, width: 4400, height: 900, background: '#14110D'}} />
					<svg width={10} height={10} style={{position: 'absolute', overflow: 'visible'}}>
						<defs>
							<linearGradient id="road" x1="1" x2="0" y1="0" y2="0">
								<stop offset="0%" stopColor="#6B5A44" stopOpacity={0.7} />
								<stop offset="100%" stopColor="#6B5A44" stopOpacity={0} />
							</linearGradient>
						</defs>
						<polygon points={`${FIG.x + 40},${FIG.y - 4} ${FIG.x + 40},${FIG.y + 12} 120,${FIG.y + 4} 120,${FIG.y - 2}`} fill="url(#road)" />
						{/* 第 3 屏 一道光从脚下沿路扫向远处 路很长 人没动 */}
						{f > 116 && f < 156 ? (
							<rect
								x={lerp(f, 116, 154, FIG.x - 60, 140, (t) => t)}
								y={FIG.y - 5}
								width={180}
								height={16}
								rx={8}
								fill={COLORS.warm}
								opacity={0.55 * Math.sin(lerp(f, 116, 154, 0, Math.PI, (t) => t))}
								style={{filter: 'blur(4px)'}}
							/>
						) : null}
						{Array.from({length: 40}, (_, i) => {
							const x = ((i * 120 + treadShift) % 4800) - 1600;
							return <rect key={i} x={x} y={800 + (i % 3) * 26} width={46 + (i % 4) * 14} height={3} fill="#5A4936" opacity={0.95} />;
						})}
					</svg>
					<Dust frame={f} seed={11} count={50} />
					<Figure
						x={FIG.x}
						y={FIG.y + (1 - figIn) * 20}
						height={FIG.h}
						facing={-1}
						lightFrom={-1}
						pose={pose}
						color={COLORS.ink}
						rimAmount={figIn}
						opacity={figIn}
					/>
					<Boulder
						x={stone.x}
						y={stone.y}
						size={stone.size * (1 + popK * 0.25)}
						facets={facets}
						rotation={f * (f > 154 && f < 216 ? 1.6 : 0.4)}
						glow={0.55 + popK * 0.4 + lerp(f, 160, 200, 0, 0.25) + Math.max(pulse(f, 126, 12), pulse(f, 140, 12)) * 0.5}
						crack={lerp(f, 196, 204, 0, 0.8)}
						opacity={figIn}
						seed={7}
					/>
					<BigCard text={L.think} kind="think" x={thinkX} y={420 - arc * 70} spin={spin} appear={cardsAppear} />
					<BigCard text={L.act} kind="act" x={actX} y={420 + arc * 70} spin={-spin} appear={cardsAppear} />
				</World>
			</AbsoluteFill>

			{/* 开场巨字 看透 */}
			{f < 64 ? (
				// 巨字层向右渐隐 穿越时笔画也进不了右侧禁字区
				<AbsoluteFill
					style={{
						opacity: wordOpacity,
						maskImage: `linear-gradient(to right, #000 0px, #000 ${LAYOUT.noTextX - 180}px, transparent ${LAYOUT.noTextX - 20}px)`,
						WebkitMaskImage: `linear-gradient(to right, #000 0px, #000 ${LAYOUT.noTextX - 180}px, transparent ${LAYOUT.noTextX - 20}px)`,
					}}
				>
					<World cam={wordCam} offset={wordShake}>
						<div
							style={{
								position: 'absolute',
								left: WORD.x - 700,
								top: WORD.y - 420,
								width: 1400,
								height: 840,
								borderRadius: '50%',
								background: `radial-gradient(ellipse at center, ${COLORS.warm}${Math.round((0.18 + impactGlow * 0.5) * 255)
									.toString(16)
									.padStart(2, '0')} 0%, transparent 65%)`,
							}}
						/>
						{L.bigWord.map((ch, i) => (
							<div
								key={ch}
								className="txt"
								style={{
									position: 'absolute',
									left: WORD.x + (i === 0 ? -200 : 200) - WORD.size / 2 + (i === 0 ? -split : split),
									top: WORD.y - WORD.size / 2 - 20,
									width: WORD.size,
									textAlign: 'center',
									fontFamily: FONTS.serifHeavy,
									fontSize: WORD.size,
									lineHeight: 1,
									color: COLORS.paper,
									transform: `scale(${slamScale})`,
									// 两个字都以字对中心为缩放原点 砸下时一起收拢
									transformOrigin: `${((WORD.size / 2 - (i === 0 ? -200 : 200)) / WORD.size) * 100}% 50%`,
									textShadow: `0 0 40px ${COLORS.warm}55`,
								}}
							>
								{ch}
							</div>
						))}
						<Shockwave frame={f} at={T.slam} x={WORD.x} y={WORD.y + 170} />
						<Burst frame={f} at={T.slam} x={WORD.x} y={WORD.y + 170} />
					</World>
				</AbsoluteFill>
			) : null}

			{/* 左侧信息层 */}
			<AbsoluteFill>
				<InfoCard y={220} text={L.formula[0]} appear={life(f, 70, 302)} />
				<MathSign y={297} kind="eq" appear={life(f, 76, 302)} />
				<InfoCard y={314} text={L.formula[1]} color={COLORS.cool} appear={life(f, 82, 302)} />
				<MathSign y={391} kind="mul" appear={life(f, 88, 302)} />
				<InfoCard y={408} text={L.formula[2]} color={COLORS.warm} appear={life(f, 94, 302)} />
				<Counter
					y={500}
					prefix={L.stepsPrefix}
					suffix={L.stepsSuffix}
					value={0}
					color={COLORS.warm}
					appear={life(f, 104, 262)}
					flash={pulse(f, T.stepsFlash, 10)}
				/>
				<Counter y={580} prefix={L.age} value={age} color={COLORS.warm} appear={life(f, 156, 266)} flash={Math.max(popK, pulse(f, 250, 10))} />
				<Meter y={668} label={L.exp} value={lerp(f, 222, 228, 0, 5)} color={COLORS.warm} appear={life(f, 222, 266)} shake={pulse(f, 240, 10)} />
				<OrderRow y={520} label={L.orderEarly} first={L.think} second={L.act} firstColor={COLORS.cool} secondColor={COLORS.warm} appear={life(f, 270, 304)} />
				<OrderRow y={600} label={L.orderLate} first={L.act} second={L.think} firstColor={COLORS.warm} secondColor={COLORS.cool} appear={life(f, 290, 304)} />
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
