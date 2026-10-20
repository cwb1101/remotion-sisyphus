import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ease, lerp, prog, rand } from '../anim';
import { camT, Stage, type Cam } from '../camera';
import { bubbleWidth, ChatBubble } from '../components/ChatBubble';
import { EmotionBall } from '../components/EmotionBall';
import { handWorld, Person, type Arm } from '../components/Person';
import { B6, B7 } from '../data/timeline';
import { C, FONT_SANS, mix } from '../theme';
import { BrightSceneShade } from './S2Service';
import { LivingSet } from './S6CantOrWont';

/**
 * 第 7 节「学着接住」（回收主线问题）：
 * 清晨的客厅——同一张沙发。小蓝把蓝球抛给小橙，她接住；她把红球抛回去，TA 第一次没接稳，用双臂抱住了。
 * 两颗球来回抛接，光弧连成一个圈 → 回到开头那块手机屏：这次 TA 回的不是「嗯」，而是「我在听 你慢慢说」
 * → 拉回沙发：两个人挨着坐，中间没有靠垫 → 一路拉出窗外，整栋楼只有这一扇窗亮着红蓝两点光。
 */
export const S7Catch: React.FC = () => {
  const f = useCurrentFrame();
  if (f < B6.toS7 + 4) return null;
  const fadeIn = prog(f, B6.toS7 + 4, B6.toS7 + 24, ease.inOut);
  const toPhone = prog(f, B7.phone - 8, B7.phone + 4, ease.inOut);
  const toFinal = prog(f, B7.pullOut - 6, B7.pullOut + 8, ease.inOut);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeIn }}>
      {toPhone < 1 ? <DawnShot f={f} /> : null}
      {toPhone > 0 && toFinal < 1 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: toPhone }}>
          <PhoneShot f={f} />
        </div>
      ) : null}
      {toFinal > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: toFinal }}>
          <FinalShot f={f} />
        </div>
      ) : null}
    </div>
  );
};

// ───────────────────────── 清晨：抛接 ─────────────────────────

const STAND_Y = 250 - 51 * 2.1;
const OR = { x: -330, y: STAND_Y, scale: 2.1 };
const BL = { x: 330, y: STAND_Y, scale: 2.1 };
const HOLD: Arm = { up: -20, bend: 52 };
const CATCH: Arm = { up: 40, bend: -10 };

const arc = (a: { x: number; y: number }, b: { x: number; y: number }, t: number, h: number) => ({
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t) - Math.sin(t * Math.PI) * h,
});

