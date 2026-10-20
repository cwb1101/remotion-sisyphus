import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease, lerp, prog, rand, track, wobble } from '../anim';
import { camT, MotionBlur, Stage, type Cam } from '../camera';
import { EmotionBall } from '../components/EmotionBall';
import { handWorld, Person, type Arm } from '../components/Person';
import { B } from '../data/timeline';
import { C, mix } from '../theme';

/**
 * 第 1 节「不是冷暴力」：一条走廊 → 一个房间 → 一片屋顶，全程一个连续镜头。
 * 左门：冷暴力，门被故意关上，门缝透红光，红球砸门弹回，直冲镜头。
 * 甩镜到右门：门一直开着，推进去——屋里的小蓝只剩半透明线稿，红球从 TA 脚下穿过。
 * 镜头上摇到屋顶：小蓝像流水线一样往晾衣绳上夹"报备"卡片；沿绳拉远，小橙在另一端很小。
 * 卡片掉落变成小票，小蓝忙着撕小票，红球从 TA 两手之间落地 =「不是回应」。
 */
export const S1NotColdViolence: React.FC = () => {
  const f = useCurrentFrame();
  if (f < B.toS1 + 12) return null;
  const fadeIn = prog(f, B.toS1 + 12, B.toS1 + 20, ease.inOut);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeIn }}>
      {f < B.roomIn ? <CorridorShot f={f} /> : f < B.wipe + 24 ? <RoomAndRoofShot f={f} /> : null}
      {f >= B.wipe ? <WipeToHall f={f} /> : null}
    </div>
  );
};

// ───────────────────────── 走廊 ─────────────────────────

const LX = -700;
const RX = 700;
const FLOOR = 260;
const DOOR_W = 250;
const DOOR_TOP = -290;
const ROOM_SCALE = 1 / 8.2;
const ROOM_CY = -20;

const corridorCam = (f: number): Cam => {
  // 从红光门洞里拉出来（承接上一节填满画面的红球）
  const pull = prog(f, B.toS1 + 12, B.doorShut + 2, ease.out);
  let c: Cam = {
    x: lerp(LX - 10, LX + 120, pull),
    y: lerp(-110, -40, pull),
    zoom: lerp(4.6, 1.3, pull),
  };
  // 红球撞门的一下轻推
  c.zoom += wobble(f, B.doorHit, 0.5, 0.3) * 0.03;
  // 甩镜到右门
  const w = prog(f, B.whip, B.whip + 10, ease.inOutQuart);
  c = { x: lerp(c.x, RX - 60, w), y: c.y, zoom: c.zoom + w * 0.05 };
  // 右门前慢推
  c.zoom += prog(f, B.whip + 10, B.pushDoor, ease.inOut) * 0.12;
  // 推进门里，门框从两侧滑出
  const p = prog(f, B.pushDoor, B.roomIn, ease.inOutQuart);
  return {
    x: lerp(c.x, RX, p),
    y: lerp(c.y, ROOM_CY, p),
    zoom: c.zoom * Math.pow(1 / ROOM_SCALE / c.zoom, p),
  };
};

const doorOpen = (f: number) =>
  track(f, [
    [B.toS1, 0.62],
    [B.doorShut - 14, 0.62],
    [B.doorShut, 0, ease.in],
  ]);

const ORANGE_ARM_REST: Arm = { up: 8, bend: 6 };
/** 背对镜头时，球拿在身体外侧才看得见 */
const HOLD_SIDE: Arm = { up: 26, bend: 12 };

