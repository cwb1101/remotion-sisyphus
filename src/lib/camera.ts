import {cue, FILM_END, screen} from '../data/script';
import {EASE, EASE_OUT, lerp, ramp, wobble} from './anim';

// 全片一个连续镜头：所有景别变化都是这条关键帧轨道上的推、拉、摇。

export type Cam = {x: number; y: number; z: number};
type CamKey = {f: number; cam: Cam; ease?: (t: number) => number};

const s = screen;

const KEYS: CamKey[] = [
	// 开头：贴近房间，缓慢推近
	{f: 0, cam: {x: 760, y: 560, z: 1.24}},
	{f: s(3).start, cam: {x: 770, y: 560, z: 1.32}},
	{f: s(4).start, cam: {x: 775, y: 560, z: 1.36}},
	// 第一节：拉远，露出右侧的门
	{f: s(4).start + 50, cam: {x: 960, y: 540, z: 1.0}},
	{f: s(5).start, cam: {x: 930, y: 540, z: 1.02}},
	{f: s(6).start, cam: {x: 880, y: 540, z: 1.05}},
	// 摇向左侧压力条，大字砸下
	{f: s(6).start + 22, cam: {x: 650, y: 520, z: 1.16}, ease: EASE_OUT},
	{f: s(7).start, cam: {x: 690, y: 520, z: 1.14}},
	// 第二节：拉到全景，房间与门变成天平两端
	{f: s(7).start + 40, cam: {x: 960, y: 520, z: 0.95}},
	{f: s(9).start, cam: {x: 985, y: 525, z: 0.97}},
	{f: s(9).start + 24, cam: {x: 960, y: 540, z: 1.0}},
	{f: s(10).start, cam: {x: 975, y: 540, z: 1.01}},
	{f: s(11).start, cam: {x: 900, y: 550, z: 1.06}},
	// 推近房间内部
	{f: s(11).start + 45, cam: {x: 790, y: 560, z: 1.32}},
	{f: s(11).end + 30, cam: {x: 760, y: 565, z: 1.4}},
	// ---- 以上为预览部分，以下为完整片（新关键帧只追加在后面，不改变预览） ----
	// 第三节：拉到极远，房间成了左上角的小图标 → 名字砸下 → 摇到 1988 → 拉成五个选项并排
	{f: s(13).start, cam: {x: 2046, y: 1041, z: 0.42}},
	{f: s(13).end, cam: {x: 2010, y: 1030, z: 0.44}},
	{f: s(14).start + 40, cam: {x: 1500, y: 560, z: 0.6}},
	{f: s(15).start, cam: {x: 1460, y: 555, z: 0.62}},
	{f: s(15).start + 40, cam: {x: 760, y: 470, z: 0.4}},
	{f: s(17).start, cam: {x: 760, y: 490, z: 0.48}},
	// 第四节：推回屋里（工作）→ 拉远见门 → 推近两个人 → 拉远 → 推近左墙 → 拉远（台灯）
	{f: s(17).start + 45, cam: {x: 680, y: 600, z: 1.3}},
	{f: s(18).start, cam: {x: 690, y: 598, z: 1.32}},
	{f: s(18).start + 35, cam: {x: 960, y: 540, z: 1.0}},
	{f: s(19).start, cam: {x: 945, y: 545, z: 1.0}},
	{f: s(19).start + 35, cam: {x: 790, y: 600, z: 1.25}},
	{f: s(20).start, cam: {x: 800, y: 598, z: 1.26}},
	{f: s(20).start + 30, cam: {x: 960, y: 545, z: 1.0}},
	{f: s(21).start + 5, cam: {x: 930, y: 545, z: 1.02}},
	{f: s(21).start + 35, cam: {x: 600, y: 600, z: 1.32}},
	{f: s(22).start, cam: {x: 610, y: 598, z: 1.33}},
	{f: s(22).start + 30, cam: {x: 820, y: 560, z: 1.05}},
	{f: s(23).start, cam: {x: 860, y: 550, z: 1.02}},
	{f: s(23).start + 40, cam: {x: 960, y: 540, z: 1.0}},
	// 第五节：全景带上压力条 → 跟着人走到门前
	{f: s(24).start + 35, cam: {x: 820, y: 520, z: 0.95}},
	{f: s(25).start, cam: {x: 800, y: 522, z: 0.97}},
	{f: s(26).start + 15, cam: {x: 900, y: 535, z: 0.98}},
	{f: s(26).start + 95, cam: {x: 1050, y: 540, z: 1.02}},
	{f: s(27).start, cam: {x: 1050, y: 542, z: 1.03}},
	// 第六节：跟着人被标签压回屋里 → 推近账本和天平
	{f: s(27).start + 45, cam: {x: 1000, y: 545, z: 1.02}},
	{f: s(28).start + 15, cam: {x: 820, y: 575, z: 1.15}},
	{f: s(28).start + 65, cam: {x: 640, y: 610, z: 1.32}},
	{f: s(29).start, cam: {x: 650, y: 610, z: 1.3}},
	{f: s(29).start + 30, cam: {x: 760, y: 610, z: 1.28}},
	{f: s(31).start, cam: {x: 740, y: 610, z: 1.3}},
	{f: s(33).start, cam: {x: 760, y: 605, z: 1.28}},
	{f: s(35).start, cam: {x: 760, y: 610, z: 1.3}},
	{f: s(35).start + 20, cam: {x: 760, y: 610, z: 1.38}, ease: EASE_OUT},
	// 第七节：墙往里收、镜头越贴越近 → 拉远看时间轴 → 摇向未来的自己
	{f: s(36).start, cam: {x: 760, y: 612, z: 1.36}},
	{f: s(37).start, cam: {x: 760, y: 620, z: 1.55}},
	{f: s(38).start, cam: {x: 720, y: 625, z: 1.6}},
	{f: s(39).start, cam: {x: 700, y: 600, z: 1.5}},
	{f: s(40).start, cam: {x: 720, y: 610, z: 1.45}},
	{f: s(40).start + 35, cam: {x: 980, y: 600, z: 1.0}},
	{f: s(42).start, cam: {x: 1000, y: 595, z: 1.0}},
	{f: s(42).start + 45, cam: {x: 1060, y: 575, z: 1.0}},
	// 第八节：房间与门并列 → 推近影子 → 回到开头的构图（第 5 年）→ 回到第 4 屏的全景 → 推进光里
	{f: s(44).start, cam: {x: 1050, y: 570, z: 1.0}},
	{f: s(44).start + 40, cam: {x: 980, y: 545, z: 0.95}},
	{f: s(46).start, cam: {x: 960, y: 545, z: 0.96}},
	{f: s(46).start + 25, cam: {x: 730, y: 610, z: 1.35}, ease: EASE_OUT},
	{f: s(47).start, cam: {x: 740, y: 612, z: 1.36}},
	{f: s(48).start, cam: {x: 750, y: 600, z: 1.36}},
	{f: s(48).start + 40, cam: {x: 760, y: 560, z: 1.24}},
	{f: s(49).start, cam: {x: 762, y: 560, z: 1.26}},
	{f: s(50).start, cam: {x: 790, y: 555, z: 1.2}},
	{f: s(50).start + 35, cam: {x: 960, y: 540, z: 1.0}},
	{f: s(51).start + 10, cam: {x: 1000, y: 540, z: 1.0}},
	{f: s(51).start + 65, cam: {x: 1550, y: 500, z: 1.5}},
	{f: FILM_END, cam: {x: 1700, y: 480, z: 2.0}},
];

