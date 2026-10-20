import React from 'react';
import { useCurrentFrame } from 'remotion';
import { ease, lerp, prog, rand, track, wobble } from '../anim';
import { camT, MotionBlur, Stage, type Cam } from '../camera';
import { EmotionBall } from '../components/EmotionBall';
import { handWorld, Person, type Arm } from '../components/Person';
import { B5, B6 } from '../data/timeline';
import { C, mix } from '../theme';
import { PocketHeart } from './S4StillFeel';

/**
 * 第 6 节「不会还是不想」：线变成一条分岔路 → 左右分屏：手忙脚乱接球 / 插兜背过身
 * → 冰箱上的便利贴，把需求画具体 → 第一次拥抱很僵、第二次自然了，灯亮了
 * → 冷灰时间线：一次次抛球没人接，小橙抱回红球走向暖光的门 → 起雾的镜子
 * → 想逃的小蓝停住，掏出口袋里的蓝球摊在掌心 → 坐回来，拿开中间的靠垫。
 */
export const S6CantOrWont: React.FC = () => {
  const f = useCurrentFrame();
  if (f < B5.toS6 - 4 || f > B6.toS7 + 30) return null;
  const fadeIn = prog(f, B5.toS6 - 4, B5.toS6 + 10, ease.inOut);
  const x = (a: number, b: number) => prog(f, a, b, ease.inOut);
  const toNote = x(B6.note - 8, B6.note + 4);
  const toTries = x(B6.tries - 8, B6.tries + 4);
  const toMirror = x(B6.mirror - 6, B6.mirror + 4);
  const toTalk = x(B6.talk - 6, B6.talk + 6);
  const layer = (o: number, node: React.ReactNode) =>
    o > 0 ? <div style={{ position: 'absolute', inset: 0, opacity: o }}>{node}</div> : null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeIn }}>
      {toNote < 1 ? <ForkShot f={f} /> : null}
      {layer(toNote * (1 - toTries), <KitchenNightShot f={f} />)}
      {layer(toTries * (1 - toMirror), <TriesShot f={f} />)}
      {layer(toMirror * (1 - toTalk), <MirrorShot f={f} />)}
      {layer(toTalk, <TalkShot f={f} />)}
    </div>
  );
};

// ───────────────────────── 分岔路 + 分屏 ─────────────────────────