const DawnShot: React.FC<{ f: number }> = ({ f }) => {
  const out = prog(f, B6.toS7 + 4, B7.dawn + 30, ease.inOut);
  // 先拉开、后下移：人物进画面时已经是正常大小，不会出现贴边的大头
  let cam: Cam = { x: lerp(300, 0, out), y: lerp(-390, -60, Math.pow(out, 3)), zoom: lerp(5, 1.1, ease.out(out)) };
  cam.zoom += prog(f, B7.dawn + 30, B7.arcs, ease.inOut) * 0.12;
  const ringCam = prog(f, B7.arcs - 6, B7.arcs + 20, ease.inOut);
  cam = { x: cam.x, y: lerp(cam.y, -90, ringCam), zoom: lerp(cam.zoom, 1.05, ringCam) + prog(f, B7.arcs + 20, B7.phone, ease.linear) * 0.2 };

  const grow = prog(f, B7.dawn, B7.dawn + 60, ease.out);
  // 动作：抛 → 接
  const t1 = prog(f, B7.toss1, B7.catch1, ease.inOut);
  const t2 = prog(f, B7.toss2, B7.toss2 + 18, ease.inOut);
  const fumble = f >= B7.toss2 + 18 && f < B7.catch2;
  const throwArm = (t0: number): Arm => {
    const p = prog(f, t0 - 8, t0 + 2, ease.out);
    return { up: lerp(-20, 120, p) - prog(f, t0 + 4, t0 + 16, ease.inOut) * 140, bend: lerp(52, 0, p) };
  };
  const bArmR: Arm = f < B7.toss1 + 16 ? throwArm(B7.toss1) : fumble ? { up: 50 + Math.sin(f * 0.8) * 25, bend: -10 } : f >= B7.toss2 + 10 && f < B7.toss2 + 18 ? CATCH : HOLD;
  const bArmL: Arm = fumble ? { up: 50 + Math.sin(f * 0.8 + 1) * 25, bend: -10 } : f >= B7.toss2 + 10 && f < B7.toss2 + 18 ? CATCH : HOLD;
  const oArmR: Arm = f >= B7.catch1 - 8 && f < B7.catch1 + 4 ? CATCH : f >= B7.toss2 - 10 && f < B7.toss2 + 16 ? throwArm(B7.toss2) : HOLD;
  const oArmL: Arm = f >= B7.catch1 - 8 && f < B7.catch1 + 4 ? CATCH : HOLD;
  const smile = prog(f, B7.catch2, B7.catch2 + 10, ease.out);

  const oChest = { x: OR.x, y: OR.y - 34 * OR.scale };
  const bChest = { x: BL.x, y: BL.y - 34 * BL.scale };
  const bHand = handWorld(BL, 1, bArmR);
  const oHand = handWorld(OR, 1, oArmR);

  // 蓝球：小蓝 → 小橙（被接住以后慢慢回暖）
  let blue = { x: bChest.x + 26, y: bChest.y };
  if (f >= B7.toss1) blue = t1 < 1 ? arc(bHand, oChest, t1, 220) : { x: oChest.x + 26, y: oChest.y };
  const warm = prog(f, B7.catch1, B7.catch1 + 40, ease.inOut) * 0.55;
  // 红球：小橙 → 小蓝（第一下没接稳，弹起来，再用双臂抱住）
  let red = { x: oChest.x - 26, y: oChest.y };
  if (f >= B7.toss2) {
    if (t2 < 1) red = arc(oHand, { x: BL.x, y: BL.y - 70 * BL.scale }, t2, 200);
    else if (fumble) {
      const fp = prog(f, B7.toss2 + 18, B7.catch2);
      red = { x: BL.x + Math.sin(fp * 9) * 30 * (1 - fp), y: BL.y - 70 * BL.scale - Math.abs(Math.sin(fp * Math.PI * 2)) * 90 * (1 - fp) + fp * 36 * BL.scale };
    } else red = { x: bChest.x - 26, y: bChest.y };
  }
  // 光弧：来回抛接，弧线留下来连成一个圈
  const arcs = [0, 1, 2, 3].map((k) => B7.arcs + k * 12);
  const trails = arcs.map((t0, k) => {
    const p = prog(f, t0, t0 + 12, ease.inOut);
    if (p <= 0) return null;
    const up = k % 2 === 0;
    const a = up ? oChest : bChest;
    const b = up ? bChest : oChest;
    const h = up ? 300 : -120;
    const pts = Array.from({ length: 24 }, (_, i) => arc(a, b, (i / 23) * p, h));
    return (
      <polyline
        key={k}
        points={pts.map((q) => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ')}
        stroke="#F6D79A"
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
        opacity={0.75}
      />
    );
  });
  const flying = arcs.map((t0, k) => {
    const p = prog(f, t0, t0 + 12, ease.inOut);
    if (p <= 0 || p >= 1) return null;
    const up = k % 2 === 0;
    const a = up ? oChest : bChest;
    const b = up ? bChest : oChest;
    return arc(a, b, p, up ? 300 : -120);
  });
  const inArcs = f >= B7.arcs && f < B7.arcs + 48;
  return (
    <Stage>
      <defs>
        <radialGradient id="sun-room">
          <stop offset="0%" stopColor="#FFE6B0" stopOpacity={0.4} />
          <stop offset="100%" stopColor="#FFE6B0" stopOpacity={0} />
        </radialGradient>
        <filter id="fg-blur-7">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect width={1920} height={1080} fill="#5E4E66" />
      <g transform={camT(cam, 1)}>
        <LivingSet f={f} dawn={1} />
        <circle cx={420} cy={-260} r={700} fill="url(#sun-room)" />
        {trails}
        <Person {...OR} who="orange" armR={oArmR} armL={oArmL} look={{ x: 0.8, y: -0.1 }} mouth={lerp(0.4, 0.9, smile)} breath={f} />
        <Person {...BL} who="blue" armR={bArmR} armL={bArmL} look={{ x: -0.8, y: fumble ? -0.6 : 0 }} mouth={lerp(0.3, 0.8, smile)} mouthOpen={fumble ? 0.4 : 0} brows={fumble ? 0.4 : 0} breath={f} />
        {inArcs ? (
          flying.map((q, k) => (q ? <EmotionBall key={k} uid={`fly-${k}`} x={q.x} y={q.y} r={26} glow={1} cool={k % 2 ? 0 : 0.45} /> : null))
        ) : (
          <>
            <EmotionBall uid="dawn-blue" x={blue.x} y={blue.y} r={26} glow={0.9} hue="red" cool={1 - warm} />
            <EmotionBall uid="dawn-red" x={red.x} y={red.y} r={26} glow={0.9} />
          </>
        )}
      </g>
      {/* 前景：窗台上的植物在晨光里舒展 */}
      <g transform={camT(cam, 1.45)} filter="url(#fg-blur-7)">
        <g transform="translate(-980 420)">
          {[-50, -20, 10, 40].map((a, i) => (
            <ellipse key={i} cx={Math.sin((a * Math.PI) / 180) * 120} cy={-90} rx={34} ry={120 * grow} transform={`rotate(${a * grow} 0 0)`} fill="#6E9F7C" />
          ))}
        </g>
      </g>
      <rect width={1920} height={1080} fill="#FFE6B0" opacity={0.06} />
      <BrightSceneShade strength={0.9} />
    </Stage>
  );
};

// ───────────────────────── 回到开头那块手机屏 ─────────────────────────

const PhoneShot: React.FC<{ f: number }> = ({ f }) => {
  const enter = prog(f, B7.phone - 8, B7.phone + 8, ease.out);
  const typing = f < B7.reply;
  const pop = prog(f, B7.reply, B7.reply + 8, ease.outBack);
  const z = lerp(1.15, 1, enter) + prog(f, B7.phone, B7.pullOut) * 0.06;
  const reply = '我在听 你慢慢说';
  const w = bubbleWidth(reply, 70);
  return (
    <Stage>
      <defs>
        <linearGradient id="warm-chat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3E3242" />
          <stop offset="100%" stopColor="#231C2A" />
        </linearGradient>
        <linearGradient id="my-bubble-3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F9A877" />
          <stop offset="100%" stopColor="#EC8045" />
        </linearGradient>
        <filter id="soft3b">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
      </defs>
      <g transform={`translate(960 540) scale(${z}) translate(-960 -540)`}>
        <rect width={1920} height={1080} fill="url(#warm-chat)" />
        {/* 同一条三百字的长消息 */}
        <rect x={780} y={110} width={940} height={400} rx={56} fill="url(#my-bubble-3)" />
        <g filter="url(#soft3b)" opacity={0.55}>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={840} y={160 + i * 64} width={i === 4 ? 420 : 800 - rand(i + 2) * 120} height={26} rx={13} fill="#FFE0C9" />
          ))}
        </g>
        <text x={1120} y={262} fontFamily={FONT_SANS} fontWeight={700} fontSize={52} fill="#FFF7EE">
          好难受
        </text>
        <text x={1660} y={488} textAnchor="end" fontFamily={FONT_SANS} fontWeight={500} fontSize={32} fill="#FFF1E4" opacity={0.85}>
          312
        </text>
        {/* 这一次：TA 认真打了很久的字 */}
        {typing ? (
          <g transform="translate(520 660)">
            <rect x={-90} y={-50} width={180} height={100} rx={50} fill="#6A7FA0" />
            {[-1, 0, 1].map((k) => (
              <circle key={k} cx={k * 40} cy={0} r={11} fill="#E8EEF8" opacity={0.4 + 0.6 * Math.max(0, Math.sin(f * 0.4 - k))} />
            ))}
          </g>
        ) : (
          <>
            <ChatBubble x={430 + w / 2} y={660} text={reply} fill={mix('#7C93B5', '#8FA6C8', 0.5)} size={70} scale={0.7 + 0.3 * pop} />
            <circle cx={430 + w + 50} cy={730} r={11 * prog(f, B7.reply + 6, B7.reply + 12, ease.outBack)} fill="#F6C177" />
          </>
        )}
        <path
          d="M -300 -300 H 2220 V 1380 H -300 Z M 180 30 Q 90 30 90 120 V 960 Q 90 1050 180 1050 H 1740 Q 1830 1050 1830 960 V 120 Q 1830 30 1740 30 Z"
          fill="#0E0B12"
          fillRule="evenodd"
        />
      </g>
    </Stage>
  );
};

