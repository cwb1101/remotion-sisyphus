import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease, lerp, prog, rand, track, velocity, wobble, type Key } from '../anim';
import { camT, MotionBlur, Stage, type Cam } from '../camera';
import { bubbleWidth, ChatBubble } from '../components/ChatBubble';
import { EmotionBall } from '../components/EmotionBall';
import { handWorld, Person } from '../components/Person';
import { B } from '../data/timeline';
import { C, FONT_SANS, mix } from '../theme';

/**
 * 第 0 节「一个字」：
 * 0–0.5s 长气泡发出 → 快切对方视角 → 三次跳切气泡越回越短 → 定格闪白去色
 * → 推拉变焦推向已读圆点 → 圆点变遮罩揭开深夜客厅 → 速度渐变推向两人之间，红球滚到靠垫边
 * → 红球特写变暗 → 推向沙发靠背线，匹配到下一节的门框横梁。
 */
export const S0Hook: React.FC = () => {
  const f = useCurrentFrame();
  if (f > B.toS1 + 20) return null;
  return (
    <>
      {f < B.mask + 16 ? <ChatPhase f={f} /> : null}
      {f >= B.mask ? <LivingRoomShot f={f} /> : null}
    </>
  );
};

// ───────────────────────── 聊天特写 ─────────────────────────

const REPLIES: [number, string][] = [
  [B.quickCut, '我今天有点累'],
  [B.jump1, '对不起'],
  [B.jump2, '好'],
  [B.jump3, '嗯'],
];
const REPLY_Y = 470;
const REPLY_SIZE = 100;

const replyAt = (f: number) => {
  let cur = REPLIES[0];
  for (const r of REPLIES) if (f >= r[0]) cur = r;
  return cur;
};

const dotPos = () => {
  const w = bubbleWidth('嗯', REPLY_SIZE);
  return { x: 960 + w / 2 + 46, y: REPLY_Y + 62 };
};

const ChatPhase: React.FC<{ f: number }> = ({ f }) => {
  if (f < B.quickCut) return <MySide f={f} />;
  return <TheirSide f={f} />;
};

/** 第 1 帧：自己这边，暖橙长气泡正在被发出去 */
const MySide: React.FC<{ f: number }> = ({ f }) => {
  const dyKeys: Key[] = [
    [B.send, -40],
    [B.quickCut, -820, ease.in],
  ];
  const dy = track(f, dyKeys);
  const vy = velocity(f, dyKeys);
  const s = lerp(1, 0.9, prog(f, B.send, B.quickCut, ease.in));
  const rows = [-300, -215, -130, -45, 40, 125, 210, 295];
  return (
    <Stage>
      <defs>
        <linearGradient id="my-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#33233A" />
          <stop offset="100%" stopColor="#17142A" />
        </linearGradient>
        <linearGradient id="my-bubble" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F9A877" />
          <stop offset="100%" stopColor="#EC8045" />
        </linearGradient>
        <filter id="soft4">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="bokeh">
          <feGaussianBlur stdDeviation="22" />
        </filter>
      </defs>
      <rect width={1920} height={1080} fill="url(#my-bg)" />
      {/* 背景：卧室虚焦光斑 */}
      <g filter="url(#bokeh)" transform={`translate(0 ${dy * 0.08})`}>
        <circle cx={1580} cy={260} r={190} fill={C.lamp} opacity={0.32} />
        <circle cx={1760} cy={520} r={90} fill={C.lamp} opacity={0.22} />
        <circle cx={260} cy={180} r={130} fill="#6F8CC9" opacity={0.22} />
        <circle cx={140} cy={760} r={160} fill="#6F8CC9" opacity={0.14} />
        <circle cx={1500} cy={900} r={120} fill={C.lamp} opacity={0.16} />
      </g>
      <MotionBlur id="mb-my" bx={0} by={Math.min(36, Math.abs(vy) * 0.5)}>
        <g transform={`translate(960 ${540 + dy}) scale(${s})`}>
          <rect x={-750} y={-372} width={1500} height={760} rx={70} fill="#000" opacity={0.25} />
          <rect x={-760} y={-390} width={1520} height={760} rx={70} fill="url(#my-bubble)" />
          <g filter="url(#soft4)" opacity={0.55}>
            {rows.map((ry, i) => (
              <rect
                key={i}
                x={-660}
                y={ry - 22}
                width={i === rows.length - 1 ? 520 : 1180 + (rand(i) - 0.5) * 220}
                height={36}
                rx={18}
                fill="#FFE0C9"
              />
            ))}
          </g>
          {(
            [
              ['今天', -660, -215],
              ['好难受', -180, 40],
              ['你知道吗', 120, 210],
            ] as const
          ).map(([t, x, y]) => (
            <text key={t} x={x} y={y + 26} fontFamily={FONT_SANS} fontWeight={700} fontSize={74} fill="#FFF7EE">
              {t}
            </text>
          ))}
          <text x={690} y={340} textAnchor="end" fontFamily={FONT_SANS} fontWeight={500} fontSize={44} fill="#FFF1E4" opacity={0.85}>
            312
          </text>
        </g>
      </MotionBlur>
    </Stage>
  );
};

