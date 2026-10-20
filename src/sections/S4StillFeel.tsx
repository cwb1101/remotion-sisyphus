import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease, lerp, prog, rand, track, wobble } from '../anim';
import { camT, MotionBlur, Stage, type Cam } from '../camera';
import { EmotionBall } from '../components/EmotionBall';
import { Person, type Arm } from '../components/Person';
import { B3, B4 } from '../data/timeline';
import { C } from '../theme';

/**
 * 第 4 节「感觉还在」：冰壳里的小蓝裂开 → 雨夜给流浪猫打伞，口袋透出蓝光
 * → 推进路灯光，接电影院放映窗口的光 → 看电影偷偷红了眼 → 口袋里的蓝球像心脏一样跳
 * → 拉开：其实是在家门口，小橙就在沙发上 → TA 把口袋里的感觉拧到静音。
 */
export const S4StillFeel: React.FC = () => {
  const f = useCurrentFrame();
  if (f < B3.flip + 24 || f > B4.toS5 + 12) return null;
  const fadeIn = prog(f, B3.flip + 24, B3.flip + 38, ease.inOut);
  const toCinema = prog(f, B4.toCinema + 6, B4.toCinema + 16, ease.inOut);
  const toHome = prog(f, B4.door - 8, B4.door + 6, ease.inOut);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeIn }}>
      {toCinema < 1 ? <StreetShot f={f} /> : null}
      {toCinema > 0 && toHome < 1 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: toCinema }}>
          <CinemaShot f={f} />
        </div>
      ) : null}
      {toHome > 0 ? (
        <div style={{ position: 'absolute', inset: 0, opacity: toHome }}>
          <HomeShot f={f} />
        </div>
      ) : null}
    </div>
  );
};

// ───────────────────────── 雨夜街道 ─────────────────────────

const GROUND = 300;
const LAMP = { x: 560, y: -420 };
const CAT_X = -270;

/** 稀疏的细雨线：三层景深，低对比 */
export const Rain: React.FC<{ f: number; count?: number; len?: number; opacity?: number; seed?: number; speed?: number }> = ({
  f,
  count = 50,
  len = 46,
  opacity = 0.22,
  seed = 0,
  speed = 34,
}) => (
  <g stroke="#C9D6EA" strokeWidth={2} strokeLinecap="round" opacity={opacity}>
    {Array.from({ length: count }).map((_, i) => {
      const x = ((rand(i + seed) * 2400 + f * speed * 0.25) % 2400) - 240;
      const y = ((rand(i * 3 + seed) * 1300 + f * speed) % 1300) - 110;
      return <line key={i} x1={x} y1={y} x2={x - len * 0.25} y2={y + len} />;
    })}
  </g>
);