const ForkShot: React.FC<{ f: number }> = ({ f }) => {
  const out = prog(f, B5.toS6 - 4, B6.fork + 34, ease.inOut);
  const cam: Cam = { x: 0, y: lerp(470, 20, out), zoom: lerp(6, 1.0, out) + prog(f, B6.fork + 34, B6.note, ease.linear) * 0.08 };
  const split = prog(f, B6.split - 2, B6.split + 12, ease.out);
  const bounce = Math.abs(Math.sin((f - B6.split) * 0.16));
  return (
    <Stage>
      <defs>
        <linearGradient id="dusk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4A3F6B" />
          <stop offset="70%" stopColor="#C9826A" />
          <stop offset="100%" stopColor="#E8A877" />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill="#3A3254" />
      <g transform={camT(cam, 0.5)}>
        <rect x={-3000} y={-2000} width={6000} height={2000} fill="url(#dusk)" />
        <circle cx={300} cy={-120} r={70} fill="#F6C177" opacity={0.8} />
        <path d="M -3000 0 C -1600 -260 -800 -120 0 -60 C 800 -10 1600 -280 3000 -60 L 3000 400 L -3000 400 Z" fill="#4A3F63" />
      </g>
      <g transform={camT(cam, 1)}>
        <rect x={-4000} y={-60} width={8000} height={2000} fill="#3B3354" />
        {/* 分岔的路 */}
        <polygon points="-300,700 300,700 40,140 -40,140" fill="#8D86A0" />
        <polygon points="-40,140 40,140 -440,-60 -520,-60" fill="#8D86A0" />
        <polygon points="-40,140 40,140 520,-60 440,-60" fill="#8D86A0" />
        <path d="M 0 690 L 0 160" stroke="#E8E2D2" strokeWidth={6} strokeDasharray="30 26" strokeDashoffset={-f * 1.2} />
        {/* 路牌：两个图标 */}
        <g transform="translate(110 150)">
          <rect x={-6} y={-260} width={12} height={260} fill="#2A2438" />
          <path d="M -6 -240 L -140 -240 L -170 -210 L -140 -180 L -6 -180 Z" fill="#E8DCC8" />
          <path d="M -120 -200 q 10 -20 24 0 M -88 -200 q 10 -20 24 0" stroke="#5D7396" strokeWidth={6} fill="none" strokeLinecap="round" />
          <path d="M 6 -160 L 140 -160 L 170 -130 L 140 -100 L 6 -100 Z" fill="#E8DCC8" />
          <rect x={60} y={-152} width={36} height={46} rx={4} fill="none" stroke="#5D7396" strokeWidth={5} />
        </g>
        <Person x={-250} y={140 + 30 - 51 * 1.7} scale={1.7} opacity={prog(f, B5.toS6 + 10, B5.toS6 + 22)} who="orange" armL={{ up: -16, bend: 36 }} armR={{ up: -16, bend: 36 }} look={{ x: 0, y: -0.2 }} mouth={0} brows={0.3} breath={f} />
        <EmotionBall uid="fork-ball" opacity={prog(f, B5.toS6 + 10, B5.toS6 + 22)} x={-250} y={140 + 30 - 51 * 1.7 - 34 * 1.7} r={24} glow={0.8} dim={0.15} />
      </g>
      {/* 左右分屏：「不会」与「不想」 */}
      {split > 0 ? (
        <g>
          <g transform={`translate(${(split - 1) * 960} 0)`}>
            <rect x={0} y={0} width={958} height={1080} fill="#6B4E5A" />
            <circle cx={480} cy={420} r={420} fill="#F6C177" opacity={0.1} />
            <rect x={0} y={780} width={958} height={300} fill="#553D48" />
            <Person
              x={480}
              y={780 - 51 * 3}
              scale={3}
              who="blue"
              armL={{ up: 60 + Math.sin(f * 0.3) * 20, bend: -20 }}
              armR={{ up: 60 + Math.sin(f * 0.3 + 1.4) * 20, bend: -20 }}
              look={{ x: 0, y: -0.8 }}
              mouth={0}
              mouthOpen={0.3}
              brows={0.5}
              breath={f}
            />
            <EmotionBall uid="cant-ball" x={480 + Math.sin(f * 0.2) * 40} y={300 - bounce * 120} r={36} glow={0.8} />
          </g>
          <g transform={`translate(${(1 - split) * 960} 0)`}>
            <rect x={962} y={0} width={958} height={1080} fill="#3A4560" />
            <rect x={962} y={780} width={958} height={300} fill="#2E3850" />
            <Person x={1440} y={780 - 51 * 3} scale={3} who="blue" view="back" armL={{ up: 0, bend: 0 }} armR={{ up: -6, bend: 60 }} breath={f} />
            <circle cx={1500} cy={780 - 51 * 3 - 60 * 3} r={90} fill="#BFD8FF" opacity={0.15} />
            <EmotionBall uid="wont-ball" x={1240 - prog(f, B6.split, B6.note) * 120} y={780 - 36} r={36} glow={0.4} dim={0.3} spin={-prog(f, B6.split, B6.note) * 200} />
          </g>
          <rect x={958} y={0} width={4} height={1080} fill="#FFF4DD" opacity={0.9 * split} />
        </g>
      ) : null}
    </Stage>
  );
};

// ───────────────────────── 夜里的厨房：便利贴 + 拥抱 ─────────────────────────

const FLOOR_K = 340;
const STICK = { x: 0, y: -150, s: 150 };

