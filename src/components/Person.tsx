import React from 'react';
import { PALETTE } from '../theme';
import { COOL, WARM } from '../data/script';
import { lerp, mix } from '../lib/anim';

/**
 * 关节角度（度）。四肢 0° = 竖直向下；正值 = 往身后摆（面朝右时朝左）。
 * 躯干正值 = 前倾；脖子负值 = 抬头。
 */
export type Pose = {
  torso: number;
  neck: number;
  shL: number;
  elL: number;
  shR: number;
  elR: number;
  hipL: number;
  knL: number;
  hipR: number;
  knR: number;
  /** 身体整体上下起伏（像素） */
  bob: number;
};

const KEYS: (keyof Pose)[] = ['torso', 'neck', 'shL', 'elL', 'shR', 'elR', 'hipL', 'knL', 'hipR', 'knR', 'bob'];

export const lerpPose = (a: Pose, b: Pose, t: number): Pose =>
  Object.fromEntries(KEYS.map((k) => [k, lerp(a[k], b[k], t)])) as Pose;

export const POSES: Record<'stand' | 'push' | 'shoulder' | 'lookUp' | 'flinch' | 'release', Pose> = {
  stand: { torso: 0, neck: 0, shL: 5, elL: -6, shR: -4, elR: -8, hipL: 0, knL: 0, hipR: 0, knR: 0, bob: 0 },
  flinch: { torso: -6, neck: 6, shL: -30, elL: -70, shR: 10, elR: -20, hipL: 4, knL: 6, hipR: -6, knR: 4, bob: 2 },
  push: { torso: 24, neck: -10, shL: -78, elL: -14, shR: -84, elR: -8, hipL: -22, knL: 24, hipR: 26, knR: 6, bob: 6 },
  shoulder: { torso: 34, neck: -6, shL: -20, elL: -100, shR: -40, elR: -90, hipL: -26, knL: 30, hipR: 30, knR: 4, bob: 10 },
  lookUp: { torso: -3, neck: -24, shL: 6, elL: -4, shR: -6, elR: -6, hipL: 0, knL: 0, hipR: 0, knR: 0, bob: -2 },
  release: { torso: -8, neck: -4, shL: -30, elL: -30, shR: -36, elR: -26, hipL: 10, knL: 8, hipR: -6, knR: 2, bob: 0 },
};

/** 走路循环；phase 以弧度计，每 2π 走两步。 */
export const walkPose = (phase: number, stride = 1): Pose => {
  const s = Math.sin(phase);
  const c = Math.cos(phase);
  return {
    torso: 4 * stride,
    neck: -2,
    shL: 22 * s * stride,
    elL: -12 - 10 * Math.max(0, -s) * stride,
    shR: -22 * s * stride,
    elR: -12 - 10 * Math.max(0, s) * stride,
    hipL: -26 * s * stride,
    knL: (8 + 30 * Math.max(0, c)) * stride,
    hipR: 26 * s * stride,
    knR: (8 + 30 * Math.max(0, -c)) * stride,
    bob: -5 * Math.abs(c) * stride,
  };
};

const L = { thigh: 70, shin: 68, torso: 112, neck: 12, head: 31, upper: 58, fore: 54, limbW: 30, torsoW: 78 };

export type PersonProps = {
  x: number;
  y: number; // 脚底
  scale?: number;
  /** 1 = 面朝右，-1 = 面朝左 */
  facing?: 1 | -1;
  /** 转身进度 0..1：0.5 时侧身最窄，过半后朝向翻转 */
  turn?: number;
  pose: Pose;
  body?: string;
  rim?: string;
  /** 暖色裂纹（愤怒、受伤）0..1 */
  crack?: number;
  /** 冷色描边（冷静下来）0..1 */
  calm?: number;
  /** 呼吸 0..1（胸口起伏） */
  breath?: number;
  opacity?: number;
};

const Limb: React.FC<{ len: number; w: number; fill: string; stroke: string; children?: React.ReactNode; angle: number }> = ({ len, w, fill, stroke, angle, children }) => (
  <g transform={`rotate(${angle})`}>
    <rect x={-w / 2} y={-w / 2} width={w} height={len + w} rx={w / 2} fill={fill} stroke={stroke} strokeWidth={1.8} />
    <g transform={`translate(0 ${len})`}>{children}</g>
  </g>
);

