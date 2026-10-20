import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ease, lerp, prog, rand, track, wobble, type Key } from '../anim';
import { camT, MotionBlur, Stage, type Cam } from '../camera';
import { ChatBubble } from '../components/ChatBubble';
import { EmotionBall } from '../components/EmotionBall';
import { handWorld, Person, type Arm } from '../components/Person';
import { B2 } from '../data/timeline';
import { C, FONT_SANS, mix } from '../theme';
import { HallTeaser } from './S1NotColdViolence';

/**
 * 第 2 节「客服式回应」：客服大厅 → 一模一样的无数柜台 → 印章 → 封箱上架
 * → 卷帘落下、灯一排排熄灭 → 卷帘纹理匹配成百叶窗，第二天早上 → 撕日历 → 推进木纹桌面。
 */
export const S2Service: React.FC = () => {
  const f = useCurrentFrame();
  if (f < B2.hallIn || f > B2.toS3 + 26) return null;
  const toKitchen = prog(f, B2.morning - 6, B2.morning + 4, ease.inOut);
  return (
    <>
      {toKitchen < 1 ? <HallShot f={f} /> : null}
      {toKitchen > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: toKitchen }}>
          <KitchenShot f={f} />
        </div>
      ) : null}
    </>
  );
};

// ───────────────────────── 客服大厅 ─────────────────────────

const FLOOR = 300;
const DESK_TOP = 100;
const PANE_X = -90;
const BLUE_AT = { x: 130, y: 150, scale: 2 };
const SLOT_BALL_X = -2;
const BALL_R = 30;

const hallCam = (f: number): Cam => {
  // 从擦出的大厅画面推近主柜台
  const intro = prog(f, B2.hallIn, B2.hallIn + 20, ease.out);
  let c: Cam = { x: lerp(60, 10, intro), y: lerp(-120, -10, intro), zoom: lerp(0.62, 1.25, intro) };
  c.zoom += prog(f, B2.hallIn + 20, B2.pullWide, ease.inOut) * 0.08;
  // 拉远：无数个一模一样的柜台
  const w = prog(f, B2.pullWide, B2.pullWide + 40, ease.inOut);
  c = { x: lerp(c.x, 200, w), y: lerp(c.y, -60, w), zoom: lerp(c.zoom, 0.34, w) };
  // 回到柜台：印章特写
  const s = prog(f, B2.stampIn - 6, B2.stampIn + 18, ease.inOut);
  c = { x: lerp(c.x, 20, s), y: lerp(c.y, 10, s), zoom: lerp(c.zoom, 2.0, s) };
  c.zoom += prog(f, B2.stampIn + 18, B2.box, ease.inOut) * 0.15;
  c.zoom += B2.stamps.reduce((a, t) => a + Math.max(0, wobble(f, t, 0.5, 0.4)) * 0.025, 0);
  // 纸箱上架，镜头上摇
  const up = prog(f, B2.boxLift, B2.boxLift + 30, ease.inOut);
  c = { x: lerp(c.x, 240, up), y: lerp(c.y, -640, up), zoom: lerp(c.zoom, 0.95, up) };
  // 回到柜台：敲玻璃、打哈欠、卷帘
  const down = prog(f, B2.knock[0] - 14, B2.knock[0] + 6, ease.inOut);
  c = { x: lerp(c.x, 40, down), y: lerp(c.y, -20, down), zoom: lerp(c.zoom, 1.45, down) };
  c.zoom += prog(f, B2.knock[0] + 6, B2.shutter, ease.inOut) * 0.1;
  // 推进卷帘，直到卷帘纹理填满画面
  const into = prog(f, B2.lightsOff, B2.morning, ease.in);
  return { x: lerp(c.x, 200, into), y: lerp(c.y, -90, into), zoom: c.zoom * Math.pow(4.2, into) };
};

const Headset: React.FC<{ x: number; y: number; scale: number }> = ({ x, y, scale }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <path d="M -38 -98 A 38 40 0 0 1 38 -98" stroke="#20232E" strokeWidth={6} fill="none" />
    <rect x={-44} y={-106} width={12} height={22} rx={5} fill="#20232E" />
    <rect x={32} y={-106} width={12} height={22} rx={5} fill="#20232E" />
    <path d="M -38 -88 Q -34 -70 -14 -72" stroke="#20232E" strokeWidth={3} fill="none" />
    <circle cx={-12} cy={-72} r={4} fill="#20232E" />
  </g>
);

