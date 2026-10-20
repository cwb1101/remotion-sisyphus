import React from 'react';
import { useCurrentFrame } from 'remotion';
import { clamp, ease, lerp, prog, rand } from '../anim';
import { camT, Stage, type Cam } from '../camera';
import { EmotionBall } from '../components/EmotionBall';
import { Person } from '../components/Person';
import { B4, B5 } from '../data/timeline';
import { C, FONT_SANS } from '../theme';
import { BrightSceneShade } from './S2Service';
import { HomeWorld, PocketHeart, Rain, StreetWorld } from './S4StillFeel';

/**
 * 第 5 节「静止的脸」：雨夜暖 / 沙发冷的分屏 → 老纪录片质感的静止脸实验（示意）
 * → 宝宝转开的侧脸匹配成长走廊里的小小蓝 → 红球被按进口袋、冷成蓝色、拉链拉上
 * → 长大后，小橙一靠近，TA 拉起兜帽缩进壳里 → 壳里其实是害怕 → 一根线：童年只是其中一股。
 */
export const S5StillFace: React.FC = () => {
  const f = useCurrentFrame();
  if (f < B4.toS5 - 2 || f > B5.toS6 + 26) return null;
  const fadeIn = prog(f, B4.toS5 - 2, B4.toS5 + 8, ease.inOut);
  const x = (a: number, b: number) => prog(f, a, b, ease.inOut);
  const toLab = x(B5.lab - 8, B5.lab + 8);
  const toCorr = x(B5.corridor - 6, B5.corridor + 6);
  const toPocket = x(B5.pocket - 6, B5.pocket + 4);
  const toAdult = x(B5.adult - 6, B5.adult + 4);
  const toThreads = x(B5.threads - 8, B5.threads + 6);
  const layer = (o: number, node: React.ReactNode) =>
    o > 0 ? <div style={{ position: 'absolute', inset: 0, opacity: o }}>{node}</div> : null;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: fadeIn }}>
      {toLab < 1 ? <SplitShot f={f} /> : null}
      {layer(toLab * (1 - toCorr), <LabShot f={f} />)}
      {layer(toCorr * (1 - toPocket), <CorridorShot f={f} />)}
      {layer(toPocket * (1 - toAdult), <PocketShot f={f} />)}
      {layer(toAdult * (1 - toThreads), <AdultShot f={f} />)}
      {layer(toThreads, <ThreadsShot f={f} />)}
    </div>
  );
};

// ───────────────────────── 分屏：暖 / 冷 ─────────────────────────

const SplitShot: React.FC<{ f: number }> = ({ f }) => {
  const open = prog(f, B4.toS5 - 2, B4.toS5 + 14, ease.out);
  const push = prog(f, B5.lab - 16, B5.lab + 6, ease.in);
  const z = 1 + push * 0.5 + prog(f, B5.split, B5.lab) * 0.06;
  const half = (cx: number, cam: Cam) => `translate(${cx} 540) scale(${cam.zoom * z}) translate(${-cam.x} ${-cam.y})`;
  return (
    <Stage>
      <defs>
        <clipPath id="split-l">
          <rect x={0} y={0} width={960 - 2} height={1080} />
        </clipPath>
        <clipPath id="split-r">
          <rect x={962} y={0} width={958} height={1080} />
        </clipPath>
        <filter id="split-cold">
          <feColorMatrix type="saturate" values="0.45" />
        </filter>
      </defs>
      <rect width={1920} height={1080} fill="#151A2A" />
      <g clipPath="url(#split-l)" transform={`translate(${(1 - open) * -200} 0)`}>
        <rect width={960} height={1080} fill="#1A2036" />
        <g transform={half(480, { x: -170, y: 80, zoom: 1.25 })}>
          <StreetWorld f={f} blueX={-110} crouch={1} umbrella={1} pocketGlow={0.8 + 0.2 * Math.sin(f * 0.2)} />
        </g>
        <Rain f={f} count={24} opacity={0.15} seed={5} />
        <rect width={960} height={1080} fill="#F6C177" opacity={0.08} />
      </g>
      <g clipPath="url(#split-r)" transform={`translate(${(1 - open) * 200} 0)`}>
        <g filter="url(#split-cold)">
          <rect x={960} width={960} height={1080} fill={C.nightWallDeep} />
          <g transform={half(1440, { x: 250, y: 20, zoom: 1.35 })}>
            <HomeWorld f={f} mode="sofa" pocketGlow={0} />
          </g>
        </g>
        <rect x={960} width={960} height={1080} fill="#4A6A9A" opacity={0.12} />
      </g>
      <rect x={958} y={0} width={4} height={1080} fill="#FFF4DD" opacity={0.9} />
      <rect x={940} y={0} width={40} height={1080} fill="#FFF4DD" opacity={0.08} />
    </Stage>
  );
};

