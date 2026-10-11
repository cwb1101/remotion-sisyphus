/**
 * 纯代码合成全部音效（无任何音频素材），输出 public/sfx/*.wav（44.1kHz / 16bit / 单声道）。
 * 用到的手段：正弦/三角振荡器、确定性白噪声、RBJ 双二阶滤波、包络、Schroeder 混响。
 */
import fs from 'node:fs';
import path from 'node:path';

const SR = 44100;
const OUT = path.resolve('public/sfx');
fs.mkdirSync(OUT, {recursive: true});

// ---------- 基础工具 ----------
let seed = 12345;
const rnd = () => {
	seed = (seed * 1664525 + 1013904223) >>> 0;
	return seed / 4294967296;
};
const noise = () => rnd() * 2 - 1;
const buf = (sec) => new Float32Array(Math.ceil(sec * SR));
const TAU = Math.PI * 2;

/** 指数衰减包络（attack 秒、decay 时间常数秒） */
const envAD = (t, a, d) => (t < 0 ? 0 : t < a ? t / a : Math.exp(-(t - a) / d));

/** 时变 RBJ 双二阶滤波器 */
function biquad(input, type, freqFn, q = 0.707) {
	const out = new Float32Array(input.length);
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	let b0, b1, b2, a1, a2;
	const update = (f) => {
		const w = (TAU * Math.min(f, SR * 0.45)) / SR;
		const cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
		let B0, B1, B2;
		if (type === 'lp') { B0 = (1 - cs) / 2; B1 = 1 - cs; B2 = (1 - cs) / 2; }
		else if (type === 'hp') { B0 = (1 + cs) / 2; B1 = -(1 + cs); B2 = (1 + cs) / 2; }
		else { B0 = al; B1 = 0; B2 = -al; } // bp
		const A0 = 1 + al;
		b0 = B0 / A0; b1 = B1 / A0; b2 = B2 / A0; a1 = (-2 * cs) / A0; a2 = (1 - al) / A0;
	};
	for (let i = 0; i < input.length; i++) {
		if (i % 32 === 0) update(typeof freqFn === 'function' ? freqFn(i / SR) : freqFn);
		const x = input[i];
		const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
		x2 = x1; x1 = x; y2 = y1; y1 = y;
		out[i] = y;
	}
	return out;
}

/** Schroeder 混响（4 梳状 + 2 全通），返回干湿混合 */
function reverb(input, wet = 0.25, size = 1, tailSec = 1.2) {
	const len = input.length + Math.ceil(tailSec * SR);
	const x = new Float32Array(len);
	x.set(input);
	const combs = [1557, 1617, 1491, 1422].map((d) => Math.floor(d * size));
	const wetBuf = new Float32Array(len);
	for (const d of combs) {
		const line = new Float32Array(d);
		let idx = 0, lp = 0;
		for (let i = 0; i < len; i++) {
			const y = line[idx];
			lp = y * 0.75 + lp * 0.25;
			line[idx] = x[i] + lp * 0.8;
			idx = (idx + 1) % d;
			wetBuf[i] += y * 0.25;
		}
	}
	let y = wetBuf;
	for (const d of [225, 556]) {
		const line = new Float32Array(d);
		let idx = 0;
		const out = new Float32Array(len);
		for (let i = 0; i < len; i++) {
			const bufd = line[idx];
			const v = -0.5 * y[i] + bufd;
			line[idx] = y[i] + 0.5 * bufd;
			idx = (idx + 1) % d;
			out[i] = v;
		}
		y = out;
	}
	const out = new Float32Array(len);
	for (let i = 0; i < len; i++) out[i] = x[i] * (1 - wet * 0.5) + y[i] * wet;
	return out;
}

const mix = (...bufs) => {
	const len = Math.max(...bufs.map((b) => b.length));
	const out = new Float32Array(len);
	for (const b of bufs) for (let i = 0; i < b.length; i++) out[i] += b[i];
	return out;
};
const gain = (b, g) => b.map((v) => v * g);