const CorridorShot: React.FC<{ f: number }> = ({ f }) => {
  const cam = corridorCam(f);
  const vx = cam.x - corridorCam(f - 1).x;
  const bx = Math.min(42, Math.abs(vx) * cam.zoom * 0.35);
  const anchor = { x: 0, y: -100 };

  // 左门
  const open = doorOpen(f);
  const shut = f >= B.doorShut;
  const leak = shut ? 0.75 + track(f, [[B.doorHit, 0], [B.doorHit + 2, 0.6], [B.doorHit + 14, 0, ease.out]]) : 0;
  const leakOff = prog(f, B.doorHit + 14, B.whip, ease.inOut);
  const leakA = leak * (1 - leakOff * 0.9);

  // 小橙：走到左门前，敲门，扔球；甩镜后走向右门
  const walk1 = prog(f, B.orangeWalkIn, B.knock1 - 2, ease.out);
  const walk2 = prog(f, B.whip + 6, B.pushDoor - 4, ease.out);
  const ox = f < B.whip ? lerp(LX + 980, LX + 150, walk1) : lerp(RX - 640, RX + 230, walk2);
  const oy = FLOOR - 52 * 2.1;
  const walking = (f >= B.orangeWalkIn && f < B.knock1 - 2) || (f >= B.whip + 6 && f < B.pushDoor - 4);
  const knockA = (fr: number) => wobble(f, fr - 3, 0.33, 0.2);
  const knocking = f >= B.knock1 - 6 && f < B.throw1 - 4;
  const armL: Arm = knocking
    ? { up: 120 + (knockA(B.knock1) + knockA(B.knock2)) * 18, bend: 40 }
    : ORANGE_ARM_REST;
  const throwT = prog(f, B.throw1 - 6, B.throw1 + 2, ease.out);
  const armR: Arm =
    f >= B.throw1 - 6 && f < B.whip
      ? { up: lerp(20, 165, throwT) - prog(f, B.throw1 + 2, B.throw1 + 14, ease.inOut) * 140, bend: lerp(60, 0, throwT) }
      : HOLD_SIDE;

  // 红球：手里 → 飞向门 → 撞门 → 弹回冲向镜头（屏幕空间放大）
  const person = { x: ox, y: oy, scale: 2.1 };
  const hand = handWorld(person, 1, armR);
  let ball: { x: number; y: number; r: number; squash: number } | null = null;
  let ballScreen: { x: number; y: number; r: number; blur: number } | null = null;
  if (f < B.throw1) {
    ball = { x: hand.x + 10, y: hand.y + 4, r: 26, squash: 1 };
  } else if (f < B.doorHit) {
    const t = prog(f, B.throw1, B.doorHit, ease.in);
    ball = { x: lerp(hand.x, LX, t), y: lerp(hand.y, -70, t) - Math.sin(t * Math.PI) * 60, r: 26, squash: 1 };
  } else if (f < B.doorHit + 3) {
    ball = { x: LX + 10, y: -70, r: 26, squash: 1.45 - (f - B.doorHit) * 0.15 };
  } else if (f < B.whip) {
    // 弹回来直冲镜头：半径指数放大，最后几帧填满画面后从下方掠过
    const t = prog(f, B.doorHit + 3, B.doorHit + 21);
    const sx = 960 + (LX + 10 - cam.x) * cam.zoom;
    const sy = 540 + (-70 - cam.y) * cam.zoom;
    ballScreen = {
      x: lerp(sx, 1000, ease.out(t)),
      y: lerp(sy, 600, ease.out(t)) + Math.max(0, (t - 0.72) / 0.28) * 1500,
      r: 26 * cam.zoom * Math.pow(30, t),
      blur: Math.max(0, t - 0.6) * 30,
    };
  } else if (f >= B.whip + 6) {
    const h2 = handWorld({ x: ox, y: oy, scale: 2.1 }, 1, HOLD_SIDE);
    ball = { x: h2.x + 10, y: h2.y + 4, r: 26, squash: 1 };
  }

  // 右门：门里的房间（推进时它就是下一段的房间）
  const ceilingSway = Math.sin(f * 0.05) * 4;

  return (
    <Stage>
      <defs>
        <linearGradient id="cor-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#232733" />
          <stop offset="100%" stopColor={C.corridor} />
        </linearGradient>
        <radialGradient id="red-room">
          <stop offset="0%" stopColor="#FC593F" stopOpacity={0.85} />
          <stop offset="100%" stopColor="#4A1418" stopOpacity={1} />
        </radialGradient>
        <linearGradient id="warm-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.warmRoom} stopOpacity={0.45} />
          <stop offset="100%" stopColor={C.warmRoom} stopOpacity={0} />
        </linearGradient>
        <radialGradient id="sconce">
          <stop offset="0%" stopColor="#F6E2B8" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#F6E2B8" stopOpacity={0} />
        </radialGradient>
        <filter id="leak-blur">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="fg-blur-c">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <clipPath id="right-doorway">
          <rect x={RX - DOOR_W / 2} y={DOOR_TOP} width={DOOR_W} height={FLOOR - DOOR_TOP} />
        </clipPath>
      </defs>
      <MotionBlur id="mb-cor" bx={bx} by={0}>
        <rect width={1920} height={1080} fill="#1A1D27" />
        {/* 背景：墙纸、踢脚线、壁灯 */}
        <g transform={camT(cam, 0.85, anchor)}>
          <rect x={-2400} y={-900} width={4800} height={1300} fill="url(#cor-wall)" />
          {Array.from({ length: 70 }).map((_, i) => (
            <rect key={i} x={-2400 + i * 70} y={-900} width={30} height={1300} fill={C.corridorStripe} opacity={0.35} />
          ))}
          {[-1400, 0, 1400].map((sx) => (
            <g key={sx}>
              <circle cx={sx} cy={-420} r={260} fill="url(#sconce)" />
              <path d={`M ${sx - 30} -440 L ${sx + 30} -440 L ${sx + 18} -400 L ${sx - 18} -400 Z`} fill="#D9C79F" />
            </g>
          ))}
        </g>
        <g transform={camT(cam, 1, anchor)}>
          <rect x={-2600} y={FLOOR - 30} width={5200} height={34} fill={C.corridorDark} />
          <rect x={-2600} y={FLOOR} width={5200} height={900} fill="#2A2C36" />
          <rect x={-2600} y={FLOOR + 40} width={5200} height={140} fill="#33303F" opacity={0.7} />

          {/* 左门：门洞里红光 + 抱臂背对的灰色剪影 */}
          <rect x={LX - 150} y={DOOR_TOP - 30} width={300} height={FLOOR - DOOR_TOP + 30} fill={C.doorDark} />
          <rect x={LX - DOOR_W / 2} y={DOOR_TOP} width={DOOR_W} height={FLOOR - DOOR_TOP} fill="url(#red-room)" />
          {open > 0.02 ? (
            <Person
              x={LX + 30}
              y={FLOOR - 52 * 2.2}
              scale={2.2}
              who="shadow"
              view="back"
              armL={{ up: -28, bend: 118 }}
              armR={{ up: -28, bend: 118 }}
              breath={f}
            />
          ) : null}
          <DoorSlab x={LX - DOOR_W / 2} open={open} wob={wobble(f, B.doorShut, 0.6, 0.35)} hit={leak > 0.8 ? leak - 0.75 : 0} />
          {shut ? (
            <g opacity={leakA} filter="url(#leak-blur)">
              <rect x={LX - DOOR_W / 2} y={FLOOR - 9} width={DOOR_W} height={14} fill={C.accent} />
              <rect x={LX - DOOR_W / 2 - 60} y={FLOOR + 2} width={DOOR_W + 120} height={70} rx={30} fill={C.accent} opacity={0.4} />
              <rect x={LX + DOOR_W / 2 - 4} y={DOOR_TOP} width={7} height={FLOOR - DOOR_TOP} fill={C.accent} opacity={0.6} />
            </g>
          ) : null}

          {/* 右门：一直开着，里面是暖光的房间 */}
          <rect x={RX - 150} y={DOOR_TOP - 30} width={300} height={FLOOR - DOOR_TOP + 30} fill={C.doorDark} />
          <g clipPath="url(#right-doorway)">
            <g transform={`translate(${RX} ${ROOM_CY}) scale(${ROOM_SCALE})`}>
              <Room f={f} />
            </g>
          </g>
          <path
            d={`M ${RX - DOOR_W / 2} ${DOOR_TOP} L ${RX - DOOR_W / 2 - 70} ${DOOR_TOP + 30} L ${RX - DOOR_W / 2 - 70} ${FLOOR + 30} L ${RX - DOOR_W / 2} ${FLOOR} Z`}
            fill={C.door}
          />
          <polygon
            points={`${RX - DOOR_W / 2},${FLOOR} ${RX + DOOR_W / 2},${FLOOR} ${RX + 360},${FLOOR + 700} ${RX - 360},${FLOOR + 700}`}
            fill="url(#warm-floor)"
          />

          {/* 天花板吊灯 */}
          <g transform={`rotate(${ceilingSway} 0 -900)`}>
            <line x1={0} y1={-900} x2={0} y2={-560} stroke="#14161E" strokeWidth={4} />
            <path d="M -50 -560 L 50 -560 L 34 -520 L -34 -520 Z" fill="#C9B58C" />
          </g>

          <Person
            x={ox}
            y={oy}
            scale={2.1}
            who="orange"
            view="back"
            legs={walking ? 'walk' : 'stand'}
            walkPhase={f * 0.5}
            armL={armL}
            armR={armR}
            breath={f}
          />
          {ball ? (
            <EmotionBall uid="ball-s1a" x={ball.x} y={ball.y} r={ball.r} squash={ball.squash} glow={0.75} dim={0.15} />
          ) : null}
        </g>
        {/* 前景：门把手的虚影 */}
        <g transform={camT(cam, 1.6, anchor)} filter="url(#fg-blur-c)" opacity={0.85}>
          {/* 左：挂在墙钩上的外套；右：鞋柜和一把伞 */}
          <path d={`M ${LX - 900} -60 C ${LX - 980} 40 ${LX - 1000} 260 ${LX - 960} 420 L ${LX - 760} 420 C ${LX - 740} 260 ${LX - 760} 40 ${LX - 840} -60 Z`} fill="#1A1C28" />
          <rect x={RX + 560} y={240} width={360} height={260} rx={20} fill="#16181F" />
          <path d={`M ${RX + 620} 240 L ${RX + 600} -80`} stroke="#16181F" strokeWidth={18} strokeLinecap="round" />
        </g>
      </MotionBlur>
      {ballScreen ? (
        <g>
          <defs>
            <filter id="ball-fly" filterUnits="userSpaceOnUse" x={-400} y={-400} width={2720} height={2400}>
              <feGaussianBlur stdDeviation={`${ballScreen.blur * 0.4} ${ballScreen.blur}`} />
            </filter>
          </defs>
          <g filter="url(#ball-fly)">
            <EmotionBall uid="ball-fly" x={ballScreen.x} y={ballScreen.y} r={ballScreen.r} glow={0.8} dim={0.15} />
          </g>
        </g>
      ) : null}
    </Stage>
  );
};

