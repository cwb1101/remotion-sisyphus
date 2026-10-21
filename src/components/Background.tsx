import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {useCamera} from '../camera/Camera';
import {HEIGHT, WIDTH} from '../data/script';
import {backdrop, dust, noise, palette, rgba} from '../theme';

export type LightState = {
	/** 径向光透明度（0.04–0.08） */
	alpha: number;
	/** 径向光中心（屏幕坐标 0–1） */
	cx: number;
	cy: number;
	/** 暗角强度 0–1 */
	vignette: number;
};

/** 暗底 + 暖棕径向光 */
export const BaseLayer: React.FC<{light: LightState}> = ({light}) => {
	const r = backdrop.radialRadius * WIDTH;
	return (
		<AbsoluteFill style={{backgroundColor: palette.bg}}>
			<AbsoluteFill
				style={{
					background: `radial-gradient(${r}px ${r * 0.78}px at ${light.cx * 100}% ${light.cy * 100}%, ${rgba(
						palette.gold,
						light.alpha,
					)} 0%, ${rgba(palette.gold, light.alpha * 0.45)} 38%, ${rgba(palette.gold, 0)} 100%)`,
				}}
			/>
		</AbsoluteFill>
	);
};

/** 四周自然暗角（压暗到接近底色，不到纯黑） */
export const Vignette: React.FC<{strength: number}> = ({strength}) => (
	<AbsoluteFill
		style={{
			background: `radial-gradient(ellipse 72% 70% at 50% 50%, rgba(4,4,6,0) 55%, rgba(4,4,6,${0.6 * strength}) 85%, rgba(4,4,6,${0.92 * strength}) 100%)`,
			pointerEvents: 'none',
		}}
	/>
);

/** 极淡噪点颗粒：全屏 feTurbulence，每 N 帧换一次种子 */
export const Grain: React.FC = () => {
	const frame = useCurrentFrame();
	const seed = Math.floor(frame / noise.reseedEvery) % 97;
	return (
		<AbsoluteFill style={{opacity: noise.opacity, pointerEvents: 'none'}}>
			<svg width={WIDTH} height={HEIGHT}>
				<filter id="grain" x="0" y="0" width="100%" height="100%">
					<feTurbulence type="fractalNoise" baseFrequency={noise.baseFrequency} numOctaves={noise.octaves} seed={seed} stitchTiles="stitch" />
					<feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0.02  0.31 0.31 0.31 0 0.01  0.28 0.28 0.28 0 0  0 0 0 0 1" />
				</filter>
				<rect width={WIDTH} height={HEIGHT} filter="url(#grain)" />
			</svg>
		</AbsoluteFill>
	);
};

export type DustImpulse = {f: number; x: number; y: number; strength: number};

type Particle = {x: number; y: number; vx: number; vy: number; size: number; alpha: number; tw: number; ph: number};

const makeParticles = (count: number, seed: string, size: readonly [number, number], alpha: readonly [number, number]) =>
	new Array(count).fill(0).map(
		(_, i): Particle => ({
			x: random(`${seed}x${i}`) * WIDTH * 1.4,
			y: random(`${seed}y${i}`) * HEIGHT * 1.4,
			vx: (random(`${seed}vx${i}`) - 0.5) * 0.35,
			vy: -0.08 - random(`${seed}vy${i}`) * 0.22,
			size: size[0] + random(`${seed}s${i}`) * (size[1] - size[0]),
			alpha: alpha[0] + random(`${seed}a${i}`) * (alpha[1] - alpha[0]),
			tw: 0.4 + random(`${seed}t${i}`) * 0.8,
			ph: random(`${seed}p${i}`) * Math.PI * 2,
		}),
	);

const wrap = (v: number, m: number) => ((v % m) + m) % m;

/**
 * 稀疏尘埃：远层（小、清晰、视差小）+ 近层（大、虚、视差大）
 * 跟镜头做视差，冲击时被推开
 */
export const Dust: React.FC<{layer: 'far' | 'near'; impulses?: DustImpulse[]; brightness?: number}> = ({
	layer,
	impulses = [],
	brightness = 1,
}) => {
	const frame = useCurrentFrame();
	const cam = useCamera();
	const isNear = layer === 'near';
	const parts = useMemo(
		() =>
			isNear
				? makeParticles(dust.nearCount, 'near', dust.nearSize, dust.nearAlpha)
				: makeParticles(dust.farCount, 'far', dust.farSize, dust.farAlpha),
		[isNear],
	);
	const parallax = isNear ? 1.35 : 0.22;
	const zoomPar = isNear ? 0.9 : 0.15;
	const fw = WIDTH * 1.4;
	const fh = HEIGHT * 1.4;
	const zf = 1 + (cam.z - 1) * zoomPar;
	return (
		<AbsoluteFill style={{pointerEvents: 'none', filter: isNear ? `blur(${dust.nearBlur}px)` : undefined}}>
			<svg width={WIDTH} height={HEIGHT}>
				{parts.map((p, i) => {
					let x = wrap(p.x + p.vx * frame - cam.x * parallax, fw) - (fw - WIDTH) / 2;
					let y = wrap(p.y + p.vy * frame - cam.y * parallax, fh) - (fh - HEIGHT) / 2;
					x = WIDTH / 2 + (x - WIDTH / 2) * zf;
					y = HEIGHT / 2 + (y - HEIGHT / 2) * zf;
					for (const im of impulses) {
						const dt = frame - im.f;
						if (dt < 0) continue;
						const dx = x - im.x;
						const dy = y - im.y;
						const d = Math.max(40, Math.hypot(dx, dy));
						const push = im.strength * (isNear ? 1.6 : 1) * (1 - Math.exp(-dt / 6)) * Math.exp(-dt / 70);
						x += (dx / d) * push;
						y += (dy / d) * push;
					}
					const tw = 0.75 + 0.25 * Math.sin(frame * 0.05 * p.tw + p.ph);
					return (
						<circle
							key={i}
							cx={x}
							cy={y}
							r={p.size / 2}
							fill={isNear ? palette.gold : palette.goldDim}
							opacity={p.alpha * tw * brightness}
						/>
					);
				})}
			</svg>
		</AbsoluteFill>
	);
};
