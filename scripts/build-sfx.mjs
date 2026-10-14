#!/usr/bin/env node
/**
 * 根据 src/data/script.json 合成整条音效轨（48kHz / 16bit 单声道 wav）。
 * - 不用任何音频素材，全部由正弦/三角波合成；唯一的噪声类音效 spray 先经 4 阶高通 100Hz、4 阶低通再压低电平。
 * - 三档峰值：弱 -24 dBFS、中 -16 dBFS、强 -8 dBFS（可用 gainDb 再往下压）。
 * - 每个音效首尾 15ms 淡入淡出；叠加后在总线上做前瞻限幅（上限 -7 dBFS），不削波。
 * - 没有音效的地方写入数字静音（全 0）。
 *
 * 用法：node scripts/build-sfx.mjs [--comp preview|full] [--stems out/sfx-stems]
 */
import fs from 'node:fs';
import path from 'node:path';

const SR = 48000;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/script.json'), 'utf8'));
const args = process.argv.slice(2);
const argOf = (name, dflt) => {
	const i = args.indexOf(name);
	return i >= 0 ? args[i + 1] : dflt;
};
const comp = argOf('--comp', 'preview');
const stemsDir = argOf('--stems', null);
const fps = data.fps;
const SPF = SR / fps;

const screens =
	comp === 'full' ? data.screens : data.screens.filter((s) => data.preview.sections.includes(s.section));
const durationFrames =
	Math.max(...screens.map((s) => s.endFrame)) + (comp === 'full' ? 30 : data.preview.tailFrames);
const totalSamples = Math.round(durationFrames * SPF);

const dbToLin = (db) => 10 ** (db / 20);
const linToDb = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const TIER_DB = data.sfxTiersDbfs;
const BUS_CEILING = dbToLin(-7);
const EDGE_FADE = Math.round(0.015 * SR);

// ---------- 基础工具 ----------
const buf = (sec) => new Float64Array(Math.round(sec * SR));
const attackEnv = (t, a) => (t < a ? 0.5 - 0.5 * Math.cos((Math.PI * t) / a) : 1);

/** 相位连续的变频正弦：freqAt(t) 返回 Hz */
const sweep = (out, freqAt, ampAt, startSec = 0, phase0 = 0) => {
	let ph = phase0;
	const s0 = Math.round(startSec * SR);
	for (let i = s0; i < out.length; i++) {
		const t = (i - s0) / SR;
		ph += (2 * Math.PI * freqAt(t)) / SR;
		out[i] += Math.sin(ph) * ampAt(t);
	}
	return out;
};

/** RBJ 双二阶滤波 */
const biquad = (x, type, f0, q = Math.SQRT1_2) => {
	const w = (2 * Math.PI * f0) / SR;
	const cw = Math.cos(w);
	const al = Math.sin(w) / (2 * q);
	let b0, b1, b2;
	if (type === 'lp') {
		b0 = (1 - cw) / 2;
		b1 = 1 - cw;
		b2 = (1 - cw) / 2;
	} else {
		b0 = (1 + cw) / 2;
		b1 = -(1 + cw);
		b2 = (1 + cw) / 2;
	}
	const a0 = 1 + al;
	const a1 = -2 * cw;
	const a2 = 1 - al;
	const y = new Float64Array(x.length);
	let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
	for (let i = 0; i < x.length; i++) {
		const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
		x2 = x1;
		x1 = x[i];
		y2 = y1;
		y1 = v;
		y[i] = v;
	}
	return y;
};
/** 4 阶 Butterworth（两级双二阶） */
const butter4 = (x, type, f0) =>
	biquad(biquad(x, type, f0, 0.5412), type, f0, 1.3066);

const mixInto = (out, src, gain = 1, atSec = 0) => {
	const o = Math.round(atSec * SR);
	for (let i = 0; i < src.length && i + o < out.length; i++) {
		if (i + o >= 0) out[i + o] += src[i] * gain;
	}
	return out;
};

let seed = 12345;
const rnd = () => {
	seed = (seed * 1103515245 + 12345) & 0x7fffffff;
	return seed / 0x7fffffff;
};

