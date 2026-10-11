/**
 * 心跳节拍轨：由 script.json 每屏的 pulse.bpm 积分得到。
 * 画面（红点跳动、心率线）与音效（心跳、滴声）共用同一份节拍，保证同步。
 */
import {screens, PREVIEW_END, screenAt} from '../data/script';
import {lerp} from './anim';

const REST_BPM = 66;
const END = Math.max(PREVIEW_END, screens[screens.length - 1].end) + 60;

export const bpmAt = (f: number) => {
	const s = screenAt(f);
	if (!s || !s.pulse) return REST_BPM;
	const t = (f - s.start) / (s.end - s.start);
	return lerp(s.pulse.bpm[0], s.pulse.bpm[1], t);
};

/** 所有心跳的发生帧（可为小数） */
export const beatFrames: number[] = (() => {
	const out: number[] = [];
	let phase = 0.85; // 第一拍在开头不久出现
	const step = 0.25;
	for (let f = 0; f < END; f += step) {
		const next = phase + (bpmAt(f) / 60 / 30) * step;
		if (Math.floor(next) > Math.floor(phase)) out.push(f + step);
		phase = next;
	}
	return out;
})();

/** 当前帧的心跳强度（lub + dub 双峰），0..~1.2 */
export const pulseAt = (f: number) => {
	let v = 0;
	for (let i = beatFrames.length - 1; i >= 0; i--) {
		const b = beatFrames[i];
		if (b > f) continue;
		const dt = f - b;
		if (dt > 24) break;
		v += Math.exp(-dt / 3.2);
		if (dt >= 5) v += 0.55 * Math.exp(-(dt - 5) / 3.2);
	}
	return Math.min(1.2, v);
};

/** 心电图波形：t 时刻（帧）的电位，基于真实节拍 */
export const ecgAt = (t: number) => {
	let v = 0;
	for (let i = beatFrames.length - 1; i >= 0; i--) {
		const b = beatFrames[i];
		const dt = t - b;
		if (dt < -8) continue;
		if (dt > 14) break;
		// P 波
		v += 0.12 * Math.exp(-((dt + 4.5) ** 2) / 1.6);
		// QRS
		v += -0.18 * Math.exp(-((dt + 0.7) ** 2) / 0.08);
		v += 1.0 * Math.exp(-(dt ** 2) / 0.12);
		v += -0.35 * Math.exp(-((dt - 0.75) ** 2) / 0.1);
		// T 波
		v += 0.28 * Math.exp(-((dt - 6) ** 2) / 4);
	}
	return v;
};
