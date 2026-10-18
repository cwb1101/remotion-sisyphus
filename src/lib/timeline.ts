// 把 subtitles.ts 里的 拍号 变成帧号: 人物关键帧 音效 脚步 镜头 重卡点
import {BARS, beatsBetween, nextKick, plusBeats} from '../data/beatmap';
import type {PoseKey} from '../data/poses';
import {SCREENS, type Screen, type SfxName, type Who} from '../data/subtitles';
import {SHOTS, type Shot} from '../data/shots';

export const cueFrame = (s: Screen, beat: number) => (beat === 0 ? s.startFrame : plusBeats(s.startFrame, beat));

export const screenById = (id: number): Screen => {
	const s = SCREENS.find((x) => x.id === id);
	if (!s) throw new Error(`no screen ${id}`);
	return s;
};

export const screenAt = (frame: number): Screen | undefined => SCREENS.find((s) => frame >= s.startFrame && frame < s.endFrame);

/** 某个人物在全片的动作关键帧 (按帧升序) */
export const keysFor = (who: Who): PoseKey[] =>
	SCREENS.flatMap((s) =>
		s.cast
			.filter((c) => c.who === who)
			.map((c) => ({
				frame: cueFrame(s, c.beat),
				pose: c.pose,
				lower: c.lower,
				expr: c.expr,
				facing: c.facing,
				lead: c.lead,
				speed: c.speed,
			})),
	).sort((a, b) => a.frame - b.frame);

/** 走路 / 跑步的区间: [开始帧, 结束帧) */
export const moveSegments = (keys: PoseKey[]) =>
	keys
		.map((k, i) => ({k, end: keys[i + 1]?.frame ?? k.frame}))
		.filter(({k}) => k.pose === 'walk' || k.pose === 'run' || k.pose === 'walkBack')
		.map(({k, end}) => ({start: k.frame, end, run: k.pose === 'run'}));

/** 步点: 走路每拍一步, 跑步每半拍一步 */
export const footstepFrames = (keys: PoseKey[]) =>
	moveSegments(keys).flatMap((seg) => beatsBetween(seg.start, seg.end, seg.run ? 0.5 : 1));

/**
 * 沿着这些走路区间, 把人物从 x0 移到 x1: 每走一步前进相同距离, 停下时正好到 x1
 * from / to 限定只看哪一段时间里的走路
 */
export const travel = (keys: PoseKey[], frame: number, x0: number, x1: number, from = -Infinity, to = Infinity) => {
	const segs = moveSegments(keys).filter((s) => s.start >= from && s.start < to);
	const steps = segs.map((s) => beatsBetween(s.start, s.end, s.run ? 0.5 : 1).length);
	const total = steps.reduce((a, b) => a + b, 0) || 1;
	let done = 0;
	for (let i = 0; i < segs.length; i++) {
		const s = segs[i];
		if (frame < s.start) break;
		const t = Math.min(1, (frame - s.start) / Math.max(1, s.end - s.start));
		done += steps[i] * (frame >= s.end ? 1 : t);
	}
	return x0 + ((x1 - x0) * done) / total;
};

/** 水平速度 (每帧), 给围巾和衣角用 */
export const velocity = (fn: (f: number) => number, frame: number) => fn(frame) - fn(frame - 1);

export type SoundEvent = {frame: number; name: SfxName; gain: number; heavy: boolean};

export const SOUND_EVENTS: SoundEvent[] = (() => {
	const ev: SoundEvent[] = SCREENS.flatMap((s) =>
		s.sfx.map((x) => ({frame: cueFrame(s, x.beat), name: x.name, gain: x.gain ?? 1, heavy: !!x.heavy})),
	);
	const walkers: Who[] = ['hero', 'partner', 'viewer', 'oldFriend', 'buddy'];
	for (const w of walkers) {
		for (const f of footstepFrames(keysFor(w))) ev.push({frame: f, name: 'step', gain: w === 'hero' ? 0.45 : 0.32, heavy: false});
	}
	return ev.sort((a, b) => a.frame - b.frame);
})();

export const HEAVY_FRAMES: number[] = SOUND_EVENTS.filter((e) => e.heavy).map((e) => e.frame);

export type CameraMove = {from: Shot; to: Shot; start: number; end: number; name: string};

/** 每屏换一个机位: 从这一屏起点的小节线开始动, 落在之后的底鼓上 */
export const CAMERA_MOVES: CameraMove[] = (() => {
	const moves: CameraMove[] = [];
	let prev: Shot | null = null;
	let prevName = '';
	for (const s of SCREENS) {
		const shot = SHOTS[s.shot];
		if (!shot || s.shot === prevName) continue;
		const start = BARS.includes(s.startFrame) ? s.startFrame : s.startFrame;
		const end = shot.cut ? start : nextKick(start, shot.moveFrames ?? 18);
		moves.push({from: prev ?? shot.enterFrom ?? shot, to: shot, start, end, name: s.shot});
		prev = shot;
		prevName = s.shot;
	}
	return moves;
})();

export const PORTAL_PUSH = 14;
export const PORTAL_PULL = 18;
/** 穿过物件的换场: 帧号 + 两个场景里的对应点 */
export const PORTALS = CAMERA_MOVES.filter((m) => m.to.cut && m.to.portalFrom && m.to.portalTo).map((m) => ({
	frame: m.start,
	from: m.to.portalFrom!,
	to: m.to.portalTo!,
}));
