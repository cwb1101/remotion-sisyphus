// 合成全部音效并按 script.json 的时间轴混成一条 48kHz / 16bit 立体声 wav。
// 不使用任何音频素材。用法：node scripts/build-audio.mjs [--full]
//
// 规则（全片硬性规范第 4 条 + 预览要求）：
// - 三档峰值：weak -24 dBFS / mid -16 dBFS / strong -8 dBFS（读自 script.json）
// - 噪声类音效（whoosh / grain / roll 的沙粒层）先切 100Hz 以下和 6kHz 以上，再额外压低 4dB
// - 每个音效首尾 12ms / 18ms 余弦淡入淡出，防咔哒
// - 总线 lookahead 限幅，天花板 -6.5 dBFS，绝不削波
// - 没有音效的地方是数字静音（全 0），不加抖动、不铺底噪
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SR = 48000;
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/script.json'), 'utf8'));
const FULL = process.argv.includes('--full');

const screens = FULL ? doc.screens : doc.screens.filter((s) => s.id <= doc.preview.lastScreen);
const last = screens[screens.length - 1];
const totalFrames = last.endFrame + (FULL ? doc.full.endHoldFrames : doc.preview.tailFrames);
const totalSamples = Math.round((totalFrames / doc.fps) * SR);

const dbToLin = (db) => Math.pow(10, db / 20);
const LEVEL = Object.fromEntries(Object.entries(doc.sfxLevelsDbfs).map(([k, v]) => [k, dbToLin(v)]));
const NOISE_TRIM = dbToLin(-4);
const CEILING = dbToLin(FULL ? -7 : -6.5);
const TAU = Math.PI * 2;

