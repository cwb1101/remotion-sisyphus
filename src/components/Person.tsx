import React from 'react';
import { C } from '../theme';

/**
 * 扁平矢量小人（约 2.5 头身），SVG 绘制，可换动作和表情。
 * 局部坐标原点在胯部中心；头半径 34。
 *
 * 角色：
 * - orange：小橙（你）暖橙毛衣
 * - blue：小蓝（TA）灰蓝连帽衫
 * - shadow：冷暴力里的灰色剪影人
 */
export type Who = 'orange' | 'blue' | 'shadow';

/** 手臂：up = 向外抬起的角度（0 = 自然下垂，负数 = 收向身体中线）；bend = 肘部向内弯 */
export type Arm = { up: number; bend: number };

export type PersonProps = {
  x: number;
  y: number;
  scale?: number;
  who: Who;
  view?: 'front' | 'back';
  legs?: 'stand' | 'sit' | 'walk';
  walkPhase?: number;
  armL?: Arm;
  armR?: Arm;
  headTilt?: number;
  bodyTilt?: number;
  /** 视线偏移，-1..1 */
  look?: { x: number; y: number };
  /** 嘴角：-1 下撇 … 0 平 … 1 微笑 */
  mouth?: number;
  mouthOpen?: number;
  /** 眉头：0 平；>0 皱眉/委屈 */
  brows?: number;
  blink?: number;
  /** 线稿 + 半透明：人在心不在 */
  outline?: number;
  opacity?: number;
  /** 手机冷光照在脸上 */
  phoneGlow?: number;
  /** 呼吸起伏（帧），让静止的人物也有微动 */
  breath?: number;
  /** 画在手上的东西（局部坐标已经平移到手心） */
  holdR?: React.ReactNode;
  holdL?: React.ReactNode;
};

const L1 = 24;
const L2 = 22;
const SHOULDER_Y = -56;
const SHOULDER_X = 28;
const HEAD_Y = -98;
const HEAD_R = 34;

const d2r = (d: number) => (d * Math.PI) / 180;

/** 正向运动学：返回肩、肘、手的局部坐标。side: -1 画面左侧手臂，+1 右侧 */
export const armFK = (side: -1 | 1, arm: Arm) => {
  const s = { x: side * SHOULDER_X, y: SHOULDER_Y };
  const a1 = d2r(side * arm.up);
  const e = { x: s.x + Math.sin(a1) * L1, y: s.y + Math.cos(a1) * L1 };
  const a2 = d2r(side * (arm.up - arm.bend));
  const h = { x: e.x + Math.sin(a2) * L2, y: e.y + Math.cos(a2) * L2 };
  return { s, e, h };
};

/** 手在世界坐标里的位置（给场景挂物件用） */
export const handWorld = (p: Pick<PersonProps, 'x' | 'y' | 'scale'>, side: -1 | 1, arm: Arm) => {
  const { h } = armFK(side, arm);
  const k = p.scale ?? 1;
  return { x: p.x + h.x * k, y: p.y + h.y * k };
};

const PAL = {
  orange: { top: C.orange, topDark: C.orangeDark, hair: C.orangeHair, pants: C.orangePants, skin: C.skin },
  blue: { top: C.blue, topDark: C.blueDark, hair: C.blueHair, pants: C.bluePants, skin: C.skin },
  shadow: {
    top: C.shadowFigure,
    topDark: '#23252F',
    hair: '#1F212A',
    pants: '#23252F',
    skin: C.shadowFigure,
  },
};

