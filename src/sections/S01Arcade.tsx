import React from 'react';
import {AbsoluteFill, interpolate} from 'remotion';
import {Cam, dofBlur, Layer, Svg} from '../lib/camera';
import {cue, screen, section, stepFrames} from '../lib/timeline';
import {easeCam, easeOut} from '../theme';
import {Figure} from '../components/Figure';
import {Beam, Dust} from '../components/Atmos';
import {HEAD_DOWN, mixPose, poseTrack, simulateWalk, STAND, WIPE_EYE} from '../components/poses';
import {truckT} from './S00Window';

/**
 * 01 — 现象。一串拱门的长廊（侧面看），光从拱洞斜切进来，地上一格格亮斑。
 * 镜头 1-1：大远景，向右横移（接 00 的平移）；镜头 1-2：中景，慢推。
 */

const D_FOG = 8;
const D_WALL = 3;
const D_FIG = 2.8;
const D_FG = 1.25;

const PITCH = 420;
const OPEN = 250;
const ARCH_TOP = 255;
const SPRING = 380;
const FLOOR = 770;
const X0_STOP = 1454; // 人物停下的第三道拱门
const ARCHES = [-5, -4, -3, -2, -1, 0, 1, 2].map((k) => X0_STOP + k * PITCH);
const DOOR_X = 1850; // 尽头的门（中心）
const DOOR_W = 112;
const END_WALL = 2600;

const FIG_H = 270;
const FIG_GROUND = 820;

const TRUCK_X = 1000;
const FG_COL = 2470; // 前景柱（前层坐标）
const PUSH_Z = 1.05;

const archPath = (x0: number) =>
  `M${x0},${FLOOR} L${x0},${SPRING} A${OPEN / 2},${OPEN / 2 + (SPRING - ARCH_TOP - OPEN / 2)} 0 0 1 ${x0 + OPEN},${SPRING} L${x0 + OPEN},${FLOOR} Z`;

const patchPath = (x0: number) => {
  const nearY = 1190;
  const sk = 330;
  return `M${x0 + 12},${FLOOR + 2} L${x0 + OPEN - 8},${FLOOR + 2} L${x0 + OPEN + sk + 40},${nearY} Q${x0 + sk + OPEN / 2 + 20},${nearY + 70} ${x0 + sk - 20},${nearY} Z`;
};

const beamPath = (x0: number) =>
  `M${x0 + 10},${SPRING - 40} L${x0 + OPEN},${SPRING - 60} L${x0 + OPEN + 370},1190 L${x0 + 310},1190 Z`;