// ---------- 工具 ----------
const mulberry32 = (seed) => () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const biquad = (type, f0, Q) => {
	const w = (TAU * f0) / SR;
	const cs = Math.cos(w);
	const al = Math.sin(w) / (2 * Q);
	let b0, b1, b2;
	if (type === 'lp') [b0, b1, b2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
	else if (type === 'hp') [b0, b1, b2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
	else [b0, b1, b2] = [al, 0, -al];
	const a0 = 1 + al;
	return {b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * cs) / a0, a2: (1 - al) / a0};
};

const filt = (x, c) => {
	const y = new Float64Array(x.length);
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	for (let n = 0; n < x.length; n++) {
		const v = c.b0 * x[n] + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
		x2 = x1; x1 = x[n]; y2 = y1; y1 = v;
		y[n] = v;
	}
	return y;
};

// 4 阶巴特沃斯高通 100Hz + 6 阶低通（拐点 4.5kHz，到 6kHz 已衰减约 15dB）：切掉轰鸣和嘶声
const bandLimit = (x, lpHz = 4500) => {
	let y = filt(x, biquad('hp', 100, 0.5412));
	y = filt(y, biquad('hp', 100, 1.3066));
	y = filt(y, biquad('lp', lpHz, 0.5176));
	y = filt(y, biquad('lp', lpHz, 0.7071));
	y = filt(y, biquad('lp', lpHz, 1.9319));
	return y;
};

const buf = (sec) => new Float64Array(Math.round(sec * SR));
const hann = (t, len) => (t < 0 || t > len ? 0 : 0.5 - 0.5 * Math.cos((TAU * t) / len));

const noise = (len, seed) => {
	const rnd = mulberry32(seed);
	const x = new Float64Array(len);
	for (let i = 0; i < len; i++) x[i] = rnd() * 2 - 1;
	return x;
};

// ---------- 音色 ----------
const SYNTH = {
	thud({pitch = 1}) {
		const x = buf(1.3);
		let ph = 0;
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			const f = (38 + 52 * Math.exp(-t / 0.09)) * pitch;
			ph += (TAU * f) / SR;
			// 基频 38–90Hz 手机外放听不到，所以把能量更多放在 2、3 次谐波和 180Hz 的"木质"敲击上
			x[n] =
				Math.sin(ph) * Math.exp(-t / 0.4) +
				0.75 * Math.sin(2 * ph) * Math.exp(-t / 0.28) +
				0.3 * Math.sin(3 * ph) * Math.exp(-t / 0.16) +
				0.35 * Math.sin(TAU * 180 * pitch * t) * Math.exp(-t / 0.06);
		}
		return x;
	},
	// 强档关键句：闷响 + 和弦尾音。mood=dark 用低沉的小三和弦（被砸倒），默认是暖色大三和弦（主题词）
	impact({pitch = 0.9, mood = 'warm'}) {
		// 闷响本身 1.3s 就结束，先给它做尾部淡出，否则叠进 3.6s 的和弦时会在 1.3s 处留下一个小台阶（咔哒）
		const base = fadeEdges(SYNTH.thud({pitch}), 0, 120);
		const x = buf(3.6);
		const notes = mood === 'dark' ? [146.83, 174.61, 220.0, 293.66] : [196.0, 246.94, 293.66, 392.0];
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			const env = Math.min(1, t / 0.05) * Math.exp(-t / 1.9);
			let s = 0;
			for (const f of notes) s += (Math.sin(TAU * f * t) + 0.12 * Math.sin(TAU * 2 * f * t) + 0.05 * Math.sin(TAU * 3 * f * t)) / notes.length;
			x[n] = 1.15 * s * env + 0.8 * (n < base.length ? base[n] : 0);
		}
		return x;
	},
	slideDown() {
		const x = buf(1.1);
		let ph = 0;
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			const f = 520 * Math.pow(170 / 520, Math.min(1, t / 0.9)) * (1 + 0.01 * Math.sin(TAU * 5 * t));
			ph += (TAU * f) / SR;
			x[n] = (Math.sin(ph) + 0.2 * Math.sin(2 * ph)) * Math.min(1, t / 0.03) * Math.exp(-t / 0.42);
		}
		return x;
	},
	bell({pitch = 1}) {
		const x = buf(2.4);
		const f0 = 587.33 * pitch;
		const parts = [[1, 1, 1.4], [2, 0.3, 0.8], [3, 0.12, 0.45], [4.2, 0.05, 0.25]];
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			let s = 0;
			for (const [r, a, tau] of parts) s += a * Math.sin(TAU * f0 * r * t) * Math.exp(-t / tau);
			x[n] = s;
		}
		return x;
	},
	heartbeat() {
		const x = buf(0.7);
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			const bump = (t0, a) => a * hann(t - t0, 0.13) * (Math.sin(TAU * 62 * (t - t0)) + 0.45 * Math.sin(TAU * 124 * (t - t0)));
			x[n] = bump(0, 1) + bump(0.27, 0.75);
		}
		return x;
	},
	pluck({note = 0}) {
		const f = [220, 293.66, 392][note + 1] ?? 293.66;
		const x = buf(1.3);
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			const ph = TAU * f * t;
			x[n] = (Math.sin(ph) + 0.11 * Math.sin(3 * ph) + 0.04 * Math.sin(5 * ph)) * Math.exp(-t / 0.5);
		}
		return x;
	},
	drone({glide = 1, shape = 'hump', dur = 2.2}) {
		const x = buf(dur);
		const fs_ = [73.42, 110, 146.83];
		const amps = [1, 0.6, 0.35];
		const ph = [0, 0, 0];
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			const u = t / dur;
			const g = 1 + (glide - 1) * u;
			let s = 0;
			for (let k = 0; k < 3; k++) {
				ph[k] += (TAU * fs_[k] * g) / SR;
				s += amps[k] * Math.sin(ph[k]);
			}
			const env = shape === 'up' ? Math.pow(Math.sin((Math.PI / 2) * Math.min(1, u / 0.85)), 2) * (u > 0.85 ? Math.cos(((u - 0.85) / 0.15) * (Math.PI / 2)) : 1) : Math.pow(Math.sin(Math.PI * u), 2);
			x[n] = s * env;
		}
		return x;
	},
	droneDown() {
		return SYNTH.drone({glide: 0.9});
	},
	droneUp() {
		return SYNTH.drone({glide: 1.05, shape: 'up', dur: 2.6});
	},
	pad() {
		const x = buf(2.8);
		const notes = [146.83, 185.0, 220.0];
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			const env = Math.min(1, t / 0.6) * (t > 1.8 ? Math.max(0, 1 - (t - 1.8) / 1.0) : 1);
			let s = 0;
			for (const f of notes) s += Math.sin(TAU * f * t) + 0.08 * Math.sin(TAU * 3 * f * t);
			x[n] = (s / notes.length) * env;
		}
		return x;
	},
	// 4 个音，间隔 0.55s，与第 9 屏的 4 圈年轮同步
	arpUp() {
		const x = buf(3.0);
		const notes = [293.66, 369.99, 440.0, 587.33];
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			let s = 0;
			notes.forEach((f, i) => {
				const tt = t - i * 0.55;
				if (tt >= 0) s += Math.sin(TAU * f * tt) * Math.min(1, tt / 0.01) * Math.exp(-tt / 0.6);
			});
			x[n] = s;
		}
		return x;
	},
	swellUp() {
		const x = buf(1.5);
		let ph = 0;
		for (let n = 0; n < x.length; n++) {
			const t = n / SR;
			const f = 220 * Math.pow(2, Math.min(1, t / 1.2));
			ph += (TAU * f) / SR;
			x[n] = Math.sin(ph) * Math.pow(Math.sin((Math.PI * t) / 1.5), 2);
		}
		return x;
	},
	// —— 以下为噪声类（风 / 沙粒），全部先带通 100Hz–6kHz ——
	whoosh({seed = 11}) {
		const dur = 0.9;
		const len = Math.round(dur * SR);
		const w = noise(len, seed);
		const x = new Float64Array(len);
		let y = 0;
		for (let n = 0; n < len; n++) {
			const u = n / len;
			const fc = 300 + 1600 * Math.sin(Math.PI * u);
			const a = 1 - Math.exp((-TAU * fc) / SR);
			y += a * (w[n] - y);
			x[n] = y * Math.pow(Math.sin(Math.PI * u), 2);
		}
		return bandLimit(x);
	},
	grain({seed = 23}) {
		const dur = 0.8;
		const x = buf(dur);
		const src = bandLimit(noise(x.length, seed), 4000);
		const rnd = mulberry32(seed + 1);
		for (let k = 0; k < 70; k++) {
			const t0 = -Math.log(1 - rnd() * 0.95) * 0.16;
			const len = 0.015 + rnd() * 0.03;
			const amp = (0.3 + 0.7 * rnd()) * Math.exp(-t0 / 0.3);
			const s0 = Math.round(t0 * SR);
			const L = Math.round(len * SR);
			for (let i = 0; i < L && s0 + i < x.length; i++) {
				x[s0 + i] += amp * hann(i, L) * src[(s0 + i) % src.length];
			}
		}
		return bandLimit(x);
	},
	roll({seed = 31}) {
		const dur = 1.25;
		const x = buf(dur);
		const rnd = mulberry32(seed);
		let t0 = 0;
		let gap = 0.17;
		while (t0 < dur - 0.1) {
			const f = 66 + rnd() * 16;
			const a = 0.5 + 0.5 * Math.min(1, t0 / 0.8);
			const s0 = Math.round(t0 * SR);
			const L = Math.round(0.08 * SR);
			for (let i = 0; i < L && s0 + i < x.length; i++) {
				const tt = i / SR;
				x[s0 + i] += a * hann(i, L) * (Math.sin(TAU * f * tt) + 0.3 * Math.sin(TAU * 2 * f * tt));
			}
			t0 += gap;
			gap = Math.max(0.065, gap * 0.9);
		}
		// 沙粒层：滤波后的噪声，比低频滚动声低 12dB
		const g = SYNTH.grain({seed: seed + 5});
		const gpk = g.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
		for (let n = 0; n < x.length; n++) {
			const u = n / x.length;
			x[n] += (0.25 * (n < g.length ? g[n] : g[n % g.length]) / gpk) * Math.sin(Math.PI * u);
		}
		return x;
	},
};