/** 一个柜台单元：桌面、玻璃隔板、戴耳麦的小蓝、显示屏 */
const Counter: React.FC<{
  x: number;
  f: number;
  main?: boolean;
  blueArmL?: Arm;
  blueArmR?: Arm;
  blueFace?: { mouth: number; mouthOpen?: number; blink?: number; look?: { x: number; y: number }; brows?: number };
  check?: number;
  shutter?: number;
  holdL?: React.ReactNode;
}> = ({ x, f, main, blueArmL, blueArmR, blueFace, check = 0, shutter = 0, holdL }) => {
  const smileSync = 0.55 + Math.sin(f * 0.09) * 0.05;
  const face = blueFace ?? { mouth: smileSync };
  return (
    <g transform={`translate(${x} 0)`}>
      {/* 背后的墙面和工牌 */}
      <rect x={-220} y={-330} width={720} height={430} fill="#2F3A4E" />
      <rect x={-200} y={-310} width={680} height={14} fill="#3B4860" />
      <Person
        x={BLUE_AT.x}
        y={BLUE_AT.y}
        scale={BLUE_AT.scale}
        who="blue"
        legs="sit"
        armL={blueArmL ?? { up: -22, bend: 70 }}
        armR={blueArmR ?? { up: -22, bend: 70 }}
        mouth={face.mouth}
        mouthOpen={face.mouthOpen}
        blink={face.blink}
        look={face.look ?? { x: -0.4, y: 0.1 }}
        brows={face.brows}
        breath={f}
        holdL={holdL}
      />
      <Headset x={BLUE_AT.x} y={BLUE_AT.y} scale={BLUE_AT.scale} />
      {/* 卷帘：从玻璃顶上落下来，盖住小蓝 */}
      {shutter > 0 ? (
        <g>
          <rect x={PANE_X} y={-300} width={590} height={(DESK_TOP + 300) * shutter} fill="#6A7385" />
          {Array.from({ length: 22 }).map((_, i) => {
            const yy = -300 + i * 20;
            return yy < -300 + (DESK_TOP + 300) * shutter ? (
              <rect key={i} x={PANE_X} y={yy} width={590} height={4} fill="#556073" />
            ) : null;
          })}
          <rect x={PANE_X - 6} y={-300 + (DESK_TOP + 300) * shutter - 12} width={602} height={12} rx={4} fill="#4A5366" />
        </g>
      ) : null}
      {/* 桌面 */}
      <rect x={-230} y={DESK_TOP} width={740} height={26} rx={6} fill="#6A7895" />
      <rect x={-230} y={DESK_TOP + 26} width={740} height={FLOOR - DESK_TOP - 26} fill="#46536D" />
      <rect x={-230} y={DESK_TOP + 60} width={740} height={10} fill="#56647F" />
      {/* 玻璃隔板，底部留出小窗口 */}
      <rect x={PANE_X - 8} y={-280} width={16} height={DESK_TOP + 280 - 60} fill="#BFD6EE" opacity={0.35} />
      <rect x={PANE_X - 12} y={-290} width={24} height={14} rx={4} fill="#8796B0" />
      {/* 显示屏 */}
      <rect x={350} y={DESK_TOP - 10} width={16} height={12} fill="#2A3142" />
      <rect x={300} y={DESK_TOP - 92} width={116} height={82} rx={8} fill="#2A3142" />
      <rect x={308} y={DESK_TOP - 84} width={100} height={66} rx={4} fill={main ? mix('#3C4A66', '#4B6E5E', check) : '#3C4A66'} />
      {main && check > 0 ? (
        <path
          d={`M 336 ${DESK_TOP - 52} L 352 ${DESK_TOP - 36} L 384 ${DESK_TOP - 70}`}
          stroke={C.gold}
          strokeWidth={8}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={80}
          strokeDashoffset={80 * (1 - check)}
        />
      ) : null}
    </g>
  );
};

