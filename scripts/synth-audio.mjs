// 用代码合成全部音效并按 script.json 的时间轴混成一个 wav 48kHz 16bit 立体声
// 用法 node scripts/synth-audio.mjs [preview|full]
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const SR = 48000;
const root = fileURLToPath(new URL('..', import.meta.url));
const data = JSON.parse(readFileSync(`${root}src/data/script.json`, 'utf8'));
const mode = process.argv[2] ?? 'preview';
const fps = data.meta.fps;

const chapters = data.chapters;
const endFrame =
	mode === 'full'
		? chapters[chapters.length - 1].end
		: Math.max(...data.meta.previewChapters.map((i) => chapters[i].end));

const dbToGain = (db) => Math.pow(10, db / 20);
const LEVEL_DB = {weak: data.sfxLevels.weak, mid: data.sfxLevels.mid, strong: data.sfxLevels.strong};
// 总线限幅的上限 比 -6 dBFS 再留 0.5 dB 余量
const CEILING = dbToGain(data.sfxLevels.ceiling - 0.5);

// 确定性白噪声
let seed = 20261017;
const noise = () => {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 2147483648 - 1;
};

// RBJ 双二阶滤波器
const biquad = (type, freq, q = 0.707) => {
	const w = (2 * Math.PI * freq) / SR;
	const cos = Math.cos(w);
	const alpha = Math.sin(w) / (2 * q);
	let b0, b1, b2;
	if (type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
	else if (type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
	else [b0, b1, b2] = [alpha, 0, -alpha];
	const a0 = 1 + alpha;
	const a1 = -2 * cos;
	const a2 = 1 - alpha;
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	return (x) => {
		const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
		x2 = x1; x1 = x; y2 = y1; y1 = y;
		return y;
	};
};

// 所有噪声类声音都先过这条链 切掉 100Hz 以下和 6kHz 以上
const cleanNoise = () => {
	const h1 = biquad('hp', 100), h2 = biquad('hp', 100);
	const l1 = biquad('lp', 6000), l2 = biquad('lp', 6000);
	return () => l2(l1(h2(h1(noise()))));
};

const buf = (sec) => new Float32Array(Math.round(sec * SR));
const expDecay = (t, tau) => Math.exp(-t / tau);

const GEN = {
	// 低频沉击 音高下坠的正弦加一点柔和的气流
	impact() {
		const out = buf(1.5);
		const n = cleanNoise();
		const bp = biquad('lp', 1800);
		const rum = biquad('lp', 380);
		let ph = 0, ph2 = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			// 基频从 150Hz 落到 72Hz 再叠二三次谐波 手机外放也听得到
			const f = 72 + 78 * Math.exp(-t / 0.08);
			ph += (2 * Math.PI * f) / SR;
			ph2 += (2 * Math.PI * f * 2.01) / SR;
			const body =
				Math.sin(ph) * expDecay(t, 0.4) +
				0.55 * Math.sin(ph2) * expDecay(t, 0.22) +
				0.25 * Math.sin(ph * 3.02) * expDecay(t, 0.12);
			const air = bp(n()) * expDecay(t, 0.05) * 0.35;
			const tail = rum(n()) * expDecay(t, 0.5) * 0.5;
			out[i] = Math.tanh(1.3 * (body + air + tail));
		}
		return out;
	},
	stoneDrop() {
		const out = buf(1.1);
		const n = cleanNoise();
		const lp = biquad('lp', 1500);
		let ph = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			ph += (2 * Math.PI * (66 + 70 * Math.exp(-t / 0.06))) / SR;
			const grit = lp(n()) * (expDecay(t, 0.07) * 0.8 + 0.12 * expDecay(t, 0.35));
			out[i] = (Math.sin(ph) + 0.5 * Math.sin(2 * ph) + 0.2 * Math.sin(3 * ph)) * expDecay(t, 0.26) + grit;
		}
		return out;
	},
	// 带通扫频的气流声
	whoosh() {
		const dur = 0.62;
		const out = buf(dur);
		const n = cleanNoise();
		// 中心频率随时间升高的状态变量带通 逐样本改频率 不会产生断点
		let low = 0, band = 0;
		const wl = biquad('lp', 4800);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const env = Math.pow(Math.sin(Math.PI * Math.min(1, t / dur)), 1.6);
			const fc = 300 + 2200 * (t / dur);
			const k = 2 * Math.sin((Math.PI * fc) / SR);
			const x = n();
			low += k * band;
			const high = x - low - 1.1 * band;
			band += k * high;
			out[i] = wl(band) * env;
		}
		return out;
	},
	wind() {
		const dur = 1.8;
		const out = buf(dur);
		const n = cleanNoise();
		const l1 = biquad('lp', 800), l2 = biquad('lp', 800), h = biquad('hp', 160);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const env = Math.pow(Math.sin(Math.PI * (t / dur)), 1.5) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 0.9 * t));
			out[i] = h(l2(l1(n()))) * env;
		}
		return out;
	},
	// 沙粒 很短的高频颗粒 密度递减
	sand() {
		const out = buf(0.6);
		const n = cleanNoise();
		const h = biquad('hp', 1200);
		const l1 = biquad('lp', 4200), l2 = biquad('lp', 4200);
		let s = 1234;
		const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
		for (let g = 0; g < 46; g++) {
			const start = Math.floor(Math.pow(r(), 1.8) * (out.length - 600));
			const len = 240 + Math.floor(r() * 300);
			const amp = 0.4 + r() * 0.6;
			for (let i = 0; i < len; i++) {
				const w = Math.sin((Math.PI * i) / len) ** 2;
				out[start + i] += l2(l1(h(n()))) * w * amp;
			}
		}
		return out;
	},
	tick() {
		const out = buf(0.2);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			out[i] = (Math.sin(2 * Math.PI * 1320 * t) + 0.3 * Math.sin(2 * Math.PI * 2640 * t)) * expDecay(t, 0.035);
		}
		return out;
	},
	// 玻璃泛音 几个不成整数倍的分音 都在 6kHz 以下
	glass() {
		const out = buf(0.9);
		const parts = [
			[1760, 1, 0.5],
			[2650, 0.5, 0.35],
			[3510, 0.28, 0.25],
			[4620, 0.12, 0.18],
		];
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			let v = 0;
			for (const [f, a, tau] of parts) v += a * Math.sin(2 * Math.PI * f * t) * expDecay(t, tau);
			out[i] = v;
		}
		return out;
	},
	downSweep() {
		const dur = 0.6;
		const out = buf(dur);
		let ph = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const f = 520 * Math.pow(140 / 520, t / dur);
			ph += (2 * Math.PI * f) / SR;
			out[i] = (Math.sin(ph) + 0.2 * Math.sin(2 * ph)) * Math.pow(Math.sin(Math.PI * (t / dur)), 0.8);
		}
		return out;
	},
	upSweep() {
		const dur = 0.45;
		const out = buf(dur);
		let ph = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const f = 180 * Math.pow(700 / 180, t / dur);
			ph += (2 * Math.PI * f) / SR;
			out[i] = Math.sin(ph) * Math.pow(Math.sin(Math.PI * (t / dur)), 1.2);
		}
		return out;
	},
	// 翻牌 两下短促的纸感拍击
	flip() {
		const out = buf(0.4);
		const n = cleanNoise();
		const bp = biquad('bp', 1800, 0.8);
		for (const at of [0, 0.075]) {
			const s0 = Math.round(at * SR);
			const len = Math.round(0.03 * SR);
			for (let i = 0; i < len; i++) {
				const t = i / SR;
				const w = Math.sin((Math.PI * i) / len);
				out[s0 + i] += bp(n()) * w * 1.6 + Math.sin(2 * Math.PI * 160 * t) * expDecay(t, 0.03) * 0.5;
			}
		}
		return out;
	},
	// 干净的低频嗡鸣 只有正弦 没有噪声
	hum() {
		const dur = 2.3;
		const out = buf(dur);
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			const env = Math.min(1, Math.pow(t / 1.6, 1.5)) * Math.min(1, (dur - t) / 0.35);
			const vib = 1 + 0.004 * Math.sin(2 * Math.PI * 5 * t);
			out[i] =
				env *
				(Math.sin(2 * Math.PI * 131 * vib * t) + 0.5 * Math.sin(2 * Math.PI * 262 * vib * t) + 0.22 * Math.sin(2 * Math.PI * 393 * vib * t));
		}
		return out;
	},
	soft() {
		const out = buf(0.32);
		const n = cleanNoise();
		const lp = biquad('lp', 700);
		let ph = 0;
		for (let i = 0; i < out.length; i++) {
			const t = i / SR;
			ph += (2 * Math.PI * (120 + 60 * Math.exp(-t / 0.03))) / SR;
			out[i] = Math.sin(ph) * expDecay(t, 0.09) + lp(n()) * expDecay(t, 0.02) * 0.3;
		}
		return out;
	},
};

