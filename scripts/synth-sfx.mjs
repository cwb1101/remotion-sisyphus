/**
 * 用代码合成全部音效（不使用任何音频素材）
 * 输出 public/sfx/<name>.wav，48kHz / 16bit / 单声道
 *
 * 音色原则：柔和低频冲击、轻点击、气流声、柔和上扬音
 * - 每个音效都有淡入淡出包络，首尾强制 0，避免咔哒声
 * - 少用高频与白噪声：气流声用低通后的棕噪声
 * - 单个音效峰值 ≤ -1.5 dBFS（混音时再乘音量），最终混音检查峰值 ≤ -3 dBFS
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SFX} from '../src/sfx/catalog.ts';

const SR = 48000;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sfx');

// 确定性随机数，保证每次生成结果一致
let seed = 1234567;
const rnd = () => {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 4294967296;
};

const buf = (sec) => new Float32Array(Math.round(sec * SR));

/** 一阶低通（cutoff 可随时间变化） */
const lowpass = (x, cutoff) => {
	const y = new Float32Array(x.length);
	let s = 0;
	for (let i = 0; i < x.length; i++) {
		const fc = typeof cutoff === 'function' ? cutoff(i / SR) : cutoff;
		const a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
		s += a * (x[i] - s);
		y[i] = s;
	}
	return y;
};

/** 一阶高通，去直流和次声 */
const highpass = (x, fc) => {
	const y = new Float32Array(x.length);
	const rc = 1 / (2 * Math.PI * fc);
	const a = rc / (rc + 1 / SR);
	let px = 0;
	let py = 0;
	for (let i = 0; i < x.length; i++) {
		py = a * (py + x[i] - px);
		px = x[i];
		y[i] = py;
	}
	return y;
};

/** 棕噪声（白噪声积分），高频很少 */
const brown = (n) => {
	const y = new Float32Array(n);
	let s = 0;
	for (let i = 0; i < n; i++) {
		s = (s + (rnd() * 2 - 1) * 0.06) * 0.998;
		y[i] = s;
	}
	return y;
};

/** 简单 Schroeder 混响：4 个带阻尼的梳状滤波 + 2 个全通 */
const reverb = (x, {mix = 0.2, size = 1, damp = 0.35, feedback = 0.78} = {}) => {
	const combs = [1687, 1601, 2053, 2251].map((d) => Math.round(d * size));
	const wet = new Float32Array(x.length);
	for (const d of combs) {
		const line = new Float32Array(d);
		let idx = 0;
		let lp = 0;
		for (let i = 0; i < x.length; i++) {
			const out = line[idx];
			lp = out * (1 - damp) + lp * damp;
			line[idx] = x[i] + lp * feedback;
			idx = (idx + 1) % d;
			wet[i] += out / combs.length;
		}
	}
	let y = wet;
	for (const d of [556, 441].map((v) => Math.round(v * size))) {
		const line = new Float32Array(d);
		const z = new Float32Array(y.length);
		let idx = 0;
		for (let i = 0; i < y.length; i++) {
			const bufOut = line[idx];
			const v = y[i] + bufOut * 0.5;
			line[idx] = v;
			z[i] = bufOut - v * 0.5;
			idx = (idx + 1) % d;
		}
		y = z;
	}
	// 混响尾巴再过一次温和低通，避免发亮
	const tail = lowpass(y, 4500);
	const res = new Float32Array(x.length);
	for (let i = 0; i < x.length; i++) res[i] = x[i] * (1 - mix * 0.5) + tail[i] * mix;
	return res;
};

/** 首尾包络：淡入 fadeIn 秒，淡出 fadeOut 秒（余弦） */
const edges = (x, fadeIn = 0.004, fadeOut = 0.08) => {
	const ni = Math.round(fadeIn * SR);
	const no = Math.round(fadeOut * SR);
	for (let i = 0; i < ni; i++) x[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / ni);
	for (let i = 0; i < no; i++) x[x.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / no);
	x[0] = 0;
	x[x.length - 1] = 0;
	return x;
};

const normalize = (x, peakDb) => {
	let m = 0;
	for (const v of x) m = Math.max(m, Math.abs(v));
	const g = 10 ** (peakDb / 20) / (m || 1);
	for (let i = 0; i < x.length; i++) x[i] *= g;
	return x;
};