// ───────────────────────── 纪录片质感（示意） ─────────────────────────

/** 老纪录片：泛黄 + 椭圆暗角 + 圆角片框；cold 让定格那一刻色温变冷 */
const DocLook: React.FC<{ children: React.ReactNode; amount?: number; cold?: number; f: number; color?: React.ReactNode }> = ({ children, amount = 1, cold = 0, f, color }) => {
  const a = amount;
  // 棕褐色矩阵与原色按 a 插值
  const m = [
    lerp(1, 0.393, a), lerp(0, 0.769, a), lerp(0, 0.189, a), 0, 0,
    lerp(0, 0.349, a), lerp(1, 0.686, a), lerp(0, 0.168, a), 0, 0,
    lerp(0, 0.272, a), lerp(0, 0.534, a), lerp(1, 0.131, a), 0, 0,
    0, 0, 0, 1, 0,
  ].join(' ');
  return (
    <g>
      <defs>
        <filter id="sepia">
          <feColorMatrix type="matrix" values={m} />
        </filter>
        <radialGradient id="doc-vig" cx="50%" cy="50%" r="70%">
          <stop offset="55%" stopColor="#1A1208" stopOpacity={0} />
          <stop offset="100%" stopColor="#1A1208" stopOpacity={0.7 * a} />
        </radialGradient>
      </defs>
      <g filter={a > 0.01 ? 'url(#sepia)' : undefined}>{children}</g>
      <rect width={1920} height={1080} fill="#5B7BA8" opacity={cold * 0.22} />
      {/* 情绪（红泡泡）不去色：老纪录片里唯一的彩色 */}
      {color}
      <rect width={1920} height={1080} fill="url(#doc-vig)" />
      {a > 0.01 ? (
        <path
          d="M -20 -20 H 1940 V 1100 H -20 Z M 90 40 Q 40 40 40 90 V 990 Q 40 1040 90 1040 H 1830 Q 1880 1040 1880 990 V 90 Q 1880 40 1830 40 Z"
          fill="#120C06"
          fillRule="evenodd"
          opacity={0.85 * a}
        />
      ) : null}
      {a > 0.01 ? (
        <text x={1720} y={1010} fontFamily={FONT_SANS} fontWeight={500} fontSize={26} fill="#F4E6C8" opacity={0.6 * a} letterSpacing="0.2em">
          示意
        </text>
      ) : null}
      {/* 极轻的胶片划痕，缓慢移动，不抖动 */}
      {a > 0.01 ? <rect x={300 + ((f * 7) % 1300)} y={40} width={1.5} height={1000} fill="#F4E6C8" opacity={0.08 * a} /> : null}
    </g>
  );
};

/** 侧脸：face=1 面向右，-1 面向左；smile 嘴角；flat 表情被抹平 */
const ProfileHead: React.FC<{
  x: number;
  y: number;
  r: number;
  face: number;
  smile: number;
  hair: string;
  bun?: boolean;
  worry?: number;
  nod?: number;
}> = ({ x, y, r, face, smile, hair, bun, worry = 0, nod = 0 }) => {
  const k = r / 60;
  const show = Math.abs(face) > 0.25;
  return (
    <g transform={`translate(${x} ${y}) rotate(${nod}) scale(${face * k} ${k})`}>
      {bun ? <circle cx={-56} cy={-34} r={26} fill={hair} /> : null}
      <circle r={60} fill={C.skin} />
      <path d="M -60 6 C -66 -60 -10 -76 30 -58 C 10 -44 -10 -30 -16 0 C -30 10 -46 20 -60 6 Z" fill={hair} />
      {show ? (
        <g>
          <ellipse cx={30} cy={-8} rx={5} ry={6} fill={C.ink} />
          <path d={`M 18 ${-22 - worry * 4} L 40 ${-24 + worry * 6}`} stroke={C.ink} strokeWidth={3} strokeLinecap="round" />
          <path d="M 58 -6 Q 68 6 58 12" fill={C.skin} stroke={C.skinShade} strokeWidth={2} />
          <path d={`M 30 ${28 - smile * 2} Q 42 ${28 + smile * 8} 50 ${24 - smile * 4}`} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" />
          <ellipse cx={22} cy={14} rx={8} ry={5} fill="#F28C8C" opacity={0.3 * Math.max(0, smile)} />
        </g>
      ) : null}
    </g>
  );
};