/** 门扇：铰链在左侧，open=1 时侧转成很窄的梯形 */
const DoorSlab: React.FC<{ x: number; open: number; wob: number; hit: number }> = ({ x, open, wob, hit }) => {
  const w = DOOR_W * (1 - open * 0.86) * (1 + wob * 0.012);
  const h = FLOOR - DOOR_TOP;
  const persp = open * 26;
  const pts = `${x},${DOOR_TOP} ${x + w},${DOOR_TOP - persp} ${x + w},${FLOOR + persp} ${x},${FLOOR}`;
  return (
    <g>
      <polygon points={pts} fill={mix(C.door, '#6B5560', hit * 0.6)} />
      <polygon
        points={`${x + w * 0.12},${DOOR_TOP + 30} ${x + w * 0.88},${DOOR_TOP + 30 - persp * 0.8} ${x + w * 0.88},${DOOR_TOP + h * 0.45 - persp * 0.4} ${x + w * 0.12},${DOOR_TOP + h * 0.45}`}
        fill="none"
        stroke={C.doorDark}
        strokeWidth={6}
      />
      <polygon
        points={`${x + w * 0.12},${DOOR_TOP + h * 0.52} ${x + w * 0.88},${DOOR_TOP + h * 0.52 - persp * 0.2} ${x + w * 0.88},${FLOOR - 30 + persp * 0.8} ${x + w * 0.12},${FLOOR - 30}`}
        fill="none"
        stroke={C.doorDark}
        strokeWidth={6}
      />
      <circle cx={x + w * 0.86} cy={DOOR_TOP + h * 0.5} r={9} fill="#C9B58C" />
    </g>
  );
};