const NOISY = new Set(['whoosh', 'grain', 'roll']);

const fadeEdges = (x, inMs = 12, outMs = 18) => {
	const fi = Math.round((inMs / 1000) * SR);
	const fo = Math.round((outMs / 1000) * SR);
	for (let i = 0; i < fi && i < x.length; i++) x[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fi);
	for (let i = 0; i < fo && i < x.length; i++) x[x.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fo);
	x[0] = 0;
	x[x.length - 1] = 0;
	return x;
};

const peakOf = (x) => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

const writeWav = (file, chans) => {
	const n = chans[0].length;
	const nc = chans.length;
	const b = Buffer.alloc(44 + n * nc * 2);
	b.write('RIFF', 0);
	b.writeUInt32LE(36 + n * nc * 2, 4);
	b.write('WAVE', 8);
	b.write('fmt ', 12);
	b.writeUInt32LE(16, 16);
	b.writeUInt16LE(1, 20);
	b.writeUInt16LE(nc, 22);
	b.writeUInt32LE(SR, 24);
	b.writeUInt32LE(SR * nc * 2, 28);
	b.writeUInt16LE(nc * 2, 32);
	b.writeUInt16LE(16, 34);
	b.write('data', 36);
	b.writeUInt32LE(n * nc * 2, 40);
	let o = 44;
	for (let i = 0; i < n; i++) {
		for (let c = 0; c < nc; c++) {
			const v = Math.max(-1, Math.min(1, chans[c][i]));
			b.writeInt16LE(Math.round(v * 32767), o);
			o += 2;
		}
	}
	fs.mkdirSync(path.dirname(file), {recursive: true});
	fs.writeFileSync(file, b);
};