const MOM_FACE = { x: -290, y: -230 };
const BABY_FACE = { x: 300, y: -70 };

const labCam = (f: number): Cam => {
  let c: Cam = { x: 0, y: lerp(-60, -100, prog(f, B5.lab, B5.play)), zoom: lerp(1.3, 1.05, prog(f, B5.lab, B5.play, ease.inOut)) };
  const st = prog(f, B5.still - 2, B5.still + 12, ease.inOut);
  c = { x: lerp(c.x, MOM_FACE.x + 40, st), y: lerp(c.y, MOM_FACE.y + 20, st), zoom: lerp(c.zoom, 2.2, st) };
  const back = prog(f, B5.tries - 6, B5.tries + 14, ease.inOut);
  c = { x: lerp(c.x, 0, back), y: lerp(c.y, -110, back), zoom: lerp(c.zoom, 1.15, back) };
  // 宝宝一次次逗妈妈：镜头在两人之间缓慢横移推近，画面不停
  const drift = prog(f, B5.tries + 14, B5.turn, ease.inOut);
  c = { x: c.x + drift * 120, y: c.y + drift * 20, zoom: c.zoom + drift * 0.3 };
  const tb = prog(f, B5.turn - 4, B5.turn + 30, ease.inOut);
  return { x: lerp(c.x, BABY_FACE.x - 20, tb), y: lerp(c.y, BABY_FACE.y + 10, tb), zoom: lerp(c.zoom, 2.4, tb) };
};