/** 扫频正弦（f 可为时间函数），带包络 */
function tone(sec, fFn, envFn, type = 'sine') {
	const b = buf(sec);
	let ph = 0;
	for (let i = 0; i < b.length; i++) {
		const t = i / SR;
		const f = typeof fFn === 'function' ? fFn(t) : fFn;
		ph += (TAU * f) / SR;
		const s = type === 'sine' ? Math.sin(ph) : type === 'tri' ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : Math.sign(Math.sin(ph));
		b[i] = s * envFn(t);
	}
	return b;
}
function noiseBuf(sec, envFn) {
	const b = buf(sec);
	for (let i = 0; i < b.length; i++) b[i] = noise() * envFn(i / SR);
	return b;
}

function normalize(b, peakDb = -1) {
	let peak = 0;
	for (const v of b) peak = Math.max(peak, Math.abs(v));
	const target = 10 ** (peakDb / 20);
	return peak > 0 ? b.map((v) => (v / peak) * target) : b;
}
function fadeEdges(b, inSec = 0.002, outSec = 0.02) {
	const ni = Math.floor(inSec * SR), no = Math.floor(outSec * SR);
	for (let i = 0; i < ni && i < b.length; i++) b[i] *= i / ni;
	for (let i = 0; i < no && i < b.length; i++) b[b.length - 1 - i] *= i / no;
	return b;
}

function writeWav(name, data, peakDb = -1) {
	const b = fadeEdges(normalize(data, peakDb));
	const header = Buffer.alloc(44);
	const bytes = b.length * 2;
	header.write('RIFF', 0); header.writeUInt32LE(36 + bytes, 4); header.write('WAVE', 8);
	header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
	header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
	header.write('data', 36); header.writeUInt32LE(bytes, 40);
	const pcm = Buffer.alloc(bytes);
	for (let i = 0; i < b.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, b[i])) * 32767), i * 2);
	fs.writeFileSync(path.join(OUT, `${name}.wav`), Buffer.concat([header, pcm]));
	console.log(`  ${name}.wav  ${(b.length / SR).toFixed(2)}s`);
}

// ---------- 音效 ----------
const S = {};

// 心跳：lub-dub，低频正弦下滑 + 一点闷噪
S.heartbeat = () => {
	const lub = tone(0.5, (t) => 62 - 22 * Math.min(1, t / 0.09), (t) => envAD(t, 0.004, 0.07));
	const dubRaw = tone(0.5, (t) => 78 - 26 * Math.min(1, t / 0.08), (t) => envAD(t - 0.17, 0.004, 0.06) * 0.75);
	const thump = biquad(noiseBuf(0.5, (t) => envAD(t, 0.002, 0.025) * 0.5 + envAD(t - 0.17, 0.002, 0.02) * 0.35), 'lp', 180);
	return mix(lub, dubRaw, thump);
};

// 监护仪滴声
S.beep = () => reverb(mix(tone(0.14, 980, (t) => envAD(t, 0.004, 0.05)), gain(tone(0.14, 1960, (t) => envAD(t, 0.004, 0.03)), 0.15)), 0.18, 0.7, 0.4);

// 长「嘀——」
S.flatline = () => reverb(tone(2.2, 980, (t) => Math.min(1, t / 0.02) * (t > 2.0 ? Math.max(0, 1 - (t - 2.0) / 0.2) : 1)), 0.15, 0.7, 0.5);

// 嗖：带通噪声扫频
S.whoosh = () =>
	biquad(noiseBuf(0.8, (t) => Math.sin(Math.PI * Math.min(1, t / 0.8)) ** 2), 'bp', (t) => 300 + 2600 * Math.sin(Math.PI * Math.min(1, t / 0.8)), 1.2);

// 上扬的嗖（拉远/揭示）
S.whoosh_up = () =>
	reverb(biquad(noiseBuf(1.1, (t) => (t < 0.85 ? (t / 0.85) ** 2 : Math.max(0, 1 - (t - 0.85) / 0.25))), 'lp', (t) => 200 + 7000 * (t / 1.1) ** 2, 2), 0.2, 1, 0.8);

// 门/锁扣的咔哒
S.click = () => {
	const a = biquad(noiseBuf(0.08, (t) => envAD(t, 0.0005, 0.004)), 'hp', 2200);
	const ping = tone(0.12, 1750, (t) => envAD(t, 0.0005, 0.018) * 0.5);
	const b = biquad(noiseBuf(0.12, (t) => envAD(t - 0.03, 0.0005, 0.006) * 0.6), 'bp', 1200, 2);
	return reverb(mix(a, ping, b), 0.3, 0.9, 0.6);
};

