import {at} from '../data/timeline';
import {TOTAL_FRAMES} from '../data/script';
import type {Ellipse} from '../components/geometry';

/** 贯穿物件的“家”：光点被卷入的那条透视椭圆轨道（世界坐标） */
export const ORBIT_HOME: Ellipse = {cx: -380, cy: 80, rx: 300, ry: 120, rot: 0};

/** 入轨帧：光点滑进轨道、开始绕圈 */
export const ORBIT_ENTRY = at('s01-03', 44);

/** 绕一圈所需帧数的关键帧（时间全部挂在字幕屏上） */
const PERIOD_KEYS: [number, number][] = [
	[ORBIT_ENTRY, 150],
	[at('s01-03', 72), 64],
	[at('s01-05', 0), 64],
	[at('s02-01', 0), 84],
	[at('s02-02', 30), 70],
	[at('s02-03', 0), 50],
	[at('s02-03', 72), 50],
	[at('s02-04', 30), 96],
	[at('s02-07', 60), 70],
];

const periodAt = (f: number) => {
	if (f <= PERIOD_KEYS[0][0]) return PERIOD_KEYS[0][1];
	for (let i = 0; i < PERIOD_KEYS.length - 1; i++) {
		const [f0, p0] = PERIOD_KEYS[i];
		const [f1, p1] = PERIOD_KEYS[i + 1];
		if (f <= f1) return p0 + ((p1 - p0) * (f - f0)) / (f1 - f0);
	}
	return PERIOD_KEYS[PERIOD_KEYS.length - 1][1];
};

const TH: number[] = (() => {
	const arr = new Array(TOTAL_FRAMES + 2).fill(-Math.PI / 2);
	for (let f = ORBIT_ENTRY + 1; f < arr.length; f++) {
		arr[f] = arr[f - 1] - (2 * Math.PI) / periodAt(f);
	}
	return arr;
})();

/**
 * 光点在轨道上的参数角（全片连续，跨小节不跳变）
 * 入轨前停在顶点 -π/2，之后单调递减（屏幕上逆时针）
 */
export const orbitTheta = (frame: number) => {
	const f = Math.max(0, Math.min(TH.length - 2, frame));
	const i = Math.floor(f);
	return TH[i] + (TH[i + 1] - TH[i]) * (f - i);
};