/** 指数起音 + 指数衰减 */
const adEnv = (t, attack, decay) => (1 - Math.exp(-t / attack)) * Math.exp(-t / decay);

/** 变频正弦（相位积分） */
const sweep = (sec, freqAt, ampAt, partials = [[1, 1]]) => {
	const x = buf(sec);
	const ph = partials.map(() => 0);
	for (let i = 0; i < x.length; i++) {
		const t = i / SR;
		const f = freqAt(t);
		let v = 0;
		partials.forEach(([mul, g], k) => {
			ph[k] += (2 * Math.PI * f * mul) / SR;
			v += Math.sin(ph[k]) * g;
		});
		x[i] = v * ampAt(t);
	}
	return x;
};

const add = (a, b, g = 1) => {
	for (let i = 0; i < Math.min(a.length, b.length); i++) a[i] += b[i] * g;
	return a;
};

const RECIPES = {
	/** 柔和低频冲击：下滑的低频正弦 + 极少量低通噪声“体感” */
	impact_soft(sec) {
		const x = sweep(sec, (t) => 46 + 54 * Math.exp(-t / 0.07), (t) => adEnv(t, 0.006, 0.38), [
			[1, 1],
			[2, 0.22],
			[3, 0.06],
		]);
		const body = lowpass(brown(x.length), 220);
		for (let i = 0; i < x.length; i++) x[i] += body[i] * 1.6 * Math.exp(-(i / SR) / 0.035);
		return normalize(edges(reverb(highpass(x, 25), {mix: 0.22, size: 1.1})), -3);
	},
	/** 关键句的重冲击：更低更长，叠一层温暖的 A 小和弦衬底 */
	impact_heavy(sec) {
		const x = sweep(sec, (t) => 36 + 62 * Math.exp(-t / 0.1), (t) => adEnv(t, 0.008, 0.7), [
			[1, 1],
			[2, 0.25],
		]);
		const pad = sweep(sec, () => 55, (t) => adEnv(t, 0.06, 1.1) * 0.32, [
			[1, 1],
			[1.5, 0.55],
			[2, 0.45],
			[3, 0.12],
		]);
		add(x, pad);
		const body = lowpass(brown(x.length), 170);
		for (let i = 0; i < x.length; i++) x[i] += body[i] * 2.2 * Math.exp(-(i / SR) / 0.05);
		return normalize(edges(reverb(highpass(x, 22), {mix: 0.3, size: 1.5, feedback: 0.82}), 0.004, 0.4), -1.5);
	},
	/** 轻点击：中低频的短促木质感，不用高频 */
	click_soft(sec) {
		const x = buf(sec);
		for (let i = 0; i < x.length; i++) {
			const t = i / SR;
			x[i] =
				Math.sin(2 * Math.PI * 620 * t) * adEnv(t, 0.0015, 0.03) +
				Math.sin(2 * Math.PI * 310 * t) * adEnv(t, 0.002, 0.05) * 0.5 +
				Math.sin(2 * Math.PI * 1240 * t) * adEnv(t, 0.0015, 0.01) * 0.18;
		}
		return normalize(edges(reverb(x, {mix: 0.16, size: 0.7})), -6);
	},
	/** 打字：更轻更短 */
	tick_type(sec) {
		const x = buf(sec);
		for (let i = 0; i < x.length; i++) {
			const t = i / SR;
			x[i] = Math.sin(2 * Math.PI * 540 * t) * adEnv(t, 0.001, 0.014) + Math.sin(2 * Math.PI * 1080 * t) * adEnv(t, 0.001, 0.008) * 0.15;
		}
		return normalize(edges(x, 0.001, 0.05), -12);
	},
	/** 气流：低通棕噪声，截止频率随时间起伏，钟形包络 */
	whoosh(sec) {
		const n = brown(Math.round(sec * SR));
		const x = lowpass(lowpass(n, (t) => 240 + 820 * Math.sin((Math.PI * t) / sec) ** 2), 1400);
		for (let i = 0; i < x.length; i++) x[i] *= Math.sin((Math.PI * i) / x.length) ** 2;
		return normalize(edges(highpass(x, 40), 0.02, 0.1), -9);
	},
	whoosh_long(sec) {
		const n = brown(Math.round(sec * SR));
		const x = lowpass(lowpass(n, (t) => 200 + 700 * Math.sin((Math.PI * t) / sec) ** 2), 1200);
		for (let i = 0; i < x.length; i++) x[i] *= Math.sin((Math.PI * i) / x.length) ** 1.6;
		return normalize(edges(highpass(x, 40), 0.03, 0.15), -9);
	},
	/** 下行气流 + 很轻的下滑音 */
	whoosh_down(sec) {
		const n = brown(Math.round(sec * SR));
		const x = lowpass(lowpass(n, (t) => 900 * Math.exp(-t / 0.35) + 140), 1300);
		for (let i = 0; i < x.length; i++) {
			const t = i / SR;
			x[i] *= adEnv(t, 0.08, 0.35);
		}
		add(x, sweep(sec, (t) => 220 * Math.exp(-t / 0.7) + 90, (t) => adEnv(t, 0.05, 0.3) * 0.12));
		return normalize(edges(highpass(x, 40), 0.01, 0.12), -9);
	},
	/** 柔和上扬音：G3 → D4 滑音，缓慢起音 */
	rise_soft(sec) {
		const x = sweep(
			sec,
			(t) => 196 * 2 ** ((7 / 12) * Math.min(1, t / 0.7)) * (1 + 0.003 * Math.sin(2 * Math.PI * 5 * t)),
			(t) => (t < 0.55 ? Math.sin((Math.PI / 2) * (t / 0.55)) ** 2 : Math.exp(-(t - 0.55) / 0.35)),
			[
				[1, 1],
				[2, 0.28],
				[3, 0.08],
			],
		);
		return normalize(edges(reverb(x, {mix: 0.28, size: 1.2})), -7);
	},
	down_tone(sec) {
		const x = sweep(sec, (t) => 330 * 2 ** (-(9 / 12) * Math.min(1, t / 0.6)), (t) => adEnv(t, 0.03, 0.35), [
			[1, 1],
			[2, 0.2],
		]);
		return normalize(edges(reverb(x, {mix: 0.22})), -10);
	},
	/** 闷声低频脉冲（像很轻的心跳，两拍） */
	pulse_low(sec) {
		const x = buf(sec);
		for (let i = 0; i < x.length; i++) {
			const t = i / SR;
			const b1 = adEnv(t, 0.012, 0.12);
			const t2 = t - 0.24;
			const b2 = t2 > 0 ? adEnv(t2, 0.012, 0.1) * 0.5 : 0;
			x[i] = (Math.sin(2 * Math.PI * 58 * t) + 0.2 * Math.sin(2 * Math.PI * 116 * t)) * (b1 + b2);
		}
		return normalize(edges(reverb(x, {mix: 0.15, size: 0.9})), -5);
	},
};