/** 对方视角：冷色，气泡越回越短，定格 → 推拉变焦 → 遮罩转场 */
const TheirSide: React.FC<{ f: number }> = ({ f }) => {
  // 定格之后，画面内容停在定格那一帧
  const tc = Math.min(f, B.freeze);
  const [since, text] = replyAt(tc);
  const pop = prog(tc, since, since + 5, ease.outBack);
  const w = bubbleWidth(text, REPLY_SIZE);

  // 跳切：同机位，阶梯式推近 + 轻微错位
  const jumpZ = tc >= B.jump3 ? 1.18 : tc >= B.jump2 ? 1.12 : tc >= B.jump1 ? 1.06 : 1;
  const jumpX = tc >= B.jump3 ? -10 : tc >= B.jump2 ? 12 : tc >= B.jump1 ? -14 : 0;

  // 推拉变焦：主体（气泡、已读点）指数放大，背景反向缩小
  const dp = prog(f, B.dolly, B.mask, ease.in);
  const dot = dotPos();
  const pivot = { x: lerp(960 + jumpX, dot.x, ease.inOut(dp)), y: lerp(REPLY_Y + 30, dot.y, ease.inOut(dp)) };
  const z = jumpZ * Math.pow(8.2, dp) * (1 + prog(f, B.mask, B.mask + 16) * 2);
  const zBg = jumpZ * (1 - 0.32 * dp);
  const fgT = `translate(960 540) scale(${z}) translate(${-pivot.x} ${-pivot.y})`;
  const bgT = `translate(960 540) scale(${zBg}) translate(${-(960 + jumpX)} ${-(REPLY_Y + 30)})`;

  const desat = prog(f, B.freeze, B.freeze + 4);
  const bloom = track(f, [
    [B.freeze, 0],
    [B.freeze + 1, 0.7],
    [B.freeze + 6, 0, ease.out],
  ]);
  const fade = 1 - prog(f, B.mask + 6, B.mask + 16);
  const bubbleCol = mix('#7C93B5', '#4F86D6', desat);
  const dotCol = mix('#8FB0DD', '#121630', prog(f, B.dolly + 6, B.mask, ease.in));

  // 遮罩：已读圆点在屏幕上的位置和半径
  const dotR = 11 * z;
  const maskR = lerp(dotR, 1300, prog(f, B.mask, B.mask + 15, ease.inOut));

  const orangeOut = prog(tc, B.jump2, B.thumb + 6, ease.in);
  const thumb = track(tc, [
    [B.thumb, 0],
    [B.thumb + 6, 1, ease.out],
    [B.thumb + 10, 1],
    [B.freeze, 0.2, ease.in],
  ]);

  return (
    <Stage style={{ opacity: fade }}>
      <defs>
        <linearGradient id="their-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2C3447" />
          <stop offset="100%" stopColor="#151A26" />
        </linearGradient>
        <filter id="desat">
          <feColorMatrix type="saturate" values={`${1 - desat * 0.95}`} />
        </filter>
        <filter id="soft6">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <radialGradient id="bloom">
          <stop offset="0%" stopColor="#FFF4DD" stopOpacity={1} />
          <stop offset="60%" stopColor="#FFF4DD" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#FFF4DD" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g filter={desat > 0 ? 'url(#desat)' : undefined}>
        <rect width={1920} height={1080} fill="url(#their-bg)" />
        {/* 背景：更早的聊天记录，缓慢上漂 */}
        <g transform={bgT}>
          <g filter="url(#soft6)" transform={`translate(0 ${-tc * 0.6})`} opacity={0.5}>
            {[0, 1, 2, 3, 4].map((i) => (
              <rect
                key={i}
                x={i % 2 ? 1060 : 260}
                y={210 + i * 70}
                width={i % 2 ? 560 : 380 + rand(i + 3) * 300}
                height={46}
                rx={23}
                fill={i % 2 ? '#C9825A' : '#55657F'}
              />
            ))}
          </g>
          {/* 被挤出去的暖橙长气泡一角 */}
          <rect
            x={-260 - orangeOut * 760}
            y={790}
            width={760}
            height={520}
            rx={70}
            fill="#EC8045"
            opacity={0.85}
          />
          {/* 手机边框 */}
          <path
            d="M -300 -300 H 2220 V 1380 H -300 Z M 180 30 Q 90 30 90 120 V 960 Q 90 1050 180 1050 H 1740 Q 1830 1050 1830 960 V 120 Q 1830 30 1740 30 Z"
            fill="#090B11"
            fillRule="evenodd"
          />
          <path
            d="M 180 30 Q 90 30 90 120 V 960 Q 90 1050 180 1050 H 1740 Q 1830 1050 1830 960 V 120 Q 1830 30 1740 30 Z"
            fill="none"
            stroke="#3A4256"
            strokeWidth={3}
          />
          {/* 拇指剪影：停一下又移开 */}
          <ellipse
            cx={1560 - thumb * 120}
            cy={1250 - thumb * 300}
            rx={92}
            ry={150}
            transform={`rotate(-28 ${1560 - thumb * 120} ${1250 - thumb * 300})`}
            fill="#05060A"
            opacity={0.55}
            filter="url(#soft6)"
          />
        </g>
      </g>
      {/* 主体：气泡 + 已读圆点（定格后保持冷蓝，不去色） */}
      <g transform={fgT}>
        <ChatBubble
          x={960 + jumpX}
          y={REPLY_Y}
          text={text}
          fill={bubbleCol}
          size={REPLY_SIZE}
          scale={0.82 + 0.18 * pop}
        />
        {tc >= B.jump3 ? (
          <circle cx={dot.x} cy={dot.y} r={11 * prog(tc, B.jump3, B.jump3 + 4, ease.outBack)} fill={dotCol} />
        ) : null}
      </g>
      {bloom > 0 ? (
        <circle cx={960} cy={REPLY_Y} r={1100} fill="url(#bloom)" opacity={bloom} />
      ) : null}
      {f >= B.mask ? (
        <circle
          cx={960}
          cy={540}
          r={maskR}
          fill="none"
          stroke="#F6C177"
          strokeWidth={10}
          opacity={0.35 * (1 - prog(f, B.mask, B.mask + 15))}
          filter="url(#soft6)"
        />
      ) : null}
    </Stage>
  );
};