const KitchenNightShot: React.FC<{ f: number }> = ({ f }) => {
  const draw = prog(f, B6.note + 4, B6.stick - 6, ease.inOut);
  const pull = prog(f, B6.stick - 4, B6.stick + 26, ease.inOut);
  let cam: Cam = { x: lerp(0, 0, pull), y: lerp(STICK.y, -80, pull), zoom: lerp(4.6, 1.15, pull) };
  const hugCam = prog(f, B6.hug1 - 6, B6.hug1 + 20, ease.inOut);
  cam = { x: lerp(cam.x, -190, hugCam), y: lerp(cam.y, -60, hugCam), zoom: lerp(cam.zoom, 1.7, hugCam) + prog(f, B6.hug1 + 20, B6.tries, ease.linear) * 0.25 };

  const demo = track(f, [
    [B6.stick + 20, 0],
    [B6.stick + 32, 1, ease.out],
    [B6.stick + 58, 1],
    [B6.stick + 68, 0, ease.inOut],
  ]);
  const walk = prog(f, B6.hug1, B6.hug1 + 16, ease.inOut);
  const blueX = lerp(420, -110, walk);
  const hug = prog(f, B6.hug1 + 14, B6.hug1 + 22, ease.out);
  const relax = prog(f, B6.hug2, B6.hug2 + 16, ease.inOut);
  const lamp = prog(f, B6.hug2 + 10, B6.hug2 + 22, ease.out);
  const orangeArm: Arm = demo > 0 ? { up: lerp(-10, 110, demo), bend: lerp(30, -10, demo) } : hug > 0 ? { up: lerp(-10, -60, hug), bend: lerp(30, 70, hug) } : { up: 30, bend: 20 };
  const blueArm: Arm = hug > 0 ? { up: lerp(-80, -70, relax), bend: lerp(0, 70, relax) } : { up: 8, bend: 4 };
  const flash = Math.max(0, wobble(f, B6.hug1 + 24, 0.25, 0.12));
  const pen = handWorld({ x: -330, y: FLOOR_K - 51 * 2.1, scale: 2.1 }, 1, { up: 100, bend: 10 });
  const sticky = (
    <g transform={`translate(${STICK.x} ${STICK.y})`}>
      <rect x={-STICK.s / 2 + 4} y={-STICK.s / 2 + 6} width={STICK.s} height={STICK.s} fill="#000" opacity={0.15} />
      <rect x={-STICK.s / 2} y={-STICK.s / 2} width={STICK.s} height={STICK.s} fill="#F4D35E" />
      {/* 画出来的需求：两个简笔小人抱在一起，中间一颗红球 */}
      <g stroke="#3B3040" strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={400} strokeDashoffset={400 * (1 - draw)}>
        <circle cx={-26} cy={-34} r={12} />
        <circle cx={26} cy={-34} r={12} />
        <path d="M -26 -22 L -26 26 M 26 -22 L 26 26 M -26 -6 C -6 -20 6 -20 26 -6 M 26 -6 C 6 6 -6 6 -26 -6" />
      </g>
      <circle cx={0} cy={4} r={9} fill={C.accent} opacity={prog(f, B6.stick - 14, B6.stick - 6)} />
    </g>
  );
  return (
    <Stage>
      <defs>
        <radialGradient id="ceil-lamp" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="#FFE9BE" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#FFE9BE" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={1920} height={1080} fill="#2B2A3E" />
      <g transform={camT(cam, 0.8)}>
        <rect x={-3000} y={-2000} width={6000} height={2400} fill="#34324A" />
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={-1700 + i * 420} y={-560} width={300} height={180} rx={10} fill="#3E3B56" />
        ))}
      </g>
      <g transform={camT(cam, 1)}>
        <rect x={-3000} y={FLOOR_K} width={6000} height={1200} fill="#26243A" />
        {/* 冰箱 */}
        <rect x={-210} y={-600} width={420} height={FLOOR_K + 600} rx={24} fill="#AEB6C4" />
        <rect x={-210} y={-300} width={420} height={10} fill="#8F98A8" />
        <rect x={150} y={-560} width={16} height={180} rx={8} fill="#8F98A8" />
        <rect x={150} y={-240} width={16} height={300} rx={8} fill="#8F98A8" />
        {[[-150, -520, C.accent], [-90, -540, '#5D7396'], [120, 60, '#6E9F7C']].map(([mx, my, col], i) => (
          <circle key={i} cx={mx as number} cy={my as number} r={16} fill={col as string} />
        ))}
        {sticky}
        {/* 天花板的灯：第二次拥抱时亮起来 */}
        <line x1={-190} y1={-1200} x2={-190} y2={-640} stroke="#1A1828" strokeWidth={4} />
        <path d="M -250 -640 L -130 -640 L -150 -600 L -230 -600 Z" fill={mix('#5A566E', '#FFE9BE', lamp)} />
        <polygon points="-230,-600 -150,-600 260,340 -640,340" fill="url(#ceil-lamp)" opacity={lamp} />
        {/* 小橙 */}
        <Person
          x={lerp(-330, -260, hug)}
          y={FLOOR_K - 51 * 2.1}
          scale={2.1}
          who="orange"
          armR={draw > 0 && draw < 1 ? { up: 100, bend: 10 } : orangeArm}
          armL={orangeArm}
          look={{ x: hug > 0 ? 0.6 : 0.4, y: draw > 0 && draw < 1 ? -0.4 : 0 }}
          mouth={lerp(0.3, 0.8, relax)}
          mouthOpen={demo * 0.4}
          brows={0}
          breath={f}
        />
        {draw > 0 && draw < 1 ? <rect x={pen.x - 4} y={pen.y - 40} width={10} height={44} rx={4} fill="#3B3040" transform={`rotate(20 ${pen.x} ${pen.y})`} /> : null}
        {/* 小蓝：第一次抱得很僵，第二次放松下来 */}
        <Person
          x={blueX}
          y={FLOOR_K - 51 * 2.1}
          scale={2.1}
          who="blue"
          legs={walk > 0 && walk < 1 ? 'walk' : 'stand'}
          walkPhase={f * 0.5}
          armL={blueArm}
          armR={hug > 0 ? { up: lerp(-10, 10, relax), bend: lerp(0, 30, relax) } : { up: 8, bend: 4 }}
          headTilt={lerp(0, -14, relax)}
          look={{ x: hug > 0 ? lerp(0, -0.5, relax) : -0.6, y: 0 }}
          mouth={lerp(0, 0.5, relax)}
          blink={relax * 0.65}
          bodyTilt={lerp(0, -4, relax)}
          breath={f}
        />
        {hug > 0 ? <PocketHeart x={blueX} y={FLOOR_K - 51 * 2.1 - 21 * 2.1} f={f} glow={0.3 + flash * 0.9 + relax * 0.4} r={18} /> : null}
      </g>
      <rect width={1920} height={1080} fill="#FFD9A0" opacity={lamp * 0.06} />
    </Stage>
  );
};

