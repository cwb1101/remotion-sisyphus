// 导出质检要用的元数据: 每屏的帧区间 是否提到人 是否特写; 重卡点帧; 镜头落定帧
// 用法: npx tsx scripts/qa-meta.ts out/qa/meta.json <结束帧>
import fs from 'node:fs';
import path from 'node:path';
import {SCREENS} from '../src/data/subtitles';
import {SHOTS} from '../src/data/shots';
import {CAMERA_MOVES, HEAVY_FRAMES} from '../src/lib/timeline';
import beatmap from '../src/data/beatmap.json';
import {bgmVolume} from '../src/components/SoundLayer';
import {portalRadius} from '../src/components/Atmosphere';

const [out, endArg] = process.argv.slice(2);
const end = Number(endArg);
const PEOPLE = /你|我|他|她|我们|人|对方|朋友|搭子/;
const meta = {
	end,
	fps: beatmap.fps,
	kicks: beatmap.kicks,
	heavy: HEAVY_FRAMES.filter((f) => f < end),
	heavyScreens: SCREENS.filter((s) => s.heavy && s.startFrame < end).map((s) => ({id: s.id, frame: s.startFrame, kind: s.heavy})),
	camera: CAMERA_MOVES.filter((m) => m.start < end).map((m) => ({name: m.name, start: m.start, end: m.end, cut: !!m.to.cut})),
	// 每一帧: 是否算特写 (特写机位本身, 以及从特写拉出来的那段运动), 镜头是否在动, BGM 音量
	frames: Array.from({length: end}, (_, f) => {
		const moving = CAMERA_MOVES.some((m) => f >= m.start && f <= m.end);
		const fromClose = CAMERA_MOVES.some((m) => f >= m.start && f <= m.end && (m.from.closeup || m.to.closeup));
		const sc = SCREENS.find((s) => f >= s.startFrame && f < s.endFrame);
		// 穿物件换场时镜头有意推到极近 (允许裁切), 亮光盖住的圆里人物看不见 (遮挡检查跳过这一圈)
		const glow = portalRadius(f);
		return {closeup: glow > 0 || fromClose || (!moving && !!(sc && SHOTS[sc.shot]?.closeup)), moving, glow: Math.round(glow * 0.55), bgm: Number(bgmVolume(f).toFixed(4))};
	}),
	screens: SCREENS.filter((s) => s.startFrame < end).map((s) => ({
		id: s.id,
		start: s.startFrame,
		end: Math.min(end, s.endFrame),
		text: s.text,
		mentionsPeople: PEOPLE.test(s.text),
		closeup: !!SHOTS[s.shot]?.closeup,
		shot: s.shot,
	})),
};
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(meta, null, 1));
console.log(`${meta.screens.length} screens, heavy ${meta.heavy.join(',')}`);