// ───────────────────────── 房间（门里）与屋顶 ─────────────────────────

const ROOF_Y = -1000;

const roomCam = (f: number): Cam => {
  const settle = prog(f, B.roomIn, B.tiltUp, ease.out);
  let c: Cam = { x: settle * 80, y: 0, zoom: 1 + settle * 0.06 };
  // 上摇到屋顶
  const tilt = prog(f, B.tiltUp, B.tiltUp + 14, ease.inOutQuart);
  c = { x: lerp(c.x, 300, tilt), y: lerp(0, -1240, tilt), zoom: lerp(c.zoom, 1.1, tilt) };
  c.x -= prog(f, B.tiltUp + 14, B.pullBack, ease.inOut) * 60;
  // 沿绳拉远
  const pb = prog(f, B.pullBack, B.pullBack + 40, ease.inOut);
  c = { x: lerp(c.x, -420, pb), y: lerp(c.y, -1210, pb), zoom: lerp(c.zoom, 0.42, pb) };
  // 推回小蓝
  const pr = prog(f, B.receipts + 4, B.receipts + 30, ease.inOut);
  c = { x: lerp(c.x, 600, pr), y: lerp(c.y, -1170, pr), zoom: lerp(c.zoom, 1.5, pr) };
  // 跟着红球落下
  const fl = prog(f, B.throw2 + 4, B.impact, ease.inOut);
  c = { x: lerp(c.x, 620, fl), y: lerp(c.y, -1140, fl), zoom: lerp(c.zoom, 1.85, fl) };
  c.zoom += wobble(f, B.impact, 0.45, 0.28) * 0.05;
  // 落地后慢慢拉开
  const po = prog(f, B.impact + 4, B.wipe + 14, ease.inOut);
  return { x: lerp(c.x, 590, po), y: lerp(c.y, -1160, po), zoom: lerp(c.zoom, 1.55, po) };
};

const RoomAndRoofShot: React.FC<{ f: number }> = ({ f }) => {
  const cam = roomCam(f);
  const prev = roomCam(f - 1);
  const by = Math.min(40, Math.abs(cam.y - prev.y) * cam.zoom * 0.35);
  const anchor = { x: 0, y: -600 };
  return (
    <Stage>
      <defs>
        <filter id="fg-blur-r">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <MotionBlur id="mb-roof" bx={0} by={by}>
        <rect width={1920} height={1080} fill="#151626" />
        <g transform={camT(cam, 0.6, anchor)}>
          <Sky f={f} />
        </g>
        <g transform={camT(cam, 1, anchor)}>
          <Room f={f} />
          <Rooftop f={f} />
        </g>
        <g transform={camT(cam, 1.35, anchor)} filter="url(#fg-blur-r)">
          <RoomForeground f={f} />
        </g>
      </MotionBlur>
      <RoofForegroundPins f={f} cam={cam} />
    </Stage>
  );
};

/** 门里的房间：暖光，小蓝只剩半透明线稿，红球从 TA 脚下穿过 */
const Room: React.FC<{ f: number }> = ({ f }) => {
  const pass = B.rollThrough;
  const ballX = 200 + (f - pass) * 45;
  const ballOn = f >= B.roomIn && ballX < 1300;
  const flicker = 1 - track(f, [[pass - 4, 0], [pass, 0.55], [pass + 10, 0, ease.out]]);
  const ring = prog(f, pass, pass + 18, ease.out);
  const sec = Math.floor(f / 30);
  const tick = sec * 6 + prog(f % 30, 0, 5, ease.outBack) * 6;
  return (
    <g>
      <defs>
        <linearGradient id="room-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4B3F4E" />
          <stop offset="100%" stopColor="#5E4D58" />
        </linearGradient>
        <radialGradient id="room-lamp">
          <stop offset="0%" stopColor={C.warmRoom} stopOpacity={0.55} />
          <stop offset="100%" stopColor={C.warmRoom} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-1400} y={-560} width={2800} height={900} fill="url(#room-wall)" />
      <rect x={-1400} y={110} width={2800} height={12} fill="#3F3443" />
      <rect x={-1400} y={300} width={2800} height={600} fill="#3A2F3B" />
      <ellipse cx={120} cy={390} rx={620} ry={70} fill="#46384A" />
      <circle cx={-820} cy={-160} r={520} fill="url(#room-lamp)" />
      {/* 落地灯 */}
      <rect x={-826} y={-170} width={12} height={470} fill="#8E7A62" />
      <path d="M -890 -170 L -750 -170 L -780 -270 L -860 -270 Z" fill={C.warmRoom} />
      {/* 窗 */}
      <rect x={420} y={-380} width={360} height={400} rx={10} fill="#1C2347" />
      {Array.from({ length: 14 }).map((_, i) => (
        <circle key={i} cx={440 + rand(i) * 320} cy={-360 + rand(i + 20) * 360} r={2 + rand(i + 5) * 2} fill="#F8D893" opacity={0.4 + 0.4 * Math.abs(Math.sin(f * 0.07 + i))} />
      ))}
      <path d="M 420 -380 H 780 V 20 H 420 Z M 600 -380 V 20" stroke="#6B5866" strokeWidth={14} fill="none" />
      {/* 挂钟 */}
      <g transform="translate(-480 -280)">
        <circle r={78} fill="#E9DCC8" />
        <circle r={78} fill="none" stroke="#6B5866" strokeWidth={8} />
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x={-2} y={-68} width={4} height={10} fill="#6B5866" transform={`rotate(${i * 30})`} />
        ))}
        <rect x={-3} y={-40} width={6} height={44} rx={3} fill="#3B3040" transform="rotate(-50)" />
        <rect x={-1.5} y={-62} width={3} height={66} fill={C.accent} transform={`rotate(${tick})`} />
        <circle r={6} fill="#3B3040" />
      </g>
      {/* 单人椅 + 半透明的小蓝 */}
      <rect x={60} y={40} width={280} height={150} rx={40} fill="#6B5560" />
      <rect x={60} y={150} width={280} height={150} rx={26} fill="#5A4752" />
      <rect x={40} y={110} width={60} height={190} rx={28} fill="#6B5560" />
      <rect x={300} y={110} width={60} height={190} rx={28} fill="#6B5560" />
      <Person
        x={200}
        y={150}
        scale={2.2}
        who="blue"
        legs="sit"
        outline={0.9}
        opacity={0.8 * flicker + 0.1}
        armL={{ up: -20, bend: 60 }}
        armR={{ up: -20, bend: 60 }}
        look={{ x: 0, y: 0.6 }}
        breath={f}
      />
      {ring > 0 && ring < 1 ? (
        <ellipse cx={200} cy={300} rx={40 + ring * 260} ry={10 + ring * 50} fill="none" stroke="#CFE0FF" strokeWidth={4} opacity={(1 - ring) * 0.7} />
      ) : null}
      {ballOn ? (
        <>
          <ellipse cx={ballX} cy={300} rx={42} ry={8} fill="#000" opacity={0.25} />
          <EmotionBall uid="ball-room" x={ballX} y={254} r={46} glow={0.8} dim={0.2} spin={((ballX - 200) / 46) * 57.3} />
        </>
      ) : null}
      {/* 房顶剖面：天花板 → 楼板 → 屋顶 */}
      <rect x={-2600} y={-1000} width={5200} height={440} fill="#2A2634" />
      <rect x={-2600} y={-600} width={5200} height={40} fill="#3A3444" />
      {Array.from({ length: 20 }).map((_, i) => (
        <rect key={i} x={-2600 + i * 260} y={-900} width={120} height={200} rx={6} fill="#332E3F" />
      ))}
    </g>
  );
};