export const StreetWorld: React.FC<{
  f: number;
  blueX: number;
  crouch: number;
  umbrella: number;
  pocketGlow: number;
  iced?: number;
  crack?: number;
  shatter?: number;
}> = ({ f, blueX, crouch, umbrella, pocketGlow, iced = 0, crack = 0, shatter = 0 }) => {
  const scale = 2.1;
  const standY = GROUND - 51 * scale;
  const crouchY = GROUND - 75 * scale + 10;
  const hipY = lerp(standY, crouchY, crouch);
  const tilt = lerp(0, -38, crouch);
  const handPos = { x: blueX + 40 * scale, y: hipY - 80 * scale };
  const pocket = { x: blueX, y: hipY - 21 * scale };
  const catBlink = (f % 80) < 4 ? 0.2 : 1;
  return (
    <g>
      <defs>
        <linearGradient id="lamp-cone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE2A8" stopOpacity={0.45} />
          <stop offset="100%" stopColor="#FFE2A8" stopOpacity={0.06} />
        </linearGradient>
      </defs>
      {/* 店面、橱窗、雨棚 */}
      <rect x={-760} y={-520} width={1080} height={820} fill="#262C42" />
      <rect x={-640} y={-150} width={360} height={300} rx={8} fill="#F6C177" opacity={0.75} />
      <rect x={-640} y={-150} width={360} height={300} rx={8} fill="none" stroke="#3A3248" strokeWidth={12} />
      {[0, 1, 2].map((k) => (
        <rect key={k} x={-610 + k * 110} y={20} width={70} height={110} rx={6} fill="#B9864E" opacity={0.6} />
      ))}
      <rect x={-200} y={-120} width={170} height={420} rx={6} fill="#1C2033" />
      {Array.from({ length: 9 }).map((_, i) => (
        <path
          key={i}
          d={`M ${-700 + i * 120} -230 L ${-580 + i * 120} -230 L ${-560 + i * 120} -170 L ${-720 + i * 120} -170 Z`}
          fill={i % 2 ? '#C9B7A0' : '#8C4A4A'}
        />
      ))}
      {/* 路灯 */}
      <rect x={LAMP.x - 8} y={LAMP.y} width={16} height={GROUND - LAMP.y} fill="#1A1E2C" />
      <path d={`M ${LAMP.x - 50} ${LAMP.y} L ${LAMP.x + 50} ${LAMP.y} L ${LAMP.x + 30} ${LAMP.y - 40} L ${LAMP.x - 30} ${LAMP.y - 40} Z`} fill="#1A1E2C" />
      <ellipse cx={LAMP.x} cy={LAMP.y + 4} rx={30} ry={10} fill="#FFE2A8" />
      <polygon points={`${LAMP.x - 30},${LAMP.y} ${LAMP.x + 30},${LAMP.y} ${LAMP.x + 330},${GROUND} ${LAMP.x - 330},${GROUND}`} fill="url(#lamp-cone)" />
      {/* 湿地面与倒影 */}
      <rect x={-3000} y={GROUND} width={6000} height={1400} fill="#191E2E" />
      <ellipse cx={LAMP.x} cy={GROUND + 60} rx={260} ry={26} fill="#F6C177" opacity={0.18} />
      <ellipse cx={-460} cy={GROUND + 90} rx={220} ry={22} fill="#F6C177" opacity={0.12} />
      {Array.from({ length: 6 }).map((_, i) => {
        const ph = ((f + i * 13) % 40) / 40;
        return (
          <ellipse
            key={i}
            cx={-600 + rand(i) * 1500}
            cy={GROUND + 30 + rand(i + 3) * 160}
            rx={6 + ph * 40}
            ry={2 + ph * 8}
            fill="none"
            stroke="#C9D6EA"
            strokeWidth={2}
            opacity={(1 - ph) * 0.35}
          />
        );
      })}
      {/* 屋檐下的猫 */}
      <g transform={`translate(${CAT_X} ${GROUND}) scale(1.5)`}>
        <path d="M 40 -10 C 90 -20 90 -70 60 -80" stroke="#4A4F66" strokeWidth={10} fill="none" strokeLinecap="round" />
        <ellipse cx={0} cy={-42} rx={46} ry={42} fill="#4A4F66" />
        <circle cx={-26} cy={-92} r={30} fill="#4A4F66" />
        <path d="M -50 -110 L -46 -140 L -30 -118 Z M -10 -116 L -2 -142 L 6 -112 Z" fill="#4A4F66" />
        <ellipse cx={-36} cy={-94} rx={5} ry={6 * catBlink} fill="#F2C94C" />
        <ellipse cx={-16} cy={-94} rx={5} ry={6 * catBlink} fill="#F2C94C" />
      </g>
      {/* 小蓝 */}
      <Person
        x={blueX}
        y={hipY}
        scale={scale}
        who="blue"
        legs={crouch > 0.5 ? 'sit' : 'stand'}
        bodyTilt={lerp(0, -8, crouch)}
        armR={{ up: lerp(60, 30, crouch), bend: lerp(-10, -40, crouch) }}
        armL={{ up: lerp(8, -20, crouch), bend: lerp(4, 60, crouch) }}
        look={{ x: lerp(0, -0.9, crouch), y: lerp(0, 0.6, crouch) }}
        mouth={lerp(0, 0.45, crouch)}
        breath={f}
      />
      {/* 口袋透出的蓝光 */}
      {pocketGlow > 0.01 ? (
        <g>
          <ellipse cx={pocket.x} cy={pocket.y} rx={60} ry={40} fill="#8FB4E8" opacity={0.28 * pocketGlow} />
          <ellipse cx={pocket.x} cy={pocket.y} rx={26} ry={14} fill="#B9D4F5" opacity={0.6 * pocketGlow} />
        </g>
      ) : null}
      {/* 伞：慢慢倾向猫，小蓝自己的肩膀淋在雨里 */}
      {umbrella > 0 ? (
        <g transform={`translate(${handPos.x} ${handPos.y}) rotate(${tilt})`} opacity={umbrella}>
          <line x1={0} y1={0} x2={0} y2={-150} stroke="#20263A" strokeWidth={6} />
          <path d="M -170 -150 Q 0 -300 170 -150 Q 120 -170 85 -150 Q 42 -172 0 -150 Q -42 -172 -85 -150 Q -120 -170 -170 -150 Z" fill="#34405E" />
          <path d="M 0 -150 L 0 -228" stroke="#4A5778" strokeWidth={4} />
        </g>
      ) : null}
      {/* 冰壳 */}
      {iced > 0 && shatter < 1 ? (
        <g opacity={iced * (1 - shatter)}>
          <rect x={blueX - 110} y={-120} width={220} height={GROUND + 120} rx={70} fill="#BFE3FF" opacity={0.38} />
          <rect x={blueX - 110} y={-120} width={220} height={GROUND + 120} rx={70} fill="none" stroke="#EAF6FF" strokeWidth={4} opacity={0.7} />
          <path d={`M ${blueX - 70} -60 L ${blueX - 20} -110 M ${blueX + 40} 120 L ${blueX + 80} 60`} stroke="#FFFFFF" strokeWidth={6} opacity={0.6} strokeLinecap="round" />
          <path
            d={`M ${blueX - 20} -110 L ${blueX + 10} -30 L ${blueX - 30} 40 L ${blueX + 20} 130 L ${blueX - 10} 220`}
            stroke="#FFFFFF"
            strokeWidth={4}
            fill="none"
            strokeDasharray={420}
            strokeDashoffset={420 * (1 - crack)}
          />
        </g>
      ) : null}
      {shatter > 0 && shatter < 1
        ? Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const d = shatter * (200 + rand(i) * 260);
            const x = blueX + Math.cos(a) * d;
            const y = 80 + Math.sin(a) * d * 0.8 + shatter * shatter * 260;
            return (
              <path
                key={i}
                d="M -18 -14 L 22 -6 L -4 20 Z"
                transform={`translate(${x} ${y}) rotate(${shatter * 300 * (i % 2 ? 1 : -1)})`}
                fill="#DDF0FF"
                opacity={(1 - shatter) * 0.85}
              />
            );
          })
        : null}
    </g>
  );
};

