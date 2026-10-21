import React from 'react';
import {WorldSvg} from '../camera/Camera';
import {Glow} from '../components/Glow';
import {LightNode} from '../components/LightNode';
import {OrbitArc} from '../components/Orbit';
import {type Ellipse, ellipsePoint, type Pt, TAU} from '../components/geometry';
import {glow, mixHex, palette} from '../theme';

export type Scar = {theta: number; width: number; amount: number};

export type OrbitBeingProps = {
	e: Ellipse;
	/** 轨道描出进度 0–1（从 drawFrom 开始，参数角递减方向） */
	draw?: number;
	drawFrom?: number;
	/** 发光强度（亮 = 稳定 / 虚假的安心；暗 = 消耗） */
	strength?: number;
	/** 0 = 主金色，1 = 暗金 */
	dim?: number;
	/** 远景：去掉外层光晕、降低透明度 */
	far?: number;
	opacity?: number;
	/** 被“刮”过的伤痕：那一段线变乱、变暗 */
	scars?: Scar[];
	/** 整体线条混乱度（世界单位的抖动幅度） */
	roughness?: number;
	/** 光点（你）：位置由小节决定 */
	dot?: {p: Pt; scale?: number; brightness?: number; tail?: number; theta?: number} | null;
	/** 预先画好的下一圈（虚线） */
	prediction?: {from: number; to: number; opacity: number} | null;
	/** 已走过、被点亮的轨迹 */
	trail?: {from: number; to: number; opacity: number} | null;
	/** 轨道上的刻度节点 */
	ticks?: {theta: number; lit: number}[];
	/** 外围一圈柔光（确定性的包裹） */
	halo?: {expand: number; opacity: number} | null;
	/** 并行的多股线（被维护得越来越粗） */
	strands?: number;
};

/**
 * 贯穿全片的物件：一条透视椭圆轨道 + 绕着它走的光点
 * 轨道 = 现状，光点 = 你；各节通过 props 让它长大、变形、变亮、变暗
 */
export const OrbitBeing: React.FC<OrbitBeingProps> = ({
	e,
	draw = 1,
	drawFrom = -Math.PI / 2,
	strength = 1,
	dim = 0,
	far = 0,
	opacity = 1,
	scars = [],
	roughness = 0,
	dot,
	prediction,
	trail,
	ticks = [],
	halo,
	strands = 1,
}) => {
	const color = mixHex(palette.gold, palette.goldDim, Math.max(dim, far));
	const lineOpacity = opacity * (1 - far * (1 - glow.far.opacity));
	const activeScars = scars.filter((s) => s.amount > 0.001);

	const arcs: React.ReactNode[] = [];
	if (draw < 1 || activeScars.length === 0) {
		for (let k = 0; k < strands; k++) {
			const off = (k - (strands - 1) / 2) * 5;
			arcs.push(
				<OrbitArc
					key={`a${k}`}
					e={{...e, rx: e.rx + off, ry: e.ry + off * (e.ry / Math.max(1, e.rx))}}
					from={drawFrom}
					to={drawFrom - TAU * Math.min(1, draw)}
					color={color}
					jitter={roughness}
					seed={k + 1}
					opacity={k === 0 ? 1 : 0.55}
				/>,
			);
		}
	} else {
		// 伤痕把轨道切成“正常段”和“伤痕段”
		const s = activeScars[0];
		const w = s.width;
		arcs.push(
			<OrbitArc key="main" e={e} from={s.theta + w} to={s.theta - w + TAU} color={color} jitter={roughness} seed={1} />,
			<OrbitArc
				key="scar"
				e={e}
				from={s.theta - w}
				to={s.theta + w}
				color={mixHex(palette.gold, palette.goldDim, 0.4 + 0.6 * s.amount)}
				jitter={roughness + 7 * s.amount}
				seed={7}
				opacity={1 - 0.35 * s.amount}
			/>,
			<OrbitArc key="scar2" e={e} from={s.theta - w * 0.8} to={s.theta + w * 0.7} color={palette.goldDim} jitter={10 * s.amount} seed={13} width={1} opacity={0.6 * s.amount} />,
		);
	}

	return (
		<>
			<Glow strength={strength * (1 - 0.85 * far)} outer={far < 0.98} opacity={lineOpacity} phase={0.4}>
				<WorldSvg>
					{halo && halo.opacity > 0.001 ? (
						<>
							<OrbitArc
								e={{...e, rx: e.rx + halo.expand, ry: e.ry + halo.expand * 0.55}}
								from={0}
								to={TAU}
								width={6}
								color={palette.goldDim}
								opacity={halo.opacity * 0.45}
							/>
							<OrbitArc
								e={{...e, rx: e.rx + halo.expand * 0.6, ry: e.ry + halo.expand * 0.33}}
								from={0}
								to={TAU}
								width={1}
								color={palette.gold}
								opacity={halo.opacity * 0.6}
							/>
						</>
					) : null}
					{arcs}
					{prediction && prediction.opacity > 0.001 ? (
						<OrbitArc e={{...e, rx: e.rx + 14, ry: e.ry + 14 * (e.ry / e.rx)}} from={prediction.from} to={prediction.to} color={palette.goldDim} width={1.4} dash={[0.012, 0.01]} opacity={prediction.opacity} />
					) : null}
					{trail && trail.opacity > 0.001 ? (
						<OrbitArc e={e} from={trail.from} to={trail.to} color={palette.goldHi} width={2} opacity={trail.opacity} />
					) : null}
					{ticks.map((t, i) => {
						const p = ellipsePoint(e, t.theta);
						return <LightNode key={i} x={p.x} y={p.y} r={3} brightness={0.35 + 0.65 * t.lit} scale={0.8 + 0.4 * t.lit} />;
					})}
				</WorldSvg>
			</Glow>
			{dot ? (
				<Glow strength={1.15 * (dot.brightness ?? 1)} phase={1.3} opacity={opacity}>
					<WorldSvg>
						{dot.tail && dot.theta !== undefined ? (
							<>
								{[0, 1, 2, 3, 4].map((i) => (
									<OrbitArc
										key={i}
										e={e}
										from={dot.theta! + (dot.tail! * i) / 5}
										to={dot.theta! + (dot.tail! * (i + 1)) / 5}
										color={palette.goldHi}
										width={2.2 - i * 0.35}
										opacity={(1 - i / 5) * 0.75 * (dot.brightness ?? 1)}
									/>
								))}
							</>
						) : null}
						<LightNode x={dot.p.x} y={dot.p.y} r={5.5} scale={dot.scale ?? 1} brightness={Math.min(1, dot.brightness ?? 1)} />
					</WorldSvg>
				</Glow>
			) : null}
		</>
	);
};