// ───────────────────────── 结尾：拉回沙发，再拉出窗外 ─────────────────────────

const FinalShot: React.FC<{ f: number }> = ({ f }) => {
  const phone = { x: -40, y: 196 };
  const p1 = prog(f, B7.pullOut - 6, B7.pullOut + 50, ease.inOut);
  const p2 = prog(f, B7.pullOut + 50, B7.end, ease.inOut);
  const cam: Cam = {
    x: lerp(lerp(phone.x, -40, p1), 0, p2),
    y: lerp(lerp(phone.y - 10, -40, p1), -200, p2),
    zoom: lerp(lerp(5, 1.15, p1), 0.3, p2),
  };
  const breath = (k: number) => 0.9 + Math.sin(f * 0.12 + k) * 0.1;
  return (
    <Stage>
      <defs>
        <linearGradient id="dawn-out" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8FB0D6" />
          <stop offset="100%" stopColor="#F4BE8E" />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill="#8FB0D6" />
      <g transform={camT(cam, 1)}>
        <rect x={-8000} y={-6000} width={16000} height={9000} fill="url(#dawn-out)" />
        <circle cx={2400} cy={-2200} r={260} fill="#FFE6B0" opacity={0.9} />
        <LivingSet f={f} dawn={1} />
        {/* 两个人挨着坐，中间没有靠垫；各自抱着对方抛来的那颗球 */}
        <Person x={-190} y={40} scale={2} who="orange" legs="sit" armL={{ up: -16, bend: 40 }} armR={{ up: -16, bend: 40 }} look={{ x: 0.7, y: 0 }} mouth={0.8} headTilt={8} breath={f} />
        <Person x={110} y={40} scale={2} who="blue" legs="sit" armL={{ up: -16, bend: 40 }} armR={{ up: -16, bend: 40 }} look={{ x: -0.7, y: 0 }} mouth={0.6} headTilt={-8} breath={f} />
        <EmotionBall uid="end-blue" x={-190} y={40 - 34 * 2} r={26} glow={breath(0)} cool={0.45} />
        <EmotionBall uid="end-red" x={110} y={40 - 34 * 2} r={26} glow={breath(1)} />
        {/* 茶几上的手机：屏幕亮着 */}
        <rect x={-260} y={210} width={460} height={26} rx={8} fill="#5C4A58" />
        <rect x={-240} y={236} width={18} height={90} fill="#4A3C48" />
        <rect x={164} y={236} width={18} height={90} fill="#4A3C48" />
        <g transform={`translate(${phone.x} ${phone.y})`}>
          <rect x={-26} y={-8} width={52} height={14} rx={4} fill="#141824" />
          <rect x={-22} y={-6} width={44} height={9} rx={3} fill="#FFE6C8" />
          <circle r={50} fill="#FFE6C8" opacity={0.15} />
        </g>
        {/* 楼的外立面：镜头拉出窗外时出现 */}
        <path
          d="M -6000 -5000 H 6000 V 4000 H -6000 Z M -980 -640 V 380 H 980 V -640 Z"
          fill="#5E5470"
          fillRule="evenodd"
          opacity={prog(f, B7.pullOut + 60, B7.pullOut + 100)}
        />
        {Array.from({ length: 48 }).map((_, i) => {
          const col = (i % 8) - 4;
          const row = Math.floor(i / 8) - 3;
          if (row === 0 && (col === 0 || col === -1)) return null;
          return (
            <rect
              key={i}
              x={col * 2100 + 120}
              y={row * 1500 - 600}
              width={1900}
              height={1000}
              rx={20}
              fill={rand(i) > 0.8 ? '#C9A98E' : '#3E3650'}
              opacity={prog(f, B7.pullOut + 60, B7.pullOut + 100) * 0.9}
            />
          );
        })}
        <rect x={-1000} y={-660} width={2000} height={1060} fill="none" stroke="#4A4058" strokeWidth={40} opacity={prog(f, B7.pullOut + 60, B7.pullOut + 100)} />
      </g>
      <rect width={1920} height={1080} fill="#FFE6B0" opacity={0.05} />
      <BrightSceneShade strength={0.8} />
      <rect width={1920} height={1080} fill={C.nightWallDeep} opacity={prog(f, B7.end - 10, B7.end) * 0.25} />
    </Stage>
  );
};