// ---------- 铺底（仅完整片）----------
// 连续的纯音和弦层：保证全片没有意外的静音，并把整体响度托到约 -20 LUFS。
// 只用正弦（带少量 2、3 次谐波），不含任何噪声；峰值上限 -16 dBFS（不超过"中"档），
// 遇到强档音效时自动避让 8dB、中档避让 3dB，保证关键句的音效最响。
const BED_CHORDS = {
	opening: [73.42, 146.83, 174.61, 220.0],
	s1: [146.83, 185.0, 220.0, 329.63],
	s2: [116.54, 146.83, 174.61, 233.08],
	s3: [73.42, 110.0, 130.81, 174.61],
	s4: [87.31, 130.81, 220.0, 261.63],
	s4b: [98.0, 146.83, 246.94, 293.66],
	s5: [146.83, 220.0, 293.66, 369.99],
	s6: [98.0, 146.83, 246.94, 293.66],
	s6b: [73.42, 110.0, 185.0, 293.66],
};
const bedSegments = () => {
	const segs = [];
	let cur = null;
	for (const sc of screens) {
		let key = sc.section;
		if (sc.section === 's4' && sc.id >= 32) key = 's4b';
		if (sc.section === 's6' && sc.id >= 45) key = 's6b';
		if (!cur || cur.key !== key) {
			cur = {key, start: sc.startFrame / doc.fps};
			segs.push(cur);
		}
	}
	segs.forEach((g, i) => (g.end = i < segs.length - 1 ? segs[i + 1].start : totalSamples / SR));
	return segs;
};

