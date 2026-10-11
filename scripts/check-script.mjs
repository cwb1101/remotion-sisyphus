/**
 * 字幕稿体检：时间轴连续、重点词存在、阅读速度（≤5 字/秒）、单行宽度、音效名可合成。
 * 用法：npm run check
 */
import fs from 'node:fs';

const doc = JSON.parse(fs.readFileSync('src/data/script.json', 'utf8'));
const synth = fs.readFileSync('scripts/synth-sfx.mjs', 'utf8');
const sfxNames = new Set([...synth.matchAll(/^S\.(\w+) =/gm)].map((m) => m[1]));
const fps = doc.fps;
const MAX_CPS = 5;
const ENTER_EXIT = 12; // 入场+出场动画占用的帧（期间仍可读，但按保守口径另算一遍）

const errors = [];
const warns = [];
const readable = (t) => t.replace(/[，。、：；？！“”‘’（）—\-…\s,.:;?!"'()]/g, '').replace(/[A-Za-z]{1,2}/g, '字');
const visualLen = (t) => Array.from(t).reduce((n, ch) => n + (/[\x00-\x7F]/.test(ch) ? 0.6 : 1), 0);

let prevEnd = 0;
let totalChars = 0;
doc.screens.forEach((s, i) => {
	if (s.id !== i + 1) errors.push(`#${s.id}: id 不连续（应为 ${i + 1}）`);
	if (s.end <= s.start) errors.push(`#${s.id}: end <= start`);
	if (s.start < prevEnd) errors.push(`#${s.id}: 与上一屏重叠 ${prevEnd - s.start} 帧`);
	if (s.start > prevEnd) warns.push(`#${s.id}: 与上一屏之间空 ${s.start - prevEnd} 帧`);
	prevEnd = s.end;
	let rest = s.text;
	for (const h of s.highlights) {
		const k = rest.indexOf(h);
		if (k < 0) errors.push(`#${s.id}: 重点词「${h}」不在文字中（或顺序不对）`);
		else rest = rest.slice(k + h.length);
	}
	const n = readable(s.text).length;
	if (s.style !== 'note') totalChars += n;
	const sec = (s.end - s.start) / fps;
	const cps = n / sec;
	const effCps = n / ((s.end - s.start - ENTER_EXIT) / fps);
	if (s.style !== 'note' && cps > MAX_CPS) errors.push(`#${s.id}: ${n} 字 / ${sec.toFixed(2)}s = ${cps.toFixed(2)} 字/秒，超过 ${MAX_CPS}`);
	else if (s.style !== 'note' && effCps > MAX_CPS + 0.5)
		warns.push(`#${s.id}: 扣除入出场后 ${effCps.toFixed(2)} 字/秒，偏紧`);
	const style = s.style ?? 'normal';
	const size = style === 'normal' ? 72 : style === 'title' ? 230 : style === 'slam' ? Math.min(150, Math.floor(1720 / (visualLen(s.text) * 1.04))) : 30;
	const width = visualLen(s.text) * size * (style === 'title' ? 1.08 : 1.04);
	if (width > 1780) errors.push(`#${s.id}: 估算宽度 ${Math.round(width)}px 超出安全区`);
	if (style !== 'note' && size < 64) errors.push(`#${s.id}: 字号 ${size}px < 64px`);
	for (const c of s.sfx ?? []) if (!sfxNames.has(c.name)) errors.push(`#${s.id}: 音效 ${c.name} 没有对应的合成函数`);
	for (const c of s.sfx ?? []) if (s.start + c.at < 0) errors.push(`#${s.id}: 音效 ${c.name} 早于 0 帧`);
});
for (const sec of doc.sections) if (sec.bed && !sfxNames.has(sec.bed)) errors.push(`节 ${sec.id}: 底噪 ${sec.bed} 没有对应的合成函数`);

const last = doc.screens[doc.screens.length - 1];
console.log(`共 ${doc.screens.length} 屏，正片字幕 ${totalChars} 字，总长 ${(last.end / fps).toFixed(1)}s`);
warns.forEach((w) => console.log('  ⚠ ' + w));
errors.forEach((e) => console.log('  ✗ ' + e));
if (errors.length) {
	console.log(`体检未通过：${errors.length} 个错误`);
	process.exit(1);
}
console.log('体检通过');