// ───────────────────────── 深夜客厅 ─────────────────────────

const SEAT_Y = 70;
const SEAT_TOP = SEAT_Y - 20;
const ORANGE = { x: -300, y: 40, scale: 1.7 };
const BLUE = { x: 300, y: 40, scale: 1.7 };
const BALL_R = 30;
const BALL_STOP = -85;

/** 速度渐变：前 25% 时间走完 75% 路程，剩下的慢下来 */
const rampP = (f: number) => {
  const t = clamp((f - B.ramp) / (B.ballStop - B.ramp));
  return t < 0.25 ? (t / 0.25) * 0.75 : 0.75 + 0.25 * ease.outQuart((t - 0.25) / 0.75);
};

const roomCam = (f: number): Cam => {
  if (f < B.ramp) {
    return { x: 0, y: -30, zoom: lerp(1, 1.06, prog(f, B.mask, B.ramp)) };
  }
  if (f < B.ballClose) {
    const p = rampP(f);
    const drift = prog(f, B.ballStop, B.ballClose) * 0.05;
    return { x: 0, y: lerp(-30, 6, p), zoom: lerp(1.06, 1.9, p) + drift };
  }
  const c = prog(f, B.ballClose, B.ballClose + 34, ease.inOut);
  const base = { x: lerp(0, -190, c), y: lerp(6, -30, c), zoom: lerp(1.95, 3.2, c) + prog(f, B.ballClose + 34, B.toS1) * 0.12 };
  // 转场：一路推进红球，直到它填满整个画面（接下一节门缝里的红光）
  const t = prog(f, B.toS1, B.toS1 + 16, ease.in);
  return {
    x: lerp(base.x, BALL_STOP, ease.out(t)),
    y: lerp(base.y, SEAT_TOP - BALL_R + 3, ease.out(t)),
    zoom: base.zoom * Math.pow(14, t),
  };
};