/** 房间前景：茶几上两杯茶，一杯冒热气、一杯不冒 */
const RoomForeground: React.FC<{ f: number }> = ({ f }) => {
  if (f > B.tiltUp + 16) return null;
  return (
    <g>
      <rect x={-1060} y={440} width={700} height={60} rx={20} fill="#2B2230" />
      {[-900, -620].map((cx, i) => (
        <g key={cx}>
          <rect x={cx - 40} y={370} width={80} height={72} rx={18} fill="#E9DCC8" />
          <ellipse cx={cx} cy={372} rx={40} ry={10} fill="#8A5A3B" />
          {i === 0
            ? [0, 1, 2].map((k) => {
                const ph = (f * 0.8 + k * 20) % 60;
                return (
                  <path
                    key={k}
                    d={`M ${cx - 14 + k * 14} ${360 - ph} q 12 -18 0 -36 q -12 -18 0 -36`}
                    stroke="#F3E9DA"
                    strokeWidth={6}
                    strokeLinecap="round"
                    fill="none"
                    opacity={0.5 * Math.sin((ph / 60) * Math.PI)}
                  />
                );
              })
            : null}
        </g>
      ))}
    </g>
  );
};

// 屋顶：晾衣绳
const ROPE_L = -1720;
const ROPE_R = 900;
const ROPE_Y = -1330;
const CARD_SPEED = 9;
const BLUE_ROOF = { x: 780, y: ROOF_Y - 51 * 2.0, scale: 2.0 };
const ORANGE_ROOF_FAR = { x: -1580, y: ROOF_Y - 51 * 2.0, scale: 2.0 };

const ropeSag = (f: number) => 40 + prog(f, B.pullBack, B.pullBack + 50, ease.inOut) * 110;
const ropeY = (x: number, f: number) => {
  const mid = (ROPE_L + ROPE_R) / 2;
  const half = (ROPE_R - ROPE_L) / 2;
  return ROPE_Y + ropeSag(f) * (1 - Math.pow((x - mid) / half, 2));
};

const cardX = (f: number, t0: number) => Math.max(ROPE_L + 260, 700 - (f - t0) * CARD_SPEED);