// ───────────────────────── 冷灰时间线：一次次抛球没人接 ─────────────────────────

const TriesShot: React.FC<{ f: number }> = ({ f }) => {
  const FL = 300;
  const throws = [B6.tries + 2, B6.tries + 22, B6.tries + 42];
  const leave = prog(f, B6.leave + 4, B6.mirror, ease.inOut);
  const ox = lerp(-460, -860, leave);
  const oy = FL - 51 * 2.1;
  const resat = prog(f, B6.leave + 10, B6.mirror, ease.inOut);
  const blueX = 460;
  const cam: Cam = { x: lerp(0, -200, leave), y: -40, zoom: 1.05 + prog(f, B6.tries, B6.mirror) * 0.08 };
  const arcPt = (t: number) => ({ x: lerp(ox + 60, blueX - 30, t), y: lerp(oy - 120, oy - 80, t) - Math.sin(t * Math.PI) * 260 });
  let ball = { x: ox + 50, y: oy - 50 };
  let thrownCount = 0;
  throws.forEach((t0, i) => {
    if (f < t0) return;
    thrownCount = i + 1;
    const p = prog(f, t0, t0 + 12, ease.inOut);
    const back = prog(f, t0 + 14, t0 + 20, ease.inOut);
    if (p < 1) ball = arcPt(p);
    else ball = { x: lerp(blueX - 40, ox + 50, back), y: lerp(FL - 34, oy - 50, back * back) };
  });
  if (f >= B6.leave) ball = { x: ox + 4, y: oy - 60 * 2.1 + 10 };
  const throwing = throws.some((t0) => f >= t0 - 6 && f < t0 + 2);
  const t0n = throws.find((t0) => f >= t0 - 6 && f < t0 + 2) ?? 0;
  const tt = prog(f, t0n - 6, t0n + 2, ease.out);
  const oArmR: Arm = f >= B6.leave ? { up: -40, bend: 60 } : throwing ? { up: lerp(20, 150, tt), bend: lerp(60, 0, tt) } : { up: 30, bend: 30 };
  return (
    <Stage>
      <defs>
        <filter id="cold-world">
          <feColorMatrix type="saturate" values="0.2" />
        </filter>
        <filter id="orange-resat">
          <feColorMatrix type="saturate" values={`${lerp(0.25, 1, resat)}`} />
        </filter>
        <radialGradient id="warm-door">
          <stop offset="0%" stopColor="#F6C177" stopOpacity={0.6} />
          <stop offset="100%" stopColor="#F6C177" stopOpacity={0} />
        </radialGradient>
      </defs>
      <g filter="url(#cold-world)">
        <rect width={1920} height={1080} fill="#3E4250" />
        <g transform={camT(cam, 1)}>
          <rect x={-3000} y={-2000} width={6000} height={2300} fill="#4A4E5C" />
          <rect x={-3000} y={FL} width={6000} height={1200} fill="#35383F" />
          <Person x={blueX} y={FL - 51 * 2.1} scale={2.1} who="blue" armL={{ up: 4, bend: 2 }} armR={{ up: 4, bend: 2 }} look={{ x: 0, y: 0.2 }} mouth={0} breath={f} />
          {/* 每一次抛球留下的残影 */}
          {throws.slice(0, thrownCount).map((t0, i) =>
            Array.from({ length: 8 }).map((_, k) => {
              const p = (k + 1) / 9;
              const pt = arcPt(p);
              return <circle key={`${i}-${k}`} cx={pt.x} cy={pt.y - i * 30} r={10} fill="#E8C4BA" opacity={0.25 * (1 - prog(f, t0 + 40, t0 + 90))} />;
            }),
          )}
        </g>
      </g>
      <g transform={camT(cam, 1)}>
        {/* 左墙上暖光的门 */}
        <rect x={-1180} y={-260} width={200} height={FL + 260} fill="#F6C177" opacity={0.75} />
        <circle cx={-1080} cy={40} r={420} fill="url(#warm-door)" opacity={0.6 + resat * 0.4} />
        <g filter="url(#orange-resat)">
          <Person
            x={ox}
            y={oy}
            scale={2.1}
            who="orange"
            view={f >= B6.leave + 10 ? 'back' : 'front'}
            legs={leave > 0 && leave < 1 ? 'walk' : 'stand'}
            walkPhase={f * 0.5}
            armR={oArmR}
            armL={f >= B6.leave ? { up: -40, bend: 60 } : { up: 6, bend: 6 }}
            look={{ x: 0.8, y: 0.1 }}
            mouth={lerp(0.2, -0.3, prog(f, throws[1], B6.leave))}
            brows={prog(f, throws[1], B6.leave) * 0.7}
            breath={f}
          />
          <EmotionBall uid="tries-ball" x={ball.x} y={ball.y} r={26} glow={0.7} dim={0.2 - resat * 0.15} />
        </g>
      </g>
    </Stage>
  );
};