const LabShot: React.FC<{ f: number }> = ({ f }) => {
  const cam = labCam(f);
  const tStill = Math.min(f, B5.still);
  const stillT = prog(f, B5.still, B5.still + 6, ease.inOut);
  const momSmile = lerp(0.9, 0, stillT);
  const nod = f < B5.still ? Math.sin(f * 0.18) * 5 : 0;
  const babyMood = lerp(lerp(0.8, 0, prog(f, B5.tries + 10, B5.tries + 50)), -0.8, prog(f, B5.tries + 50, B5.turn + 10));
  const turn = prog(f, B5.turn + 4, B5.turn + 44, ease.inOut);
  const wave = f < B5.turn ? Math.sin(f * (f > B5.tries ? 0.6 : 0.3)) * (f > B5.tries ? 1.6 : 1) : 0;
  const sec = f / 30;
  // 来回传递的小红泡泡（玩耍阶段），定格后停在半空
  const playBubbles = [0, 1, 2].map((k) => {
    const t = ((tStill - B5.lab + k * 26) % 78) / 78;
    const dir = Math.floor((tStill - B5.lab + k * 26) / 78) % 2;
    const a = dir ? { x: BABY_FACE.x - 70, y: BABY_FACE.y } : { x: MOM_FACE.x + 70, y: MOM_FACE.y + 10 };
    const b = dir ? { x: MOM_FACE.x + 70, y: MOM_FACE.y + 10 } : { x: BABY_FACE.x - 70, y: BABY_FACE.y };
    return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) - Math.sin(t * Math.PI) * 120 };
  });
  const showPlay = f >= B5.play - 20 && f < B5.tries + 10;
  // 宝宝一次次逗妈妈：泡泡飞到妈妈脸上就破掉
  const tries = Array.from({ length: 7 }, (_, k) => B5.tries + 4 + k * 11);
  return (
    <Stage>
      <DocLook
        f={f}
        cold={stillT * (1 - prog(f, B5.turn + 30, B5.corridor))}
        color={
          <g transform={camT(cam, 1)}>
          {showPlay
            ? playBubbles.map((b, k) => <EmotionBall key={k} uid={`lab-b${k}`} x={b.x} y={b.y} r={14} glow={0.6} />)
            : null}
          {tries.map((t, k) => {
            if (f < t || f > t + 30) return null;
            const p = prog(f, t, t + 16, ease.in);
            const pop = prog(f, t + 16, t + 26);
            const x = lerp(BABY_FACE.x - 70, MOM_FACE.x + 60, p);
            const y = lerp(BABY_FACE.y, MOM_FACE.y + (k % 3) * 14 - 10, p) - Math.sin(p * Math.PI) * 90;
            return pop <= 0 ? (
              <EmotionBall key={k} uid={`try-${k}`} x={x} y={y} r={14} glow={0.6} />
            ) : (
              <circle key={k} cx={x} cy={y} r={14 + pop * 26} fill="none" stroke="#FC593F" strokeWidth={3} opacity={(1 - pop) * 0.8} />
            );
          })}
          {/* 转开时抱住最后一颗 */}
          {f >= B5.turn ? <EmotionBall uid="lab-last" x={lerp(BABY_FACE.x - 70, 350, turn)} y={lerp(BABY_FACE.y, 40, turn)} r={14} glow={0.5} /> : null}
          </g>
        }
      >
        <rect width={1920} height={1080} fill="#E9DFC9" />
        <g transform={camT(cam, 0.75)}>
          <rect x={-2000} y={-1400} width={4000} height={1700} fill="#E6DAC0" />
          <rect x={-2000} y={180} width={4000} height={14} fill="#CDBE9C" />
          {/* 挂钟：秒针一直在走 */}
          <g transform="translate(0 -440)">
            <circle r={66} fill="#F6F0E2" stroke="#8C7A5A" strokeWidth={8} />
            <rect x={-2} y={-54} width={4} height={60} fill="#5A4A36" transform={`rotate(${sec * 6})`} />
            <rect x={-3} y={-34} width={6} height={40} fill="#5A4A36" transform="rotate(130)" />
          </g>
          <path d="M 700 -700 C 680 -400 720 -100 700 200 L 900 200 L 900 -700 Z" fill="#D6C7A6" />
        </g>
        <g transform={camT(cam, 1)}>
          <rect x={-2000} y={260} width={4000} height={1000} fill="#CBBE9F" />
          {/* 妈妈：侧坐，暖黄开衫 */}
          <rect x={-470} y={-40} width={40} height={300} rx={10} fill="#9C7E5A" />
          <rect x={-470} y={60} width={220} height={30} rx={10} fill="#9C7E5A" />
          <path d="M -400 60 C -420 -40 -400 -150 -330 -160 C -260 -160 -240 -60 -250 60 Z" fill="#E0B85A" />
          <path d="M -320 60 L -170 60 L -170 250" stroke="#6B5A48" strokeWidth={34} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M -290 -100 Q -230 -20 -170 30" stroke="#E0B85A" strokeWidth={26} fill="none" strokeLinecap="round" />
          <circle cx={-168} cy={34} r={14} fill={C.skin} />
          <ProfileHead x={MOM_FACE.x} y={MOM_FACE.y} r={64} face={1} smile={momSmile} hair="#5A3E2B" bun nod={nod} />
          {/* 宝宝：婴儿座椅上，面向妈妈 */}
          <rect x={160} y={140} width={300} height={120} rx={14} fill="#B9A27E" />
          <path d="M 200 140 L 460 140 L 420 -40 L 260 -20 Z" fill="#8FA5B8" />
          <ellipse cx={330} cy={60} rx={70} ry={86} fill="#F4E6C8" />
          {[-1, 1].map((sd) => (
            <path
              key={sd}
              d={`M ${300} ${30} q ${-40} ${-10 + sd * 10} ${-60} ${-30 + wave * 20 * sd}`}
              stroke="#F4E6C8"
              strokeWidth={18}
              fill="none"
              strokeLinecap="round"
            />
          ))}
          <ProfileHead x={BABY_FACE.x} y={BABY_FACE.y} r={56} face={lerp(-1, 1, turn)} smile={babyMood} hair="#8A6A4A" worry={Math.max(0, -babyMood)} />
        </g>
        {/* 前景：老式摄影机剪影 */}
        <g transform={camT(cam, 1.4)} opacity={0.9}>
          <g transform="translate(-860 220)">
            <rect x={-130} y={-120} width={200} height={120} rx={16} fill="#2A2016" />
            <circle cx={-90} cy={-170} r={56} fill="#2A2016" />
            <circle cx={10} cy={-170} r={56} fill="#2A2016" />
            <rect x={70} y={-90} width={90} height={60} fill="#2A2016" />
            <path d="M -40 0 L -140 400 M -40 0 L 60 400 M -40 0 L -40 400" stroke="#2A2016" strokeWidth={14} />
          </g>
        </g>
      </DocLook>
    </Stage>
  );
};

// ───────────────────────── 童年：长走廊 ─────────────────────────

