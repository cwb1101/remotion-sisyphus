import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {Cam, dofBlur, Layer, mixCam, Svg} from '../lib/camera';
import {cue, screen} from '../lib/timeline';
import {easeCam, easeOut} from '../theme';
import {Figure} from '../components/Figure';
import {Glass} from '../components/Glass';
import {Beam, Dust} from '../components/Atmos';
import {poseTrack, SIT, SIT_INHALE, SIT_TOUCH_CHEEK} from '../components/poses';

/**
 * 00 序 — 满。窗边木桌，哈默修伊式窗光室内。
 * 镜头 0-1：杯子特写，固定（极慢漂移）；镜头 0-2：慢拉成中景。
 * 节尾开始向右平移，平移一路延续到 01 拱廊（连续镜头）。
 */

// 深度：后墙 4，人物 2.4，桌面与杯子 1
const D_BACK = 4;
const D_MID = 2.4;
const D_FG = 1;

const CLOSE: Cam = {x: -285, y: 262, z: 0.661};
const MEDIUM: Cam = {x: 0, y: 0, z: 0};

/** 全片共用的横移曲线：00 节尾起步，01 镜头 1-1 结束 */
export const TRUCK = {from: 300, to: 660};
export const truckT = (f: number) =>
  interpolate(f, [TRUCK.from, TRUCK.to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeCam});

const BEAM = 'M300,20 L1100,250 L1120,610 L1180,960 L820,990 L300,665 Z';