const LivingRoomShot: React.FC<{ f: number }> = ({ f }) => {
  const cam = roomCam(f);
  const camPrev = roomCam(f - 1);
  const speed = Math.hypot(cam.x - camPrev.x, cam.y - camPrev.y) * cam.zoom + Math.abs(cam.zoom - camPrev.zoom) * 500;
  const blur =
    (f >= B.ramp && f < B.ramp + 10) || f >= B.toS1 + 8 ? Math.min(7, speed * 0.012) : 0;

  const anchor = { x: 0, y: 0 };
  const lampR = lerp(560, 330, prog(f, B.ballClose + 6, B.ballClose + 36, ease.inOut));
  const darken = prog(f, B.ballClose + 4, B.ballClose + 36, ease.inOut) * 0.2;

  // ── 人物动作 ──
  const lean = track(f, [
    [B.ramp - 8, 0],
    [B.ramp, 9, ease.out],
    [B.ramp + 12, 0, ease.inOut],
  ]);
  const reach = prog(f, B.ramp - 8, B.ramp, ease.out) * (1 - prog(f, B.ramp + 6, B.ramp + 16, ease.inOut));
  const orangeArm = { up: lerp(-14, 8, reach), bend: lerp(30, 12, reach) };
  const sad = prog(f, B.ballClose + 8, B.ballClose + 24, ease.inOut);
  const blueLook = track(f, [
    [B.lookUp, 0],
    [B.lookUp + 6, 1, ease.out],
    [B.lookUp + 18, 1],
    [B.lookUp + 26, 0, ease.inOut],
  ]);
  const smile = track(f, [
    [B.lookUp + 3, 0],
    [B.lookUp + 8, 0.75, ease.out],
    [B.lookUp + 18, 0.75],
    [B.lookUp + 24, 0, ease.inOut],
  ]);
  const blink = (seed: number) => {
    const ph = (f + seed) % 97;
    return ph < 4 ? Math.sin((ph / 4) * Math.PI) : 0;
  };

  // ── 红球 ──
  const hands = handWorld(ORANGE, 1, orangeArm);
  const handsL = handWorld(ORANGE, -1, orangeArm);
  const held = { x: (hands.x + handsL.x) / 2, y: (hands.y + handsL.y) / 2 - 12 };
  const seatBallY = SEAT_TOP - BALL_R + 3;
  let bx: number;
  let by: number;
  let spin = 0;
  if (f < B.ramp) {
    bx = held.x;
    by = held.y;
  } else {
    const p = rampP(f);
    const startX = held.x;
    bx = lerp(startX, BALL_STOP, p) - wobble(f, B.ballStop, 0.5, 0.35) * 4;
    by = lerp(held.y, seatBallY, prog(f, B.ramp, B.ramp + 3, ease.in));
    spin = ((bx - startX) / BALL_R) * 57.3;
  }
  const ballGlow = track(f, [
    [B.mask, 0.6],
    [B.ballGlow, 0.6],
    [B.ballGlow + 8, 1],
    [B.ballClose + 10, 0.95],
    [B.ballClose + 36, 0.4, ease.inOut],
  ]);
  const ballDim = prog(f, B.ballClose + 10, B.ballClose + 36, ease.inOut) * 0.42;
  const pulse = 1 + Math.sin(f * 0.25) * 0.02 * (1 - ballDim);

  const carX = lerp(-1300, 1300, prog(f, B.ramp + 20, B.ballClose + 40));

  return (
    <Stage>
      <defs>
        <clipPath id="room-reveal">
          <circle cx={960} cy={540} r={lerp(11 * 9.7, 1300, prog(f, B.mask, B.mask + 15, ease.inOut))} />
        </clipPath>
        <linearGradient id="sky-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0D1230" />
          <stop offset="100%" stopColor="#24305E" />
        </linearGradient>
        <radialGradient id="lamp-glow">
          <stop offset="0%" stopColor={C.lamp} stopOpacity={0.5} />
          <stop offset="55%" stopColor={C.lamp} stopOpacity={0.12} />
          <stop offset="100%" stopColor={C.lamp} stopOpacity={0} />
        </radialGradient>
        <linearGradient id="car-light" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F8D893" stopOpacity={0} />
          <stop offset="50%" stopColor="#F8D893" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#F8D893" stopOpacity={0} />
        </linearGradient>
        <filter id="fg-blur">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        <filter id="bg-soft">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <g clipPath={f < B.mask + 16 ? 'url(#room-reveal)' : undefined}>
        <MotionBlur id="mb-room" bx={blur} by={blur}>
          <rect width={1920} height={1080} fill={C.nightWallDeep} />
          {/* 背景层：窗外城市、窗帘 */}
          <g transform={camT(cam, 0.55, anchor)} filter={cam.zoom > 2.4 ? 'url(#bg-soft)' : undefined}>
            <rect x={-1700} y={-1100} width={3400} height={1500} fill={C.nightWall} />
            <rect x={-860} y={-520} width={1720} height={500} rx={8} fill="url(#sky-night)" />
            {Array.from({ length: 16 }).map((_, i) => {
              const bw = 70 + rand(i) * 90;
              const bh = 120 + rand(i + 9) * 260;
              const x0 = -860 + i * 108;
              return (
                <g key={i}>
                  <rect x={x0} y={-20 - bh} width={bw} height={bh} fill="#151B3E" />
                  {Array.from({ length: 6 }).map((__, j) =>
                    rand(i * 7 + j) > 0.45 ? (
                      <rect
                        key={j}
                        x={x0 + 12 + (j % 2) * (bw / 2 - 6)}
                        y={-20 - bh + 18 + Math.floor(j / 2) * 36}
                        width={12}
                        height={14}
                        fill={C.cityLight}
                        opacity={0.35 + 0.4 * rand(i + j * 3 + Math.floor(f / 40))}
                      />
                    ) : null,
                  )}
                </g>
              );
            })}
            <rect x={carX - 260} y={-62} width={520} height={14} rx={7} fill="url(#car-light)" />
            {/* 窗框 */}
            <path d="M -860 -520 H 860 V -20 H -860 Z M 0 -520 V -20" stroke="#2E3560" strokeWidth={14} fill="none" />
            {[-1, 1].map((sd) => (
              <path
                key={sd}
                d={`M ${sd * 870} -560 C ${sd * (800 + Math.sin(f * 0.04) * 10)} -300 ${sd * 820} -120 ${sd * 790} 40 L ${sd * 1010} 40 L ${sd * 1000} -560 Z`}
                fill="#2A2F58"
              />
            ))}
          </g>

          {/* 中景：沙发、台灯、人物、红球 */}
          <g transform={camT(cam, 1, anchor)}>
            <circle cx={640} cy={-150} r={lampR} fill="url(#lamp-glow)" />
            <rect x={-1700} y={150} width={3400} height={900} fill={C.nightFloor} />
            <ellipse cx={0} cy={250} rx={820} ry={90} fill="#2E3360" />
            {/* 侧桌 + 台灯 */}
            <rect x={600} y={0} width={110} height={140} rx={10} fill="#2C2A45" />
            <rect x={648} y={-120} width={14} height={124} fill="#C9A46A" />
            <path d="M 600 -120 L 710 -120 L 686 -200 L 624 -200 Z" fill={C.lamp} />
            {/* 盆栽 */}
            <g transform="translate(-760 40)">
              <rect x={-46} y={30} width={92} height={90} rx={14} fill="#3A2F4A" />
              {[-60, -25, 10, 40, 70].map((a, i) => (
                <ellipse
                  key={i}
                  cx={Math.sin((a * Math.PI) / 180) * 70}
                  cy={-40 - Math.cos((a * Math.PI) / 180) * 50}
                  rx={22}
                  ry={70}
                  transform={`rotate(${a + Math.sin(f * 0.05 + i) * 3} ${Math.sin((a * Math.PI) / 180) * 70} ${-40 - Math.cos((a * Math.PI) / 180) * 50})`}
                  fill="#2F5E58"
                />
              ))}
            </g>
            {/* 沙发 */}
            <rect x={-600} y={-100} width={1200} height={150} rx={46} fill={C.sofa} />
            <rect x={-600} y={-100} width={1200} height={22} rx={11} fill="#4A5A80" opacity={0.6} />
            <rect x={-585} y={SEAT_Y - 20} width={1170} height={56} rx={24} fill={C.sofaDark} />
            <rect x={-600} y={SEAT_Y + 24} width={1200} height={62} rx={18} fill="#283350" />
            {[-520, 520].map((lx) => (
              <rect key={lx} x={lx - 14} y={SEAT_Y + 80} width={28} height={22} rx={6} fill="#1C2238" />
            ))}
            {[-1, 1].map((sd) => (
              <rect key={sd} x={sd === -1 ? -665 : 575} y={-36} width={90} height={150} rx={40} fill={C.sofa} />
            ))}
            {/* 中间的靠垫：两人之间的距离 */}
            <rect x={-56} y={-62} width={112} height={118} rx={30} fill="#56658A" transform={`rotate(-4 0 0)`} />
            <rect x={-44} y={-50} width={88} height={94} rx={24} fill="none" stroke="#6C7CA2" strokeWidth={3} strokeDasharray="6 7" transform={`rotate(-4 0 0)`} />

            <Person
              {...ORANGE}
              who="orange"
              legs="sit"
              armL={orangeArm}
              armR={orangeArm}
              bodyTilt={lean}
              look={{ x: lerp(0.7, 0.55, sad), y: lerp(0, 0.85, sad) }}
              mouth={lerp(0.25, -0.65, sad)}
              brows={sad * 0.9}
              blink={blink(11)}
              breath={f}
            />
            <Person
              {...BLUE}
              who="blue"
              legs="sit"
              armL={{ up: -32, bend: 92 }}
              armR={{ up: -32, bend: 92 }}
              look={{ x: lerp(0.1, -0.85, blueLook), y: lerp(0.9, 0.2, blueLook) }}
              mouth={smile}
              phoneGlow={1}
              blink={blink(53)}
              breath={f + 30}
              headTilt={lerp(6, 0, blueLook)}
            />
            {/* 小蓝手里的手机 */}
            <g transform={`translate(${BLUE.x} ${BLUE.y - 50 * BLUE.scale})`}>
              <rect x={-20} y={-30} width={40} height={60} rx={8} fill="#141824" />
              <rect x={-16} y={-25} width={32} height={50} rx={5} fill="#BFD8FF" opacity={0.9} />
              <circle r={70} fill="#BFD8FF" opacity={0.12} />
            </g>
            {/* 红球与座面阴影 */}
            {f >= B.ramp ? <ellipse cx={bx} cy={SEAT_TOP + 2} rx={BALL_R * 0.9} ry={6} fill="#000" opacity={0.25} /> : null}
            <EmotionBall uid="ball-s0" x={bx} y={by} r={BALL_R * pulse} glow={ballGlow} dim={ballDim} spin={spin} />
            <rect x={-1700} y={-1100} width={3400} height={2400} fill="#05060F" opacity={darken} />
          </g>

          {/* 前景：茶几边、虚焦的大叶子 */}
          <g transform={camT(cam, 1.45, anchor)} filter="url(#fg-blur)">
            <rect x={-520} y={300} width={1040} height={140} rx={24} fill="#2A2238" />
            <path d="M -1100 520 C -1020 220 -900 120 -760 80 C -820 220 -900 380 -1000 560 Z" fill="#132A2C" opacity={0.9} />
            <path d="M 1100 560 C 1040 360 980 260 880 220 C 900 340 940 460 960 600 Z" fill="#132A2C" opacity={0.85} />
          </g>
        </MotionBlur>
      </g>
    </Stage>
  );
};