const Sky: React.FC<{ f: number }> = ({ f }) => {
  // 卡片流水线那段：日夜快速轮换；拉远之后停在黄昏
  const cyc = 0.5 - 0.5 * Math.cos(((f - B.tiltUp) / 32) * Math.PI * 2);
  const settle = prog(f, B.pullBack - 6, B.pullBack + 20, ease.inOut);
  const day = f < B.tiltUp ? 0 : lerp(cyc, 0.35, settle);
  const top = mix('#16203F', '#7FA8D6', day);
  const bot = mix('#2A3560', '#E8C9A0', day * 0.9);
  const ang = ((f - B.tiltUp) / 64) * Math.PI * 2;
  return (
    <g>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={top} />
          <stop offset="100%" stopColor={bot} />
        </linearGradient>
      </defs>
      <rect x={-4200} y={-3800} width={8400} height={3300} fill="url(#sky)" />
      <circle cx={Math.cos(ang) * 900 - 200} cy={-1450 - Math.sin(ang) * 380} r={70} fill="#F8D893" opacity={day * (1 - settle)} />
      <g opacity={(1 - day) * (1 - settle)}>
        <circle cx={-Math.cos(ang) * 900 - 200} cy={-1450 + Math.sin(ang) * 380} r={56} fill="#E9E4D4" />
        <circle cx={-Math.cos(ang) * 900 - 180} cy={-1462 + Math.sin(ang) * 380} r={50} fill={top} />
      </g>
      {Array.from({ length: 30 }).map((_, i) => (
        <circle key={i} cx={-3000 + rand(i) * 6000} cy={-3000 + rand(i + 40) * 2000} r={3} fill="#FFFFFF" opacity={(1 - day) * 0.6} />
      ))}
      {/* 远处楼群剪影 */}
      {Array.from({ length: 26 }).map((_, i) => (
        <rect
          key={i}
          x={-3600 + i * 280}
          y={-1000 - 60 - rand(i + 7) * 240}
          width={200}
          height={900}
          fill={mix('#232A4C', '#8C9AB8', day * 0.6)}
          opacity={0.75}
        />
      ))}
    </g>
  );
};

const CardIcon: React.FC<{ kind: number }> = ({ kind }) => {
  const col = '#7C93B5';
  switch (kind % 5) {
    case 0:
      return <path d="M -20 6 L 0 -14 L 20 6 L 20 24 L -20 24 Z" fill={col} />;
    case 1:
      return (
        <g>
          <path d="M -22 2 A 22 18 0 0 0 22 2 Z" fill={col} />
          <path d="M -8 -6 q 6 -8 0 -16 M 6 -6 q 6 -8 0 -16" stroke={col} strokeWidth={3} fill="none" strokeLinecap="round" />
        </g>
      );
    case 2:
      return (
        <g>
          <circle r={18} fill={col} />
          <circle cx={8} cy={-5} r={16} fill="#F4F1EA" />
        </g>
      );
    case 3:
      return <path d="M -18 -6 L -4 8 L 20 -16" stroke={col} strokeWidth={6} fill="none" strokeLinecap="round" />;
    default:
      return <rect x={-18} y={-14} width={36} height={28} rx={8} fill={col} />;
  }
};