// 环合上：带金属感的咔
S.lock = () => {
	const hit = biquad(noiseBuf(0.15, (t) => envAD(t, 0.0005, 0.006)), 'hp', 1800);
	const p1 = tone(0.3, 2400, (t) => envAD(t, 0.0005, 0.05) * 0.35);
	const p2 = tone(0.3, 3720, (t) => envAD(t, 0.0005, 0.035) * 0.25);
	const low = tone(0.2, 140, (t) => envAD(t, 0.001, 0.03) * 0.5);
	return reverb(mix(hit, p1, p2, low), 0.25, 0.8, 0.6);
};

// 啵：短正弦拨音
S.pluck = () => reverb(tone(0.4, (t) => 380 + 260 * Math.exp(-t / 0.02), (t) => envAD(t, 0.002, 0.07)), 0.3, 1, 0.8);

// 极短高音嗒（进度点）
S.tick = () => reverb(tone(0.06, 2100, (t) => envAD(t, 0.0005, 0.012)), 0.2, 0.6, 0.3);

// 重击：字砸下来
S.hit = () => {
	const sub = tone(0.9, (t) => 70 - 38 * Math.min(1, t / 0.25), (t) => envAD(t, 0.002, 0.22));
	const body = tone(0.4, (t) => 190 - 80 * Math.min(1, t / 0.08), (t) => envAD(t, 0.001, 0.05) * 0.6);
	const crack = biquad(noiseBuf(0.3, (t) => envAD(t, 0.0008, 0.03)), 'lp', 3500);
	return reverb(mix(sub, body, gain(crack, 0.8)), 0.28, 1.2, 1.0);
};
// 次重击（重点词二次砸下）
S.hit2 = () => {
	const sub = tone(0.6, (t) => 95 - 40 * Math.min(1, t / 0.15), (t) => envAD(t, 0.002, 0.12));
	const crack = biquad(noiseBuf(0.2, (t) => envAD(t, 0.0008, 0.02)), 'bp', 2200, 0.9);
	return reverb(mix(sub, gain(crack, 0.9)), 0.25, 1, 0.8);
};

// 主题词的大低音
S.boom = () => {
	const sub = tone(2.6, (t) => 52 - 24 * Math.min(1, t / 0.6), (t) => envAD(t, 0.003, 0.7));
	const rumble = biquad(noiseBuf(2.6, (t) => envAD(t, 0.005, 0.5)), 'lp', 220);
	const crack = biquad(noiseBuf(0.4, (t) => envAD(t, 0.0008, 0.05)), 'lp', 5000);
	const shimmer = tone(2.6, 1318.5, (t) => envAD(t - 0.02, 0.01, 0.6) * 0.05);
	return reverb(mix(sub, gain(rumble, 0.9), gain(crack, 0.7), shimmer), 0.35, 1.4, 2.0);
};

// 蓄力上升（主题词前）
S.riser = () => {
	const n = biquad(noiseBuf(0.85, (t) => (t / 0.85) ** 2.5), 'bp', (t) => 400 + 5000 * (t / 0.85) ** 2, 2.5);
	const tn = tone(0.85, (t) => 110 + 330 * (t / 0.85) ** 2, (t) => (t / 0.85) ** 3 * 0.25, 'tri');
	return mix(n, tn);
};

// 闷响（重物落下）
S.thud = () => {
	const t1 = tone(0.5, (t) => 95 - 45 * Math.min(1, t / 0.1), (t) => envAD(t, 0.001, 0.08));
	const n = biquad(noiseBuf(0.3, (t) => envAD(t, 0.001, 0.02)), 'lp', 500);
	return reverb(mix(t1, n), 0.15, 0.8, 0.4);
};

// 噼啪（争吵）
S.zap = () => {
	const b = buf(0.6);
	for (let k = 0; k < 22; k++) {
		const at = Math.floor(rnd() * 0.42 * SR);
		const len = Math.floor((0.002 + rnd() * 0.01) * SR);
		const amp = 0.4 + rnd() * 0.6;
		for (let i = 0; i < len && at + i < b.length; i++) b[at + i] += noise() * amp * (1 - i / len);
	}
	const buzz = tone(0.45, 120, (t) => (t < 0.4 ? 0.25 : 0), 'square');
	return reverb(mix(biquad(b, 'hp', 1500), biquad(buzz, 'lp', 900)), 0.2, 0.8, 0.5);
};

