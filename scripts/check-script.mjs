// 字幕数据校验：读速、行数/宽度、高亮数量、屏与屏不重叠、强档音效数量。
// 用法：node scripts/check-script.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/script.json'), 'utf8'));
const FONT = 64;
const LETTER = 2;
const MAX_W = 1200;
const CPS = 5;

let errors = 0;
const err = (m) => {
	errors++;
	console.log('  ✗ ' + m);
};

const width = (t) => [...t].reduce((w, ch) => w + (/[\x20-\x7e]/.test(ch) ? 0.55 : 1) * FONT + LETTER, 0);
const readable = (t) => [...t].filter((ch) => !/[，。？！：、,.?!:;；\s]/.test(ch)).length;

let prevEnd = -1;
let strong = 0;
for (const s of doc.screens) {
	const sec = (s.endFrame - s.startFrame) / doc.fps;
	const need = readable(s.text) / CPS;
	const w = width(s.text);
	const lines = Math.ceil(w / MAX_W);
	if (s.startFrame < prevEnd) err(`#${s.id} overlaps previous screen`);
	if (sec + 1e-6 < need) err(`#${s.id} "${s.text}" ${sec.toFixed(2)}s < ${need.toFixed(2)}s needed at ${CPS} chars/s`);
	if (lines > 2) err(`#${s.id} needs ${lines} lines (max 2)`);
	if (s.highlights.length > 2) err(`#${s.id} has ${s.highlights.length} highlights (max 2)`);
	for (const h of s.highlights) {
		if (!s.text.includes(h.word)) err(`#${s.id} highlight "${h.word}" not in text`);
		if (!['gold', 'blue'].includes(h.color)) err(`#${s.id} highlight color ${h.color}`);
	}
	strong += s.sfx.filter((x) => x.level === 'strong').length;
	prevEnd = s.endFrame;
}
const preview = doc.screens.filter((s) => s.id <= doc.preview.lastScreen);
console.log(`screens: ${doc.screens.length} (preview ${preview.length}), strong sfx in full script: ${strong}, in preview: ${preview.reduce((n, s) => n + s.sfx.filter((x) => x.level === 'strong').length, 0)}`);
console.log(`widest line: ${Math.max(...doc.screens.map((s) => width(s.text))).toFixed(0)}px of ${MAX_W}px`);
console.log(errors ? `${errors} problem(s)` : 'all checks passed');
process.exit(errors ? 1 : 0);