const CorridorShot: React.FC<{ f: number }> = ({ f }) => {
  const VP = { x: 960, y: 470 };
  // 反向推拉：走廊越拉越长
  const k = lerp(0.24, 0.07, prog(f, B5.corridor, B5.pocket, ease.inOut));
  const far = { w: 1920 * k, h: 1080 * k };
  const fr = { x0: VP.x - far.w / 2, x1: VP.x + far.w / 2, y0: VP.y - far.h / 2, y1: VP.y + far.h / 2 };
  const at = (d: number) => ({
    x0: lerp(0, fr.x0, d),
    x1: lerp(1920, fr.x1, d),
    y0: lerp(0, fr.y0, d),
    y1: lerp(1080, fr.y1, d),
  });
  const childD = 0.42;
  const cpos = at(childD);
  const cScale = lerp(3.2, 3.2 * k, childD) * 0.62;
  const match = prog(f, B5.corridor, B5.corridor + 26, ease.out);
  const childHip = { x: VP.x, y: cpos.y1 - 75 * cScale };
  const zoom = lerp(2.8, 1, match);
  const icons = ['hat', 'bag', 'cert', 'hat2'];
  const iconIdx = Math.min(3, Math.floor(clamp((f - B5.childhood) / 14, 0, 3)));
  const tv = 0.6 + 0.2 * Math.sin(f * 0.21) + 0.1 * Math.sin(f * 0.53);
  return (
    <Stage>
      <DocLook f={f}>
        <g transform={`translate(${childHip.x} ${childHip.y - 60 * cScale}) scale(${zoom}) translate(${-childHip.x} ${-(childHip.y - 60 * cScale)})`}>
          <rect width={1920} height={1080} fill="#D9CDB4" />
          {/* 天花板、地板、两侧墙 */}
          <polygon points={`0,0 1920,0 ${fr.x1},${fr.y0} ${fr.x0},${fr.y0}`} fill="#EDE3CE" />
          <polygon points={`0,1080 1920,1080 ${fr.x1},${fr.y1} ${fr.x0},${fr.y1}`} fill="#B9A783" />
          <polygon points={`0,0 ${fr.x0},${fr.y0} ${fr.x0},${fr.y1} 0,1080`} fill="#D4C5A6" />
          <polygon points={`1920,0 ${fr.x1},${fr.y0} ${fr.x1},${fr.y1} 1920,1080`} fill="#CDBD9C" />
          {/* 两侧一扇扇关着的门 */}
          {[0.12, 0.3, 0.5, 0.68, 0.84].map((d, i) => {
            const a = at(d);
            const b = at(d + 0.07);
            const top = (q: typeof a) => lerp(q.y0, q.y1, 0.3);
            return (
              <g key={i}>
                <polygon points={`${a.x0},${top(a)} ${b.x0},${top(b)} ${b.x0},${b.y1} ${a.x0},${a.y1}`} fill="#A8946C" />
                <polygon points={`${a.x1},${top(a)} ${b.x1},${top(b)} ${b.x1},${b.y1} ${a.x1},${a.y1}`} fill="#A08B63" />
              </g>
            );
          })}
          {/* 尽头半开的门：电视光和大人的背影 */}
          <rect x={fr.x0} y={fr.y0} width={far.w} height={far.h} fill="#C9B994" />
          <rect x={VP.x - far.w * 0.18} y={fr.y0 + far.h * 0.3} width={far.w * 0.36} height={far.h * 0.7} fill="#3A3A4A" />
          <rect x={VP.x - far.w * 0.14} y={fr.y0 + far.h * 0.34} width={far.w * 0.28} height={far.h * 0.66} fill="#9FB6D6" opacity={tv} />
          <circle cx={VP.x + far.w * 0.02} cy={fr.y0 + far.h * 0.62} r={far.h * 0.07} fill="#2A2A36" />
          <rect x={VP.x - far.w * 0.05} y={fr.y0 + far.h * 0.68} width={far.w * 0.14} height={far.h * 0.32} rx={far.w * 0.04} fill="#2A2A36" />
          {/* 墙上的相框：生日帽 → 书包 → 奖状，时间在走 */}
          {(() => {
            const a = at(childD - 0.08);
            const s = (a.x1 - a.x0) / 1920;
            const cx = lerp(a.x0, cpos.x0, 0.5);
            const cy = lerp(a.y0, a.y1, 0.36);
            const icon = icons[iconIdx];
            return (
              <g transform={`translate(${cx} ${cy}) scale(${s * 2.2})`}>
                <rect x={-60} y={-70} width={120} height={140} rx={6} fill="#F4ECDA" stroke="#8C7A5A" strokeWidth={8} />
                {icon === 'hat' || icon === 'hat2' ? (
                  <g>
                    <path d="M -30 40 L 0 -40 L 30 40 Z" fill="#FC593F" />
                    <circle cx={0} cy={-44} r={8} fill="#F6C177" />
                  </g>
                ) : icon === 'bag' ? (
                  <g>
                    <rect x={-34} y={-20} width={68} height={70} rx={14} fill="#5D7396" />
                    <path d="M -18 -20 Q 0 -54 18 -20" stroke="#5D7396" strokeWidth={8} fill="none" />
                  </g>
                ) : (
                  <g>
                    <rect x={-40} y={-40} width={80} height={60} fill="#FFFFFF" stroke="#C9A46A" strokeWidth={4} />
                    <circle cx={0} cy={36} r={12} fill="#FC593F" />
                  </g>
                )}
              </g>
            );
          })()}
          {/* 小小蓝：一个人坐在走廊地上，抱着红球 */}
          <Person x={childHip.x} y={childHip.y} scale={cScale} who="blue" legs="sit" armL={{ up: -16, bend: 40 }} armR={{ up: -16, bend: 40 }} look={{ x: 0, y: 0.6 }} mouth={-0.5} brows={0.6} breath={f} />
          <EmotionBall uid="child-ball" x={childHip.x} y={childHip.y - 30 * cScale} r={13 * cScale} glow={0.6} dim={0.2} />
        </g>
      </DocLook>
    </Stage>
  );
};