// 嘶：下降的冷气声（降温）
S.hiss_down = () => biquad(noiseBuf(1.0, (t) => Math.min(1, t / 0.05) * Math.max(0, 1 - t / 1.0) ** 1.5), 'bp', (t) => 7000 - 6200 * Math.min(1, t / 0.9), 1.5);

// 粒子声：一串细碎高音
S.particles = () => {
	const parts = [];
	for (let k = 0; k < 28; k++) {
		const at = rnd() * 1.0;
		const f = 2200 + rnd() * 3000;
		const amp = (1 - at) * (0.4 + rnd() * 0.6);
		parts.push(tone(1.2, f, (t) => envAD(t - at, 0.001, 0.02) * amp));
	}
	return reverb(mix(...parts), 0.4, 1.1, 1.0);
};

// 舞台灯打开：沉闷的「咚」+ 一点电流嗡声
S.lamp = () => {
	const chunk = tone(0.6, (t) => 75 - 30 * Math.min(1, t / 0.08), (t) => envAD(t, 0.001, 0.07));
	const click = biquad(noiseBuf(0.1, (t) => envAD(t, 0.0005, 0.008)), 'bp', 2500, 1.5);
	const hum = tone(1.2, 100, (t) => Math.min(1, t / 0.15) * Math.max(0, 1 - t / 1.2) * 0.12, 'tri');
	return reverb(mix(chunk, gain(click, 0.7), biquad(hum, 'lp', 600)), 0.3, 1.2, 1.0);
};
// 舞台灯关掉：咔 + 下沉
S.lamp_off = () => {
	const click = biquad(noiseBuf(0.1, (t) => envAD(t, 0.0005, 0.006)), 'bp', 2200, 1.5);
	const drop = tone(0.8, (t) => 160 * Math.exp(-t / 0.25) + 40, (t) => envAD(t, 0.002, 0.18) * 0.6);
	return reverb(mix(click, drop), 0.35, 1.3, 1.2);
};

// 穿过心脏：低频涌起 + 闷响（转场）
S.dive = () => {
	const swell = biquad(noiseBuf(1.2, (t) => (t < 0.9 ? (t / 0.9) ** 2 : Math.max(0, 1 - (t - 0.9) / 0.3))), 'lp', (t) => 150 + 900 * (t / 1.2) ** 2, 1.5);
	const sub = tone(1.6, (t) => 45 + 25 * Math.min(1, t / 0.9), (t) => (t < 0.9 ? (t / 0.9) ** 2 : Math.exp(-(t - 0.9) / 0.25)) * 0.8);
	const thump = tone(0.8, (t) => 70 - 30 * Math.min(1, t / 0.1), (t) => envAD(t - 0.9, 0.002, 0.15));
	return reverb(mix(swell, sub, thump), 0.3, 1.4, 1.2);
};
// 相机闪光：高频「嗞」+ 咔
S.flash = () => {
	const zap = tone(0.4, (t) => 5200 - 3000 * Math.min(1, t / 0.3), (t) => envAD(t, 0.002, 0.08) * 0.25);
	const click = biquad(noiseBuf(0.1, (t) => envAD(t, 0.0005, 0.01)), 'hp', 3000);
	return reverb(mix(zap, click), 0.35, 1, 0.8);
};
// 冰裂
S.crack = () => {
	const b = buf(0.5);
	for (let k = 0; k < 9; k++) {
		const at = Math.floor((k * 0.03 + rnd() * 0.02) * SR);
		const len = Math.floor(0.004 * SR);
		for (let i = 0; i < len && at + i < b.length; i++) b[at + i] += noise() * (1 - i / len) * (1 - k / 10);
	}
	const ring = tone(0.5, 3100, (t) => envAD(t, 0.001, 0.06) * 0.2);
	return reverb(mix(biquad(b, 'hp', 1800), ring), 0.3, 0.9, 0.6);
};
// 碎裂：一串高频碎片
S.shatter = () => {
	const parts = [];
	for (let k = 0; k < 18; k++) {
		const at = rnd() * 0.25;
		parts.push(tone(0.7, 2500 + rnd() * 4000, (t) => envAD(t - at, 0.0005, 0.03 + rnd() * 0.04) * (0.3 + rnd() * 0.5)));
	}
	const hit = biquad(noiseBuf(0.3, (t) => envAD(t, 0.0005, 0.03)), 'hp', 2000);
	return reverb(mix(hit, ...parts), 0.35, 1, 0.8);
};
// 水滴（融化）
S.drip = () => reverb(tone(0.35, (t) => 900 + 1400 * Math.exp(-t / 0.015), (t) => envAD(t, 0.001, 0.05)), 0.4, 1.1, 0.8);
// 温暖的钟声
S.chime = () => {
	const fs = [880, 1318.5, 1760];
	return reverb(mix(...fs.map((f, i) => tone(2.2, f, (t) => envAD(t, 0.003, 0.5 - i * 0.12) * (0.5 - i * 0.12)))), 0.4, 1.3, 1.5);
};