const streetCam = (f: number): Cam => {
  const zin = prog(f, B4.ice, B4.shatter, ease.inOut);
  let c: Cam = { x: 120, y: lerp(60, 40, zin), zoom: lerp(1.6, 1.85, zin) };
  const wide = prog(f, B4.shatter + 4, B4.crouch + 6, ease.inOut);
  c = { x: lerp(c.x, -60, wide), y: lerp(c.y, -20, wide), zoom: lerp(c.zoom, 1.15, wide) };
  c.zoom += prog(f, B4.crouch + 6, B4.toCinema, ease.inOut) * 0.12;
  // 推进路灯的暖光
  const pl = prog(f, B4.toCinema, B4.toCinema + 16, ease.in);
  return { x: lerp(c.x, LAMP.x, pl), y: lerp(c.y, LAMP.y + 10, pl), zoom: c.zoom * Math.pow(7, pl) };
};

const StreetShot: React.FC<{ f: number }> = ({ f }) => {
  const cam = streetCam(f);
  const anchor = { x: 0, y: 0 };
  const walk = prog(f, B4.shatter + 8, B4.crouch, ease.inOut);
  const blueX = lerp(120, -110, walk);
  const crouch = prog(f, B4.crouch - 4, B4.crouch + 10, ease.inOut);
  const pocketGlow = prog(f, B4.crouch + 6, B4.crouch + 24, ease.inOut) * (0.75 + 0.25 * Math.sin(f * 0.2));
  return (
    <Stage>
      <defs>
        <radialGradient id="lamp-bloom">
          <stop offset="0%" stopColor="#FFF1D2" stopOpacity={1} />
          <stop offset="100%" stopColor="#FFE2A8" stopOpacity={0} />
        </radialGradient>
        <filter id="fg-blur-st">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>
      <rect width={1920} height={1080} fill="#151A2A" />
      <g transform={camT(cam, 0.55, anchor)}>
        <rect x={-4000} y={-2400} width={8000} height={2800} fill="#1A2036" />
        {Array.from({ length: 16 }).map((_, i) => (
          <g key={i}>
            <rect x={-3200 + i * 420} y={-200 - rand(i) * 700} width={300} height={1400} fill="#20273F" />
            {Array.from({ length: 8 }).map((__, j) =>
              rand(i * 11 + j) > 0.6 ? (
                <rect key={j} x={-3160 + i * 420 + (j % 3) * 80} y={-120 - rand(i) * 700 + Math.floor(j / 3) * 110} width={40} height={50} fill="#E8C98F" opacity={0.35} />
              ) : null,
            )}
          </g>
        ))}
        <g transform="translate(0 -300)">
          <Rain f={f} count={40} len={36} opacity={0.14} seed={7} speed={26} />
        </g>
      </g>
      <g transform={camT(cam, 1, anchor)}>
        <StreetWorld
          f={f}
          blueX={blueX}
          crouch={crouch}
          umbrella={prog(f, B4.shatter - 2, B4.shatter + 8)}
          pocketGlow={pocketGlow}
          iced={1 - prog(f, B4.shatter, B4.shatter + 2)}
          crack={prog(f, B4.crack, B4.shatter, ease.in)}
          shatter={prog(f, B4.shatter, B4.shatter + 18, ease.out)}
        />
        <circle cx={LAMP.x} cy={LAMP.y + 10} r={220} fill="url(#lamp-bloom)" opacity={0.25 + prog(f, B4.toCinema, B4.toCinema + 16) * 0.75} />
      </g>
      <g transform={camT(cam, 1.3, anchor)} filter="url(#fg-blur-st)">
        <g transform="translate(-200 -400)">
          <Rain f={f} count={26} len={70} opacity={0.2} seed={31} speed={48} />
        </g>
      </g>
      <Rain f={f} count={30} len={50} opacity={0.12} seed={3} speed={40} />
    </Stage>
  );
};

