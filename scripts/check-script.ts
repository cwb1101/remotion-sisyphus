/**
 * 字幕稿自检：标点 / 阅读速度 / 时间重叠 / 重点词 / 行宽估算
 * 用法：node scripts/check-script.ts
 */
import {FPS, KEYWORDS, LABELS, SCREENS, SECTIONS, TOPIC} from '../src/data/script.ts';

const MAX_CPS = 5;
const FONT = 66;
const MAX_LINE = 960;
const PUNCT = /[\p{P}]/u;

const errors: string[] = [];
const warn: string[] = [];

const allOnScreen: [string, string][] = [
	['TOPIC', TOPIC],
	...SECTIONS.flatMap((s): [string, string][] => [
		[`${s.id}.title`, s.title],
		[`${s.id}.titleEn`, s.titleEn],
	]),
	...SCREENS.map((s): [string, string] => [s.id, s.text]),
	...Object.entries(KEYWORDS).map(([k, v]): [string, string] => [`KEYWORD ${k}`, v]),
	...Object.entries(LABELS).map(([k, v]): [string, string] => [`LABEL ${k}`, v]),
];
for (const [id, t] of allOnScreen) {
	const m = t.match(PUNCT);
	if (m) errors.push(`${id} 含标点「${m[0]}」：${t}`);
}

let total = 0;
for (let i = 0; i < SCREENS.length; i++) {
	const s = SCREENS[i];
	const chars = s.text.replace(/\s/g, '').length;
	total += chars;
	const sec = (s.endFrame - s.startFrame) / FPS;
	const cps = chars / sec;
	if (cps > MAX_CPS + 1e-9) errors.push(`${s.id} 读不完：${chars} 字 / ${sec.toFixed(2)}s = ${cps.toFixed(2)} 字每秒`);
	if (s.endFrame <= s.startFrame) errors.push(`${s.id} 结束帧不大于开始帧`);
	if (i > 0 && s.startFrame < SCREENS[i - 1].endFrame) errors.push(`${s.id} 与上一屏重叠`);
	const sec2 = SECTIONS.find((x) => x.id === s.section);
	if (!sec2 || s.startFrame < sec2.startFrame || s.endFrame > sec2.endFrame) errors.push(`${s.id} 超出所属小节 ${s.section}`);
	for (const h of s.highlights) if (!s.text.includes(h)) errors.push(`${s.id} 重点词「${h}」不在文字里`);
	// 行宽估算：中文按 1em，空格按 0.3em，只在空格处换行
	const words = s.text.split(' ');
	let lines = 1;
	let w = 0;
	for (const word of words) {
		const ww = word.length * FONT;
		if (ww > MAX_LINE) errors.push(`${s.id} 片段「${word}」单行放不下`);
		const add = (w > 0 ? 0.3 * FONT : 0) + ww;
		if (w + add > MAX_LINE) {
			lines++;
			w = ww;
		} else w += add;
	}
	if (lines > 2) errors.push(`${s.id} 超过两行`);
	if (lines === 2) warn.push(`${s.id} 两行显示`);
}

console.log(`字幕 ${SCREENS.length} 屏，${total} 字；小节 ${SECTIONS.length} 个，总长 ${(SECTIONS[SECTIONS.length - 1].endFrame / FPS).toFixed(1)}s`);
for (const w of warn) console.log(`提示 ${w}`);
if (errors.length) {
	for (const e of errors) console.error(`错误 ${e}`);
	process.exit(1);
}
console.log('检查通过');