// ───────────────────────── 口袋：红球被按进去，冷成蓝色 ─────────────────────────

const PocketShot: React.FC<{ f: number }> = ({ f }) => {
  const S = 6.2;
  const hip = { x: 960, y: 540 + 21 * S - 20 };
  const press = prog(f, B5.pocket + 4, B5.pocket + 34, ease.inOut);
  const cool = prog(f, B5.pocket + 20, B5.pocket + 56, ease.inOut);
  const zip = prog(f, B5.pocket + 50, B5.pocket + 72, ease.inOut);
  const sepia = 1 - prog(f, B5.pocket + 40, B5.adult, ease.inOut);
  const pocketY = hip.y - 21 * S;
  const ballY = lerp(pocketY - 160, pocketY + 6, press);
  const drift = prog(f, B5.pocket, B5.adult) * 30;
  return (
    <Stage>
      <DocLook
        f={f}
        amount={sepia}
        color={<g transform={`translate(0 ${-drift})`}>
          <defs>
            <clipPath id="into-pocket">
              <rect x={hip.x - 130} y={pocketY - 600} width={260} height={600 + 30 * S * press} />
            </clipPath>
          </defs>
          <g clipPath={press > 0.85 ? 'url(#into-pocket)' : undefined}>
            <EmotionBall uid="press-ball" x={hip.x} y={ballY} r={80} glow={0.7} cool={cool} />
          </g>
        </g>}
      >
        <rect width={1920} height={1080} fill="#2A2E40" />
        <g transform={`translate(0 ${-drift})`}>
          <Person x={hip.x} y={hip.y} scale={S} who="blue" armL={{ up: lerp(-30, -38, press), bend: lerp(70, 50, press) }} armR={{ up: lerp(-30, -38, press), bend: lerp(70, 50, press) }} mouth={-0.6} brows={0.8} look={{ x: 0, y: 0.8 }} breath={f} />
          {/* 拉链：从左拉到右 */}
          {zip > 0 ? (
            <g>
              <line x1={hip.x - 120} y1={pocketY - 60} x2={hip.x - 120 + 240 * zip} y2={pocketY - 60} stroke="#3A4256" strokeWidth={10} strokeDasharray="8 6" />
              <rect x={hip.x - 130 + 240 * zip} y={pocketY - 74} width={22} height={34} rx={6} fill="#C9D3E2" />
            </g>
          ) : null}
        </g>
      </DocLook>
    </Stage>
  );
};

// ───────────────────────── 长大后：缩进壳里 ─────────────────────────