// ───────────────────────── 镜子：如果你就是 TA ─────────────────────────

const MirrorShot: React.FC<{ f: number }> = ({ f }) => {
  const whip = prog(f, B6.mirror - 6, B6.mirror + 6, ease.inOut);
  const z = 1.1 + prog(f, B6.mirror, B6.talk) * 0.15;
  const fog = 1 - prog(f, B6.mirror + 10, B6.talk, ease.inOut) * 0.5;
  return (
    <Stage>
      <MotionBlur id="mb-mirror" bx={(1 - whip) * 30} by={0}>
        <g transform={`translate(${960 + (1 - whip) * 400} 540) scale(${z}) translate(-960 -540)`}>
          <rect width={1920} height={1080} fill="#3B3150" />
          {Array.from({ length: 10 }).map((_, i) => (
            <rect key={i} x={i * 200} y={0} width={80} height={1080} fill="#43385A" />
          ))}
          <rect x={0} y={820} width={1920} height={260} fill="#2C2540" />
          <ellipse cx={960} cy={480} rx={300} ry={380} fill="#8A6844" />
          <ellipse cx={960} cy={480} rx={270} ry={350} fill="#2E3550" />
          <defs>
            <clipPath id="mirror-in">
              <ellipse cx={960} cy={480} rx={270} ry={350} />
            </clipPath>
            <filter id="fog-blur">
              <feGaussianBlur stdDeviation="22" />
            </filter>
          </defs>
          <g clipPath="url(#mirror-in)">
            <rect x={600} y={100} width={720} height={800} fill="#3A4566" />
            {/* 镜子里：兜帽戴着的小蓝 */}
            <ellipse cx={960} cy={480 - 98 * 2.6 + 6} rx={46 * 2.6} ry={48 * 2.6} fill={C.blueDark} />
            <Person x={960} y={480} scale={2.6} who="blue" look={{ x: 0, y: 0 }} mouth={-0.1} brows={0.4} breath={f} />
            <path d={`M ${960 - 44 * 2.6} ${480 - 98 * 2.6} A ${44 * 2.6} ${46 * 2.6} 0 0 1 ${960 + 44 * 2.6} ${480 - 98 * 2.6}`} stroke={C.blueDark} strokeWidth={34} fill="none" />
            <g filter="url(#fog-blur)" opacity={fog}>
              {Array.from({ length: 9 }).map((_, i) => (
                <circle key={i} cx={760 + rand(i) * 400 + Math.sin(f * 0.02 + i) * 20} cy={200 + rand(i + 5) * 560} r={90 + rand(i + 2) * 60} fill="#E8EEF8" opacity={0.35} />
              ))}
            </g>
          </g>
          <ellipse cx={880} cy={300} rx={50} ry={140} fill="#FFFFFF" opacity={0.08} transform="rotate(20 880 300)" />
        </g>
      </MotionBlur>
    </Stage>
  );
};