// ───────────────────────── 电影院 ─────────────────────────

const SEAT_HIP = 150;
const BLUE_CINEMA = { x: 170, y: SEAT_HIP, scale: 1.9 };

const cinemaCam = (f: number): Cam => {
  const out = prog(f, B4.toCinema + 6, B4.cinema + 22, ease.out);
  let c: Cam = { x: lerp(0, 140, out), y: lerp(-470, -40, out), zoom: lerp(6, 1.35, out) };
  c.zoom += prog(f, B4.cinema + 22, B4.pocket, ease.inOut) * 0.3;
  c.x += prog(f, B4.cinema + 22, B4.pocket, ease.inOut) * 30;
  // 推进口袋
  const pk = prog(f, B4.pocket - 4, B4.pocket + 16, ease.inOut);
  const pocketY = BLUE_CINEMA.y - 21 * BLUE_CINEMA.scale;
  return { x: lerp(c.x, BLUE_CINEMA.x, pk), y: lerp(c.y, pocketY - 30, pk), zoom: lerp(c.zoom, 3.6, pk) + prog(f, B4.pocket + 16, B4.door, ease.linear) * 0.3 };
};

/** 口袋里像心脏一样跳的蓝球 */
export const PocketHeart: React.FC<{ x: number; y: number; f: number; glow: number; r?: number }> = ({ x, y, f, glow, r = 22 }) => {
  const t = (f % 34) / 34;
  const beat = Math.exp(-t * 14) + 0.6 * Math.exp(-Math.max(0, t - 0.22) * 16) * (t > 0.22 ? 1 : 0);
  return (
    <g>
      <defs>
        <clipPath id={`pocket-clip-${Math.round(x)}`}>
          <rect x={x - 46} y={y - 40} width={92} height={60} />
        </clipPath>
      </defs>
      <ellipse cx={x} cy={y - 6} rx={90} ry={60} fill="#8FB4E8" opacity={0.22 * glow * (1 + beat * 0.5)} />
      <g clipPath={`url(#pocket-clip-${Math.round(x)})`}>
        <EmotionBall uid={`pocket-${Math.round(x)}`} x={x} y={y - 4} r={r * (1 + beat * 0.12)} hue="blue" glow={glow} />
      </g>
    </g>
  );
};