// ---------- 底噪（每节一套） ----------
const LONG = 45;
S.bed_dark = () => {
	const drone = tone(LONG, (t) => 55 + Math.sin(t * 0.3) * 0.4, () => 0.5);
	const fifth = tone(LONG, 82.4, (t) => 0.18 * (0.6 + 0.4 * Math.sin(t * 0.21)));
	const air = biquad(noiseBuf(LONG, (t) => 0.35 * (0.6 + 0.4 * Math.sin(t * 0.37 + 1))), 'lp', (t) => 300 + 150 * Math.sin(t * 0.25));
	return gain(mix(drone, fifth, air), 0.7);
};
S.bed_warm = () => {
	const notes = [65.41, 98.0, 261.63, 329.63, 392.0];
	const amps = [0.4, 0.22, 0.07, 0.05, 0.05];
	const parts = notes.map((f, i) => tone(LONG, (t) => f * (1 + 0.0015 * Math.sin(t * (0.4 + i * 0.1))), (t) => amps[i] * (0.75 + 0.25 * Math.sin(t * (0.5 + i * 0.13) + i))));
	const air = biquad(noiseBuf(LONG, () => 0.12), 'lp', 900);
	return reverb(mix(...parts, air), 0.25, 1.3, 1.5);
};
S.bed_tick = () => {
	const bpm = 96;
	const beat = 60 / bpm;
	const out = buf(LONG);
	for (let k = 0; k * beat < LONG; k++) {
		const t0 = k * beat;
		const kick = tone(0.25, (t) => 90 - 40 * Math.min(1, t / 0.05), (t) => envAD(t, 0.001, 0.05) * 0.35);
		const hat = biquad(noiseBuf(0.08, (t) => envAD(t, 0.0005, 0.012) * 0.12), 'hp', 7000);
		const i0 = Math.floor(t0 * SR);
		const ih = Math.floor((t0 + beat / 2) * SR);
		for (let i = 0; i < kick.length && i0 + i < out.length; i++) out[i0 + i] += kick[i];
		for (let i = 0; i < hat.length && ih + i < out.length; i++) out[ih + i] += hat[i];
	}
	const pad = mix(
		tone(LONG, 220, (t) => 0.06 * (0.7 + 0.3 * Math.sin(t * 0.4))),
		tone(LONG, 277.18, (t) => 0.04 * (0.7 + 0.3 * Math.sin(t * 0.33 + 1))),
		tone(LONG, 329.63, (t) => 0.04 * (0.7 + 0.3 * Math.sin(t * 0.29 + 2))),
		tone(LONG, 55, () => 0.12)
	);
	return reverb(mix(out, pad), 0.2, 1.1, 1.2);
};