// ---------- 音色 ----------
/** 每个音色返回 {b: 采样, pre: 音效起点早于 cue 的秒数} */
const V = {
	drop(tier) {
		const mid = tier !== 'weak';
		const b = buf(0.45);
		const f0 = mid ? 520 : 760;
		const f1 = mid ? 1080 : 1450;
		sweep(b, (t) => f0 + (f1 - f0) * (1 - Math.exp(-t / 0.012)), (t) => attackEnv(t, 0.01) * Math.exp(-t / 0.075));
		sweep(b, (t) => (f0 + (f1 - f0) * (1 - Math.exp(-t / 0.012))) / 2, (t) => 0.25 * attackEnv(t, 0.01) * Math.exp(-t / 0.06));
		if (!mid) return {b, pre: 0};
		const m = buf(1.6);
		mixInto(m, b);
		sweep(m, (t) => 200 - 40 * Math.min(1, t / 0.08), (t) => 0.45 * attackEnv(t, 0.012) * Math.exp(-t / 0.07));
		// 落地后的柔和余韵（D5 + A5）
		sweep(m, () => 587.33, (t) => 0.32 * attackEnv(t, 0.03) * Math.exp(-t / 0.55));
		sweep(m, () => 880, (t) => 0.16 * attackEnv(t, 0.03) * Math.exp(-t / 0.4), 0, 1.1);
		return {b: m, pre: 0};
	},
	drops() {
		const b = buf(0.9);
		[0, 0.17, 0.34].forEach((at, i) => mixInto(b, V.drop('weak').b, 1 - i * 0.15, at));
		return {b, pre: 0};
	},
	pad(_tier, len = 4.0) {
		const b = buf(len);
		const notes = [146.83, 220.0, 293.66, 369.99];
		const rel = Math.min(1.6, len * 0.4);
		const env = (t) => {
			const a = Math.min(1, t / 1.2);
			const r = t > len - rel ? Math.max(0, (len - t) / rel) : 1;
			return Math.sin((a * Math.PI) / 2) ** 2 * Math.sin((r * Math.PI) / 2) ** 2;
		};
		// 每个音只用一个声部（不做失谐），避免拍频造成的峰值堆叠
		notes.forEach((n, i) => {
			const g = [0.5, 0.36, 0.26, 0.16][i];
			sweep(b, () => n, (t) => g * env(t), 0, i * 1.3);
		});
		return {b, pre: 0};
	},
	chord(tier) {
		return V.pad(tier, 2.4);
	},
	swell(tier) {
		return V.pad(tier, 2.6);
	},
	glass() {
		const b = buf(1.8);
		[
			[880, 1, 0.9],
			[1760, 0.22, 0.5],
			[2650, 0.07, 0.25],
		].forEach(([f, g, tau]) => sweep(b, () => f, (t) => g * attackEnv(t, 0.01) * Math.exp(-t / tau)));
		return {b, pre: 0};
	},
	impact() {
		const pre = 0.6;
		const b = buf(pre + 3.4);
		// 预先上扬的柔和和弦，落地后慢慢收尾
		[146.83, 220.0, 293.66, 369.99].forEach((n, i) => {
			const g = [0.5, 0.38, 0.28, 0.18][i];
			sweep(
				b,
				() => n,
				(t) => {
					const u = t - pre;
					return 0.6 * g * (u < 0 ? (t / pre) ** 2 : Math.exp(-u / 2.0));
				},
				0,
				i * 1.3,
			);
		});
		// 落地的“身体”：220→147Hz，柔和不轰
		const body = buf(1.2);
		sweep(body, (t) => 147 + 73 * Math.exp(-t / 0.03), (t) => attackEnv(t, 0.012) * Math.exp(-t / 0.35));
		sweep(body, (t) => 2 * (147 + 73 * Math.exp(-t / 0.03)), (t) => 0.25 * attackEnv(t, 0.012) * Math.exp(-t / 0.2));
		mixInto(b, body, 0.7, pre);
		mixInto(b, V.glass().b, 0.45, pre);
		return {b, pre};
	},
	spray() {
		// 噪声类：150Hz 4 阶高通切掉轰鸣，3.6k+4.5k 两级 4 阶低通切掉 6kHz 以上的嘶声，再加包络
		const n = buf(0.5);
		for (let i = 0; i < n.length; i++) n[i] = rnd() * 2 - 1;
		let f = butter4(n, 'hp', 150);
		f = butter4(f, 'lp', 3600);
		f = butter4(f, 'lp', 4500);
		for (let i = 0; i < f.length; i++) {
			const t = i / SR;
			f[i] *= attackEnv(t, 0.015) * Math.exp(-t / 0.09);
		}
		return {b: f, pre: 0};
	},
	slide() {
		const T = 0.6;
		const b = buf(T);
		const fr = (t) => 392 * (523.25 / 392) ** (t / T);
		sweep(b, fr, (t) => Math.sin((Math.PI * t) / T) ** 2);
		sweep(b, (t) => fr(t) / 2, (t) => 0.4 * Math.sin((Math.PI * t) / T) ** 2);
		return {b, pre: 0.15};
	},
	thud() {
		const b = buf(0.6);
		sweep(b, (t) => 131 + 65 * Math.exp(-t / 0.03), (t) => attackEnv(t, 0.01) * Math.exp(-t / 0.12));
		sweep(b, (t) => 2 * (131 + 65 * Math.exp(-t / 0.03)), (t) => 0.3 * attackEnv(t, 0.01) * Math.exp(-t / 0.06));
		return {b, pre: 0};
	},
	rise() {
		const T = 1.3;
		const b = buf(T);
		const fr = (t) => 330 * 2 ** (t / T);
		const env = (t) => Math.sin((Math.PI * t) / T) ** 1.5;
		sweep(b, fr, env);
		sweep(b, (t) => fr(t) * 1.5, (t) => 0.25 * env(t));
		return {b, pre: 0};
	},
	pulse() {
		const T = 0.9;
		const b = buf(T);
		const env = (t) => Math.sin((Math.PI * t) / T) ** 2;
		sweep(b, () => 110, env);
		sweep(b, () => 220, (t) => 0.4 * env(t));
		return {b, pre: 0};
	},
	tick() {
		const b = buf(0.3);
		sweep(b, () => 1046.5, (t) => attackEnv(t, 0.01) * Math.exp(-t / 0.05));
		sweep(b, () => 523.25, (t) => 0.4 * attackEnv(t, 0.01) * Math.exp(-t / 0.06));
		return {b, pre: 0};
	},
	ticks() {
		const b = buf(0.9);
		[0, 0.25, 0.5].forEach((at) => mixInto(b, V.tick().b, 1, at));
		return {b, pre: 0};
	},
	bubble() {
		const b = buf(0.5);
		[0, 0.09, 0.2].forEach((at, i) => {
			const one = buf(0.15);
			sweep(one, (t) => (500 + i * 120) * (1 + t / 0.06), (t) => attackEnv(t, 0.01) * Math.exp(-t / 0.035));
			mixInto(b, one, 1 - i * 0.2, at);
		});
		return {b, pre: 0};
	},
	steps() {
		const b = buf(0.9);
		[0, 0.42].forEach((at) => {
			const one = buf(0.3);
			sweep(one, (t) => 150 + 40 * Math.exp(-t / 0.02), (t) => attackEnv(t, 0.01) * Math.exp(-t / 0.07));
			mixInto(b, one, 1, at);
		});
		return {b, pre: 0};
	},
	arc() {
		const T = 1.6;
		const b = buf(T);
		const fr = (t) => (t < T / 2 ? 440 - 110 * (t / (T / 2)) : 330 + 164 * ((t - T / 2) / (T / 2)));
		sweep(b, fr, (t) => Math.sin((Math.PI * t) / T) ** 1.2);
		return {b, pre: 0};
	},
	breath() {
		const T = 2.6;
		const b = buf(T);
		const env = (t) => Math.sin((Math.PI * t) / T) ** 2;
		sweep(b, () => 220, env);
		sweep(b, () => 330, (t) => 0.35 * env(t));
		return {b, pre: 0};
	},
	valve() {
		const T = 0.8;
		const b = buf(T);
		const fr = (t) => 160 + 80 * (t / T);
		const env = (t) => attackEnv(t, 0.02) * Math.exp(-t / 0.35);
		[1, 3].forEach((h, i) => sweep(b, (t) => fr(t) * h, (t) => (i ? 0.15 : 1) * env(t)));
		return {b, pre: 0};
	},
};