// ───────────────────────── 客厅：想逃 → 停住 → 掏出蓝球 → 坐回来 ─────────────────────────

const FL_L = 300;

export const LivingSet: React.FC<{ f: number; dawn?: number }> = ({ f, dawn = 0 }) => {
  const wall = mix(C.nightWall, '#7A6478', dawn);
  const sky0 = mix('#0D1230', '#8FB0D6', dawn);
  const sky1 = mix('#24305E', '#F4BE8E', dawn);
  return (
    <g>
      <defs>
        <linearGradient id="ls-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky0} />
          <stop offset="100%" stopColor={sky1} />
        </linearGradient>
      </defs>
      <rect x={-3000} y={-2000} width={6000} height={2400} fill={wall} />
      <rect x={-760} y={-500} width={1520} height={440} rx={8} fill="url(#ls-sky)" />
      {Array.from({ length: 14 }).map((_, i) => (
        <rect key={i} x={-760 + i * 110} y={-60 - 90 - rand(i + 4) * 220} width={80} height={300} fill={mix('#151B3E', '#6E6A8E', dawn)} />
      ))}
      <circle cx={420} cy={lerp(-40, -260, dawn)} r={60} fill="#FFE6B0" opacity={dawn} />
      <path d="M -760 -500 H 760 V -60 H -760 Z M 0 -500 V -60" stroke={mix('#2E3560', '#C9A98E', dawn)} strokeWidth={14} fill="none" />
      <rect x={-3000} y={FL_L - 150} width={6000} height={1400} fill={mix(C.nightFloor, '#6B5568', dawn)} />
      <rect x={-560} y={-70} width={1120} height={150} rx={46} fill={mix(C.sofa, '#7D86A8', dawn)} />
      <rect x={-545} y={50} width={1090} height={56} rx={24} fill={mix(C.sofaDark, '#6A7296', dawn)} />
      <rect x={-560} y={100} width={1120} height={60} rx={18} fill={mix('#283350', '#5C6488', dawn)} />
      <circle cx={-900} cy={-140} r={360} fill={C.lamp} opacity={0.12 * (1 - dawn)} />
      <g transform="translate(-860 20)">
        <rect x={-46} y={30} width={92} height={90} rx={14} fill="#3A2F4A" />
        {[-60, -25, 10, 40, 70].map((a, i) => (
          <ellipse key={i} cx={Math.sin((a * Math.PI) / 180) * 70} cy={-40 - Math.cos((a * Math.PI) / 180) * 50} rx={22} ry={70} transform={`rotate(${a + Math.sin(f * 0.05 + i) * 3} ${Math.sin((a * Math.PI) / 180) * 70} ${-40 - Math.cos((a * Math.PI) / 180) * 50})`} fill={mix('#2F5E58', '#6E9F7C', dawn)} />
        ))}
      </g>
    </g>
  );
};