const AdultShot: React.FC<{ f: number }> = ({ f }) => {
  const blue = { x: 320, y: 300 - 51 * 2.2, scale: 2.2 };
  const pocketY = blue.y - 21 * blue.scale;
  const back = prog(f, B5.shell - 10, B5.shell + 2, ease.inOut);
  const bx = blue.x + back * 70;
  const shell = prog(f, B5.shell, B5.shell + 26, ease.inOut);
  const inside = prog(f, B5.inside - 4, B5.inside + 14, ease.inOut);
  const walk = prog(f, B5.adult + 6, B5.shell - 6, ease.inOut);
  const ox = lerp(-620, -160, walk);
  let cam: Cam = { x: lerp(blue.x, 40, prog(f, B5.adult, B5.adult + 30, ease.inOut)), y: lerp(pocketY - 20, -80, prog(f, B5.adult, B5.adult + 30, ease.inOut)), zoom: lerp(3.6, 1.15, prog(f, B5.adult, B5.adult + 30, ease.inOut)) };
  cam = { x: lerp(cam.x, bx, inside), y: lerp(cam.y, pocketY - 40, inside), zoom: lerp(cam.zoom, 2.6, inside) + prog(f, B5.inside + 14, B5.threads, ease.linear) * 0.25 };
  const shellCy = blue.y - 50 * blue.scale;
  return (
    <Stage>
      <defs>
        <radialGradient id="shell-in">
          <stop offset="0%" stopColor="#2B3550" />
          <stop offset="100%" stopColor="#0E111C" />
        </radialGradient>
      </defs>
      <rect width={1920} height={1080} fill={C.nightWallDeep} />
      <g transform={camT(cam, 1)}>
        <rect x={-2400} y={-1400} width={4800} height={1800} fill={C.nightWall} />
        <rect x={-860} y={-460} width={600} height={380} rx={8} fill="#18204A" />
        <path d="M -860 -460 H -260 V -80 H -860 Z M -560 -460 V -80" stroke="#2E3560" strokeWidth={12} fill="none" />
        <circle cx={-1000} cy={-120} r={380} fill={C.lamp} opacity={0.12} />
        <rect x={-2400} y={300} width={4800} height={1200} fill={C.nightFloor} />
        <Person
          x={ox}
          y={300 - 51 * 2.2}
          scale={2.2}
          who="orange"
          legs={walk > 0 && walk < 1 ? 'walk' : 'stand'}
          walkPhase={f * 0.5}
          armL={{ up: -40, bend: 60 }}
          armR={{ up: -40, bend: 60 }}
          look={{ x: 0.8, y: 0 }}
          mouth={lerp(0.4, -0.2, shell)}
          brows={shell * 0.6}
          breath={f}
        />
        <EmotionBall uid="adult-red" x={ox + 4} y={300 - 51 * 2.2 - 60 * 2.2} r={28} glow={0.8} dim={0.15} />
        {/* 小蓝：后退半步、拉起兜帽 → 兜帽变成一个壳 */}
        <Person {...blue} x={bx} who="blue" armL={{ up: lerp(8, 150, back * (1 - shell)), bend: 20 }} armR={{ up: lerp(8, 150, back * (1 - shell)), bend: 20 }} look={{ x: -0.6, y: 0.2 }} mouth={-0.2} brows={0.6} breath={f} opacity={1 - inside} />
        {shell > 0 ? (
          <g transform={`translate(${bx} ${shellCy})`} opacity={1 - inside * 0.85}>
            <g transform={`scale(${shell} ${lerp(0.3, 1, shell)})`}>
              <path d="M -150 230 C -170 -40 -110 -220 0 -230 C 110 -220 170 -40 150 230 Z" fill="#5D7396" />
              {[0, 1, 2, 3].map((i) => (
                <path key={i} d={`M ${-150 + i * 8} ${200 - i * 100} Q 0 ${150 - i * 110} ${150 - i * 8} ${200 - i * 100}`} stroke="#4A5F80" strokeWidth={8} fill="none" />
              ))}
              <ellipse cx={-50} cy={-120} rx={26} ry={60} fill="#7C93B5" opacity={0.5} transform="rotate(20 -50 -120)" />
            </g>
          </g>
        ) : null}
        {/* 壳里：不是冷漠，是害怕 */}
        {inside > 0 ? (
          <g opacity={inside}>
            <ellipse cx={bx} cy={shellCy} rx={160} ry={240} fill="url(#shell-in)" />
            <Person x={bx} y={blue.y + 40} scale={1.9} who="blue" legs="sit" armL={{ up: -26, bend: 100 }} armR={{ up: -26, bend: 100 }} look={{ x: 0, y: 0.7 }} mouth={-0.3} brows={1} breath={f} />
            <PocketHeart x={bx} y={blue.y + 40 - 21 * 1.9} f={f} glow={0.6} r={18} />
          </g>
        ) : null}
      </g>
    </Stage>
  );
};

// ───────────────────────── 一股线：童年只是其中之一 ─────────────────────────