const CinemaShot: React.FC<{ f: number }> = ({ f }) => {
  const cam = cinemaCam(f);
  const anchor = { x: 0, y: 0 };
  const screenLight = 0.75 + 0.12 * Math.sin(f * 0.05) + 0.06 * Math.sin(f * 0.13);
  const wipe = track(f, [
    [B4.wipeEye - 6, 0],
    [B4.wipeEye + 4, 1, ease.out],
    [B4.wipeEye + 16, 1],
    [B4.wipeEye + 24, 0, ease.inOut],
  ]);
  const armR: Arm = { up: lerp(-24, -50, wipe), bend: lerp(80, 150, wipe) };
  const tear = prog(f, B4.cinema + 10, B4.wipeEye, ease.in);
  const pocketY = BLUE_CINEMA.y - 21 * BLUE_CINEMA.scale;
  const glow = lerp(0.5, 1, prog(f, B4.cinema + 20, B4.pocket, ease.inOut));
  return (
    <Stage>
      <defs>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF4DD" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#FFF4DD" stopOpacity={0} />
        </linearGradient>
        <filter id="fg-blur-ci">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect width={1920} height={1080} fill="#120F1A" />
      <g transform={camT(cam, 0.7, anchor)}>
        <rect x={-3000} y={-2000} width={6000} height={2600} fill="#17121F" />
        {/* 后墙的放映窗口和光束 */}
        <rect x={-60} y={-520} width={120} height={80} rx={8} fill="#FFF4DD" />
        <polygon points="-50,-450 50,-450 1400,600 -1400,600" fill="url(#beam)" opacity={0.5 + 0.1 * Math.sin(f * 0.07)} />
        {Array.from({ length: 30 }).map((_, i) => (
          <circle key={i} cx={(rand(i) - 0.5) * 1600 * ((f * 0.4 + rand(i + 9) * 300) % 300) / 300} cy={-450 + ((f * 0.4 + rand(i + 9) * 300) % 300) * 3} r={2} fill="#FFF4DD" opacity={0.35} />
        ))}
        {/* 后排观众剪影 */}
        {Array.from({ length: 9 }).map((_, i) => (
          <Person key={i} x={-1600 + i * 400} y={-40} scale={1.4} who="shadow" legs="sit" breath={f + i * 9} />
        ))}
        <rect x={-3000} y={0} width={6000} height={80} fill="#241826" />
      </g>
      <g transform={camT(cam, 1, anchor)}>
        {/* 同排座椅和观众 */}
        {Array.from({ length: 7 }).map((_, i) => (
          <rect key={i} x={-1200 + i * 360} y={-30} width={260} height={260} rx={40} fill="#4A2533" />
        ))}
        {[-550, 550, 910].map((x) => (
          <Person key={x} x={x} y={SEAT_HIP} scale={1.9} who="shadow" legs="sit" breath={f + x} />
        ))}
        <Person
          {...BLUE_CINEMA}
          who="blue"
          legs="sit"
          armR={armR}
          armL={{ up: -18, bend: 40 }}
          look={{ x: 0, y: -0.4 }}
          brows={0.9}
          mouth={-0.2}
          blink={wipe * 0.8}
          breath={f}
        />
        {/* 银幕的光照在脸上 */}
        <circle cx={BLUE_CINEMA.x} cy={BLUE_CINEMA.y - 92 * 1.9} r={70} fill="#E8EEF8" opacity={0.18 * screenLight} />
        {/* 眼角的一滴泪 */}
        {tear > 0 && wipe < 0.5 ? (
          <path
            d={`M ${BLUE_CINEMA.x + 24} ${BLUE_CINEMA.y - 92 * 1.9 + tear * 30} q 6 10 0 14 q -6 -4 0 -14`}
            fill="#BFE3FF"
            opacity={0.9}
          />
        ) : null}
        <PocketHeart x={BLUE_CINEMA.x} y={pocketY} f={f} glow={glow} />
      </g>
      {/* 前景：前排椅背 */}
      <g transform={camT(cam, 1.35, anchor)} filter="url(#fg-blur-ci)">
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={-1500 + i * 420} y={250} width={340} height={300} rx={60} fill="#2A1520" />
        ))}
      </g>
      <rect width={1920} height={1080} fill="#E8EEF8" opacity={0.04 * screenLight} />
    </Stage>
  );
};