// 第四节 回忆：八音盒式的慢琶音 + 暖垫
S.bed_memory = () => {
	const notes = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46];
	const out = buf(LONG);
	const step = 0.75;
	for (let k = 0; k * step < LONG; k++) {
		const f = notes[k % notes.length];
		const n = tone(1.6, f, (t) => envAD(t, 0.002, 0.45) * 0.12);
		const i0 = Math.floor(k * step * SR);
		for (let i = 0; i < n.length && i0 + i < out.length; i++) out[i0 + i] += n[i];
	}
	const pad = mix(tone(LONG, 130.81, () => 0.16), tone(LONG, 196, (t) => 0.08 * (0.7 + 0.3 * Math.sin(t * 0.3))));
	return reverb(mix(out, biquad(pad, 'lp', 700)), 0.35, 1.3, 1.5);
};
// 第五节 实验室：低频脉冲 + 冷空气
S.bed_lab = () => {
	const drone = tone(LONG, 49, (t) => 0.35 * (0.8 + 0.2 * Math.sin(t * 2 * Math.PI * 0.5)));
	const hi = tone(LONG, 1975, (t) => 0.012 * (0.5 + 0.5 * Math.sin(t * 0.7)));
	const air = biquad(noiseBuf(LONG, () => 0.18), 'bp', (t) => 900 + 300 * Math.sin(t * 0.2), 0.8);
	return reverb(mix(drone, hi, air), 0.25, 1.2, 1.2);
};
// 第六节 追与逃：110bpm 的紧张脉冲
S.bed_chase = () => {
	const beat = 60 / 110;
	const out = buf(LONG);
	for (let k = 0; k * beat < LONG; k++) {
		const kick = tone(0.3, (t) => 85 - 40 * Math.min(1, t / 0.05), (t) => envAD(t, 0.001, 0.06) * 0.45);
		const i0 = Math.floor(k * beat * SR);
		for (let i = 0; i < kick.length && i0 + i < out.length; i++) out[i0 + i] += kick[i];
		if (k % 2 === 1) {
			const sn = biquad(noiseBuf(0.15, (t) => envAD(t, 0.001, 0.03) * 0.15), 'bp', 1800, 1);
			for (let i = 0; i < sn.length && i0 + i < out.length; i++) out[i0 + i] += sn[i];
		}
	}
	const pad = mix(tone(LONG, 110, () => 0.1), tone(LONG, 130.81, () => 0.06), tone(LONG, 164.81, (t) => 0.05 * (0.6 + 0.4 * Math.sin(t))));
	return reverb(mix(out, pad), 0.2, 1, 1);
};
// 第七节 希望：大调暖垫 + 慢琶音
S.bed_hope = () => {
	const chord = [261.63, 329.63, 392, 523.25];
	const pad = mix(...chord.map((f, i) => tone(LONG, f, (t) => (0.07 - i * 0.01) * (0.75 + 0.25 * Math.sin(t * (0.3 + i * 0.07) + i)))));
	const out = buf(LONG);
	const arp = [523.25, 659.25, 783.99, 1046.5];
	for (let k = 0; k * 0.5 < LONG; k++) {
		const n = tone(1.2, arp[k % 4], (t) => envAD(t, 0.003, 0.3) * 0.06);
		const i0 = Math.floor(k * 0.5 * SR);
		for (let i = 0; i < n.length && i0 + i < out.length; i++) out[i0 + i] += n[i];
	}
	return reverb(mix(pad, out, tone(LONG, 65.41, () => 0.12)), 0.35, 1.4, 1.5);
};
// 第八节 收尾：开头的低频垫回来，加一点暖色
S.bed_end = () => {
	const drone = tone(LONG, 55, () => 0.4);
	const warm = mix(tone(LONG, 220, (t) => 0.05 * (0.6 + 0.4 * Math.sin(t * 0.4))), tone(LONG, 277.18, (t) => 0.035 * (0.6 + 0.4 * Math.sin(t * 0.33))));
	const air = biquad(noiseBuf(LONG, () => 0.2), 'lp', 350);
	return reverb(mix(drone, warm, air), 0.3, 1.3, 1.5);
};

console.log(`合成音效 → ${OUT}`);
// 底噪电平：按各节实测响度微调，让全片各节平均响度接近
const BED_PEAK = {bed_dark: -6, bed_warm: -6, bed_tick: -3.5, bed_memory: -4, bed_lab: -6, bed_chase: -3.5, bed_hope: -3, bed_end: -5};
for (const [name, fn] of Object.entries(S)) {
	const isBed = name.startsWith('bed_');
	writeWav(name, fn(), isBed ? BED_PEAK[name] ?? -6 : -1);
}
