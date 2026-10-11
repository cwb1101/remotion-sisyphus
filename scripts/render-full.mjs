/**
 * 分段渲染完整片：每节一段画面（静音）→ 整片音轨单独渲染一次（避免段落接缝处断音）→ 拼接 → 合成 mp4。
 * 用法：npm run render:full   （可选：只渲染某几段 node scripts/render-full.mjs 3 4；--skip-existing 跳过已渲染的段）
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const doc = JSON.parse(fs.readFileSync('src/data/script.json', 'utf8'));
const OUT = path.resolve('out/full');
fs.mkdirSync(OUT, {recursive: true});
const argv = process.argv.slice(2);
const skipExisting = argv.includes('--skip-existing');
const only = argv.filter((a) => /^\d+$/.test(a)).map(Number);
const remotion = path.resolve('node_modules/.bin/remotion');
const browser = process.env.REMOTION_BROWSER ? ['--browser-executable', process.env.REMOTION_BROWSER] : [];
const run = (args) => execFileSync(remotion, args, {stdio: ['ignore', 'inherit', 'inherit']});

const segs = doc.sections.map((sec, i) => {
	const list = doc.screens.filter((s) => s.section === sec.id);
	return {i, id: sec.id, from: list[0].start, to: list[list.length - 1].end - 1};
});

for (const s of segs) {
	if (only.length && !only.includes(s.i)) continue;
	const file = path.join(OUT, `seg_${s.i}_${s.id}.mp4`);
	if (skipExisting && fs.existsSync(file)) {
		console.log(`跳过已存在的第 ${s.i + 1} 段`);
		continue;
	}
	console.log(`\n▶ 第 ${s.i + 1} 段 ${s.id}：帧 ${s.from}–${s.to}`);
	run(['render', 'src/index.ts', 'Full', file, `--frames=${s.from}-${s.to}`, '--muted', '--codec=h264', '--crf=18', '--log=error', ...browser]);
}

if (!only.length) {
	console.log('\n▶ 整片音轨');
	run(['render', 'src/index.ts', 'Full', path.join(OUT, 'audio.wav'), '--codec=wav', '--log=error', ...browser]);
	const list = segs.map((s) => `file '${path.join(OUT, `seg_${s.i}_${s.id}.mp4`)}'`).join('\n');
	fs.writeFileSync(path.join(OUT, 'list.txt'), list);
	execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', path.join(OUT, 'list.txt'), '-c', 'copy', path.join(OUT, 'video.mp4')], {stdio: 'inherit'});
	execFileSync(
		'ffmpeg',
		['-v', 'error', '-y', '-i', path.join(OUT, 'video.mp4'), '-i', path.join(OUT, 'audio.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', path.resolve('out/avoidant-attachment.mp4')],
		{stdio: 'inherit'}
	);
	console.log('\n✔ 成片：out/avoidant-attachment.mp4');
}