const HallShot: React.FC<{ f: number }> = ({ f }) => {
  const cam = hallCam(f);
  const prev = hallCam(f - 1);
  const by = Math.min(30, Math.abs(cam.y - prev.y) * cam.zoom * 0.3);
  const anchor = { x: 0, y: 0 };
  const intro = prog(f, B2.hallIn, B2.hallIn + 18, ease.inOut);

  // ── 小橙 ──
  const stepIn = prog(f, B2.knock[0] - 20, B2.knock[0] - 4, ease.inOut);
  const ox = lerp(-330, -250, stepIn);
  const orange = { x: ox, y: FLOOR - 51 * 2.1, scale: 2.1 };
  const place = track(f, [
    [B2.placeBall - 14, 0],
    [B2.placeBall, 1, ease.out],
    [B2.placeBall + 12, 0, ease.inOut],
  ]);
  const push2 = track(f, [
    [B2.stamps[0] + 14, 0],
    [B2.stamps[1] - 4, 1, ease.out],
    [B2.stamps[1] + 8, 0.6],
    [B2.stamps[6] + 6, 0.6],
    [B2.stamps[6] + 16, 0, ease.inOut],
  ]);
  const knockA = (t: number) => Math.max(0, wobble(f, t - 2, 0.4, 0.3));
  const knocking = f >= B2.knock[0] - 6 && f < B2.yawn;
  let oArmR: Arm = { up: lerp(6, 84, Math.max(place, push2)), bend: lerp(6, 4, Math.max(place, push2)) };
  if (knocking) oArmR = { up: 96 + (knockA(B2.knock[0]) + knockA(B2.knock[1])) * 14, bend: 30 };
  const oSad = prog(f, B2.stamps[3], B2.stamps[6], ease.inOut);
  const oTalk = f >= B2.knock[1] && f < B2.sign + 10 ? Math.abs(Math.sin(f * 0.5)) * 0.6 : 0;

  // ── 红球：手里 → 柜台 → 从窗口滑过去 → 被扫码 → 被盖章 → 进纸箱 ──
  const hand = handWorld(orange, 1, oArmR);
  const onDeskY = DESK_TOP - BALL_R;
  let ball: { x: number; y: number; show: boolean } = { x: hand.x + 6, y: hand.y - 4, show: true };
  if (f >= B2.placeBall) {
    const sl = prog(f, B2.slide, B2.slide + 10, ease.inOut);
    ball = { x: lerp(-170, SLOT_BALL_X, sl), y: onDeskY, show: true };
  }
  const boxDrop = prog(f, B2.boxDrop, B2.boxDrop + 8, ease.in);
  if (f >= B2.boxDrop) ball = { x: SLOT_BALL_X, y: onDeskY - 40 + boxDrop * 70, show: boxDrop < 1 };
  const stampsDone = B2.stamps.filter((t) => f >= t + 2).length;
  const ballDim = 0.1 + stampsDone * 0.07;

  // ── 小蓝：扫码 → 盖章 → 封箱上架 → 打哈欠 → 指牌子 ──
  const scanA = track(f, [
    [B2.scan - 10, 0],
    [B2.scan - 2, 1, ease.out],
    [B2.scan + 12, 1],
    [B2.scan + 20, 0, ease.inOut],
  ]);
  const stampLift = B2.stamps.reduce((m, t) => {
    const d = f - t;
    if (d < -8 || d > 8) return m;
    return Math.min(m, d < 0 ? 1 + d / 8 : d / 8);
  }, 1);
  const stamping = f >= B2.stampIn && f < B2.box;
  const lifting = prog(f, B2.boxLift - 6, B2.boxLift + 6, ease.inOut) * (1 - prog(f, B2.boxLift + 26, B2.boxLift + 34));
  const yawnT = track(f, [
    [B2.yawn - 4, 0],
    [B2.yawn + 6, 1, ease.out],
    [B2.yawn + 16, 1],
    [B2.yawn + 22, 0, ease.inOut],
  ]);
  const pointT = prog(f, B2.sign - 6, B2.sign + 4, ease.out) * (1 - prog(f, B2.shutter + 10, B2.shutter + 20));
  let bArmL: Arm = { up: -22, bend: 70 };
  if (scanA > 0) bArmL = { up: lerp(-22, 62, scanA), bend: lerp(70, 30, scanA) };
  if (stamping) bArmL = { up: lerp(52, 72, stampLift), bend: lerp(20, 60, stampLift) };
  if (lifting > 0) bArmL = { up: lerp(-22, 150, lifting), bend: lerp(70, 10, lifting) };
  if (yawnT > 0) bArmL = { up: lerp(-22, -40, yawnT), bend: lerp(70, 150, yawnT) };
  if (pointT > 0) bArmL = { up: lerp(-22, -70, pointT), bend: lerp(70, 10, pointT) };
  const blueFace = {
    mouth: yawnT > 0 ? 0 : 0.55 + Math.sin(f * 0.09) * 0.05,
    mouthOpen: yawnT,
    blink: yawnT,
    look: { x: -0.5, y: stamping ? 0.6 : 0.1 },
  };

  const stampTool = stamping ? (
    <g>
      <rect x={-8} y={-30} width={16} height={34} rx={6} fill="#8A6844" />
      <rect x={-22} y={2} width={44} height={14} rx={3} fill="#3D3A44" />
    </g>
  ) : scanA > 0 ? (
    <g>
      <rect x={-10} y={-8} width={34} height={20} rx={6} fill="#3D4458" />
      <rect x={-4} y={8} width={12} height={22} rx={4} fill="#3D4458" />
    </g>
  ) : null;

  const lights = (row: number) => 1 - prog(f, B2.lightsOff + row * 4, B2.lightsOff + row * 4 + 6);
  const boxIn = prog(f, B2.box, B2.box + 10, ease.out);
  const flaps = prog(f, B2.boxClose, B2.boxClose + 8, ease.inOut);
  const tapeT = prog(f, B2.tape, B2.tape + 8, ease.out);
  const liftP = prog(f, B2.boxLift, B2.boxLift + 28, ease.inOut);
  const boxPos = { x: lerp(SLOT_BALL_X, 330, liftP) + lerp(220, 0, boxIn), y: lerp(DESK_TOP, -560, liftP) };
  const shutterT = prog(f, B2.shutter + 4, B2.shutter + 30, ease.inOut);

  return (
    <Stage>
      <defs>
        <filter id="fg-blur-h">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <radialGradient id="hall-light">
          <stop offset="0%" stopColor="#DCE6F2" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#DCE6F2" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* 承接上一节：擦出来的大厅画面，推近后淡出 */}
      {intro < 1 ? (
        <g opacity={1 - intro} transform={`translate(937 620) scale(${1 + intro * 1.6}) translate(-937 -620)`}>
          <HallTeaser f={f} />
        </g>
      ) : null}
      <g opacity={intro}>
        <MotionBlur id="mb-hall" bx={0} by={by}>
          <rect width={1920} height={1080} fill="#1E2533" />
          {/* 背景：天花板灯带、远处柜台剪影 */}
          <g transform={camT(cam, 0.55, anchor)}>
            <rect x={-4000} y={-1600} width={8000} height={2400} fill="#283246" />
            {Array.from({ length: 4 }).map((_, row) =>
              Array.from({ length: 16 }).map((__, i) => (
                <g key={`${row}-${i}`} opacity={lights(row)}>
                  <rect x={-3600 + i * 460} y={-900 + row * 90} width={260} height={16} rx={8} fill="#DCE6F2" opacity={0.55} />
                  <ellipse cx={-3470 + i * 460} cy={-860 + row * 90} rx={200} ry={60} fill="url(#hall-light)" />
                </g>
              )),
            )}
            {Array.from({ length: 14 }).map((_, i) => (
              <g key={i} transform={`translate(${-3200 + i * 480} -240)`} opacity={0.5}>
                <rect x={-120} y={0} width={240} height={110} rx={8} fill="#3A465C" />
                <circle cx={0} cy={-40} r={30} fill="#1E2533" />
                <rect x={-36} y={-14} width={72} height={30} rx={12} fill="#1E2533" />
              </g>
            ))}
          </g>
          {/* 中景：一排一模一样的柜台、货架墙 */}
          <g transform={camT(cam, 1, anchor)}>
            <rect x={-6000} y={FLOOR} width={12000} height={1600} fill="#252D3D" />
            <rect x={-6000} y={FLOOR} width={12000} height={20} fill="#2F3A4E" />
            {/* 货架墙：一排排封好的纸箱（以前的委屈） */}
            <rect x={-400} y={-1260} width={1500} height={900} fill="#2A3142" />
            {Array.from({ length: 5 }).map((_, row) => (
              <g key={row}>
                <rect x={-400} y={-1100 + row * 170} width={1500} height={14} fill="#4A5366" />
                {Array.from({ length: 9 }).map((__, i) =>
                  row === 2 && i === 4 ? null : (
                    <g key={i} transform={`translate(${-330 + i * 160} ${-1100 + row * 170})`}>
                      <rect x={-56} y={-110} width={112} height={110} rx={6} fill={mix('#B98B5E', '#8C7A6A', rand(row * 9 + i) * 0.5)} />
                      <rect x={-56} y={-66} width={112} height={12} fill="#D9C7A7" opacity={0.7} />
                      <path d="M -10 -60 l 6 6 l 12 -12" stroke="#6B5844" strokeWidth={3} fill="none" />
                    </g>
                  ),
                )}
              </g>
            ))}
            {[-4, -3, -2, -1, 1, 2, 3, 4].map((k) => (
              <Counter key={k} x={k * 900} f={f} />
            ))}
            <Counter
              x={0}
              f={f}
              main
              blueArmL={bArmL}
              blueFace={blueFace}
              check={prog(f, B2.scan + 2, B2.scan + 12, ease.out)}
              shutter={shutterT}
              holdL={stampTool}
            />
            {/* 暂停服务的小牌子：月亮 + Z */}
            {f >= B2.sign - 10 ? (
              <g transform={`translate(240 ${DESK_TOP}) scale(${prog(f, B2.sign - 10, B2.sign - 2, ease.outBack)})`}>
                <path d="M -50 0 L -36 -86 L 36 -86 L 50 0 Z" fill="#E9DCC8" />
                <circle cx={-6} cy={-46} r={20} fill="#5D7396" />
                <circle cx={4} cy={-52} r={18} fill="#E9DCC8" />
                <path d="M 14 -70 h 14 l -14 16 h 14" stroke="#5D7396" strokeWidth={4} fill="none" />
              </g>
            ) : null}
            {/* 纸箱 */}
            {f >= B2.box && f < B2.knock[0] ? (
              <g transform={`translate(${boxPos.x} ${boxPos.y})`}>
                <rect x={-70} y={-96} width={140} height={96} rx={6} fill="#B98B5E" />
                <path d={`M -70 -96 L ${-70 + 70 * flaps} ${-96 - 40 * (1 - flaps)} L 0 -96 Z`} fill="#A87A50" />
                <path d={`M 70 -96 L ${70 - 70 * flaps} ${-96 - 40 * (1 - flaps)} L 0 -96 Z`} fill="#A87A50" />
                {tapeT > 0 ? (
                  <g>
                    <rect x={-70 * tapeT} y={-102} width={140 * tapeT} height={16} fill="#E9DCC8" />
                    <path d="M -14 -62 l 10 10 l 20 -22" stroke="#6B5844" strokeWidth={6} fill="none" opacity={tapeT} />
                  </g>
                ) : null}
              </g>
            ) : null}
            {ball.show ? (
              <EmotionBall uid="ball-s2" x={ball.x} y={ball.y} r={BALL_R} glow={0.75} dim={Math.min(0.6, ballDim)} stamps={stampsDone} />
            ) : null}
            {/* 扫码光线 */}
            {scanA > 0.9 && f < B2.scan + 12 ? (
              <line x1={handWorld(BLUE_AT, -1, bArmL).x} y1={handWorld(BLUE_AT, -1, bArmL).y} x2={ball.x} y2={ball.y} stroke="#9FE3F2" strokeWidth={3} opacity={0.6} />
            ) : null}
            <Person
              {...orange}
              who="orange"
              armR={oArmR}
              armL={{ up: lerp(6, -10, oSad), bend: lerp(6, 40, oSad) }}
              look={{ x: 0.85, y: lerp(0.1, 0.5, oSad) }}
              mouth={lerp(0.3, -0.5, oSad)}
              mouthOpen={oTalk}
              brows={oSad * 0.9}
              breath={f}
            />
            {/* 小橙想说话：气泡里只有一个红点 */}
            {f >= B2.knock[1] && f < B2.shutter + 20 ? (
              <g transform={`translate(${ox + 30} ${orange.y - 330}) scale(${prog(f, B2.knock[1], B2.knock[1] + 6, ease.outBack)})`}>
                <rect x={-60} y={-44} width={120} height={88} rx={44} fill="#F4F1EA" />
                <path d="M -20 40 L -34 66 L 4 42 Z" fill="#F4F1EA" />
                <circle r={14} fill={C.accent} />
              </g>
            ) : null}
            <rect x={-6000} y={-2000} width={12000} height={4000} fill="#05070C" opacity={(1 - lights(3)) * 0.45} />
          </g>
          {/* 前景：排队隔离带、取号机 */}
          <g transform={camT(cam, 1.4, anchor)} filter="url(#fg-blur-h)">
            {[-760, -420].map((px) => (
              <g key={px}>
                <rect x={px - 10} y={140} width={20} height={300} rx={8} fill="#141924" />
                <circle cx={px} cy={136} r={18} fill="#141924" />
              </g>
            ))}
            <path d="M -760 170 Q -590 210 -420 170" stroke="#2C3B5E" strokeWidth={16} fill="none" />
            <rect x={780} y={0} width={150} height={440} rx={20} fill="#141924" />
          </g>
        </MotionBlur>
      </g>
    </Stage>
  );
};