const Rooftop: React.FC<{ f: number }> = ({ f }) => {
  if (f < B.tiltUp - 2) return null;
  const sag = ropeSag(f);
  const mid = (ROPE_L + ROPE_R) / 2;
  const ropePath = `M ${ROPE_L} ${ROPE_Y} Q ${mid} ${ROPE_Y + sag * 2} ${ROPE_R} ${ROPE_Y}`;

  // 小蓝：夹卡片 → 拿小票机 → 撕小票
  const clipPhase = B.clip.find((t) => f >= t - 8 && f < t + 4);
  const reachUp = clipPhase !== undefined ? Math.sin(prog(f, clipPhase - 8, clipPhase + 4) * Math.PI) : 0;
  const printing = f >= B.receipts + 4;
  const tearing = f >= B.throw2 - 6;
  const tear = tearing ? Math.sin((f - B.throw2) * 0.45) : 0;
  const blueArmL: Arm = printing
    ? { up: -30 + tear * 26, bend: 86 - tear * 20 }
    : { up: lerp(10, 160, reachUp), bend: lerp(10, 15, reachUp) };
  const blueArmR: Arm = printing
    ? { up: -30 - tear * 26, bend: 86 + tear * 20 }
    : { up: lerp(10, 165, reachUp), bend: lerp(10, 15, reachUp) };
  const glanceDown = track(f, [[B.impact + 16, 0], [B.impact + 22, 1, ease.out], [B.impact + 34, 1], [B.impact + 40, 0, ease.inOut]]);

  // 小橙：先远在绳子另一端；推回小蓝后从左边走进来，扔球
  const near = f >= B.receipts + 18;
  const walkIn = prog(f, B.receipts + 18, B.throw2 - 6, ease.out);
  const ox = near ? lerp(-60, 330, walkIn) : ORANGE_ROOF_FAR.x;
  const oScale = 2.0;
  const oy = ROOF_Y - 51 * oScale;
  const throwT = prog(f, B.throw2 - 6, B.throw2 + 2, ease.out);
  const oArmR: Arm =
    f >= B.throw2 - 6
      ? { up: lerp(20, 160, throwT) - prog(f, B.throw2 + 4, B.throw2 + 18, ease.inOut) * 150, bend: lerp(60, 0, throwT) }
      : { up: -12, bend: 52 };
  const oHand = handWorld({ x: ox, y: oy, scale: oScale }, 1, oArmR);
  const sadT = prog(f, B.impact + 4, B.impact + 20, ease.inOut);

  // 红球：手里 → 抛物线越过小蓝头顶 → 慢动作从 TA 两手之间落下 → 落地
  const groundY = ROOF_Y - 40;
  const apex = { x: 640, y: -1385 };
  const land = { x: BLUE_ROOF.x - 6, y: groundY };
  let ball = { x: oHand.x, y: oHand.y - 6, squash: 1, spin: 0 };
  if (f >= B.throw2 + 2 && f < B.throw2 + 12) {
    const t = prog(f, B.throw2 + 2, B.throw2 + 12, ease.out);
    ball = { x: lerp(oHand.x, apex.x, t), y: lerp(oHand.y, apex.y, t), squash: 1, spin: t * 200 };
  } else if (f >= B.throw2 + 12 && f < B.impact) {
    const t = prog(f, B.throw2 + 12, B.impact, ease.in);
    ball = { x: lerp(apex.x, land.x, t), y: lerp(apex.y, land.y, t), squash: 1 + t * 0.05, spin: 200 + t * 160 };
  } else if (f >= B.impact) {
    const sq = 1 + Math.max(0, wobble(f, B.impact, 0.5, 0.3)) * 0.5;
    const roll = prog(f, B.impact + 10, B.impact + 50, ease.out) * -70;
    ball = { x: land.x + roll, y: groundY + (1 - 1 / sq) * 40, squash: sq, spin: 360 + (roll / 40) * 57.3 };
  }
  const ballDim = prog(f, B.impact + 6, B.impact + 40, ease.inOut) * 0.45;
  const ripple = (d: number) => prog(f, B.impact + d, B.impact + d + 26, ease.out);

  const cards = B.clip.map((t0, i) => {
    if (f < t0 - 2) return null;
    let x = cardX(f, t0);
    let y = ropeY(x, f) + 6;
    let rot = Math.sin(f * 0.12 + i) * 4;
    let o = 1;
    if (f >= B.receipts) {
      const t = (f - B.receipts - i * 2) / 30;
      if (t > 0) {
        y += 900 * t * t;
        rot += t * 140 * (i % 2 ? 1 : -1);
        x += t * 60 * (i % 2 ? 1 : -1);
        o = clamp(1 - t * 1.2);
      }
    }
    return (
      <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`} opacity={o}>
        <rect x={-44} y={0} width={88} height={104} rx={8} fill="#F4F1EA" />
        <g transform="translate(0 56)">
          <CardIcon kind={i} />
        </g>
        <rect x={-30} y={-10} width={12} height={28} rx={3} fill="#B38B5D" />
        <rect x={18} y={-10} width={12} height={28} rx={3} fill="#B38B5D" />
      </g>
    );
  });

  // 小票：从小票机里吐出来，越过手背垂到地上，在脚边堆成一圈圈
  const strips = printing
    ? [0, 1, 2].map((k) => {
        const len = Math.max(0, f - B.receipts - 8 - k * 10) * 16;
        if (len <= 0) return null;
        const x0 = BLUE_ROOF.x + 20 + k * 10;
        const y0 = BLUE_ROOF.y - 72;
        const pts: string[] = [];
        for (let s = 0; s <= Math.min(len, 900); s += 14) {
          let x: number;
          let y: number;
          if (s < 60) {
            x = x0 + s * 0.4;
            y = y0 - s * 0.6;
          } else if (s < 240) {
            const u = (s - 60) / 180;
            x = x0 + 24 + u * (60 + k * 30) + Math.sin(u * 6 + f * 0.08 + k) * 10;
            y = y0 - 36 + u * (ROOF_Y - 8 - (y0 - 36));
          } else {
            const u = s - 240;
            x = x0 + 84 + k * 30 + u * 0.32 + Math.sin(u * 0.05 + k) * 34;
            y = ROOF_Y - 8 - Math.abs(Math.sin(u * 0.025 + k)) * 26;
          }
          pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
        }
        return (
          <polyline
            key={k}
            points={pts.join(' ')}
            stroke="#F2EEE4"
            strokeWidth={13}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })
    : null;

  const bits =
    f >= B.impact
      ? Array.from({ length: 10 }).map((_, i) => {
          const t = (f - B.impact) / 30;
          const vx = (rand(i) - 0.5) * 520;
          const vy = -380 - rand(i + 3) * 300;
          const x = land.x + vx * t;
          const y = groundY + vy * t + 520 * t * t;
          if (y > ROOF_Y + 10) return null;
          return <rect key={i} x={x - 12} y={y - 7} width={24} height={14} rx={2} fill="#F5F2EA" transform={`rotate(${t * 300 * (i % 2 ? 1 : -1)} ${x} ${y})`} />;
        })
      : null;

  return (
    <g>
      {/* 屋顶地面、女儿墙；上摇完成后，下面换成楼体外立面（拉远时不再露出房间剖面） */}
      <rect x={-4000} y={ROOF_Y} width={8000} height={60} fill="#4A4458" />
      <rect x={-4000} y={ROOF_Y + 60} width={8000} height={f > B.tiltUp + 14 ? 2600 : 420} fill="#2A2634" />
      {f > B.tiltUp + 14
        ? Array.from({ length: 40 }).map((_, i) => (
            <rect
              key={i}
              x={-3800 + (i % 20) * 380}
              y={ROOF_Y + 560 + Math.floor(i / 20) * 300}
              width={150}
              height={170}
              rx={8}
              fill={rand(i) > 0.55 ? '#E8C98F' : '#35304A'}
              opacity={rand(i) > 0.55 ? 0.3 : 1}
            />
          ))
        : null}
      {/* 晾衣杆和绳子 */}
      {[ROPE_L, ROPE_R].map((px) => (
        <rect key={px} x={px - 8} y={ROPE_Y - 20} width={16} height={ROOF_Y - ROPE_Y + 20} fill="#8E7A62" />
      ))}
      <path d={ropePath} stroke="#D9CFC0" strokeWidth={5} fill="none" />
      {/* 小橙这一侧：空夹子 */}
      {Array.from({ length: 8 }).map((_, i) => {
        const x = ROPE_L + 120 + i * 90;
        return <rect key={i} x={x - 6} y={ropeY(x, f) - 12} width={12} height={26} rx={3} fill="#B38B5D" />;
      })}
      {cards}
      {ripple(0) > 0 && ripple(0) < 1 ? (
        <>
          <ellipse cx={land.x} cy={ROOF_Y + 4} rx={40 + ripple(0) * 520} ry={8 + ripple(0) * 60} fill="none" stroke={C.accent} strokeWidth={6} opacity={(1 - ripple(0)) * 0.7} />
          <ellipse cx={land.x} cy={ROOF_Y + 4} rx={40 + ripple(6) * 380} ry={8 + ripple(6) * 44} fill="none" stroke={C.accent} strokeWidth={4} opacity={(1 - ripple(6)) * 0.5 * (ripple(6) > 0 ? 1 : 0)} />
        </>
      ) : null}
      {strips}
      <Person
        {...BLUE_ROOF}
        who="blue"
        armL={blueArmL}
        armR={blueArmR}
        look={{ x: lerp(-0.2, -0.3, glanceDown), y: lerp(printing ? 0.8 : -0.6, 1, glanceDown) }}
        mouth={0}
        breath={f}
        holdR={
          printing && !tearing ? (
            <g transform="translate(-20 -6)">
              <rect x={-30} y={-24} width={60} height={48} rx={8} fill="#D8DCE4" />
              <rect x={-20} y={-26} width={40} height={6} rx={3} fill="#5D6474" />
            </g>
          ) : null
        }
      />
      <Person
        x={ox}
        y={oy}
        scale={oScale}
        who="orange"
        legs={near && walkIn < 1 ? 'walk' : 'stand'}
        walkPhase={f * 0.5}
        armR={oArmR}
        armL={{ up: lerp(6, -4, sadT), bend: lerp(6, 30, sadT) }}
        look={{ x: 0.8, y: lerp(-0.3, 0.7, sadT) }}
        mouth={lerp(0.2, -0.6, sadT)}
        brows={sadT * 0.9}
        breath={f}
      />
      {bits}
      {f >= B.impact ? <ellipse cx={ball.x} cy={ROOF_Y + 2} rx={36} ry={7} fill="#000" opacity={0.3} /> : null}
      <EmotionBall uid="ball-roof" x={ball.x} y={ball.y} r={40} squash={ball.squash} spin={ball.spin} glow={0.85} dim={0.15 + ballDim} />
    </g>
  );
};

/** 屋顶前景：大号晾衣夹从镜头前快速掠过（屏幕空间，带虚焦） */
const RoofForegroundPins: React.FC<{ f: number; cam: Cam }> = ({ f }) => {
  if (f < B.tiltUp + 10 || f > B.pullBack + 30) return null;
  const t = (f - B.tiltUp - 10) / 30;
  return (
    <g filter="url(#fg-blur-r)" opacity={0.85}>
      {[0, 1].map((k) => {
        const x = 2200 - ((t + k * 0.9) % 2.2) * 1300;
        return (
          <g key={k} transform={`translate(${x} ${-40 + k * 30}) rotate(${-12 + k * 20})`}>
            <rect x={-40} y={0} width={80} height={260} rx={18} fill="#8A6844" />
            <rect x={-8} y={60} width={16} height={60} fill="#5E4630" />
          </g>
        );
      })}
    </g>
  );
};

// ───────────────────────── 转场：小票纸带擦出客服大厅 ─────────────────────────

const WipeToHall: React.FC<{ f: number }> = ({ f }) => {
  // 一条小票纸带从左往右扫过：纸带后面是客服大厅，前面还是屋顶
  const p = prog(f, B.wipe, B.wipe + 22, ease.inOut);
  const band = 520;
  const lead = lerp(-60, 1920 + band + 80, p);
  const tail = lead - band;
  return (
    <Stage>
      <defs>
        <clipPath id="hall-clip">
          <rect x={-10} y={-10} width={Math.max(0, tail + 10)} height={1100} />
        </clipPath>
      </defs>
      <g clipPath="url(#hall-clip)">
        <HallTeaser f={f} />
      </g>
      <g transform={`translate(${tail} 0) skewX(-6)`}>
        <rect x={0} y={-40} width={band} height={1160} fill="#E9E2D3" />
        {Array.from({ length: 15 }).map((_, i) => (
          <rect key={i} x={40 + (i % 3) * 26} y={70 + i * 66} width={220 + rand(i) * 200} height={10} rx={5} fill="#BDB4A3" opacity={0.7} />
        ))}
        <rect x={band - 16} y={-40} width={16} height={1160} fill="#000" opacity={0.1} />
      </g>
    </Stage>
  );
};

const HallTeaser: React.FC<{ f: number }> = ({ f }) => {
  const drift = (f - B.wipe) * 1.5;
  return (
    <g>
      <rect width={1920} height={1080} fill="#2C3546" />
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={200 + i * 300 - drift} y={110} width={180} height={14} rx={7} fill="#DCE6F2" opacity={0.5} />
      ))}
      {Array.from({ length: 7 }).map((_, i) => {
        const s = 1 - i * 0.12;
        const x = 960 + (i - 3) * 260 * s - drift * s;
        return (
          <g key={i} transform={`translate(${x} ${620}) scale(${s})`}>
            <rect x={-110} y={-40} width={220} height={140} rx={10} fill="#3E4A60" />
            <circle cx={0} cy={-90} r={30} fill="#23293A" />
            <rect x={-34} y={-62} width={68} height={40} rx={14} fill="#23293A" />
          </g>
        );
      })}
      <rect y={760} width={1920} height={320} fill="#252D3D" />
    </g>
  );
};