export const S01Arcade: React.FC<{frame: number}> = ({frame: f}) => {
  const strikes = stepFrames('act-02');
  const doorPush = cue('act-03').frame;
  const wipe = cue('act-04').frame;
  const s06 = screen('s06');
  const sec = section('01');

  // 镜头：1-1 横移（全片共用平移曲线），1-2 慢推
  const pushStart = 660;
  const push = interpolate(f, [pushStart, sec.to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeCam});
  const cam: Cam = {x: truckT(f) * TRUCK_X, y: 0, z: push * PUSH_Z};
  const focus = D_FIG;
  const dof = 10;

  // 人物：脚步锁定行走 → 停在第三道拱门的光斑里 → 低头 → 擦眼
  // 起点由终点反推（终点 = 光斑中心），起步时正好在平移移入的柔边里出现
  const settled = strikes[strikes.length - 1] + 14;
  const stopU = X0_STOP + 170; // 人物所在那一排的光斑中心
  const walkLen = simulateWalk(settled, strikes).hipX * FIG_H;
  const startU = stopU - walkLen;
  const walk = simulateWalk(f, strikes);
  const hipU = startU + walk.hipX * FIG_H;

  const after = poseTrack(f, [
    {f: settled, pose: STAND},
    {f: s06.from, pose: STAND},
    {f: s06.from + 40, pose: HEAD_DOWN},
    {f: wipe - 16, pose: HEAD_DOWN},
    {f: wipe + 6, pose: WIPE_EYE},
    {f: wipe + 28, pose: WIPE_EYE},
    {f: wipe + 62, pose: HEAD_DOWN},
  ]);
  const pose = f < settled ? walk.pose : mixPose(walk.pose, after, 1);

  // 门：被穿堂风推开一寸
  const gap = 26 + 32 * interpolate(f, [doorPush - 4, doorPush + 34], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: easeOut});
  const sun = f * 0.03; // 光斑随太阳缓慢移动
  const fogDrift = f * 0.25;

  const wallD =
    `M-2400,-1400 L${END_WALL + 2000},-1400 L${END_WALL + 2000},${FLOOR} L-2400,${FLOOR} Z ` +
    ARCHES.map(archPath).join(' ') +
    ` M${DOOR_X - DOOR_W / 2},${FLOOR} L${DOOR_X - DOOR_W / 2},430 L${DOOR_X + DOOR_W / 2},430 L${DOOR_X + DOOR_W / 2},${FLOOR} Z`;

  return (
    <AbsoluteFill style={{background: '#D6D1C6'}}>
      {/* 远层：拱洞外的亮雾 */}
      <Layer cam={cam} depth={D_FOG} blur={dofBlur(D_FOG, focus, dof) + 2}>
        <Svg>
          <defs>
            <linearGradient id="a01fog" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#B9B4AA" />
              <stop offset="0.6" stopColor="#D2CDC2" />
              <stop offset="1" stopColor="#C4BEB3" />
            </linearGradient>
            <filter id="a01blob" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={40} />
            </filter>
          </defs>
          <rect x={-3000} y={-1500} width={9000} height={3500} fill="url(#a01fog)" />
          <g filter="url(#a01blob)" fill="#F3EFE7">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ellipse key={i} cx={((i * 830 - fogDrift) % 4200) - 900} cy={480 + (i % 3) * 110} rx={420} ry={55} opacity={0.28} />
            ))}
          </g>
          <rect x={-3000} y={742} width={9000} height={6} fill="#C3BDB2" opacity={0.6} />
        </Svg>
      </Layer>

      {/* 墙层：拱廊、地面光斑、体积光、尽头的门 */}
      <Layer cam={cam} depth={D_WALL} blur={dofBlur(D_WALL, focus, dof)}>
        <Svg>
          <defs>
            <linearGradient id="a01wall" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#77736C" />
              <stop offset="1" stopColor="#726E67" />
            </linearGradient>
            <linearGradient id="a01floor" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#8A867E" />
              <stop offset="1" stopColor="#8F8B83" />
            </linearGradient>
            <filter id="a01soft" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={5} />
            </filter>
          </defs>
          {/* 门洞外的亮雾（门缝透光） */}
          <rect x={DOOR_X - DOOR_W / 2} y={430} width={DOOR_W} height={FLOOR - 430} fill="#ECE8DF" />
          <path d={wallD} fill="url(#a01wall)" fillRule="evenodd" />
          {/* 檐线与拱脚线脚：给墙一点建筑的分量 */}
          <rect x={-2400} y={168} width={END_WALL + 4400} height={10} fill="#8E8A82" />
          <rect x={-2400} y={178} width={END_WALL + 4400} height={4} fill="#6A665F" opacity={0.6} />
          {ARCHES.map((x0) => (
            <g key={`imp${x0}`} fill="#8C8880">
              <rect x={x0 - 14} y={SPRING - 14} width={30} height={12} />
              <rect x={x0 + OPEN - 16} y={SPRING - 14} width={30} height={12} />
            </g>
          ))}
          <rect x={-2400} y={FLOOR - 26} width={END_WALL + 4400} height={26} fill="#6E6A63" opacity={0.55} />
          {/* 拱洞内侧：右侧受光、左侧背光 */}
          {ARCHES.map((x0) => (
            <g key={x0}>
              <rect x={x0 + OPEN - 24} y={SPRING - 10} width={24} height={FLOOR - SPRING + 10} fill="#BEB9AF" />
              <rect x={x0} y={SPRING - 10} width={18} height={FLOOR - SPRING + 10} fill="#66625C" />
            </g>
          ))}
          {/* 门：门框 + 半开的门扇 */}
          <rect x={DOOR_X - DOOR_W / 2 - 10} y={420} width={DOOR_W + 20} height={10} fill="#5A5650" />
          <path
            d={`M${DOOR_X - DOOR_W / 2},430 L${DOOR_X + DOOR_W / 2 - gap},446 L${DOOR_X + DOOR_W / 2 - gap},${FLOOR - 6} L${DOOR_X - DOOR_W / 2},${FLOOR} Z`}
            fill="#3E3B37"
          />
          <line x1={DOOR_X + DOOR_W / 2 - gap} y1={446} x2={DOOR_X + DOOR_W / 2 - gap} y2={FLOOR - 6} stroke="#9A958C" strokeWidth={3} />
          {/* 地面 */}
          <rect x={-2400} y={FLOOR} width={END_WALL + 4400} height={1200} fill="url(#a01floor)" />
          <g transform={`translate(${sun} 0)`} filter="url(#a01soft)">
            {ARCHES.map((x0) => (
              <path key={x0} d={patchPath(x0)} fill="#CBC5B9" opacity={0.88} />
            ))}
            <path
              d={`M${DOOR_X + DOOR_W / 2 - gap},${FLOOR + 2} L${DOOR_X + DOOR_W / 2},${FLOOR + 2} L${DOOR_X + DOOR_W / 2 + 160},1100 L${DOOR_X + DOOR_W / 2 - gap + 120},1100 Z`}
              fill="#CBC5B9"
              opacity={0.7}
            />
          </g>
          {ARCHES.map((x0) => (
            <Beam key={x0} d={beamPath(x0 + sun)} opacity={0.11} blur={22} from={[0, 0]} to={[0.6, 1]} />
          ))}
          <Dust seed="dust01" frame={f} count={70} x={ARCHES[0]} y={300} w={ARCHES[7] + 700 - ARCHES[0]} h={880} clip={ARCHES.map((x) => beamPath(x + sun)).join(' ')} opacity={0.55} size={2.6} />
        </Svg>
      </Layer>

      {/* 人物层 */}
      <Layer cam={cam} depth={D_FIG} blur={dofBlur(D_FIG, focus, dof)}>
        <Svg>
          <Figure pose={pose} x={hipU} groundY={FIG_GROUND} H={FIG_H} facing={1} fill="#24221F" rim={{dx: -2, dy: -2, opacity: 0.8, blur: 0.7}} />
        </Svg>
      </Layer>

      {/* 前层：一根近处的拱柱暗边，从右侧移入（移动最快）；只走画面右侧，不压字幕 */}
      <Layer cam={cam} depth={D_FG} blur={dofBlur(D_FG, focus, dof)}>
        <Svg>
          <defs>
            <linearGradient id="a01col" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#3A3733" />
              <stop offset="0.8" stopColor="#45413C" />
              <stop offset="1" stopColor="#6F6B64" />
            </linearGradient>
          </defs>
          {[FG_COL].map((x) => (
            <rect key={x} x={x} y={-800} width={170} height={2600} fill="url(#a01col)" />
          ))}
        </Svg>
      </Layer>
    </AbsoluteFill>
  );
};