const buildBed = () => {
	const bl = new Float64Array(totalSamples);
	const br = new Float64Array(totalSamples);
	const X = 1.2; // 相邻和弦交叉淡化时长（秒）
	for (const seg of bedSegments()) {
		const notes = BED_CHORDS[seg.key];
		const s0 = Math.max(0, Math.round((seg.start - X / 2) * SR));
		const s1 = Math.min(totalSamples, Math.round((seg.end + X / 2) * SR));
		notes.forEach((f, k) => {
			const amp = (f < 100 ? 0.8 : 1) / notes.length;
			const pan = k % 2 ? 0.35 : -0.35;
			const lfoF = 0.07 + 0.03 * k;
			const lfoP = k * 1.7;
			for (let n = s0; n < s1; n++) {
				const t = n / SR;
				const edgeIn = seg.start <= 0 ? 1 : Math.min(1, Math.max(0, (t - (seg.start - X / 2)) / X));
				const edgeOut = Math.min(1, Math.max(0, (seg.end + X / 2 - t) / X));
				const xf = Math.sin((Math.PI / 2) * edgeIn) * Math.sin((Math.PI / 2) * edgeOut);
				const trem = 1 - 0.18 * (0.5 + 0.5 * Math.sin(TAU * lfoF * t + lfoP));
				const ph = TAU * f * t;
				const v = amp * xf * trem * (Math.sin(ph) + 0.12 * Math.sin(2 * ph) + 0.04 * Math.sin(3 * ph));
				bl[n] += v * Math.min(1, 1 - pan);
				br[n] += v * Math.min(1, 1 + pan);
			}
		});
	}
	// 温和软饱和：只压偶发的相位叠加尖峰，降低峰值因子（同样峰值下更饱满，不会出现噪声）
	{
		const p = Math.max(peakOf(bl), peakOf(br));
		const D = 1.8;
		const norm = Math.tanh(D);
		for (let n = 0; n < totalSamples; n++) {
			bl[n] = (Math.tanh((D * bl[n]) / p) / norm) * p;
			br[n] = (Math.tanh((D * br[n]) / p) / norm) * p;
		}
	}
	// 片头 1.5s 淡入、片尾 2.5s 淡出（成片最后 20 帧画面淡出到黑）
	const fin = Math.round(1.5 * SR);
	const fout = Math.round(2.5 * SR);
	for (let i = 0; i < fin; i++) {
		const g = Math.sin((Math.PI / 2) * (i / fin));
		bl[i] *= g * g;
		br[i] *= g * g;
	}
	for (let i = 0; i < fout; i++) {
		const g = Math.sin((Math.PI / 2) * (i / fout));
		bl[totalSamples - 1 - i] *= g * g;
		br[totalSamples - 1 - i] *= g * g;
	}
	// 避让：强档 -8dB、中档 -3dB；第 23 屏后的停顿压低 8dB（不是静音）
	const duck = new Float64Array(totalSamples).fill(1);
	const dip = (t0, t1, db, ramp = 0.12) => {
		const g = dbToLin(db);
		const a = Math.max(0, Math.round((t0 - ramp) * SR));
		const b = Math.min(totalSamples, Math.round((t1 + ramp) * SR));
		for (let n = a; n < b; n++) {
			const t = n / SR;
			const k = Math.min(1, (t - (t0 - ramp)) / ramp, (t1 + ramp - t) / ramp);
			const v = 1 + (g - 1) * Math.max(0, Math.min(1, k));
			duck[n] = Math.min(duck[n], v);
		}
	};
	for (const sc of screens) {
		for (const e of sc.sfx) {
			const t = (sc.startFrame + e.offset) / doc.fps;
			if (e.level === 'strong') dip(t, t + 1.4, -8, 0.15);
			else if (e.level === 'mid') dip(t, t + 0.8, -3, 0.12);
		}
	}
	const pause = doc.screens.find((x) => x.id === 23);
	const after = doc.screens.find((x) => x.id === 24);
	if (pause && after) dip(pause.endFrame / doc.fps, after.startFrame / doc.fps, -8, 0.2);
	for (let n = 0; n < totalSamples; n++) {
		bl[n] *= duck[n];
		br[n] *= duck[n];
	}
	return [bl, br];
};

