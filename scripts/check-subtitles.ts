// 检查字幕稿 (src/data/subtitles.ts) 并生成 docs/subtitles.md
// 用法: npm run check
//
// 逐屏检查: 不超过 15 字  每秒不超过 4 字  有字的屏至少 2 秒  最多一个重点词  不含标点
//          起止帧落在小节上 (2 帧内)  首尾相接  同一画面最多两屏有字  人物列不空  有人物的屏不少于 80%
//          重卡点 3 到 5 处且在 drop 或 accents 上  动作名都在动作库里  音效文件都存在
// 动作库: 每个静态动作和走路 跑步循环的关节角都在限位内 (不靠限位兜底)
import fs from 'node:fs';
import path from 'node:path';
import beatmap from '../src/data/beatmap.json';
import {SCREENS, CREDITS, UNCERTAIN} from '../src/data/subtitles';
import {POSES, POSE_LABELS, clampPose, runPose, walkPose, type Pose} from '../src/data/poses';

const FPS = beatmap.fps;
const MAX_CHARS = 15;
const MAX_RATE = 4;
const MIN_SEC = 2;
const TOL = 2;
const PUNCT = /[，。、！？；：“”‘’（）《》〈〉…—–·,.!?;:"'()[\]<>~`@#$%^&*_+=|\\/-]/;
const CAST: [string, string][] = [['主角', 'hero'], ['对方', 'partner'], ['观众替身', 'viewer'], ['群像', 'crowd'], ['老朋友', 'oldFriend'], ['搭子', 'buddy']];

const tc = (f: number) => {
	const s = Math.floor(f / FPS);
	return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f % FPS).padStart(2, '0')}`;
};
const count = (t: string) => t.replace(/\s/g, '').length;

const errors: string[] = [];
const bars = beatmap.bars;
const heavyOk = new Set([...beatmap.accents, beatmap.dropFrame, beatmap.mainDropFrame]);

SCREENS.forEach((s, i) => {
	const tag = `屏 ${s.id}`;
	const sec = (s.endFrame - s.startFrame) / FPS;
	const n = count(s.text);
	if (n > MAX_CHARS) errors.push(`${tag} ${n} 字 超过 ${MAX_CHARS}`);
	if (n && n / sec > MAX_RATE + 1e-9) errors.push(`${tag} 每秒 ${(n / sec).toFixed(2)} 字`);
	if (n && sec < MIN_SEC) errors.push(`${tag} 只有 ${sec.toFixed(2)} 秒`);
	if (PUNCT.test(s.text) || /[【】]/.test(s.text)) errors.push(`${tag} 含标点或【】`);
	if (s.keyword && !s.text.includes(s.keyword)) errors.push(`${tag} 重点词不在字幕里`);
	for (const f of [s.startFrame, s.endFrame]) {
		if (f !== beatmap.durationFrames && Math.min(...bars.map((b) => Math.abs(b - f))) > TOL) errors.push(`${tag} 帧 ${f} 不在小节上`);
	}
	const next = SCREENS[i + 1];
	if (next && next.startFrame !== s.endFrame) errors.push(`${tag} 和下一屏没有首尾相接`);
	if (!s.people.trim()) errors.push(`${tag} 人物列为空`);
	if (s.heavy && !heavyOk.has(s.startFrame)) errors.push(`${tag} 重卡点不在 drop 或 accents 上`);
	for (const c of s.cast) {
		if (!(c.pose in POSE_LABELS) || (c.lower && !(c.lower in POSE_LABELS))) errors.push(`${tag} 动作 ${c.pose} 不在动作库`);
	}
	for (const x of s.sfx) {
		if (!fs.existsSync(path.resolve('public/sfx', `${x.name}.wav`))) errors.push(`${tag} 缺音效 ${x.name}.wav`);
	}
});
if (SCREENS[SCREENS.length - 1].endFrame !== beatmap.durationFrames) errors.push('最后一屏没有到片尾');
const shotText = new Map<string, number>();
for (const s of SCREENS) if (s.text) shotText.set(s.shot, (shotText.get(s.shot) ?? 0) + 1);
for (const [shot, c] of shotText) if (c > 2) errors.push(`画面 ${shot} 挂了 ${c} 屏字幕`);
const withPeople = SCREENS.filter((s) => CAST.some(([k]) => s.people.includes(k)));
if (withPeople.length / SCREENS.length < 0.8) errors.push('有人物的屏不到 80%');
const heavy = SCREENS.filter((s) => s.heavy);
if (heavy.length < 3 || heavy.length > 5) errors.push(`重卡点 ${heavy.length} 处`);

// 动作库限位
const same = (a: Pose, b: Pose) => JSON.stringify(a) === JSON.stringify(b);
for (const [name, p] of Object.entries(POSES)) if (!same(p, clampPose(p))) errors.push(`动作 ${name} 有关节超出限位`);
for (let ph = 0; ph < 1; ph += 0.02) {
	if (!same(walkPose(ph), clampPose(walkPose(ph)))) errors.push(`走路循环 相位 ${ph.toFixed(2)} 超出限位`);
	if (!same(runPose(ph), clampPose(runPose(ph)))) errors.push(`跑步循环 相位 ${ph.toFixed(2)} 超出限位`);
}

// ---------- 生成文档 ----------
const sectionOf = (f: number) => beatmap.sections.find((x) => x.startFrame <= f && f < x.endFrame)?.name ?? '';
const out: string[] = [
	'# 字幕稿',
	'',
	'> 由 `npm run check` 从 `src/data/subtitles.ts` 和 `src/data/beatmap.json` 生成 改稿只改 subtitles.ts',
	'> 时间码是 分:秒:帧（30fps）括号里是帧号；加粗的是重卡点；「无字」的屏只演不写',
	'',
	'| 屏号 | 时间码 | 字幕 | 人物（谁 在做什么 景别） | 动作 pose | 画面动作 | 音效 | 卡点 |',
	'|---|---|---|---|---|---|---|---|',
];
let last = '';
for (const s of SCREENS) {
	const sec = sectionOf(s.startFrame);
	if (sec !== last) {
		out.push(`| | **${sec}** | | | | | | |`);
		last = sec;
	}
	let text = s.text || '（无字）';
	if (s.keyword) text = text.replace(s.keyword, `【${s.keyword}】`);
	if (s.heavy) text = `**${text}**`;
	const poses = s.cast.map((c) => `${c.who} ${POSE_LABELS[c.pose]}${c.lower ? '+' + POSE_LABELS[c.lower] : ''}@${c.beat}`).join(' ') || '保持';
	const sfx = s.sfx.map((x) => `${x.name}@${x.beat}${x.heavy ? '（重）' : ''}`).join(' ') || '—';
	const cue = [s.heavy ? `**重卡点 ${s.heavy}**` : '', s.cue].filter(Boolean).join('；');
	out.push(`| ${s.id} | ${tc(s.startFrame)}–${tc(s.endFrame)}（${s.startFrame}–${s.endFrame}） | ${text} | ${s.people} | ${poses} | ${s.action} | ${sfx} | ${cue} |`);
}
const textScreens = SCREENS.filter((s) => s.text);
const totalChars = textScreens.reduce((a, s) => a + count(s.text), 0);
const rate = (s: (typeof SCREENS)[number]) => count(s.text) / ((s.endFrame - s.startFrame) / FPS);
out.push(
	'',
	'## 统计',
	'',
	`- 总屏数 **${SCREENS.length}**（有字 ${textScreens.length} 屏）`,
	`- 总字数 **${totalChars}**`,
	`- 总时长 **${(beatmap.durationFrames / FPS).toFixed(2)} 秒**（${beatmap.durationFrames} 帧）`,
	`- 最快语速 ${Math.max(...textScreens.map(rate)).toFixed(2)} 字每秒`,
	`- 有人物的屏 **${withPeople.length}/${SCREENS.length}（${Math.round((withPeople.length / SCREENS.length) * 100)}%）**`,
	'',
	'### 重卡点',
	'',
	'| 屏 | 帧 | 时间码 | 类型 | 字幕 | 人物大动作 |',
	'|---|---|---|---|---|---|',
	...heavy.map((s) => `| ${s.id} | ${s.startFrame} | ${tc(s.startFrame)} | ${s.heavy} | ${s.text} | ${s.people} |`),
	'',
	'### 人物出场',
	'',
	'| 人物 | 出场屏数 | 屏号 |',
	'|---|---|---|',
	...CAST.map(([k]) => {
		const ids = SCREENS.filter((s) => s.people.includes(k)).map((s) => s.id);
		return ids.length ? `| ${k} | ${ids.length} | ${ids.join(' ')} |` : '';
	}).filter(Boolean),
	'',
	'### 最没把握的三句 和怎么变成有把握',
	'',
	...UNCERTAIN.flatMap((u) => [`**屏 ${u.id}：${u.before}**`, '', `- 没把握在哪：${u.why}`, `- 核实结果：${u.check}`, `- 定稿：${u.after}`, '']),
	'### 片尾出处',
	'',
	...CREDITS.map((c) => `- ${c}`),
	'',
	'## 检查结果',
	'',
	...(errors.length ? errors.map((e) => `- ❌ ${e}`) : ['- 全部通过']),
	'',
);
fs.writeFileSync('docs/subtitles.md', out.join('\n'));
console.log(`${SCREENS.length} screens  ${totalChars} chars  heavy ${heavy.length}  people ${withPeople.length}/${SCREENS.length}  errors ${errors.length}`);
errors.forEach((e) => console.log('  ' + e));
process.exit(errors.length ? 1 : 0);