// ───────────────────────── 家门口 ─────────────────────────

export const HomeWorld: React.FC<{
  f: number;
  mode: 'door' | 'sofa';
  pocketGlow: number;
  muteHand?: number;
  flat?: number;
}> = ({ f, mode, pocketGlow, muteHand = 0, flat = 0 }) => {
  const blue = mode === 'door' ? { x: 420, y: 300 - 51 * 2.2, scale: 2.2 } : { x: 260, y: 150, scale: 2 };
  const pocketY = blue.y - 21 * blue.scale;
  return (
    <g>
      <defs>
        <radialGradient id="home-lamp">
          <stop offset="0%" stopColor={C.lamp} stopOpacity={0.45} />
          <stop offset="100%" stopColor={C.lamp} stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect x={-2400} y={-1400} width={4800} height={1800} fill={C.nightWall} />
      {/* 窗、城市 */}
      <rect x={-760} y={-440} width={640} height={380} rx={8} fill="#18204A" />
      {Array.from({ length: 10 }).map((_, i) => (
        <rect key={i} x={-740 + i * 62} y={-60 - 80 - rand(i) * 180} width={48} height={260} fill="#151B3E" />
      ))}
      <path d="M -760 -440 H -120 V -60 H -760 Z M -440 -440 V -60" stroke="#2E3560" strokeWidth={12} fill="none" />
      {/* 台灯光 */}
      <circle cx={-900} cy={-160} r={420} fill="url(#home-lamp)" />
      <rect x={-920} y={-60} width={90} height={160} rx={8} fill="#2C2A45" />
      <path d="M -925 -140 L -825 -140 L -845 -210 L -905 -210 Z" fill={C.lamp} />
      <rect x={-2400} y={300} width={4800} height={1200} fill={C.nightFloor} />
      {/* 沙发和小橙 */}
      <rect x={-760} y={-40} width={700} height={140} rx={40} fill={C.sofa} />
      <rect x={-750} y={70} width={680} height={56} rx={22} fill={C.sofaDark} />
      <rect x={-760} y={120} width={700} height={70} rx={16} fill="#283350" />
      <Person x={-560} y={92} scale={1.8} who="orange" legs="sit" armL={{ up: -14, bend: 30 }} armR={{ up: -14, bend: 30 }} look={{ x: 0.8, y: 0 }} mouth={0.2} breath={f} />
      <EmotionBall uid="home-ball" x={-560} y={92 - 34 * 1.8} r={26} glow={0.7} dim={0.3} />
      {mode === 'sofa' ? (
        <>
          <rect x={60} y={-40} width={500} height={140} rx={40} fill={C.sofa} />
          <rect x={70} y={70} width={480} height={56} rx={22} fill={C.sofaDark} />
        </>
      ) : null}
      {/* 门 */}
      {mode === 'door' ? (
        <g>
          <rect x={250} y={-360} width={360} height={660} fill="#3B3150" />
          <rect x={270} y={-340} width={320} height={640} fill="#4A3F63" />
          <path d={`M 270 -340 L ${270 + 120} -320 L ${270 + 120} 290 L 270 300 Z`} fill="#5A4E73" />
        </g>
      ) : null}
      <Person
        {...blue}
        who="blue"
        legs={mode === 'door' ? 'stand' : 'sit'}
        armR={mode === 'door' ? { up: lerp(10, -36, muteHand), bend: lerp(6, 64, muteHand) } : { up: -32, bend: 92 }}
        armL={mode === 'door' ? { up: 10, bend: 6 } : { up: -32, bend: 92 }}
        look={{ x: mode === 'door' ? lerp(-0.8, 0, flat) : 0.1, y: mode === 'door' ? 0 : 0.9 }}
        mouth={lerp(0.3, 0, flat)}
        brows={0}
        blink={flat * 0.35}
        phoneGlow={mode === 'sofa' ? 1 : 0}
        breath={f}
      />
      {mode === 'sofa' ? (
        <g transform={`translate(${blue.x} ${blue.y - 50 * blue.scale})`}>
          <rect x={-20} y={-30} width={40} height={60} rx={8} fill="#141824" />
          <rect x={-16} y={-25} width={32} height={50} rx={5} fill="#BFD8FF" />
        </g>
      ) : null}
      {pocketGlow > 0.01 ? <PocketHeart x={blue.x} y={pocketY} f={f} glow={pocketGlow} r={20} /> : null}
    </g>
  );
};