/** 震动：[起始帧, 幅度 px, 衰减帧数] */
const SHAKES: [number, number, number][] = [
	[cue(3, 'slam'), 16, 20],
	[cue(6, 'slam'), 6, 12],
	[cue(13, 'slam'), 14, 20],
	[cue(25, 'cross'), 6, 12],
	[cue(35, 'tip'), 14, 18],
	[cue(46, 'shadow'), 10, 16],
	[cue(51, 'push'), 6, 14],
];

export const cameraAt = (frame: number): Cam & {sx: number; sy: number} => {
	let cam = KEYS[KEYS.length - 1].cam;
	if (frame <= KEYS[0].f) {
		cam = KEYS[0].cam;
	} else {
		for (let i = 1; i < KEYS.length; i++) {
			if (frame <= KEYS[i].f) {
				const a = KEYS[i - 1];
				const b = KEYS[i];
				const t = ramp(frame, a.f, b.f, b.ease ?? EASE);
				cam = {x: lerp(a.cam.x, b.cam.x, t), y: lerp(a.cam.y, b.cam.y, t), z: lerp(a.cam.z, b.cam.z, t)};
				break;
			}
		}
	}
	// 手持感：极轻的漂移，保证画面永远不完全静止
	const drift = 3;
	let sx = drift * wobble('cam-x', frame / 40);
	let sy = drift * wobble('cam-y', frame / 47);
	for (const [f0, amp, len] of SHAKES) {
		const t = frame - f0;
		if (t >= 0 && t < len) {
			const k = amp * (1 - t / len) ** 2;
			sx += k * Math.sin(t * 2.3);
			sy += k * Math.cos(t * 3.1);
		}
	}
	return {...cam, sx, sy};
};

export const cameraTransform = (frame: number) => {
	const c = cameraAt(frame);
	return `translate(${960 + c.sx} ${540 + c.sy}) scale(${c.z}) translate(${-c.x} ${-c.y})`;
};

export const worldToScreen = (frame: number, wx: number, wy: number) => {
	const c = cameraAt(frame);
	return {x: 960 + c.sx + (wx - c.x) * c.z, y: 540 + c.sy + (wy - c.y) * c.z};
};
