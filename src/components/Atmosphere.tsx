// 氛围层 (屏幕空间): 漂浮的失焦尘埃 四角压暗 重卡点的全屏闪光与尘埃炸开
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cameraAt} from './Camera';
import {HEAVY_FRAMES, PORTALS, PORTAL_PULL, PORTAL_PUSH} from '../lib/timeline';
import {mulberry32, range} from '../lib/random';
import {COLORS, H, W} from '../theme';
import {useRenderMode} from './Character';

const rng = mulberry32(404);
const DUST = Array.from({length: 46}, () => ({
	x: range(rng, 0, W),
	y: range(rng, 0, H),
	r: Math.pow(rng(), 2.2) * 26 + 2,
	depth: range(rng, 0.02, 0.25),
	vx: range(rng, -0.25, 0.25),
	vy: range(rng, -0.35, -0.05),
	tw: range(rng, 0, Math.PI * 2),
	a: range(rng, 0.08, 0.32),
}));

export const Atmosphere: React.FC = () => {
	const frame = useCurrentFrame();
	const mode = useRenderMode();
	if (mode !== 'normal') return null;
	const cam = cameraAt(frame);
	const lastHeavy = [...HEAVY_FRAMES].reverse().find((h) => h <= frame);
	const since = lastHeavy === undefined ? 999 : frame - lastHeavy;
	const burst = since < 40 ? 1 - since / 40 : 0;
	const flash = since < 8 ? 1 - since / 8 : 0;
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
			<defs>
				<radialGradient id="dust">
					<stop offset="0" stopColor={COLORS.gold} stopOpacity={1} />
					<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
				</radialGradient>
				<radialGradient id="vignette" cx="50%" cy="48%" r="75%">
					<stop offset="0.45" stopColor="#000" stopOpacity={0} />
					<stop offset="1" stopColor="#000" stopOpacity={0.78} />
				</radialGradient>
			</defs>
			{DUST.map((d, i) => {
				const push = burst * burst * 260 * (1 + d.depth * 4);
				const cx = d.x - W / 2;
				const cy = d.y - H / 2;
				const len = Math.hypot(cx, cy) || 1;
				let x = d.x + d.vx * frame - cam.x * d.depth * 0.35 + (cx / len) * push;
				let y = d.y + d.vy * frame - cam.y * d.depth * 0.35 + (cy / len) * push;
				x = ((x % W) + W) % W;
				y = ((y % H) + H) % H;
				const a = d.a * (0.65 + 0.35 * Math.sin(frame * 0.05 + d.tw)) * (1 + burst);
				return <circle key={i} cx={x} cy={y} r={d.r} fill="url(#dust)" opacity={Math.min(0.6, a)} />;
			})}
			<rect width={W} height={H} fill="url(#vignette)" />
			{flash > 0 ? <rect width={W} height={H} fill={COLORS.gold} opacity={0.22 * flash} /> : null}
			<PortalGlow frame={frame} />
		</svg>
	);
};

/** 换场亮光的半径 (屏幕像素), 不在换场时为 0; 质检用它判断哪些像素被亮光盖住 */
export const portalRadius = (frame: number) => {
	const p = PORTALS.find((q) => frame >= q.frame - PORTAL_PUSH && frame < q.frame + PORTAL_PULL);
	if (!p) return 0;
	const k = frame < p.frame ? 1 - (p.frame - frame) / PORTAL_PUSH : 1 - (frame - p.frame) / PORTAL_PULL;
	return 40 + 1700 * Math.pow(Math.max(0, k), 1.5);
};

/** 换场时盖住画面的一圈亮光 (象牙白到金), 中心就是镜头推近的那个物件 */
const PortalGlow: React.FC<{frame: number}> = ({frame}) => {
	const r = portalRadius(frame);
	if (r <= 0) return null;
	return (
		<>
			<defs>
				<radialGradient id="portal">
					<stop offset="0" stopColor="#FFF4DC" stopOpacity={1} />
					<stop offset="0.55" stopColor={COLORS.ivory} stopOpacity={0.97} />
					<stop offset="1" stopColor={COLORS.gold} stopOpacity={0} />
				</radialGradient>
			</defs>
			<circle cx={W / 2} cy={H / 2} r={r} fill="url(#portal)" />
		</>
	);
};