const ThreadsShot: React.FC<{ f: number }> = ({ f }) => {
  const cam: Cam = {
    x: lerp(-40, 120, prog(f, B5.threads, B5.toS6, ease.inOut)),
    y: -40,
    zoom: lerp(0.95, 1.05, prog(f, B5.threads, B5.toS6)),
  };
  const out = prog(f, B5.toS6 - 6, B5.toS6 + 20, ease.in);
  const c2: Cam = { x: lerp(cam.x, 1080, ease.out(prog(f, B5.toS6 - 16, B5.toS6 + 4))), y: lerp(cam.y, 0, out), zoom: cam.zoom * Math.pow(8, out) };
  const grow = (a: number, b: number) => 1 - prog(f, a, b, ease.inOut);
  const mainPath = 'M -720 120 C -500 60 -380 20 -200 0 C -40 -16 60 30 200 0 C 340 -30 420 -10 520 -20';
  const strands = [
    { d: 'M -760 -380 C -560 -300 -380 -120 -200 0', col: '#5D7396', from: B5.threads + 12, icon: 'book', at: { x: -800, y: -400 } },
    { d: 'M -560 380 C -420 260 -320 80 -200 0', col: '#C9A46A', from: B5.threads + 18, icon: 'crowd', at: { x: -600, y: 420 } },
    { d: 'M -140 -420 C -160 -260 -200 -120 -200 0', col: '#6E9F7C', from: B5.threads + 24, icon: 'bolt', at: { x: -140, y: -460 } },
  ];
  const knot = prog(f, B5.knot, B5.knot + 20, ease.inOut);
  const future = prog(f, B5.knot + 24, B5.toS6, ease.inOut);
  return (
    <Stage>
      <rect width={1920} height={1080} fill="#D3C6AE" />
      <g transform={camT(c2, 1)}>
        <rect x={-3000} y={-2000} width={6000} height={4000} fill="#D8CCB5" />
        {Array.from({ length: 40 }).map((_, i) => (
          <circle key={i} cx={-1400 + rand(i) * 2800} cy={-800 + rand(i + 9) * 1600} r={2 + rand(i + 3) * 3} fill="#BFB196" opacity={0.6} />
        ))}
        {/* 童年的小小蓝 → 成年的小蓝 */}
        <Person x={-760} y={160} scale={1.2} who="blue" legs="sit" mouth={-0.3} look={{ x: 0.6, y: 0 }} breath={f} />
        <Person x={560} y={60 - 30} scale={1.6} who="blue" armL={{ up: 8, bend: 4 }} armR={{ up: 40, bend: 10 }} mouth={0} look={{ x: -0.5, y: 0 }} breath={f} />
        {strands.map((s, i) => (
          <g key={i}>
            <path d={s.d} stroke={s.col} strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray={1200} strokeDashoffset={1200 * grow(s.from, s.from + 24)} />
            <g transform={`translate(${s.at.x} ${s.at.y}) scale(${prog(f, s.from - 6, s.from + 4, ease.outBack)})`}>
              <circle r={40} fill="#EFE6D4" stroke={s.col} strokeWidth={5} />
              {s.icon === 'book' ? (
                <path d="M -20 -14 L 0 -8 L 20 -14 L 20 16 L 0 22 L -20 16 Z M 0 -8 L 0 22" fill="none" stroke={s.col} strokeWidth={4} />
              ) : s.icon === 'crowd' ? (
                <g fill={s.col}>
                  <circle cx={-14} cy={-6} r={8} />
                  <circle cx={14} cy={-6} r={8} />
                  <rect x={-24} y={4} width={20} height={16} rx={6} />
                  <rect x={4} y={4} width={20} height={16} rx={6} />
                </g>
              ) : (
                <path d="M 6 -22 L -12 4 L 2 4 L -6 24 L 14 -4 L 0 -4 Z" fill={s.col} />
              )}
            </g>
          </g>
        ))}
        <path d={mainPath} stroke={C.accent} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray={1600} strokeDashoffset={1600 * grow(B5.threads, B5.threads + 30)} />
        {/* 拧在一起的几股 */}
        {[0, 1, 2].map((k) => (
          <path
            key={k}
            d={Array.from({ length: 30 }, (_, i) => {
              const x = -200 + i * 24;
              const y = (i < 10 ? -i * 1.6 : i < 20 ? -16 + (i - 10) * 3 : 14 - (i - 20) * 3.4) + Math.sin(i * 0.9 + k * 2.1) * 10;
              return `${i ? 'L' : 'M'} ${x} ${y}`;
            }).join(' ')}
            stroke={['#5D7396', '#C9A46A', '#6E9F7C'][k]}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            opacity={prog(f, B5.threads + 40, B5.threads + 56)}
          />
        ))}
        {/* 一个结：留下痕迹 */}
        {knot > 0 ? (
          <g transform="translate(40 8)" opacity={knot}>
            <path d="M -30 0 C -30 -40 30 -40 30 0 C 30 40 -30 40 -30 0" stroke={C.accent} strokeWidth={9} fill="none" strokeDasharray={260} strokeDashoffset={260 * (1 - knot)} />
          </g>
        ) : null}
        {/* 线继续往前，伸进一片空白 */}
        <path d="M 520 -20 C 700 -40 860 10 1100 0" stroke={C.accent} strokeWidth={10} fill="none" strokeLinecap="round" strokeDasharray="22 18" strokeDashoffset={-f * 1.5} opacity={future} />
      </g>
      <BrightSceneShade strength={0.8} />
    </Stage>
  );
};

