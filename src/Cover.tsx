import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Door} from './components/Door';
import {Dust} from './components/Particles';
import {Person} from './components/Person';
import {Room, roomCeilingY} from './components/Room';
import {WATERMARK} from './components/Watermark';
import {fitUnder, HOLD} from './lib/pose';
import {headroom} from './sections/continuity';
import {C, CEILING, DOOR, FONT, ROOM} from './theme';

// 3:4 封面（1080×1440）：上方问题标题，中间是片中的房间——天花板压下来、人双手托住，右边门缝透出青光；
// 下方一句答案作钩子。右上角与成片同款水印。

export const COVER = {width: 1080, height: 1440};

const DOOR_SHIFT = -420; // 把门挪近房间，竖版里放得下

export const Cover: React.FC = () => {
	const ceiling = CEILING.slam;
	const ceilY = roomCeilingY(ceiling);
	const x = 820;
	const pose = fitUnder(HOLD, HOLD, headroom(ceiling));
	return (
		<AbsoluteFill style={{backgroundColor: C.bg, fontFamily: FONT}}>
			{/* 背景光：左暖右冷 */}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 70% 40% at 45% 62%, rgba(255,181,71,0.16) 0%, rgba(255,181,71,0) 70%)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 45% 45% at 95% 60%, rgba(92,225,230,0.14) 0%, rgba(92,225,230,0) 70%)'}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)'}} />

			{/* 画面主体 */}
			<svg width={COVER.width} height={COVER.height} style={{position: 'absolute', left: 0, top: 0}}>
				<g transform="translate(-370 400) scale(1.04)">
					<line x1={360} y1={ROOM.floor} x2={DOOR.cx + DOOR_SHIFT + 200} y2={ROOM.floor} stroke={C.line} strokeWidth={3} />
					<g transform={`translate(${DOOR_SHIFT} 0)`}>
						<Door frame={40} open={0.25} light={0.9} fog={0.8} spill={0.9} />
					</g>
					<Room frame={0} ceiling={ceiling} warmth={1.4} ceilingGlow={1} crack={1} />
					<Dust frame={60} seed="cover" color={C.amber} count={30} box={{l: ROOM.left + 12, t: ceilY + 10, r: ROOM.right - 12, b: ROOM.floor - 8}} />
					<Person
						x={x}
						groundY={ROOM.floor}
						pose={pose}
						reachF={{x: x + 74, y: ceilY + 10, w: 1}}
						reachB={{x: x + 40, y: ceilY + 10, w: 1}}
						rim={{color: C.cyan, strength: 0.8, side: 1}}
					/>
				</g>
			</svg>

			{/* 标签 */}
			<div
				style={{
					position: 'absolute',
					left: 72,
					top: 150,
					padding: '10px 22px',
					border: `2px solid ${C.amber}`,
					borderRadius: 999,
					color: C.amber,
					fontWeight: 700,
					fontSize: 34,
					letterSpacing: '0.12em',
				}}
			>
				现状偏差 · Status Quo Bias
			</div>

			{/* 标题：开头抛出的问题 */}
			<div style={{position: 'absolute', left: 72, top: 240, color: C.text, fontWeight: 900, lineHeight: 1.22, textShadow: '0 6px 30px rgba(0,0,0,0.6)'}}>
				<div style={{fontSize: 118}}>明明很痛苦</div>
				<div style={{fontSize: 92}}>
					为什么还是<span style={{color: C.cyan}}>不想改变</span>？
				</div>
			</div>

			{/* 底部钩子：片中的答案 */}
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 150, textAlign: 'center', color: C.text, fontWeight: 900, fontSize: 64, textShadow: '0 4px 20px rgba(0,0,0,0.8)'}}>
				你可能只算了<span style={{color: C.amber}}>一本账</span>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 96, textAlign: 'center', color: C.grey, fontWeight: 700, fontSize: 30, letterSpacing: '0.2em'}}>
				留下，也是一种选择
			</div>

			{/* 水印（与成片同款） */}
			<div
				style={{
					position: 'absolute',
					right: WATERMARK.right,
					top: WATERMARK.top,
					padding: '6px 12px',
					border: '1px solid #FFFFFF',
					fontWeight: 700,
					fontSize: WATERMARK.size,
					lineHeight: 1.2,
					letterSpacing: '0.06em',
					color: '#FFFFFF',
					opacity: 0.35,
				}}
			>
				{WATERMARK.text}
			</div>
		</AbsoluteFill>
	);
};