const finishEvent = (b, peakLin) => {
	const x = biquad(b, 'hp', 40);
	let peak = 0;
	for (const v of x) peak = Math.max(peak, Math.abs(v));
	const g = peak > 0 ? peakLin / peak : 0;
	for (let i = 0; i < x.length; i++) {
		let e = 1;
		if (i < EDGE_FADE) e = 0.5 - 0.5 * Math.cos((Math.PI * i) / EDGE_FADE);
		const fromEnd = x.length - 1 - i;
		if (fromEnd < EDGE_FADE) e *= 0.5 - 0.5 * Math.cos((Math.PI * fromEnd) / EDGE_FADE);
		x[i] *= g * e;
	}
	return x;
};

// ---------- 时间轴 ----------
const cueFrames = (s, name) => {
	if (name === 'start') return [s.startFrame];
	const v = s.cues[name];
	if (v === undefined) throw new Error(`screen ${s.id}: cue ${name} missing`);
	return (Array.isArray(v) ? v : [v]).map((x) => s.startFrame + x);
};

const bus = new Float64Array(totalSamples);
const events = [];
for (const s of screens) {
	for (const sfx of s.sfx) {
		const voice = V[sfx.type];
		if (!voice) throw new Error(`screen ${s.id}: unknown sfx type ${sfx.type}`);
		for (const fr of cueFrames(s, sfx.cue)) {
			if (fr >= durationFrames) continue;
			const {b, pre} = voice(sfx.tier);
			const peakDb = TIER_DB[sfx.tier] + (sfx.gainDb ?? 0);
			const x = finishEvent(b, dbToLin(peakDb));
			const start = fr / fps - pre;
			mixInto(bus, x, 1, start);
			events.push({screen: s.id, type: sfx.type, tier: sfx.tier, frame: fr, sec: +(fr / fps).toFixed(2), peakDb, x});
		}
	}
}