// ───────────────────────── 第二天早上：厨房 ─────────────────────────

const TABLE_Y = 140;

const kitchenCam = (f: number): Cam => {
  // 从百叶窗特写拉开
  const out = prog(f, B2.morning, B2.morning + 34, ease.inOut);
  let c: Cam = { x: lerp(0, 0, out), y: lerp(-250, -40, out), zoom: lerp(3.4, 1.05, out) };
  c.zoom += prog(f, B2.morning + 34, B2.tear, ease.inOut) * 0.25;
  c.x += prog(f, B2.morning + 34, B2.tear, ease.inOut) * 120;
  // 撕日历：转向左墙的日历
  const cal = prog(f, B2.tear - 14, B2.tear + 4, ease.inOut);
  c = { x: lerp(c.x, -380, cal), y: lerp(c.y, -150, cal), zoom: lerp(c.zoom, 1.5, cal) };
  // 拉远：一切明亮整洁
  const po = prog(f, B2.poster - 10, B2.poster + 34, ease.inOut);
  c = { x: lerp(c.x, 0, po), y: lerp(c.y, -60, po), zoom: lerp(c.zoom, 0.9, po) };
  // 推进木纹桌面（下一节天平底座的木纹）
  const tw = prog(f, B2.toS3 - 10, B2.toS3 + 22, ease.in);
  return { x: lerp(c.x, -40, tw), y: lerp(c.y, TABLE_Y + 70, tw), zoom: c.zoom * Math.pow(7, tw) };
};

