/**
 * 交片自查：
 *  1) 画面静止：相邻帧差（10fps 采样）低于阈值且持续 > 2 秒的段落
 *  2) 音频：静音段（< -45 dBFS 持续 ≥ 0.4s）、削波（采样峰值 ≥ -0.3 dBFS）、每秒响度、整体响度（EBU R128）
 * 用法：node scripts/qa.mjs out/avoidant-attachment.mp4
 */
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';

const file = process.argv[2] ?? 'out/avoidant-attachment.mp4';
const sh = (args) => execFileSync('ffmpeg', args, {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28});
const shErr = (args) => spawnSync('ffmpeg', args, {encoding: 'utf8', maxBuffer: 1 << 28}).stderr ?? '';
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

// 1) 静止画面
const motion = sh(['-v', 'error', '-i', file, '-vf', 'fps=10,scale=160:-1,gblur=sigma=2,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-an', '-f', 'null', '-']);
const diffs = [...motion.matchAll(/YAVG=([\d.]+)/g)].map((m) => Number(m[1]));
const runsBelow = (th, minSec) => {
	const out = [];
	let run = -1;
	diffs.forEach((d, i) => {
		if (d < th) {
			if (run < 0) run = i;
		} else if (run >= 0) {
			if ((i - run) / 10 > minSec) out.push([run / 10, i / 10]);
			run = -1;
		}
	});
	if (run >= 0 && (diffs.length - run) / 10 > minSec) out.push([run / 10, diffs.length / 10]);
	return out;
};
const still = runsBelow(0.12, 2); // 真正静止
const low = runsBelow(0.6, 2.5); // 只剩镜头漂移、浮尘这类微动
const avgMotion = diffs.reduce((a, b) => a + b, 0) / Math.max(1, diffs.length);

// 2) 音频
const sil = shErr(['-v', 'info', '-i', file, '-vn', '-af', 'silencedetect=n=-45dB:d=0.4', '-f', 'null', '-']);
const silences = [...sil.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
const per = sh(['-v', 'error', '-i', file, '-vn', '-af', 'asetnsamples=24000,astats=metadata=1:reset=1,ametadata=print:file=-', '-f', 'null', '-']);
const blocks = per.split('frame:').slice(1).map((b) => ({
	rms: Number((b.match(/Overall\.RMS_level=([-\d.inf]+)/) ?? [])[1]),
	peak: Number((b.match(/Overall\.Peak_level=([-\d.inf]+)/) ?? [])[1]),
}));
const clips = blocks.map((b, i) => ({t: i * 0.5, ...b})).filter((b) => b.peak >= -0.3);
const loudest = blocks.map((b, i) => ({t: i * 0.5, ...b})).sort((a, b) => b.peak - a.peak).slice(0, 8);
const r128 = shErr(['-v', 'info', '-i', file, '-vn', '-af', 'ebur128=peak=true', '-f', 'null', '-']);
const I = (r128.match(/I:\s+([-\d.]+) LUFS/g) ?? []).pop();
const TP = (r128.match(/Peak:\s+([-\d.]+) dBFS/g) ?? []).pop();
const quiet = blocks.map((b, i) => ({t: i * 0.5, ...b})).filter((b) => b.rms < -38);

const report = [
	`文件：${file}`,
	`画面：平均帧差 ${avgMotion.toFixed(2)}；静止 > 2s 的段落：${still.length ? still.map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join('、') : '无'}`,
	`      只有微动 > 2.5s 的段落：${low.length ? low.map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join('、') : '无'}`,
	`音频：静音段（< -45dB ≥0.4s）：${silences.length ? silences.map(([a, b]) => `${fmt(a)}–${fmt(b)}`).join('、') : '无'}`,
	`      偏安静的半秒块（RMS < -38dB）：${quiet.length ? quiet.map((q) => fmt(q.t)).join('、') : '无'}`,
	`      削波（峰值 ≥ -0.3dBFS）：${clips.length ? clips.map((c) => `${fmt(c.t)}(${c.peak.toFixed(1)})`).join('、') : '无'}`,
	`      最响的 8 个半秒块：${loudest.map((c) => `${fmt(c.t)} ${c.peak.toFixed(1)}dB`).join('、')}`,
	`      整体响度 ${I ?? '?'}；真峰值 ${TP ?? '?'}`,
].join('\n');
console.log(report);
fs.writeFileSync('out/qa-report.txt', report + '\n\n每半秒 RMS/峰值：\n' + blocks.map((b, i) => `${fmt(i * 0.5)}\t${b.rms.toFixed(1)}\t${b.peak.toFixed(1)}`).join('\n'));