// ---------- 总线前瞻限幅 ----------
const L = Math.round(0.005 * SR);
const req = new Float64Array(totalSamples);
for (let i = 0; i < totalSamples; i++) {
	const a = Math.abs(bus[i]);
	req[i] = a > BUS_CEILING ? BUS_CEILING / a : 1;
}
const minF = new Float64Array(totalSamples);
for (let i = 0; i < totalSamples; i++) {
	let m = 1;
	for (let k = i; k < Math.min(totalSamples, i + L); k++) if (req[k] < m) m = req[k];
	minF[i] = m;
}
const relCoef = 1 - Math.exp(-1 / (0.08 * SR));
let gPrev = 1;
let limited = 0;
let acc = 0;
for (let i = 0; i < totalSamples; i++) {
	acc += minF[i] - (i >= L ? minF[i - L] : 1);
	const avg = (acc + L) / L;
	const g = Math.min(avg, gPrev + (1 - gPrev) * relCoef);
	if (g < 0.9999) limited++;
	bus[i] *= g;
	gPrev = g;
}

// ---------- 片尾淡出：与画面最后 18 帧的淡出同步，保证末样本为 0、不会被截断出咔哒声 ----------
const tailFade = Math.round((18 / fps) * SR);
for (let i = 0; i < tailFade; i++) {
	const k = totalSamples - 1 - i;
	bus[k] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / tailFade);
}

// ---------- 写文件 ----------
const writeWav = (file, x) => {
	const n = x.length;
	// 双声道（两声道相同）：单声道进 Remotion 会按声像定律衰减 3dB
	const ch = 2;
	const b = Buffer.alloc(44 + n * 2 * ch);
	b.write('RIFF', 0);
	b.writeUInt32LE(36 + n * 2 * ch, 4);
	b.write('WAVE', 8);
	b.write('fmt ', 12);
	b.writeUInt32LE(16, 16);
	b.writeUInt16LE(1, 20);
	b.writeUInt16LE(ch, 22);
	b.writeUInt32LE(SR, 24);
	b.writeUInt32LE(SR * 2 * ch, 28);
	b.writeUInt16LE(2 * ch, 32);
	b.writeUInt16LE(16, 34);
	b.write('data', 36);
	b.writeUInt32LE(n * 2 * ch, 40);
	for (let i = 0; i < n; i++) {
		const v = Math.round(Math.max(-1, Math.min(1, x[i])) * 32767);
		for (let c = 0; c < ch; c++) b.writeInt16LE(v, 44 + (i * ch + c) * 2);
	}
	fs.mkdirSync(path.dirname(file), {recursive: true});
	fs.writeFileSync(file, b);
};

const outFile = path.join(root, 'public/audio', `${comp}.wav`);
writeWav(outFile, bus);
if (stemsDir) {
	for (const e of events) {
		writeWav(path.join(root, stemsDir, `s${String(e.screen).padStart(2, '0')}-${e.type}-f${e.frame}.wav`), e.x);
	}
}

let busPeak = 0;
for (const v of bus) busPeak = Math.max(busPeak, Math.abs(v));
console.log(`wrote ${path.relative(root, outFile)}  ${(totalSamples / SR).toFixed(2)}s  ${events.length} events`);
console.log(`bus peak ${linToDb(busPeak).toFixed(2)} dBFS, limiter active on ${limited} samples`);
for (const e of events) {
	console.log(`  s${e.screen}\t${e.sec}s\t${e.type}\t${e.tier}\t${e.peakDb} dBFS`);
}
