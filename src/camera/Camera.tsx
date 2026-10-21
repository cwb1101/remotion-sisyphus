import React, {createContext, useContext, useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {HEIGHT, WIDTH} from '../data/script';

export type CameraState = {x: number; y: number; z: number; r: number};

export type CameraKey = CameraState & {f: number};

/** 单调三次插值（Fritsch–Carlson）：关键帧之间速度连续、不过冲，镜头不会在关键帧上急停 */
export const monotone = (ts: number[], vs: number[], t: number) => {
	const n = ts.length;
	if (t <= ts[0]) return vs[0];
	if (t >= ts[n - 1]) return vs[n - 1];
	const d: number[] = [];
	for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]));
	const m: number[] = [d[0]];
	for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
	m.push(d[n - 2]);
	for (let i = 0; i < n - 1; i++) {
		if (d[i] === 0) {
			m[i] = 0;
			m[i + 1] = 0;
			continue;
		}
		const a = m[i] / d[i];
		const b = m[i + 1] / d[i];
		const s = a * a + b * b;
		if (s > 9) {
			const k = 3 / Math.sqrt(s);
			m[i] = k * a * d[i];
			m[i + 1] = k * b * d[i];
		}
	}
	let i = 0;
	while (t > ts[i + 1]) i++;
	const h = ts[i + 1] - ts[i];
	const u = (t - ts[i]) / h;
	const h00 = 2 * u ** 3 - 3 * u ** 2 + 1;
	const h10 = u ** 3 - 2 * u ** 2 + u;
	const h01 = -2 * u ** 3 + 3 * u ** 2;
	const h11 = u ** 3 - u ** 2;
	return h00 * vs[i] + h10 * h * m[i] + h01 * vs[i + 1] + h11 * h * m[i + 1];
};

export type CameraKick = {f: number; zoom: number; decay: number};

export const evalCamera = (keys: CameraKey[], kicks: CameraKick[], frame: number): CameraState => {
	const ts = keys.map((k) => k.f);
	const ch = (c: keyof CameraState) => monotone(ts, keys.map((k) => k[c]), frame);
	// 轻微的呼吸式漂移，保证画面永远在动
	const t = frame / 30;
	let z = ch('z');
	for (const k of kicks) {
		const dt = frame - k.f;
		if (dt >= 0) z *= 1 + k.zoom * Math.exp(-dt / k.decay) * Math.min(1, dt / 2);
	}
	return {
		x: ch('x') + 7 * Math.sin(t * 0.37) + 3 * Math.sin(t * 0.91 + 1.3),
		y: ch('y') + 5 * Math.sin(t * 0.29 + 0.7) + 2 * Math.sin(t * 0.77),
		z: z * (1 + 0.006 * Math.sin(t * 0.21)),
		r: ch('r') + 0.18 * Math.sin(t * 0.23 + 0.4),
	};
};

const CameraCtx = createContext<CameraState>({x: 0, y: 0, z: 1, r: 0});

export const CameraProvider: React.FC<{keys: CameraKey[]; kicks: CameraKick[]; children: React.ReactNode}> = ({
	keys,
	kicks,
	children,
}) => {
	const frame = useCurrentFrame();
	const cam = useMemo(() => evalCamera(keys, kicks, frame), [keys, kicks, frame]);
	return <CameraCtx.Provider value={cam}>{children}</CameraCtx.Provider>;
};

export const useCamera = () => useContext(CameraCtx);

export const cameraTransform = (c: CameraState) =>
	`translate(${WIDTH / 2} ${HEIGHT / 2}) rotate(${c.r}) scale(${c.z}) translate(${-c.x} ${-c.y})`;

export const worldToScreen = (c: CameraState, x: number, y: number) => {
	const dx = (x - c.x) * c.z;
	const dy = (y - c.y) * c.z;
	const a = (c.r * Math.PI) / 180;
	return {
		x: WIDTH / 2 + dx * Math.cos(a) - dy * Math.sin(a),
		y: HEIGHT / 2 + dx * Math.sin(a) + dy * Math.cos(a),
	};
};

/** 屏幕像素 → 世界单位（线宽、点半径在推近时保持细，只按 z^grow 轻微变粗） */
export const px = (c: CameraState, screenPx: number, grow = 0.25) => (screenPx * c.z ** grow) / c.z;

/** 世界坐标系的全屏 SVG 层 */
export const WorldSvg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => {
	const cam = useCamera();
	return (
		<svg
			width={WIDTH}
			height={HEIGHT}
			viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
			style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style}}
		>
			<g transform={cameraTransform(cam)}>{children}</g>
		</svg>
	);
};

/** 把 HTML 元素钉在世界坐标上；scaleExp 控制字号随镜头推近放大的程度 */
export const WorldHtml: React.FC<{
	x: number;
	y: number;
	scaleExp?: number;
	children: React.ReactNode;
	style?: React.CSSProperties;
}> = ({x, y, scaleExp = 0.6, children, style}) => {
	const cam = useCamera();
	const p = worldToScreen(cam, x, y);
	return (
		<div
			style={{
				position: 'absolute',
				left: p.x,
				top: p.y,
				transform: `translate(-50%, -50%) rotate(${cam.r}deg) scale(${cam.z ** scaleExp})`,
				whiteSpace: 'nowrap',
				...style,
			}}
		>
			{children}
		</div>
	);
};
