/**
 * 3:4 封面（1080×1440）：复用片中的舞台、人物与贯穿物件。
 * 构图：上方主题词 + 主线问题，下方是第二节「来人伸手、TA背身」的两束光，TA在冰墙里、心在发光。
 */
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT_SANS, FONT_SERIF} from './theme';
import {Avoider, Actor} from './components/Avoider';
import {PAL, heartWorld} from './components/Person';
import {Curtain, LIGHT, Spotlight, StageFloor} from './components/Stage';
import {Ripple, Watermark} from './components/Props';
import {POCKETS, REACH, STAND} from './lib/poses';
import './fonts';

const W = 1080;
const H = 1440;
const FLOOR_Y = 1250;
const SCALE = 1.45;
const P_X = -300;
const T_X = 250;

const halo = '0 0 10px rgba(0,0,0,0.95), 0 0 28px rgba(0,0,0,0.85), 0 0 48px rgba(0,0,0,0.6)';

export const Cover: React.FC = () => {
	const pHeart = heartWorld(P_X, 1, SCALE, 1);
	// 静态心电线（呼应片中的心跳线）
	const ecg = (() => {
		const pts: string[] = [];
		for (let x = 60; x <= 1020; x += 4) {
			const k = ((x - 60) % 240) / 240;
			let v = 0;
			v += 0.12 * Math.exp(-((k - 0.32) ** 2) / 0.002);
			v += -0.18 * Math.exp(-((k - 0.47) ** 2) / 0.00015);
			v += 1.0 * Math.exp(-((k - 0.5) ** 2) / 0.0002);
			v += -0.35 * Math.exp(-((k - 0.53) ** 2) / 0.00018);
			v += 0.28 * Math.exp(-((k - 0.7) ** 2) / 0.004);
			pts.push(`${x},${1318 - v * 62}`);
		}
		return pts.join(' ');
	})();

	return (
		<AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse 80% 55% at 50% 62%, #12223f 0%, rgba(0,0,0,0) 100%)', opacity: 0.9}} />
			<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
				<g transform={`translate(${W / 2} ${FLOOR_Y})`}>
					<Curtain x0={-900} x1={900} opacity={0.75} frame={0} />
					<StageFloor tint="#0f141d" x0={-900} x1={900} />
					<Spotlight x={P_X} color={LIGHT.warm} intensity={1} width={560} topWidth={170} tilt={-220} frame={40} seed={3} />
					<Spotlight x={T_X} color={LIGHT.cold} intensity={1} width={520} topWidth={150} tilt={160} frame={40} seed={4} />
					<Actor x={P_X} scale={SCALE} facing={1} pose={{...STAND, ...REACH, lean: 8}} palette={PAL.warm} face="neutral" heart={0.7} heartGlow={1.2} />
					<Ripple x={pHeart.x} y={pHeart.y} t={0.42} maxR={330} dir={1} color="#FFB07A" width={6} spread={38} />
					<Avoider
						x={T_X}
						frame={0}
						beat={1.1}
						scale={SCALE}
						facing={1}
						pose={{...POCKETS, head: 18}}
						face="down"
						heartGlow={2.2}
						heartScale={1.4}
						rings={{count: 3, r: 140, gap: 42, frost: 0.7, thick: 6, rise: 0.55, riseH: 560, spin: 40}}
					/>
				</g>
				<polyline points={ecg} fill="none" stroke="#FF4433" strokeWidth={14} opacity={0.18} strokeLinejoin="round" />
				<polyline points={ecg} fill="none" stroke="#FF4433" strokeWidth={4.5} strokeLinejoin="round" />
				<circle cx={1020} cy={1318} r={8} fill="#FF4433" />
			</svg>
			{/* 暗角 + 颗粒 */}
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.75) 100%)'}} />
			<svg width={W} height={H} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.22}}>
				<filter id="grain">
					<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={7} stitchTiles="stitch" />
					<feColorMatrix type="saturate" values="0" />
				</filter>
				<rect width={W} height={H} filter="url(#grain)" />
			</svg>

			{/* 文字 */}
			<div style={{position: 'absolute', left: 0, right: 0, top: 128, textAlign: 'center', fontFamily: FONT_SANS, fontWeight: 400, fontSize: 32, letterSpacing: '0.3em', color: 'rgba(230,234,240,0.7)', textShadow: halo}}>
				<span style={{display: 'inline-block', width: 70, height: 2, background: 'rgba(230,234,240,0.45)', verticalAlign: 'middle', marginRight: 22}} />
				心理学 · 依恋理论
				<span style={{display: 'inline-block', width: 70, height: 2, background: 'rgba(230,234,240,0.45)', verticalAlign: 'middle', marginLeft: 22}} />
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 190, textAlign: 'center', fontFamily: FONT_SERIF, fontWeight: 900, fontSize: 182, lineHeight: 1.2, letterSpacing: '0.04em', color: C.text, textShadow: halo}}>
				回避型<span style={{color: C.hi}}>依恋</span>
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, top: 455, textAlign: 'center', fontFamily: FONT_SANS, fontWeight: 700, fontSize: 70, lineHeight: 1.38, color: C.text, textShadow: halo}}>
				为什么你越靠近，
				<br />
				TA越想<span style={{color: C.hi, fontWeight: 900, fontSize: 92}}>逃</span>？
			</div>
			<div style={{position: 'absolute', left: 0, right: 0, bottom: 34, textAlign: 'center', fontFamily: FONT_SANS, fontWeight: 700, fontSize: 40, letterSpacing: '0.12em', color: 'rgba(246,241,233,0.92)', textShadow: halo}}>
				冷淡，不等于<span style={{color: C.hi}}>不在乎</span>
			</div>
			<Watermark />
		</AbsoluteFill>
	);
};