// 每个音效首尾 15ms 余弦淡入淡出 防止咔哒声
const FADE = Math.round(0.015 * SR);
const fadeEdges = (x) => {
	for (let i = 0; i < FADE && i < x.length; i++) {
		const g = 0.5 - 0.5 * Math.cos((Math.PI * i) / FADE);
		x[i] *= g;
		x[x.length - 1 - i] *= g;
	}
	return x;
};

const normalizePeak = (x, db) => {
	let peak = 0;
	for (const v of x) peak = Math.max(peak, Math.abs(v));
	const g = dbToGain(db) / (peak || 1);
	for (let i = 0; i < x.length; i++) x[i] *= g;
	return x;
};

const writeWav = (file, samples) => {
	const n = samples.length;
	const b = Buffer.alloc(44 + n * 4);
	b.write('RIFF', 0);
	b.writeUInt32LE(36 + n * 4, 4);
	b.write('WAVEfmt ', 8);
	b.writeUInt32LE(16, 16);
	b.writeUInt16LE(1, 20);
	b.writeUInt16LE(2, 22);
	b.writeUInt32LE(SR, 24);
	b.writeUInt32LE(SR * 4, 28);
	b.writeUInt16LE(4, 32);
	b.writeUInt16LE(16, 34);
	b.write('data', 36);
	b.writeUInt32LE(n * 4, 40);
	for (let i = 0; i < n; i++) {
		const v = Math.max(-32767, Math.min(32767, Math.round(samples[i] * 32767)));
		b.writeInt16LE(v, 44 + i * 4);
		b.writeInt16LE(v, 46 + i * 4);
	}
	writeFileSync(file, b);
};

