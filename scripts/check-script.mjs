#!/usr/bin/env node
/**
 * 字幕稿硬性规范检查：每屏读得完（约 5 字/秒）、每屏最多 2 处高亮、全片最多两种强调色、
 * 主字幕 66px 单行不超过 1200px（超过则会折成两行，不得超过两行）、屏与屏不重叠。
 */
import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync(new URL('../src/data/script.json', import.meta.url), 'utf8'));
const FONT_PX = 66;
const MAX_W = 1200;
const errors = [];
const colors = new Set();
let prevEnd = 0;
for (const s of data.screens) {
	const chars = [...s.text.replace(/[，。：、？！“”,.:?!\s]/g, '')].length;
	const need = Math.ceil((chars / 5) * data.fps);
	const has = s.endFrame - s.startFrame;
	if (has < need) errors.push(`第${s.id}屏 ${chars}字 需${need}帧 只有${has}帧`);
	if (s.highlights.length > 2) errors.push(`第${s.id}屏 高亮超过 2 处`);
	s.highlights.forEach((h) => colors.add(h.color));
	const lines = Math.ceil(([...s.text].length * FONT_PX) / MAX_W);
	if (lines > 2) errors.push(`第${s.id}屏 超过两行`);
	if (s.startFrame < prevEnd) errors.push(`第${s.id}屏 与上一屏重叠`);
	prevEnd = s.endFrame;
}
if (colors.size > 2) errors.push(`强调色超过两种：${[...colors].join(' ')}`);
const maxLen = Math.max(...data.screens.map((s) => [...s.text].length));
console.log(`${data.screens.length} 屏，最长 ${maxLen} 字（${maxLen * FONT_PX}px），强调色 ${[...colors].join(' ')}`);
if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}
console.log('字幕稿检查通过');
