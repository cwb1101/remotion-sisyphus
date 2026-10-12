// 用法：node scripts/retime.mjs <屏id> <新时长帧数> —— 修改某屏时长，后面所有屏整体顺移
import fs from 'node:fs';
const [id, durStr] = process.argv.slice(2);
const p = 'src/data/subtitles.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const i = d.screens.findIndex((s) => s.id === id);
if (i < 0) throw new Error(`没有屏 ${id}`);
const s = d.screens[i];
const delta = Number(durStr) - (s.end - s.start);
s.end += delta;
for (const t of d.screens.slice(i + 1)) {
  t.start += delta;
  t.end += delta;
}
fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
console.log(`${id}: ${s.start}-${s.end}，其后 ${d.screens.length - i - 1} 屏顺移 ${delta} 帧`);