// ---------- BS.1770 响度（K 计权 + 门限），用于给铺底定电平 ----------
const kWeight = (x) => {
	const sh = {b0: 1.53512485958697, b1: -2.69169618940638, b2: 1.19839281085285, a1: -1.69065929318241, a2: 0.73248077421585};
	const hp = {b0: 1.0, b1: -2.0, b2: 1.0, a1: -1.99004745483398, a2: 0.99007225036621};
	return filt(filt(x, sh), hp);
};
const blockStats = (a, b) => {
	// 每 400ms 块（100ms 步进）的 sum(a^2), sum(ab), sum(b^2)
	const W = Math.round(0.4 * SR);
	const H = Math.round(0.1 * SR);
	const out = [];
	for (let s0 = 0; s0 + W <= a.length; s0 += H) {
		let aa = 0, ab = 0, bb = 0;
		for (let n = s0; n < s0 + W; n++) {
			aa += a[n] * a[n];
			ab += a[n] * b[n];
			bb += b[n] * b[n];
		}
		out.push([aa / W, ab / W, bb / W]);
	}
	return out;
};
const integrated = (statsL, statsR, g) => {
	const pw = statsL.map((sl, i) => {
		const sr = statsR[i];
		return sl[0] + 2 * g * sl[1] + g * g * sl[2] + sr[0] + 2 * g * sr[1] + g * g * sr[2];
	});
	const lk = (p) => -0.691 + 10 * Math.log10(p + 1e-20);
	const abs = pw.filter((p) => lk(p) > -70);
	if (!abs.length) return -Infinity;
	const rel = lk(abs.reduce((s, p) => s + p, 0) / abs.length) - 10;
	const gated = abs.filter((p) => lk(p) > rel);
	return lk(gated.reduce((s, p) => s + p, 0) / gated.length);
};

// ---------- 混音 ----------
const L = new Float64Array(totalSamples);
const R = new Float64Array(totalSamples);
const events = [];
const sfxDir = path.join(ROOT, 'out/sfx');
fs.rmSync(sfxDir, {recursive: true, force: true});

for (const s of screens) {
	s.sfx.forEach((e, k) => {
		const make = SYNTH[e.type];
		if (!make) throw new Error(`unknown sfx type ${e.type} (screen ${s.id})`);
		const x = make({...e, seed: s.id * 100 + k});
		const target = LEVEL[e.level] * (NOISY.has(e.type) ? NOISE_TRIM : 1);
		const g = target / peakOf(x);
		for (let i = 0; i < x.length; i++) x[i] *= g;
		fadeEdges(x);
		const frame = s.startFrame + e.offset;
		const at = Math.round((frame / doc.fps) * SR);
		const pan = e.pan ?? 0;
		const gl = Math.min(1, 1 - pan);
		const gr = Math.min(1, 1 + pan);
		for (let i = 0; i < x.length && at + i < totalSamples; i++) {
			L[at + i] += x[i] * gl;
			R[at + i] += x[i] * gr;
		}
		const name = `${String(s.id).padStart(2, '0')}_${String(k)}_${e.type}_${e.level}`;
		writeWav(path.join(sfxDir, `${name}.wav`), [x]);
		events.push({screen: s.id, frame, time: +(frame / doc.fps).toFixed(3), type: e.type, level: e.level, peakDbfs: +(20 * Math.log10(peakOf(x))).toFixed(2), noisy: NOISY.has(e.type), file: `out/sfx/${name}.wav`});
	});
}

