// 按 字数 乘 4 帧 加 10 帧 重新计算每屏的开始帧和结束帧 并重建章节表
// 改字幕后运行 npm run retime 只会改写 src/data/script.json 里的帧数
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const file = fileURLToPath(new URL('../src/data/script.json', import.meta.url));
const data = JSON.parse(readFileSync(file, 'utf8'));
const {framesPerChar, padFrames, maxScreenFrames} = data.meta;

export const countChars = (text) => [...text.replace(/\s/g, '')].length;

let cursor = 0;
const problems = [];
for (const s of data.screens) {
	const frames = countChars(s.text) * framesPerChar + padFrames;
	s.start = cursor;
	s.end = cursor + frames;
	cursor = s.end;
	if (frames > maxScreenFrames) problems.push(`屏 ${s.id} 超过 ${maxScreenFrames} 帧 需要拆屏`);
	if (s.highlights.length > 2) problems.push(`屏 ${s.id} 高亮超过 2 处`);
	for (const h of s.highlights) {
		if (!s.text.includes(h.word)) problems.push(`屏 ${s.id} 找不到高亮词 ${h.word}`);
	}
}

data.chapters = data.chapterNames.map((name, index) => {
	const own = data.screens.filter((s) => s.chapter === index);
	return {index, name, start: own[0].start, end: own[own.length - 1].end};
});

writeFileSync(file, JSON.stringify(data, null, '\t') + '\n');
console.log(`${data.screens.length} 屏 共 ${cursor} 帧 ${(cursor / data.meta.fps).toFixed(2)} 秒`);
for (const c of data.chapters) console.log(`${c.name} ${c.start}-${c.end}`);
if (problems.length) {
	console.error(problems.join('\n'));
	process.exit(1);
}