const HomeShot: React.FC<{ f: number }> = ({ f }) => {
  const blue = { x: 420, y: 300 - 51 * 2.2, scale: 2.2 };
  const pocketY = blue.y - 21 * blue.scale;
  // 从口袋特写拉开：其实 TA 站在自家门口，小橙就在沙发上
  const out = prog(f, B4.door - 8, B4.door + 26, ease.inOut);
  let cam: Cam = { x: lerp(blue.x, 40, out), y: lerp(pocketY - 30, -60, out), zoom: lerp(3.9, 1.0, out) };
  const mz = prog(f, B4.mute - 4, B4.mute + 16, ease.inOut);
  cam = { x: lerp(cam.x, blue.x - 40, mz), y: lerp(cam.y, pocketY - 90, mz), zoom: lerp(cam.zoom, 2.1, mz) + prog(f, B4.mute + 16, B4.toS5, ease.linear) * 0.15 };
  const bars = 5 - Math.floor(clamp((f - B4.mute - 6) / 6, 0, 5));
  const muteIcon = prog(f, B4.mute + 36, B4.mute + 42, ease.outBack) * (1 - prog(f, B4.mute + 62, B4.toS5));
  const flat = prog(f, B4.mute + 6, B4.mute + 40, ease.inOut);
  const glow = (1 - prog(f, B4.mute + 6, B4.mute + 36, ease.inOut)) * 0.9;
  const muteHand = prog(f, B4.mute - 2, B4.mute + 6, ease.out) * (1 - prog(f, B4.mute + 44, B4.mute + 54));
  const knob = { x: blue.x + 70, y: pocketY - 90 };
  return (
    <Stage>
      <defs>
        <filter id="mute-desat">
          <feColorMatrix type="saturate" values={`${1 - flat * 0.55}`} />
        </filter>
      </defs>
      <rect width={1920} height={1080} fill={C.nightWallDeep} />
      <g filter={flat > 0 ? 'url(#mute-desat)' : undefined}>
        <g transform={camT(cam, 1)}>
          <HomeWorld f={f} mode="door" pocketGlow={glow} muteHand={muteHand} flat={flat} />
          {/* 音量格：一格一格熄灭 */}
          {f >= B4.mute && muteIcon < 0.99 ? (
            <g transform={`translate(${knob.x} ${knob.y})`} opacity={1 - prog(f, B4.mute + 36, B4.mute + 44)}>
              {Array.from({ length: 5 }).map((_, i) => (
                <rect key={i} x={i * 16} y={-10 - i * 8} width={11} height={14 + i * 8} rx={3} fill={i < bars ? '#B9D4F5' : '#B9D4F5'} opacity={i < bars ? 0.95 : 0.15} />
              ))}
            </g>
          ) : null}
          {muteIcon > 0 ? (
            <g transform={`translate(${knob.x + 30} ${knob.y - 20}) scale(${muteIcon})`} opacity={muteIcon}>
              <path d="M -26 -12 L -12 -12 L 6 -28 L 6 28 L -12 12 L -26 12 Z" fill="#E8EEF8" />
              <path d="M 16 -14 L 40 14 M 40 -14 L 16 14" stroke="#E8EEF8" strokeWidth={6} strokeLinecap="round" />
            </g>
          ) : null}
        </g>
      </g>
      {/* 进入下一节：画面中央亮起一道细缝 */}
      <rect x={958} y={0} width={4} height={1080} fill="#FFF4DD" opacity={prog(f, B4.toS5 - 10, B4.toS5, ease.in) * 0.9} />
    </Stage>
  );
};