let bedInfo = null;
if (FULL) {
	const [bl, br] = buildBed();
	const bedPeak = Math.max(peakOf(bl), peakOf(br));
	const gMax = dbToLin(-16) / bedPeak;
	const target = -20.3;
	const sL = blockStats(kWeight(L), kWeight(bl));
	const sR = blockStats(kWeight(R), kWeight(br));
	let lo = 0;
	let hi = gMax;
	for (let it = 0; it < 40; it++) {
		const mid = (lo + hi) / 2;
		if (integrated(sL, sR, mid) < target) lo = mid;
		else hi = mid;
	}
	const g = (lo + hi) / 2;
	for (let n = 0; n < totalSamples; n++) {
		L[n] += bl[n] * g;
		R[n] += br[n] * g;
	}
	bedInfo = {
		bedPeakDbfs: +(20 * Math.log10(bedPeak * g)).toFixed(2),
		bedCappedAtMid: g >= gMax * 0.999,
		estimatedIntegratedLufs: +integrated(sL, sR, g).toFixed(2),
	};
	writeWav(path.join(ROOT, 'out/sfx/00_bed.wav'), [bl.map((v) => v * g), br.map((v) => v * g)]);
}

// ---------- 总线限幅（lookahead，不削波） ----------
const LA = Math.round(0.004 * SR);
const rel = 1 - Math.exp(-1 / (0.12 * SR));
const req = new Float64Array(totalSamples);
for (let i = 0; i < totalSamples; i++) {
	const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
	req[i] = p > CEILING ? CEILING / p : 1;
}
// 前视最小值
const hold = new Float64Array(totalSamples);
{
	const dq = [];
	for (let i = totalSamples - 1; i >= 0; i--) {
		while (dq.length && req[dq[dq.length - 1]] >= req[i]) dq.pop();
		dq.push(i);
		while (dq[0] > i + LA) dq.shift();
		hold[i] = req[dq[0]];
	}
}
const env = new Float64Array(totalSamples);
let gPrev = 1;
for (let i = 0; i < totalSamples; i++) {
	const g = Math.min(hold[i], gPrev + (1 - gPrev) * rel);
	env[i] = g;
	gPrev = g;
}
let acc = 0;
let maxGr = 0;
for (let i = 0; i < totalSamples; i++) {
	acc += env[i];
	if (i >= LA) acc -= env[i - LA];
	const g = acc / Math.min(i + 1, LA);
	maxGr = Math.max(maxGr, -20 * Math.log10(g));
	L[i] *= g;
	R[i] *= g;
}
let safety = 0;
for (let i = 0; i < totalSamples; i++) {
	for (const ch of [L, R]) {
		if (Math.abs(ch[i]) > CEILING) {
			ch[i] = Math.sign(ch[i]) * CEILING;
			safety++;
		}
	}
}

const outFile = path.join(ROOT, 'public/audio', FULL ? 'full-mix.wav' : 'preview-mix.wav');
writeWav(outFile, [L, R]);
const mixPeak = Math.max(peakOf(L), peakOf(R));
const report = {
	file: path.relative(ROOT, outFile),
	sampleRate: SR,
	bits: 16,
	durationSec: +(totalSamples / SR).toFixed(3),
	mixPeakDbfs: +(20 * Math.log10(mixPeak)).toFixed(2),
	limiterMaxGainReductionDb: +maxGr.toFixed(2),
	safetyClampedSamples: safety,
	bed: bedInfo,
	events,
};
fs.mkdirSync(path.join(ROOT, 'out'), {recursive: true});
fs.writeFileSync(path.join(ROOT, 'out/audio-report.json'), JSON.stringify(report, null, 1));
if (bedInfo) console.log('bed', JSON.stringify(bedInfo));
console.log(`wrote ${report.file}  ${report.durationSec}s  peak ${report.mixPeakDbfs} dBFS  limiter GR max ${report.limiterMaxGainReductionDb} dB  events ${events.length}`);