const TalkShot: React.FC<{ f: number }> = ({ f }) => {
  const scale = 2.1;
  const standY = FL_L - 51 * scale;
  const flee = prog(f, B6.talk + 6, B6.stop, ease.inOut);
  const shellT = track(f, [
    [B6.talk, 0.2],
    [B6.stop, 0.7, ease.inOut],
    [B6.offerBlue, 0.7],
    [B6.offerBlue + 14, 0, ease.inOut],
  ]);
  const turnBack = prog(f, B6.offerBlue - 6, B6.offerBlue + 8, ease.inOut);
  const take = prog(f, B6.offerBlue + 4, B6.offerBlue + 22, ease.inOut);
  const sand = prog(f, B6.offerBlue + 24, B6.sitBack, ease.linear);
  const sit = prog(f, B6.sitBack, B6.sitBack + 18, ease.inOut);
  const cushionOut = prog(f, B6.sitBack + 14, B6.sitBack + 34, ease.inOut);
  const blueX = lerp(lerp(240, 470, flee), 70, sit);
  const blueY = lerp(standY, 40, sit);
  const orangeY = lerp(standY, 40, sit);
  const orangeX = lerp(-380, -250, sit);
  const talk = f < B6.stop + 10 ? Math.abs(Math.sin(f * 0.45)) * 0.6 : 0;
  const palmArm: Arm = { up: lerp(8, -70, take), bend: lerp(4, -20, take) };
  const palm = handWorld({ x: blueX, y: blueY, scale }, -1, palmArm);
  const dawn = prog(f, B6.sitBack + 10, B6.toS7 + 30, ease.inOut) * 0.5;
  // 推向窗外的晨光（下一节）
  const toWin = prog(f, B6.toS7 - 10, B6.toS7 + 24, ease.in);
  const cam: Cam = {
    x: lerp(lerp(0, -40, sit), 300, toWin),
    y: lerp(-80, -390, toWin),
    zoom: lerp(1.15 + prog(f, B6.talk, B6.sitBack) * 0.15, 5, toWin),
  };
  const shellCy = blueY - 50 * scale;
  return (
    <Stage>
      <rect width={1920} height={1080} fill={C.nightWallDeep} />
      <g transform={camT(cam, 1)}>
        <LivingSet f={f} dawn={dawn} />
        {/* 右边的门：小蓝想往那里走 */}
        <rect x={640} y={-360} width={260} height={FL_L - 150 + 360 + 150} fill="#2E2844" />
        <rect x={660} y={-340} width={220} height={FL_L + 340} fill="#3D3556" />
        {/* 两人中间的靠垫：坐回来以后被拿开 */}
        {cushionOut < 1 ? (
          <rect
            x={-110 - cushionOut * 700}
            y={-40 - cushionOut * 500}
            width={112}
            height={118}
            rx={30}
            fill="#56658A"
            opacity={sit}
            transform={`rotate(${-4 - cushionOut * 60} ${-54 - cushionOut * 700} ${20 - cushionOut * 500})`}
          />
        ) : null}
        <Person
          x={orangeX}
          y={orangeY}
          scale={scale}
          who="orange"
          legs={sit > 0.5 ? 'sit' : 'stand'}
          armL={{ up: -30, bend: 60 }}
          armR={{ up: -30, bend: 60 }}
          look={{ x: 0.8, y: 0 }}
          mouth={lerp(0.1, 0.6, sit)}
          mouthOpen={talk}
          brows={lerp(0.4, 0, sit)}
          breath={f}
        />
        <EmotionBall uid="talk-red" x={orangeX} y={orangeY - 56 * scale + 30} r={28} glow={0.9 + Math.sin(f * 0.3) * 0.1} />
        <Person
          x={blueX}
          y={blueY}
          scale={scale}
          who="blue"
          legs={sit > 0.5 ? 'sit' : flee > 0 && flee < 1 ? 'walk' : 'stand'}
          walkPhase={f * 0.5}
          armL={sit > 0.5 ? { up: -20, bend: 50 } : palmArm}
          armR={{ up: 8, bend: 4 }}
          look={{ x: lerp(0.8, -0.8, turnBack), y: 0 }}
          mouth={lerp(-0.2, 0.3, sit)}
          brows={lerp(0.5, 0, sit)}
          breath={f}
        />
        {/* 兜帽壳：合到一半 */}
        {shellT > 0.02 && sit < 0.5 ? (
          <g transform={`translate(${blueX} ${shellCy}) scale(${shellT} ${lerp(0.3, 1, shellT)})`} opacity={0.75}>
            <path d="M -150 230 C -170 -40 -110 -220 0 -230 C 110 -220 170 -40 150 230 Z" fill="#5D7396" />
            {[0, 1, 2].map((i) => (
              <path key={i} d={`M ${-150 + i * 8} ${200 - i * 100} Q 0 ${150 - i * 110} ${150 - i * 8} ${200 - i * 100}`} stroke="#4A5F80" strokeWidth={8} fill="none" />
            ))}
          </g>
        ) : null}
        {/* 掌心里的蓝球 */}
        {take > 0 ? (
          <EmotionBall
            uid="palm-blue"
            x={sit > 0.5 ? blueX : lerp(blueX, palm.x, take)}
            y={sit > 0.5 ? blueY - 34 * scale : lerp(blueY - 21 * scale, palm.y - 30, take)}
            r={26}
            hue="blue"
            glow={0.9}
          />
        ) : (
          <PocketHeart x={blueX} y={blueY - 21 * scale} f={f} glow={0.5} r={18} />
        )}
        {/* 气泡：省略号 + 沙漏 */}
        {take > 0.5 && sit < 1 ? (
          <g transform={`translate(${blueX + 40} ${blueY - 330}) scale(${prog(f, B6.offerBlue + 16, B6.offerBlue + 24, ease.outBack) * (1 - sit)})`}>
            <rect x={-130} y={-56} width={260} height={112} rx={56} fill="#F4F1EA" />
            <path d="M -40 50 L -64 86 L 0 54 Z" fill="#F4F1EA" />
            {[-1, 0, 1].map((k) => (
              <circle key={k} cx={-60 + k * 28} cy={0} r={9} fill="#7C93B5" />
            ))}
            <g transform="translate(60 0)">
              <path d="M -20 -32 L 20 -32 L 0 0 L 20 32 L -20 32 L 0 0 Z" fill="none" stroke="#7C93B5" strokeWidth={4} />
              <path d={`M ${-16 * (1 - sand)} ${-28 + 26 * sand} L ${16 * (1 - sand)} ${-28 + 26 * sand} L 0 -2 Z`} fill="#C9A46A" />
              <path d={`M ${-16 * sand} ${28 - 26 * sand} L ${16 * sand} ${28 - 26 * sand} L 18 30 L -18 30 Z`} fill="#C9A46A" opacity={sand > 0 ? 1 : 0} />
              <line x1={0} y1={-2} x2={0} y2={28} stroke="#C9A46A" strokeWidth={2} opacity={sand > 0 && sand < 1 ? 1 : 0} strokeDasharray="4 4" strokeDashoffset={-f} />
            </g>
          </g>
        ) : null}
      </g>
      <rect width={1920} height={1080} fill="#FFE6B0" opacity={toWin * 0.5} />
    </Stage>
  );
};