export const Person: React.FC<PersonProps> = (props) => {
  const {
    x,
    y,
    scale = 1,
    who,
    view = 'front',
    legs = 'stand',
    walkPhase = 0,
    armL = { up: 6, bend: 4 },
    armR = { up: 6, bend: 4 },
    headTilt = 0,
    bodyTilt = 0,
    look = { x: 0, y: 0 },
    mouth = 0,
    mouthOpen = 0,
    brows = 0,
    blink = 0,
    outline = 0,
    opacity = 1,
    phoneGlow = 0,
    breath = 0,
    holdR,
    holdL,
  } = props;
  const pal = PAL[who];
  const isShadow = who === 'shadow';
  const showFace = view === 'front' && !isShadow;
  const bob = Math.sin(breath * 0.11) * 1.2;

  // 线稿模式：填充褪去、描边出现
  const fillOp = 1 - outline;
  const lineCol = '#CFE0FF';
  const sw = outline > 0 ? 2.2 : 0;
  const dash = undefined;
  const st = (fill: string) => ({
    fill,
    fillOpacity: fillOp,
    stroke: outline > 0 ? lineCol : 'none',
    strokeOpacity: outline,
    strokeWidth: sw,
    strokeDasharray: dash,
  });

  const arm = (side: -1 | 1, a: Arm, held?: React.ReactNode) => {
    const { s, e, h } = armFK(side, a);
    return (
      <g key={side}>
        <path
          d={`M ${s.x} ${s.y} L ${e.x} ${e.y} L ${h.x} ${h.y}`}
          stroke={outline > 0 ? lineCol : pal.top}
          strokeOpacity={outline > 0 ? outline * 0.9 : 1}
          strokeWidth={outline > 0 ? 2.6 : 15}
          strokeDasharray={dash}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {outline > 0 ? null : (
          <path
            d={`M ${s.x} ${s.y} L ${e.x} ${e.y} L ${h.x} ${h.y}`}
            stroke={pal.topDark}
            strokeOpacity={0.35}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            transform={`translate(${side * 3} 1)`}
          />
        )}
        <circle cx={h.x} cy={h.y} r={7.5} {...st(pal.skin)} />
        {held ? <g transform={`translate(${h.x} ${h.y})`}>{held}</g> : null}
      </g>
    );
  };

  const legPaths = () => {
    if (legs === 'sit') {
      // 正面坐姿：胯下一块"膝盖面"（大腿朝向镜头），膝盖两个圆，小腿垂到地面
      return (
        <g>
          {[-1, 1].map((sd) => (
            <g key={sd}>
              <path
                d={`M ${sd * 18} 24 L ${sd * 19} 66`}
                stroke={outline > 0 ? lineCol : pal.pants}
                strokeOpacity={outline > 0 ? outline : 1}
                strokeWidth={outline > 0 ? 2.6 : 16}
                strokeDasharray={dash}
                strokeLinecap="round"
              />
              <ellipse cx={sd * 21} cy={71} rx={12} ry={6} {...st('#20222E')} />
            </g>
          ))}
          <rect x={-35} y={-4} width={70} height={30} rx={13} {...st(pal.pants)} />
          {[-1, 1].map((sd) => (
            <circle key={sd} cx={sd * 18} cy={20} r={12} {...st(pal.pants)} />
          ))}
          {outline === 0 ? <rect x={-35} y={-4} width={70} height={8} rx={4} fill="#000" opacity={0.12} /> : null}
        </g>
      );
    }
    const swing = legs === 'walk' ? Math.sin(walkPhase) * 16 : 0;
    return (
      <g>
        {[-1, 1].map((sd) => {
          const a = d2r(sd === -1 ? swing : -swing);
          const fx = sd * 12 + Math.sin(a) * 46;
          const fy = Math.cos(a) * 46;
          return (
            <g key={sd}>
              <path
                d={`M ${sd * 12} 0 L ${fx} ${fy}`}
                stroke={outline > 0 ? lineCol : pal.pants}
                strokeOpacity={outline > 0 ? outline : 1}
                strokeWidth={outline > 0 ? 2.6 : 18}
                strokeDasharray={dash}
                strokeLinecap="round"
              />
              <ellipse cx={fx + sd * 2} cy={fy + 5} rx={12} ry={6} {...st('#20222E')} />
            </g>
          );
        })}
      </g>
    );
  };

  const hair = () => {
    if (view === 'back' || isShadow) {
      return <circle cx={0} cy={HEAD_Y} r={HEAD_R + 1} {...st(pal.hair)} />;
    }
    if (who === 'orange') {
      return (
        <path
          d={`M -37 ${HEAD_Y + 14} C -42 ${HEAD_Y - 30} -18 ${HEAD_Y - 42} 2 ${HEAD_Y - 40}
              C 26 ${HEAD_Y - 40} 44 ${HEAD_Y - 22} 37 ${HEAD_Y + 14}
              L 31 ${HEAD_Y + 12} C 32 ${HEAD_Y - 6} 26 ${HEAD_Y - 14} 16 ${HEAD_Y - 16}
              C 6 ${HEAD_Y - 8} -12 ${HEAD_Y - 10} -22 ${HEAD_Y - 16}
              C -30 ${HEAD_Y - 8} -31 ${HEAD_Y + 2} -31 ${HEAD_Y + 12} Z`}
          {...st(pal.hair)}
        />
      );
    }
    return (
      <path
        d={`M -35 ${HEAD_Y + 2} C -38 ${HEAD_Y - 32} -14 ${HEAD_Y - 40} 4 ${HEAD_Y - 38}
            C 28 ${HEAD_Y - 38} 40 ${HEAD_Y - 20} 35 ${HEAD_Y + 2}
            L 30 ${HEAD_Y - 6} L 22 ${HEAD_Y - 14} L 12 ${HEAD_Y - 9} L 2 ${HEAD_Y - 17}
            L -10 ${HEAD_Y - 10} L -22 ${HEAD_Y - 16} L -30 ${HEAD_Y - 6} Z`}
        {...st(pal.hair)}
      />
    );
  };

  const face = () => {
    if (!showFace) return null;
    const lx = look.x * 4;
    const ly = look.y * 3;
    const ey = HEAD_Y + 3 + ly;
    const eyeH = Math.max(0.12, 1 - blink);
    const my = HEAD_Y + 18 + ly * 0.6;
    const mc = mouth * 7;
    return (
      <g opacity={fillOp + outline * 0.6}>
        {[-1, 1].map((sd) => (
          <ellipse
            key={sd}
            cx={sd * 12 + lx}
            cy={ey}
            rx={3.9}
            ry={3.9 * eyeH}
            fill={outline > 0 ? lineCol : C.ink}
          />
        ))}
        {brows > 0.01
          ? [-1, 1].map((sd) => (
              <path
                key={sd}
                d={`M ${sd * 19 + lx} ${ey - 9 + brows * 1.5} L ${sd * 6 + lx} ${ey - 11 - brows * 3}`}
                stroke={outline > 0 ? lineCol : C.ink}
                strokeWidth={2.4}
                strokeLinecap="round"
                opacity={Math.min(1, brows * 1.5)}
              />
            ))
          : null}
        {mouthOpen > 0.05 ? (
          <ellipse cx={lx * 0.6} cy={my + 1} rx={5} ry={2 + mouthOpen * 4} fill="#7A3B3B" />
        ) : (
          <path
            d={`M ${-8 + lx * 0.6} ${my - mc * 0.3} Q ${lx * 0.6} ${my + mc} ${8 + lx * 0.6} ${my - mc * 0.3}`}
            stroke={outline > 0 ? lineCol : C.ink}
            strokeWidth={2.6}
            strokeLinecap="round"
            fill="none"
          />
        )}
        {who === 'orange' && outline === 0 ? (
          [-1, 1].map((sd) => <ellipse key={sd} cx={sd * 21 + lx} cy={ey + 10} rx={5.5} ry={3.5} fill="#F28C8C" opacity={0.35} />)
        ) : null}
      </g>
    );
  };

  const hoodie = who === 'blue';

  return (
    <g transform={`translate(${x} ${y + bob}) scale(${scale})`} opacity={opacity}>
      {/* 地面阴影 */}
      {outline < 0.5 ? (
        <ellipse cx={0} cy={legs === 'sit' ? 76 : 52} rx={44} ry={8} fill="#000" opacity={0.18 * (1 - outline)} />
      ) : null}
      {legPaths()}
      <g transform={`rotate(${bodyTilt} 0 0)`}>
        {view === 'back' ? [arm(-1, armL, holdL), arm(1, armR, holdR)] : null}
        {/* 躯干 */}
        <rect x={-32} y={-68} width={64} height={74} rx={24} {...st(pal.top)} />
        {outline === 0 && !isShadow ? (
          <rect x={-32} y={-24} width={64} height={30} rx={14} fill={pal.topDark} opacity={0.35} />
        ) : null}
        {hoodie && view === 'front' && outline === 0 ? (
          <g>
            <rect x={-20} y={-30} width={40} height={18} rx={8} fill={pal.topDark} opacity={0.75} />
            <path d="M -7 -66 L -9 -46 M 7 -66 L 9 -46" stroke="#E8EEF7" strokeWidth={2.4} strokeLinecap="round" />
          </g>
        ) : null}
        {/* 头 */}
        <g transform={`rotate(${headTilt} 0 ${HEAD_Y + 30})`}>
          {hoodie && !isShadow ? (
            <ellipse cx={0} cy={HEAD_Y + 30} rx={38} ry={14} {...st(pal.topDark)} />
          ) : null}
          <circle cx={0} cy={HEAD_Y} r={HEAD_R} {...st(pal.skin)} />
          {hair()}
          {face()}
          {phoneGlow > 0.01 && showFace ? (
            <circle cx={0} cy={HEAD_Y + 6} r={HEAD_R} fill="#A9CCFF" opacity={0.28 * phoneGlow} />
          ) : null}
        </g>
        {view === 'front' ? [arm(-1, armL, holdL), arm(1, armR, holdR)] : null}
      </g>
    </g>
  );
};