export const S00Window: React.FC<{frame: number}> = ({frame: f}) => {
  const drop = cue('act-01').frame; // 水滴落桌（= 关键句①）
  const inhale = drop - 40;
  const s03 = screen('s03');

  // 镜头
  const pull = interpolate(f, [198, 372], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeCam});
  const close = {...CLOSE, z: CLOSE.z + interpolate(f, [0, 198], [0, 0.011], {extrapolateRight: 'clamp'})};
  const base = mixCam(close, MEDIUM, pull);
  const cam: Cam = {...base, x: base.x + truckT(f) * 1000};
  const focus = interpolate(pull, [0, 1], [1, 2.4]);
  const dof = 14;

  // 光：关键句①时窗光 1.5 秒内提亮约 8%
  const light = 1 + 0.08 * interpolate(f, [drop, drop + 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut});
  const drift = f * 0.06; // 墙上光斑缓慢右移

  // 杯子状态
  const rippleImpulse = f > inhale + 6 ? Math.exp(-(f - inhale - 6) / 26) : 0;
  const ripple = 0.08 + 1.1 * rippleImpulse;
  const spillT = interpolate(f, [drop - 24, drop - 2], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const spill = f < drop - 24 ? 0 : f >= drop - 2 ? 1.0001 : spillT * spillT;
  const puddle = interpolate(f, [drop, drop + 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut});
  const bulge = f < drop - 24 ? 1 : 0.86;

  const pose = poseTrack(f, [
    {f: 0, pose: SIT},
    {f: inhale - 14, pose: SIT},
    {f: inhale + 8, pose: SIT_INHALE},
    {f: inhale + 36, pose: SIT},
    {f: s03.from + 40, pose: SIT},
    {f: s03.from + 76, pose: SIT_TOUCH_CHEEK},
    {f: s03.from + 104, pose: SIT_TOUCH_CHEEK},
    {f: s03.from + 140, pose: SIT},
  ]);

  return (
    <AbsoluteFill style={{background: '#8A857D'}}>
      {/* 后层：墙、窗、光斑、地面、体积光 */}
      <Layer cam={cam} depth={D_BACK} blur={dofBlur(D_BACK, focus, dof)}>
        <Svg>
          <defs>
            <linearGradient id="w00wall" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#918C84" />
              <stop offset="1" stopColor="#86827A" />
            </linearGradient>
            <linearGradient id="w00left" x1="1" x2="0" y1="0" y2="0">
              <stop offset="0" stopColor="#7B776F" />
              <stop offset="1" stopColor="#6C6862" />
            </linearGradient>
            <linearGradient id="w00floor" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#7A766F" />
              <stop offset="1" stopColor="#6F6B65" />
            </linearGradient>
            <linearGradient id="w00pane" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#F1EDE4" />
              <stop offset="1" stopColor="#E0DBD0" />
            </linearGradient>
            <filter id="w00soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={7} />
            </filter>
          </defs>
          <rect x={620} y={-1500} width={2600} height={2290} fill="url(#w00wall)" />
          <path d="M-1500,-1500 L620,-1500 L620,790 L-1500,2265 Z" fill="url(#w00left)" />
          <path d="M-1500,2265 L620,790 L3200,790 L3200,2600 Z" fill="url(#w00floor)" />
          <line x1={620} y1={-1500} x2={620} y2={790} stroke="#6A6660" strokeWidth={2} opacity={0.6} />
          <line x1={620} y1={790} x2={3200} y2={790} stroke="#5E5A54" strokeWidth={2} opacity={0.5} />
          {/* 左墙上的窗（透视） */}
          <path d="M300,20 L560,170 L560,600 L300,665 Z" fill="url(#w00pane)" opacity={Math.min(1, 0.94 * light)} />
          <g stroke="#4E4A45" strokeWidth={7} fill="none" opacity={0.85}>
            <path d="M300,20 L560,170 L560,600 L300,665 Z" />
            <line x1={435} y1={98} x2={435} y2={632} />
            <line x1={300} y1={342} x2={560} y2={385} />
          </g>
          <path d="M560,170 L578,178 L578,596 L560,600 Z" fill="#B3AEA4" />
          {/* 后墙上的窗形光斑（带窗棂影），缓慢右移 */}
          <g transform={`translate(${drift} 0)`} filter="url(#w00soft)" opacity={0.62 * light}>
            <path d="M760,300 L1100,250 L1120,610 L780,650 Z" fill="#D2CCC0" />
            <line x1={930} y1={276} x2={950} y2={630} stroke="#8A857D" strokeWidth={12} />
            <line x1={770} y1={472} x2={1110} y2={430} stroke="#8A857D" strokeWidth={12} />
          </g>
          <g transform={`translate(${drift * 1.3} 0)`} filter="url(#w00soft)" opacity={0.55 * light}>
            <path d="M700,820 L1000,805 L1180,960 L820,990 Z" fill="#B4AEA3" />
          </g>
          <Beam d={BEAM} opacity={0.15 * light} blur={28} from={[0, 0]} to={[1, 0.8]} />
          <Dust seed="dust00" frame={f} count={46} x={300} y={20} w={900} h={980} clip={BEAM} opacity={0.55} size={2.4} />
        </Svg>
      </Layer>

      {/* 中层：椅子与坐着的人（逆光剪影，面朝窗） */}
      <Layer cam={cam} depth={D_MID} blur={dofBlur(D_MID, focus, dof)}>
        <Svg>
          <g fill="#4A4742">
            <rect x={1262} y={732} width={128} height={11} />
            <rect x={1266} y={740} width={8} height={122} />
            <rect x={1378} y={740} width={8} height={122} />
            <path d="M1380,742 L1394,742 L1410,520 L1398,518 Z" />
            <rect x={1384} y={560} width={20} height={6} transform="rotate(4 1394 563)" />
          </g>
          <Figure pose={pose} x={1330} groundY={862} seatY={736} H={480} facing={-1} rim={{dx: -3, dy: -2, opacity: 0.8, blur: 0.8}} />
        </Svg>
      </Layer>

      {/* 前层：桌面与杯子（贯穿物件） */}
      <Layer cam={cam} depth={D_FG} blur={dofBlur(D_FG, focus, dof)}>
        <Svg>
          <defs>
            <linearGradient id="w00table" x1="0" x2="0.2" y1="0" y2="1">
              <stop offset="0" stopColor="#A8A399" />
              <stop offset="0.45" stopColor="#9E998F" />
              <stop offset="1" stopColor="#959087" />
            </linearGradient>
          </defs>
          <path d="M-900,860 L1060,852 L1300,1700 L-900,1700 Z" fill="url(#w00table)" />
          <path d="M-900,860 L1060,852" stroke="#D3CDC2" strokeWidth={2} opacity={0.8} />
          <path d="M1060,852 L1300,1700" stroke="#6A665F" strokeWidth={3} opacity={0.6} />
          <Glass
            x={560}
            y={900}
            h={210}
            bulge={bulge}
            ripple={ripple}
            ripplePhase={f * 0.32}
            spill={spill}
            puddle={puddle}
            caustic={0.5}
            light={light}
          />
        </Svg>
      </Layer>
    </AbsoluteFill>
  );
};
