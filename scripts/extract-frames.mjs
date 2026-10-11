/**
 * 每 2 秒抽一帧，并拼成联系表，便于人工逐帧检查。
 * 用法：node scripts/extract-frames.mjs out/preview.mp4 out/frames
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [input = 'out/preview.mp4', outDir = 'out/frames'] = process.argv.slice(2);
fs.rmSync(outDir, {recursive: true, force: true});
fs.mkdirSync(outDir, {recursive: true});
// 按帧号精确抽取：第 0、60、120… 帧（30fps 下即 0s、2s、4s…）
execFileSync(
	'ffmpeg',
	['-v', 'error', '-i', input, '-vf', "select='not(mod(n\\,60))'", '-vsync', 'vfr', '-q:v', '3', path.join(outDir, 'f_%03d.jpg')],
	{stdio: 'inherit'}
);
const files = fs.readdirSync(outDir).filter((f) => f.startsWith('f_')).sort();
files.forEach((f, i) => {
	const t = i * 2;
	fs.renameSync(path.join(outDir, f), path.join(outDir, `t${String(t).padStart(3, '0')}s.jpg`));
});
console.log(`抽出 ${files.length} 帧 → ${outDir}`);
