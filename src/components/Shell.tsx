/**
 * 贯穿全片的物件：「壳与心跳」
 * - 本体：墨灰描边的圆（一个人）
 * - 防御环：若干层带缺口的同心环，可弹出、加厚、变不透明、炸开、收紧
 * - 心跳：中心朱红小点，随节拍轨跳动并发光
 * 所有尺寸均为世界坐标，由摄像机统一缩放。
 */
import React, {useId} from 'react';
import {C} from '../theme';
import {clamp, lerp, rand} from '../lib/anim';

export type ShellProps = {
	x: number;
	y: number;
	/** 本体半径 */
	r: number;
	/** 环的数量（可为小数；第 i 层的出现进度 = clamp(rings - i)） */
	rings?: number;
	/** 环半径基准（默认等于 r） */
	ringBase?: number;
	/** 环整体扩张倍数（标题处炸开用） */
	spread?: number;
	/** 环线宽（相对 r 的比例） */
	ringWidth?: number;
	ringOpacity?: number;
	/** 环的旋转角（度），各层速度不同 */
	ringRot?: number;
	/** 环的缺口角度（度），0 表示闭合 */
	gapDeg?: number;
	/** 环紧缩：0 正常，1 全部贴到本体上 */
	tighten?: number;
	/** 心跳强度（pulseAt） */
	beat?: number;
	coreR?: number;
	coreGlow?: number;
	coreOpacity?: number;
	bodyOpacity?: number;
	/** 本体描边变虚线 0..1 */
	bodyDash?: number;
	bodyFill?: string;
	/** 纵向挤压（被重物压时） */
	squash?: number;
	/** 结霜：最外层环外的短线，0..1 */
	frost?: number;
	/** 整体透明度 */
	opacity?: number;
	/** 本体描边宽（相对 r 的比例） */
	bodyStroke?: number;
	/** 本体是否实心墨色（妈妈等配角复用） */
	solid?: boolean;
};

export const Shell: React.FC<ShellProps> = ({
	x,
	y,
	r,
	rings = 0,
	ringBase,
	spread = 1,
	ringWidth = 0.045,
	ringOpacity = 0.55,
	ringRot = 0,
	gapDeg = 26,
	tighten = 0,
	beat = 0,
	coreR,
	coreGlow = 0.6,
	coreOpacity = 1,
	bodyOpacity = 1,
	bodyDash = 0,
	bodyFill = C.paper,
	squash = 1,
	frost = 0,
	opacity = 1,
	bodyStroke = 0.05,
	solid = false,
}) => {
	const id = useId().replace(/:/g, '');
	const base = ringBase ?? r;
	const cr = coreR ?? r * 0.2;
	const n = Math.ceil(rings);
	const ringEls: React.ReactNode[] = [];
	let outer = r;
	for (let i = 0; i < n; i++) {
		const appear = clamp(rings - i);
		if (appear <= 0) continue;
		const nominal = base * (1.27 + 0.23 * i) * spread;
		const tight = lerp(nominal, r * (1.06 + 0.07 * i), tighten);
		const rr = tight * lerp(1.35, 1, appear);
		outer = Math.max(outer, rr);
		const circ = 2 * Math.PI * rr;
		const gaps = i % 2 === 0 ? 1 : 2;
		const gapLen = (gapDeg / 360) * circ;
		const seg = circ / gaps - gapLen;
		const w = Math.max(1.2, base * ringWidth * (1 - i * 0.12));
		const rot = ringRot * (i % 2 === 0 ? 1 : -0.7) * (1 + i * 0.35) + i * 67;
		ringEls.push(
			<circle
				key={i}
				cx={0}
				cy={0}
				r={rr}
				fill="none"
				stroke={C.ink}
				strokeWidth={w}
				strokeLinecap="round"
				strokeDasharray={gapDeg > 0.5 ? `${seg} ${gapLen}` : undefined}
				transform={`rotate(${rot})`}
				opacity={ringOpacity * appear * (1 - i * 0.12)}
			/>
		);
	}

	const frostEls: React.ReactNode[] = [];
	if (frost > 0.01) {
		const N = 36;
		for (let i = 0; i < N; i++) {
			const a = (i / N) * Math.PI * 2 + rand(i) * 0.1;
			const len = (6 + rand(i + 7) * 12) * (base / 110) * frost;
			const r0 = outer + 8 * (base / 110);
			frostEls.push(
				<line
					key={i}
					x1={Math.cos(a) * r0}
					y1={Math.sin(a) * r0}
					x2={Math.cos(a) * (r0 + len)}
					y2={Math.sin(a) * (r0 + len)}
					stroke={C.inkSoft}
					strokeWidth={Math.max(1, base * 0.018)}
					strokeLinecap="round"
					opacity={frost * (0.5 + 0.5 * rand(i + 3))}
				/>
			);
		}
	}

	const bodyCirc = 2 * Math.PI * r;
	const dashOn = lerp(bodyCirc, bodyCirc / 40, bodyDash);
	const dashOff = lerp(0, bodyCirc / 60, bodyDash);
	const b = clamp(beat, 0, 1.2);

	return (
		<g transform={`translate(${x} ${y}) scale(1 ${squash})`} opacity={opacity}>
			<defs>
				<radialGradient id={`glow-${id}`}>
					<stop offset="0%" stopColor={C.red} stopOpacity={0.55} />
					<stop offset="45%" stopColor={C.red} stopOpacity={0.16} />
					<stop offset="100%" stopColor={C.red} stopOpacity={0} />
				</radialGradient>
			</defs>
			{ringEls}
			{frostEls}
			<circle
				r={r}
				fill={solid ? C.ink : bodyFill}
				stroke={C.ink}
				strokeWidth={Math.max(1.5, r * bodyStroke)}
				strokeDasharray={bodyDash > 0.01 ? `${dashOn} ${dashOff}` : undefined}
				opacity={bodyOpacity}
			/>
			{!solid && (
				<>
					<circle
						r={cr * (2.6 + coreGlow * 3.2) * (1 + 0.45 * b)}
						fill={`url(#glow-${id})`}
						opacity={coreOpacity * clamp(coreGlow * (0.55 + 0.6 * b), 0, 1)}
					/>
					<circle r={cr * (1 + 0.32 * b)} fill={C.red} opacity={coreOpacity} />
				</>
			)}
		</g>
	);
};

/** 环形外轮廓半径（用于构图避让） */
export const shellOuter = (r: number, rings: number, spread = 1, ringBase?: number) =>
	rings <= 0 ? r : (ringBase ?? r) * (1.27 + 0.23 * (Math.ceil(rings) - 1)) * spread;