// solo 模式 把每种音效单独放大到 -1 dBFS 导出 方便单独检查嘶声和咔哒声
if (mode === 'solo') {
	mkdirSync(`${root}out/sfx-solo`, {recursive: true});
	for (const [name, gen] of Object.entries(GEN)) {
		writeWav(`${root}out/sfx-solo/${name}.wav`, normalizePeak(fadeEdges(gen()), -1));
	}
	console.log(`导出 ${Object.keys(GEN).length} 个单独音效到 out/sfx-solo`);
	process.exit(0);
}

const total = Math.round((endFrame / fps) * SR);
const bus = new Float32Array(total);
const placed = [];
for (const s of data.screens) {
	if (s.start >= endFrame) continue;
	for (const cue of s.sfx) {
		const gen = GEN[cue.type];
		if (!gen) throw new Error(`未知音效类型 ${cue.type}`);
		const frame = s.start + cue.offset;
		const clip = normalizePeak(fadeEdges(gen()), LEVEL_DB[cue.level]);
		const at = Math.round((frame / fps) * SR);
		for (let i = 0; i < clip.length && at + i < total; i++) bus[at + i] += clip[i];
		placed.push({screen: s.id, frame, type: cue.type, level: cue.level});
	}
}

// 总线限幅 预读 5ms 起音 1ms 释放 80ms 保证不超过上限
const look = Math.round(0.005 * SR);
const rel = Math.exp(-1 / (0.08 * SR));
const att = Math.exp(-1 / (0.001 * SR));
let gain = 1;
let limited = 0;
const out = new Float32Array(total);
const need = new Float32Array(total);
for (let i = 0; i < total; i++) need[i] = Math.abs(bus[i]) > CEILING ? CEILING / Math.abs(bus[i]) : 1;
// 预读窗口内的最小增益
const minAhead = new Float32Array(total);
{
	const dq = [];
	for (let i = total - 1; i >= 0; i--) {
		while (dq.length && need[dq[dq.length - 1]] >= need[i]) dq.pop();
		dq.push(i);
		while (dq[0] > i + look) dq.shift();
		minAhead[i] = need[dq[0]];
	}
}
for (let i = 0; i < total; i++) {
	const target = minAhead[i];
	gain = target < gain ? att * gain + (1 - att) * target : rel * gain + (1 - rel) * target;
	if (gain < 0.999) limited++;
	let v = bus[i] * gain;
	if (Math.abs(v) > CEILING) v = Math.sign(v) * CEILING;
	out[i] = v;
}

// 写 16bit 立体声 wav 静音处就是数字零
let peak = 0;
for (let i = 0; i < total; i++) peak = Math.max(peak, Math.abs(out[i]));
mkdirSync(`${root}public/audio`, {recursive: true});
const file = `${root}public/audio/${mode}.wav`;
writeWav(file, out);
console.log(`写入 ${file}`);
console.log(`音效 ${placed.length} 个 时长 ${(total / SR).toFixed(2)} 秒 峰值 ${(20 * Math.log10(peak)).toFixed(2)} dBFS 限幅介入样本 ${limited}`);
for (const p of placed) console.log(`  屏${p.screen} 帧${p.frame} ${p.type} ${p.level}`);