const writeWav = (file, x) => {
	const n = x.length;
	const b = Buffer.alloc(44 + n * 2);
	b.write('RIFF', 0);
	b.writeUInt32LE(36 + n * 2, 4);
	b.write('WAVE', 8);
	b.write('fmt ', 12);
	b.writeUInt32LE(16, 16);
	b.writeUInt16LE(1, 20);
	b.writeUInt16LE(1, 22);
	b.writeUInt32LE(SR, 24);
	b.writeUInt32LE(SR * 2, 28);
	b.writeUInt16LE(2, 32);
	b.writeUInt16LE(16, 34);
	b.write('data', 36);
	b.writeUInt32LE(n * 2, 40);
	for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
	fs.writeFileSync(file, b);
};

fs.mkdirSync(OUT, {recursive: true});
for (const [name, {seconds}] of Object.entries(SFX)) {
	const recipe = RECIPES[name];
	if (!recipe) throw new Error(`缺少音效配方 ${name}`);
	const x = recipe(seconds);
	let peak = 0;
	let maxStep = 0;
	for (let i = 0; i < x.length; i++) {
		peak = Math.max(peak, Math.abs(x[i]));
		if (i > 0) maxStep = Math.max(maxStep, Math.abs(x[i] - x[i - 1]));
	}
	writeWav(path.join(OUT, `${name}.wav`), x);
	console.log(`${name.padEnd(14)} ${seconds.toFixed(2)}s  峰值 ${(20 * Math.log10(peak)).toFixed(1)} dBFS  最大相邻跳变 ${maxStep.toFixed(4)}`);
}
