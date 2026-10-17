// 统计每屏停留时长 用法 node scripts/timing-report.mjs [preview|full]
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const data = JSON.parse(readFileSync(fileURLToPath(new URL('../src/data/script.json', import.meta.url)), 'utf8'));
const mode = process.argv[2] ?? 'preview';
const fps = data.meta.fps;
const chapters = mode === 'full' ? data.chapters.map((c) => c.index) : data.meta.previewChapters;
const screens = data.screens.filter((s) => chapters.includes(s.chapter));
const dur = (s) => s.end - s.start;
const chars = (s) => [...s.text.replace(/\s/g, '')].length;

let gaps = 0;
for (let i = 1; i < screens.length; i++) if (screens[i].start !== screens[i - 1].end) gaps++;
for (const s of screens) {
	const d = dur(s);
	console.log(`屏${String(s.id).padStart(2)} ${String(s.start).padStart(4)}-${String(s.end).padEnd(4)} ${String(chars(s)).padStart(2)}字 ${String(d).padStart(2)}帧 ${(d / fps).toFixed(2)}s 读速${(chars(s) / (d / fps)).toFixed(1)}字每秒 ${s.text}`);
}
const total = screens.reduce((a, s) => a + dur(s), 0);
const longest = screens.reduce((a, s) => (dur(s) > dur(a) ? s : a));
const shortest = screens.reduce((a, s) => (dur(s) < dur(a) ? s : a));
console.log(`\n${screens.length} 屏 共 ${total} 帧 ${(total / fps).toFixed(2)} 秒`);
console.log(`平均每屏 ${(total / screens.length).toFixed(1)} 帧 ${(total / screens.length / fps).toFixed(2)} 秒`);
console.log(`最长 屏${longest.id} ${dur(longest)} 帧 ${(dur(longest) / fps).toFixed(2)} 秒 ${longest.text}`);
console.log(`最短 屏${shortest.id} ${dur(shortest)} 帧 ${(dur(shortest) / fps).toFixed(2)} 秒 ${shortest.text}`);
console.log(`超过 3 秒的屏 ${screens.filter((s) => dur(s) > 90).length} 个  屏间空档 ${gaps} 处`);