const Cracks: React.FC<{ amount: number; pts: string[] }> = ({ amount, pts }) =>
  amount > 0.01 ? (
    <g opacity={Math.min(1, amount * 1.3)}>
      {pts.slice(0, Math.ceil(pts.length * amount)).map((p, i) => (
        <polyline key={i} points={p} fill="none" stroke={WARM} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </g>
  ) : null;

/** 扁平几何人形：圆头、圆角躯干、胶囊四肢，不画五官。 */
export const Person: React.FC<PersonProps> = ({
  x,
  y,
  scale = 1,
  facing = 1,
  turn = 0,
  pose,
  body = PALETTE.personBody,
  rim = PALETTE.personRim,
  crack = 0,
  calm = 0,
  breath = 0,
  opacity = 1,
}) => {
  const turnW = Math.cos(turn * Math.PI);
  const dir = (turn > 0.5 ? -facing : facing) * Math.max(0.42, Math.abs(turnW));
  const stroke = mix(mix(rim, WARM, crack * 0.6), COOL, calm);
  const far = mix(body, '#000000', 0.32);
  const hipY = -(L.thigh + L.shin) + pose.bob;
  const chest = 1 + breath * 0.05;

  const leg = (hip: number, kn: number, fill: string) => (
    <Limb len={L.thigh} w={L.limbW + 2} fill={fill} stroke={stroke} angle={hip}>
      <Limb len={L.shin} w={L.limbW} fill={fill} stroke={stroke} angle={kn}>
        <rect x={-12} y={-6} width={40} height={16} rx={8} fill={fill} stroke={stroke} strokeWidth={1.6} />
      </Limb>
    </Limb>
  );
  const arm = (sh: number, el: number, fill: string, cracks: boolean) => (
    <Limb len={L.upper} w={L.limbW - 2} fill={fill} stroke={stroke} angle={sh}>
      {cracks && <Cracks amount={crack} pts={['-4,-30 3,-18 -3,-8 4,4']} />}
      <Limb len={L.fore} w={L.limbW - 4} fill={fill} stroke={stroke} angle={el}>
        <circle cx={0} cy={4} r={13} fill={fill} stroke={stroke} strokeWidth={1.6} />
      </Limb>
    </Limb>
  );

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * dir} ${scale})`} opacity={opacity}>
      <ellipse cx={0} cy={4} rx={70} ry={12} fill="rgba(0,0,0,0.4)" />
      <g transform={`translate(0 ${hipY})`}>
        {/* 远侧肢体（暗一些，画在后面） */}
        {leg(pose.hipL, pose.knL, far)}
        <g transform={`rotate(${pose.torso})`}>
          <g transform={`translate(0 ${-L.torso + 8})`}>{arm(pose.shL, pose.elL, far, false)}</g>
        </g>
        {/* 躯干 + 头 */}
        <g transform={`rotate(${pose.torso})`}>
          <g transform={`scale(${chest} 1)`}>
            <rect x={-L.torsoW / 2} y={-L.torso - 6} width={L.torsoW} height={L.torso + 18} rx={32} fill={body} stroke={stroke} strokeWidth={2} />
            <rect x={-L.torsoW / 2 + 8} y={-L.torso + 4} width={10} height={L.torso - 26} rx={5} fill="rgba(255,255,255,0.06)" />
            <Cracks amount={crack} pts={['-10,-92 2,-74 -6,-60 8,-44', '14,-30 4,-18 12,-6', '-16,-40 -6,-30 -14,-16']} />
          </g>
          <g transform={`translate(0 ${-L.torso - 4}) rotate(${pose.neck})`}>
            <rect x={-10} y={-L.neck - 6} width={20} height={L.neck + 10} rx={8} fill={body} />
            <circle cx={3} cy={-L.neck - L.head + 2} r={L.head} fill={body} stroke={stroke} strokeWidth={2} />
            <path d={`M${3 + L.head * 0.35} ${-L.neck - L.head * 1.75} A${L.head} ${L.head} 0 0 1 ${3 + L.head} ${-L.neck - L.head + 6}`} fill="none" stroke={stroke} strokeWidth={3} opacity={0.7} />
          </g>
        </g>
        {/* 近侧肢体 */}
        {leg(pose.hipR, pose.knR, body)}
        <g transform={`rotate(${pose.torso})`}>
          <g transform={`translate(0 ${-L.torso + 8})`}>{arm(pose.shR, pose.elR, body, true)}</g>
        </g>
      </g>
    </g>
  );
};

/** 人物身高（scale=1 时，脚底到头顶）。 */
export const PERSON_HEIGHT = L.thigh + L.shin + L.torso + L.neck + L.head * 2;