export const WoodGrain: React.FC<{ x: number; y: number; w: number; h: number }> = ({ x, y, w, h }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill="#A87652" />
    {Array.from({ length: 14 }).map((_, i) => (
      <path
        key={i}
        d={`M ${x} ${y + (i + 0.5) * (h / 14)} C ${x + w * 0.3} ${y + (i + 0.2) * (h / 14)} ${x + w * 0.6} ${y + (i + 0.9) * (h / 14)} ${x + w} ${y + (i + 0.5) * (h / 14)}`}
        stroke="#8E5E3E"
        strokeWidth={h / 70}
        fill="none"
        opacity={0.45}
      />
    ))}
  </g>
);

const KitchenShot: React.FC<{ f: number }> = ({ f }) => {
  const cam = kitchenCam(f);
  const anchor = { x: 0, y: -100 };
  const blinds = prog(f, B2.morning + 2, B2.morning + 26, ease.inOut);
  const sunY = lerp(-120, -300, prog(f, B2.morning, B2.toS3));
  const toastUp = Math.max(0, wobble(f, B2.toast, 0.4, 0.25)) * 40 + (f >= B2.toast ? 20 : 0);
  const msg = prog(f, B2.askMsg, B2.askMsg + 8, ease.outBack);
  const tearT = prog(f, B2.tear, B2.tear + 46);
  const dayNum = f >= B2.tear + 2 ? 18 : 17;
  const ballDim = lerp(0.45, 0.72, prog(f, B2.tear, B2.tear + 24, ease.inOut));
  const glanceMsg = track(f, [
    [B2.askMsg - 4, 0],
    [B2.askMsg + 4, 1, ease.out],
  ]);

  return (
    <Stage>
      <defs>
        <linearGradient id="dawn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9CC4E4" />
          <stop offset="100%" stopColor="#F6D2A6" />
        </linearGradient>
        <radialGradient id="sun-glow">
          <stop offset="0%" stopColor="#FFF1C9" stopOpacity={0.9} />
          <stop offset="100%" stopColor="#FFF1C9" stopOpacity={0} />
        </radialGradient>
        <linearGradient id="sun-beam" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFF4DA" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#FFF4DA" stopOpacity={0} />
        </linearGradient>
        <filter id="fg-blur-k">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <rect width={1920} height={1080} fill="#C9AE8E" />
      <g transform={camT(cam, 0.8, anchor)}>
        <rect x={-2400} y={-1400} width={4800} height={1800} fill="#CDB394" />
        <rect x={-2400} y={-80} width={4800} height={14} fill="#BBA07F" />
        {/* 窗：日出、飞鸟 */}
        <rect x={-320} y={-470} width={640} height={420} rx={10} fill="url(#dawn-sky)" />
        <circle cx={60} cy={sunY} r={170} fill="url(#sun-glow)" />
        <circle cx={60} cy={sunY} r={46} fill="#FFE6B0" />
        {[0, 1, 2].map((k) => {
          const bx = -360 + ((f * 3 + k * 180) % 760);
          return (
            <path
              key={k}
              d={`M ${bx - 14} ${-380 + k * 40} q 7 -8 14 0 q 7 -8 14 0`}
              stroke="#5B6A8A"
              strokeWidth={3}
              fill="none"
              opacity={bx > -310 && bx < 300 ? 0.8 : 0}
            />
          );
        })}
        {/* 百叶窗升起 */}
        <g>
          {Array.from({ length: 14 }).map((_, i) => {
            const yy = lerp(-470 + i * 30, -470 + i * 6, blinds);
            return <rect key={i} x={-330} y={yy} width={660} height={lerp(26, 5, blinds)} fill="#F2EADC" />;
          })}
        </g>
        <path d="M -320 -470 H 320 V -50 H -320 Z" stroke="#CDB797" strokeWidth={16} fill="none" />
        <polygon points="-320,-50 320,-50 620,700 -120,700" fill="url(#sun-beam)" opacity={blinds} />
        {/* 窗台盆栽 */}
        <g transform="translate(250 -50)">
          <rect x={-26} y={-40} width={52} height={40} rx={6} fill="#C27D5A" />
          {[-30, 0, 30].map((a, i) => (
            <ellipse key={i} cx={Math.sin((a * Math.PI) / 180) * 30} cy={-70} rx={12} ry={34} transform={`rotate(${a + Math.sin(f * 0.06 + i) * 4} ${Math.sin((a * Math.PI) / 180) * 30} -70)`} fill="#6E9F7C" />
          ))}
        </g>
        {/* 日历 */}
        <g transform="translate(-700 -300)">
          <rect x={-110} y={-120} width={220} height={250} rx={10} fill="#FFFFFF" />
          <rect x={-110} y={-120} width={220} height={56} rx={10} fill={C.accent} />
          <text x={0} y={70} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={900} fontSize={110} fill="#3B3040">
            {dayNum}
          </text>
          {f >= B2.tear && f < B2.tear + 3 ? (
            <rect x={-110} y={-64} width={220} height={194} fill="#FFFFFF" />
          ) : null}
        </g>
      </g>
      <g transform={camT(cam, 1, anchor)}>
        <rect x={-2400} y={300} width={4800} height={1200} fill="#8E765D" />
        {/* 椅子 + 人物 */}
        {[-330, 330].map((cx) => (
          <rect key={cx} x={cx - 90} y={-60} width={180} height={340} rx={30} fill="#9B7656" />
        ))}
        <Person
          x={-330}
          y={110}
          scale={2}
          who="orange"
          legs="sit"
          armL={{ up: -14, bend: 34 }}
          armR={{ up: -14, bend: 34 }}
          look={{ x: lerp(0.7, 0.2, prog(f, B2.tear, B2.tear + 20)), y: lerp(0.2, 0.8, prog(f, B2.tear, B2.tear + 20)) }}
          mouth={lerp(-0.1, -0.5, prog(f, B2.tear, B2.tear + 20))}
          brows={lerp(0.3, 0.8, prog(f, B2.tear, B2.tear + 20))}
          breath={f}
        />
        <Person
          x={330}
          y={110}
          scale={2}
          who="blue"
          legs="sit"
          armL={{ up: -30, bend: 92 }}
          armR={{ up: -30, bend: 92 }}
          look={{ x: lerp(-0.6, -0.2, glanceMsg), y: lerp(0, 0.8, glanceMsg) }}
          mouth={0.7}
          breath={f + 20}
          phoneGlow={0.5}
        />
        <g transform={`translate(330 ${110 - 50 * 2})`}>
          <rect x={-20} y={-30} width={40} height={60} rx={8} fill="#141824" />
          <rect x={-16} y={-25} width={32} height={50} rx={5} fill="#BFD8FF" />
        </g>
        {msg > 0 ? <ChatBubble x={500} y={-170} text="早饭吃了吗" fill="#7C93B5" size={40} scale={msg} /> : null}
        {/* 桌子：木纹 */}
        <WoodGrain x={-560} y={TABLE_Y} w={1120} h={60} />
        <rect x={-560} y={TABLE_Y + 60} width={1120} height={22} fill="#7E5538" />
        <rect x={-520} y={TABLE_Y + 82} width={30} height={240} fill="#7E5538" />
        <rect x={490} y={TABLE_Y + 82} width={30} height={240} fill="#7E5538" />
        {/* 吐司机 + 吐司 */}
        <g transform={`translate(-40 ${TABLE_Y})`}>
          <rect x={-40} y={-20 - toastUp} width={34} height={46} rx={6} fill="#E5B678" />
          <rect x={6} y={-24 - toastUp * 0.8} width={34} height={46} rx={6} fill="#E5B678" />
          <rect x={-60} y={-60} width={120} height={60} rx={16} fill="#C8CFD9" />
          <rect x={-60} y={-60} width={120} height={14} rx={7} fill="#AEB7C4" />
        </g>
        <g transform={`translate(160 ${TABLE_Y})`}>
          <ellipse cx={0} cy={-4} rx={60} ry={12} fill="#F4F1EA" />
        </g>
        {/* 小橙手里的红球：比昨天更暗 */}
        <EmotionBall uid="ball-k" x={-330} y={110 - 34 * 2} r={30} glow={0.5} dim={ballDim} />
      </g>
      {/* 前景：撕下的日历页飘过镜头 */}
      {tearT > 0 && tearT < 1 ? (
        <g transform={camT(cam, 1.5, anchor)} filter="url(#fg-blur-k)">
          <g transform={`translate(${-700 + tearT * 520} ${-240 + tearT * 760}) rotate(${tearT * 220})`}>
            <rect x={-110} y={-100} width={220} height={200} rx={8} fill="#FFFFFF" opacity={0.95} />
            <text x={0} y={46} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={900} fontSize={110} fill="#3B3040">
              17
            </text>
          </g>
        </g>
      ) : null}
      <BrightSceneShade />
      <g transform={camT(cam, 1.4, anchor)} filter="url(#fg-blur-k)">
        <path d="M -1100 600 C -1040 360 -980 260 -880 220 C -900 360 -950 480 -980 640 Z" fill="#6E9F7C" opacity={0.8} />
      </g>
    </Stage>
  );
};

/** 亮色场景的上下压暗：保证白色字幕、主题标注、水印都看得清 */
export const BrightSceneShade: React.FC<{ strength?: number }> = ({ strength = 1 }) => (
  <g>
    <defs>
      <linearGradient id="bright-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2A2030" stopOpacity={0.38 * strength} />
        <stop offset="18%" stopColor="#2A2030" stopOpacity={0} />
        <stop offset="68%" stopColor="#2A2030" stopOpacity={0} />
        <stop offset="100%" stopColor="#2A2030" stopOpacity={0.55 * strength} />
      </linearGradient>
    </defs>
    <rect width={1920} height={1080} fill="url(#bright-shade)" />
  </g>
);
