// 可复用的骨骼人物：关节角度驱动，扁平插画为主风格（木刻 剪影为变奏材质）
// 头身比由 build 决定（成人 1:4 孩子 1:3 婴儿 1:2.2），线宽按头高等比，全片一致
import React from "react";
import { useCurrentFrame } from "remotion";
import { Vec } from "../lib/ik";
import { Face } from "../data/poses";
import { useTheme } from "../styles/ThemeContext";
import { Material, Theme } from "../styles/themes";
import { HATCH, RIM } from "../styles/Defs";
import { Build, PoseKey, Rig, RigInput, solveRig } from "./rig";
import { capsule, pt, rot, shade, smoothClosed, smoothOpen } from "./draw";
import { Gait, PoseName } from "../data/poses";

export type Costume = "nurse" | "baby" | "emperor" | "plain";
/** 识别特征：主角的朱红布（婴儿是襁褓 后面是围巾） */
export type Feature = "redSwaddle" | "redScarf" | null;

export type CharacterProps = {
  build: Build;
  costume: Costume;
  /** 头高（像素），即缩放 */
  h: number;
  x: number;
  y: number;
  track?: PoseKey[];
  /** 不给 track 时用的单个姿势 */
  pose?: PoseName;
  facing?: 1 | -1;
  face?: Partial<Face>;
  /** 主色（衣服） */
  color?: string;
  feature?: Feature;
  material?: Material;
  seed?: number;
  gait?: Gait;
  carriedBy?: Vec | null;
  breathe?: boolean;
  opacity?: number;
  /** 0–1，整体压暗（站在暗处） */
  dim?: number;
  /** 剪影时整个人用这一个颜色（比如投在地上的影子），同时不加轮廓光 */
  tint?: string;
  /** 外部已经解好的骨骼（需要和别的角色联动时） */
  rig?: Rig;
  /** 画在手上的东西（局部坐标在世界层里画） */
  children?: React.ReactNode;
  frameOverride?: number;
};

export const computeRig = (p: CharacterProps, frame: number): Rig => {
  const track = p.track ?? [{ at: 0, pose: p.pose ?? "stand", facing: p.facing ?? 1, face: p.face }];
  const input: RigInput = {
    build: p.build,
    h: p.h,
    x: p.x,
    y: p.y,
    track,
    frame,
    seed: p.seed,
    gait: p.gait,
    breathe: p.breathe,
    carriedBy: p.carriedBy,
  };
  return solveRig(input);
};

type Paint = { fill: string; stroke: string; sw: number; hatch?: boolean };

const paintFor = (th: Theme, mat: Material, fill: string, h: number, far = false, tint?: string): Paint => {
  if (tint) return { fill: tint, stroke: "none", sw: 0 };
  if (mat === "silhouette") return { fill: far ? shade(th.cloth.emperor, 0.8) : th.cloth.emperor, stroke: "none", sw: 0 };
  if (mat === "woodcut") return { fill, stroke: th.ink, sw: th.inkWidth * h, hatch: far };
  return { fill: far ? shade(fill, 0.78) : fill, stroke: th.ink, sw: th.inkWidth * h };
};

const P: React.FC<{ d: string; p: Paint; hatchAlways?: boolean }> = ({ d, p, hatchAlways }) => (
  <>
    <path d={d} fill={p.fill} stroke={p.stroke} strokeWidth={p.sw} strokeLinejoin="round" strokeLinecap="round" />
    {(p.hatch || hatchAlways) && p.sw > 0 ? <path d={d} fill={`url(#${HATCH})`} opacity={0.55} /> : null}
  </>
);

export const Character: React.FC<CharacterProps> = (props) => {
  const frame = useCurrentFrame();
  const th = useTheme();
  const rig = props.rig ?? computeRig(props, props.frameOverride ?? frame);
  const mat: Material = props.material ?? (props.costume === "emperor" && th.material === "flat" ? "silhouette" : th.material);
  return (
    <g opacity={props.opacity ?? 1} filter={mat !== "woodcut" && th.rim && !props.tint ? `url(#${RIM})` : undefined}>
      <Body rig={rig} th={th} mat={mat} costume={props.costume} color={props.color} feature={props.feature} tint={props.tint} />
      {props.dim ? <Body rig={rig} th={th} mat="silhouette" costume={props.costume} overlay={props.dim} /> : null}
      {props.children}
    </g>
  );
};

const Body: React.FC<{
  rig: Rig;
  th: Theme;
  mat: Material;
  costume: Costume;
  color?: string;
  feature?: Feature;
  overlay?: number;
  tint?: string;
}> = ({ rig, th, mat, costume, color, feature, overlay, tint }) => {
  const { s, B, h } = rig;
  const W = (p: Vec, part: "U" | "L" = "U") => rig.toWorld(p, part);
  const c = th.cloth;
  const mainColor = color ?? (costume === "nurse" ? c.nurse : costume === "emperor" ? c.emperor : costume === "baby" ? th.skin : "#7D6B5A");
  const skinP = (far = false) => paintFor(th, mat, th.skin, h, far, tint);
  const clothP = (fill: string, far = false) => paintFor(th, mat, fill, h, far, tint);
  const ov = overlay !== undefined;
  const opacity = ov ? overlay : 1;

  // —— 四肢 ——
  const arm = (side: "L" | "R", sleeve: string | null) => {
    const far = side === "R";
    const sh = W(side === "L" ? s.shL : s.shR);
    const el = W(side === "L" ? s.elL : s.elR);
    const wr = W(side === "L" ? s.wrL : s.wrR);
    const hd = W(side === "L" ? s.handL : s.handR);
    const [r0, r1, r2] = B.rArm.map((r) => r * h);
    const sleeveP = sleeve ? clothP(sleeve, far) : skinP(far);
    const handC = { x: wr.x + (hd.x - wr.x) * 0.45, y: wr.y + (hd.y - wr.y) * 0.45 };
    return (
      <g key={`arm${side}`}>
        <P d={capsule(sh, el, r0, r1, r0 * 0.25)} p={sleeveP} />
        <P d={capsule(el, wr, r1 * 0.95, r2, r1 * 0.15)} p={sleeveP} />
        <P d={capsule(wr, { x: handC.x + (hd.x - wr.x) * 0.3, y: handC.y + (hd.y - wr.y) * 0.3 }, r2 * 1.15, r2 * 1.25, r2 * 0.2)} p={skinP(far)} />
      </g>
    );
  };
  const leg = (side: "L" | "R", hose: string | null, shoe: string) => {
    const far = side === "R";
    const hp = W(side === "L" ? s.hipL : s.hipR, "L");
    const kn = W(side === "L" ? s.knL : s.knR, "L");
    const an = W(side === "L" ? s.anL : s.anR, "L");
    const ang = side === "L" ? s.footAngL : s.footAngR;
    const [r0, r1, r2] = B.rLeg.map((r) => r * h);
    const legP = hose ? clothP(hose, far) : skinP(far);
    // 脚：沿脚的方向，从脚跟到脚尖
    const fs = rig.facingL;
    const rad = (ang * Math.PI) / 180;
    const d = { x: Math.cos(rad) * fs, y: -Math.sin(rad) };
    const n = { x: -d.y * Math.sign(fs), y: Math.abs(d.x) };
    const footLen = B.foot * h;
    const sole = r2 * 0.6 + B.ankle * h;
    const heel = { x: an.x - d.x * footLen * 0.22 + n.x * sole, y: an.y - d.y * footLen * 0.22 + n.y * sole };
    const toe = { x: an.x + d.x * footLen * 0.78 + n.x * sole, y: an.y + d.y * footLen * 0.78 + n.y * sole };
    const top = { x: an.x + d.x * footLen * 0.2 - n.x * r2 * 0.6, y: an.y + d.y * footLen * 0.2 - n.y * r2 * 0.6 };
    const footPath = smoothClosed([heel, { x: an.x - d.x * r2, y: an.y - d.y * r2 }, top, { x: toe.x - n.x * r2 * 0.7, y: toe.y - n.y * r2 * 0.7 }, toe], 0.45);
    return (
      <g key={`leg${side}`}>
        <P d={capsule(hp, kn, r0, r1, r0 * 0.3)} p={legP} />
        <P d={capsule(kn, an, r1 * 0.95, r2, r1 * 0.25)} p={legP} />
        <P d={footPath} p={clothP(shoe, far)} />
      </g>
    );
  };

  // —— 头和脸 ——
  const head = W(s.head);
  const R = s.headR;
  const fu = rig.facingU;
  const local = (dx: number, dy: number) => {
    const p = rot({ x: s.head.x + dx, y: s.head.y + dy }, s.head, s.headAng);
    return W(p);
  };
  const turn = rig.headTurn;
  const faceShift = turn * 0.5 * R;
  const faceOpacity = Math.max(0, 1 - turn * 1.5);
  const infant = rig.input.build === "infant";
  const eyeR = (infant ? 0.1 : 0.075) * R;
  const eyeY = infant ? 0.02 : -0.04;
  const eyes: Vec[] = [local(0.2 * R + faceShift, eyeY * R), local(0.58 * R + faceShift, (eyeY - 0.02) * R)];
  const f = rig.face;
  const blink = rig.blink;
  const ink = mat === "woodcut" ? th.ink : "#2A1A10";
  const fw = Math.max(0.6, 0.045 * h);
  const eyeEl = (e: Vec, i: number) => {
    if (f.eyes === "happy") {
      return <path key={i} d={`M${e.x - eyeR * 1.4} ${e.y + eyeR * 0.4} Q${e.x} ${e.y - eyeR * 1.6} ${e.x + eyeR * 1.4} ${e.y + eyeR * 0.4}`} fill="none" stroke={ink} strokeWidth={fw} strokeLinecap="round" />;
    }
    const k = f.eyes === "wide" ? 1.2 : 1;
    const ry = eyeR * k * (1 - blink * 0.92);
    if (ry < eyeR * 0.25) {
      return <path key={i} d={`M${e.x - eyeR * 1.3} ${e.y} Q${e.x} ${e.y + eyeR * 0.9} ${e.x + eyeR * 1.3} ${e.y}`} fill="none" stroke={ink} strokeWidth={fw} strokeLinecap="round" />;
    }
    return <ellipse key={i} cx={e.x} cy={e.y} rx={eyeR * k} ry={ry} fill={ink} />;
  };
  const browY = eyeY - 0.24;
  const browTilt = { neutral: [0, 0], sad: [0.06, -0.08], up: [-0.08, -0.08], knit: [-0.06, 0.07] }[f.brows];
  const brow = (cx: number, inner: 1 | -1) => {
    const a = local(cx * R + faceShift - 0.11 * R, (browY + (inner < 0 ? browTilt[1] : browTilt[0])) * R + browTilt[0] * R * 0.2);
    const b = local(cx * R + faceShift + 0.11 * R, (browY + (inner < 0 ? browTilt[0] : browTilt[1])) * R);
    return <path d={`M${pt(a)} L${pt(b)}`} stroke={ink} strokeWidth={fw * 0.85} strokeLinecap="round" />;
  };
  const mouthC = local(0.42 * R + faceShift, (infant ? 0.34 : 0.36) * R);
  const mw = (infant ? 0.16 : 0.18) * R;
  const mouth = (() => {
    const m = f.mouth;
    const sx = Math.sign(fu) || 1;
    if (m === "smile") return <path d={`M${mouthC.x - mw * sx} ${mouthC.y - mw * 0.2} Q${mouthC.x} ${mouthC.y + mw * 0.9} ${mouthC.x + mw * sx} ${mouthC.y - mw * 0.2}`} fill="none" stroke={ink} strokeWidth={fw} strokeLinecap="round" />;
    if (m === "frown") return <path d={`M${mouthC.x - mw * 0.8} ${mouthC.y + mw * 0.3} Q${mouthC.x} ${mouthC.y - mw * 0.5} ${mouthC.x + mw * 0.8} ${mouthC.y + mw * 0.3}`} fill="none" stroke={ink} strokeWidth={fw} strokeLinecap="round" />;
    if (m === "tight") return <path d={`M${mouthC.x - mw * 0.75} ${mouthC.y} L${mouthC.x + mw * 0.75} ${mouthC.y}`} stroke={ink} strokeWidth={fw * 1.3} strokeLinecap="round" />;
    if (m === "o") return <ellipse cx={mouthC.x} cy={mouthC.y} rx={mw * 0.4} ry={mw * 0.5} fill={ink} />;
    if (m === "open" || m === "talk") {
      const o = m === "talk" ? 0.2 + rig.talkOpen * 0.6 : 0.75;
      return <ellipse cx={mouthC.x} cy={mouthC.y + mw * 0.1} rx={mw * 0.7} ry={mw * o} fill={ink} />;
    }
    if (m === "cry") return <path d={`M${mouthC.x - mw} ${mouthC.y + mw * 0.6} Q${mouthC.x} ${mouthC.y - mw * 1.2} ${mouthC.x + mw} ${mouthC.y + mw * 0.6} Z`} fill={ink} />;
    return <path d={`M${mouthC.x - mw * 0.55} ${mouthC.y} Q${mouthC.x} ${mouthC.y + mw * 0.25} ${mouthC.x + mw * 0.55} ${mouthC.y}`} fill="none" stroke={ink} strokeWidth={fw} strokeLinecap="round" />;
  })();
  const blush = local(0.24 * R + faceShift, 0.22 * R);
  const showFace = mat !== "silhouette" && !tint && faceOpacity > 0;
  const headP = mat === "silhouette" ? clothP(c.emperor) : skinP();

  const neck = <P d={capsule(W(s.neckBase), W(rot({ x: s.head.x, y: s.head.y + R * 0.6 }, s.head, s.headAng)), B.rArm[0] * h * 1.05, B.rArm[0] * h, 0)} p={headP} />;
  const headCircle = <P d={`M${head.x - R} ${head.y} a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 ${-2 * R} 0`} p={headP} />;
  const faceEls = showFace ? (
    <g opacity={faceOpacity}>
      {eyes.map(eyeEl)}
      {brow(0.2, 1)}
      {brow(0.58, -1)}
      {mouth}
      {mat === "flat" ? <ellipse cx={blush.x} cy={blush.y} rx={R * 0.13} ry={R * 0.08} fill="#E58C74" opacity={0.35} /> : null}
    </g>
  ) : null;

  // —— 躯干和服装 ——
  const pelvisW = W(s.pelvis);
  const neckW = W(s.neckBase);
  const tw = B.torsoW * h;
  const torsoPath = capsule(pelvisW, neckW, tw * 1.05, tw * 0.92, tw * 0.12);

  let content: React.ReactNode;
  if (costume === "nurse") {
    const veilC = c.veil;
    // 裙摆：腰到小腿中段，跟着膝盖张开，衣角随 sway 晚到摆动
    const knL = W(s.knL, "L");
    const knR = W(s.knR, "L");
    const anL = W(s.anL, "L");
    const anR = W(s.anR, "L");
    const waist = W(rot({ x: s.pelvis.x, y: s.pelvis.y - 0.32 * h }, s.pelvis, s.torso));
    const hemY = Math.max(knL.y, knR.y) * 0.4 + Math.max(anL.y, anR.y) * 0.6;
    const xs = [knL.x, knR.x, anL.x, anR.x, pelvisW.x];
    const minX = Math.min(...xs) - 0.34 * h;
    const maxX = Math.max(...xs) + 0.34 * h;
    const swayX = (rig.sway / 28) * 0.18 * h;
    const wl = { x: waist.x - 0.33 * h, y: waist.y };
    const wr = { x: waist.x + 0.33 * h, y: waist.y };
    const skirt = smoothClosed(
      [wl, { x: Math.min(minX, wl.x) - 0.04 * h, y: (waist.y + hemY) / 2 }, { x: minX + swayX, y: hemY }, { x: (minX + maxX) / 2 + swayX, y: hemY + 0.04 * h }, { x: maxX + swayX, y: hemY - 0.02 * h }, { x: Math.max(maxX, wr.x) + 0.04 * h, y: (waist.y + hemY) / 2 }, wr],
      0.42,
    );
    const front = fu > 0 ? 1 : -1;
    const apron = smoothClosed(
      [
        { x: waist.x + front * 0.02 * h, y: waist.y + 0.02 * h },
        { x: waist.x + front * 0.3 * h, y: waist.y + 0.04 * h },
        { x: (front > 0 ? maxX : minX) - front * 0.08 * h + swayX * 0.8, y: hemY - 0.12 * h },
        { x: waist.x + front * 0.08 * h + swayX * 0.8, y: hemY - 0.08 * h },
      ],
      0.3,
    );
    // 头巾：盖住头顶和后脑，垂到肩后，尾巴随 sway 摆
    const vp = (dx: number, dy: number) => local(dx * R, dy * R);
    const swayK = rig.sway / 28;
    // 头巾的兜帽部分：盖住头顶 后脑和脸颊后侧，前缘沿着脸的轮廓，不挡眼睛
    const veil = smoothClosed(
      [vp(0.66, -0.66), vp(0.15, -1.13), vp(-0.6, -0.98), vp(-1.06, -0.25), vp(-1.02, 0.55), vp(-0.6, 0.95), vp(-0.12, 0.72), vp(-0.14, 0.2), vp(-0.02, -0.38), vp(0.3, -0.62)],
      0.42,
    );
    // 垂在背后的部分，画在身体后面，随 sway 晚到摆动
    const drape = smoothClosed(
      [vp(-0.55, 0.2), vp(-1.05, 0.3), vp(-1.12 - swayK * 0.5, 1.4), vp(-0.95 - swayK * 0.8, 2.3), vp(-0.35 - swayK * 0.4, 2.1), vp(-0.2, 1.0)],
      0.45,
    );
    content = (
      <>
        <P d={drape} p={clothP(c.veilShade)} />
        {arm("R", c.nurseShade)}
        {leg("R", null, c.shoe)}
        {leg("L", null, c.shoe)}
        <P d={skirt} p={clothP(mainColor)} hatchAlways={mat === "woodcut"} />
        <P d={apron} p={clothP(c.apron)} />
        <P d={torsoPath} p={clothP(mainColor)} />
        <path d={`M${pt(waist)} m${-0.3 * h} 0 l${0.6 * h} 0`} stroke={mat === "woodcut" ? th.ink : shade(mainColor, 0.6)} strokeWidth={0.06 * h} strokeLinecap="round" />
        {neck}
        {headCircle}
        <P d={veil} p={clothP(veilC)} />
        {faceEls}
        {arm("L", mainColor)}
      </>
    );
  } else if (costume === "baby") {
    const sw = feature === "redSwaddle" ? c.swaddle : c.apron;
    const swd = feature === "redSwaddle" ? c.swaddleShade : shade(c.apron, 0.8);
    const hipsW = W(s.pelvis, "L");
    const wrap = capsule(hipsW, W(rot({ x: s.neckBase.x, y: s.neckBase.y + 0.06 * h }, s.neckBase, 0)), tw * 1.15, tw * 1.0, tw * 0.2);
    const a = W(rot({ x: s.pelvis.x, y: s.pelvis.y - 0.5 * B.torso * h }, s.pelvis, s.torso));
    const tuft = local(-0.1 * R, -1.0 * R);
    content = (
      <>
        {arm("R", null)}
        {leg("R", null, th.skin)}
        {leg("L", null, th.skin)}
        <P d={wrap} p={clothP(sw)} hatchAlways={mat === "woodcut"} />
        <path d={`M${pt(W(s.pelvis))} L${pt(a)}`} stroke={swd} strokeWidth={0.05 * h} opacity={0.8} strokeLinecap="round" />
        {neck}
        {headCircle}
        <path d={`M${pt(tuft)} q${0.25 * R * fu} ${-0.3 * R} ${0.4 * R * fu} ${0.02 * R}`} fill="none" stroke={mat === "woodcut" ? th.ink : c.hair} strokeWidth={0.06 * h} strokeLinecap="round" />
        {turn > 0.05 ? <circle cx={head.x} cy={head.y} r={R * 0.98} fill={mat === "woodcut" ? th.wall : shade(th.skin, 0.9)} opacity={Math.min(1, turn * 1.2)} /> : null}
        {turn > 0.05 ? <path d={smoothOpen([local(-0.6 * R, -0.6 * R), local(0, -0.95 * R), local(0.5 * R, -0.7 * R)])} fill="none" stroke={mat === "woodcut" ? th.ink : c.hair} strokeWidth={0.05 * h} opacity={turn} /> : null}
        {faceEls}
        {arm("L", null)}
      </>
    );
  } else if (costume === "emperor") {
    const swayK = rig.sway / 28;
    const back = fu > 0 ? -1 : 1;
    const sh = W(s.shL);
    const hemY = Math.max(W(s.anL, "L").y, W(s.anR, "L").y) + 0.04 * h;
    const cloak = smoothClosed(
      [
        { x: sh.x + back * 0.1 * h, y: sh.y - 0.12 * h },
        { x: sh.x + back * 0.42 * h, y: sh.y + 0.2 * h },
        { x: pelvisW.x + back * (0.7 + swayK * 0.15) * h, y: (sh.y + hemY) / 2 + 0.3 * h },
        { x: pelvisW.x + back * (0.82 + swayK * 0.3) * h, y: hemY },
        { x: pelvisW.x - back * 0.1 * h, y: hemY - 0.02 * h },
        { x: pelvisW.x - back * 0.2 * h, y: pelvisW.y },
        { x: sh.x - back * 0.15 * h, y: sh.y + 0.05 * h },
      ],
      0.45,
    );
    const cp = (dx: number, dy: number) => local(dx * R, dy * R);
    const crown = `M${pt(cp(-0.62, -0.62))} L${pt(cp(-0.7, -1.25))} L${pt(cp(-0.35, -0.92))} L${pt(cp(0, -1.38))} L${pt(cp(0.35, -0.92))} L${pt(cp(0.7, -1.25))} L${pt(cp(0.62, -0.62))} Z`;
    content = (
      <>
        <P d={cloak} p={clothP(c.cloak)} />
        {arm("R", mainColor)}
        {leg("R", mainColor, c.shoe)}
        {leg("L", mainColor, c.shoe)}
        <P d={torsoPath} p={clothP(mainColor)} />
        {neck}
        {headCircle}
        <path d={crown} fill={tint ?? (mat === "silhouette" ? c.emperor : th.gold)} stroke={tint ?? th.gold} strokeWidth={0.05 * h} strokeLinejoin="round" />
        {mat !== "silhouette" ? faceEls : null}
        {arm("L", mainColor)}
      </>
    );
  } else {
    content = (
      <>
        {arm("R", mainColor)}
        {leg("R", "#4B4038", c.shoe)}
        {leg("L", "#4B4038", c.shoe)}
        <P d={torsoPath} p={clothP(mainColor)} />
        {neck}
        {headCircle}
        <path d={smoothOpen([local(-0.9 * R, 0.1 * R), local(-0.75 * R, -0.75 * R), local(0, -1.02 * R), local(0.7 * R, -0.7 * R)])} fill="none" stroke={c.hair} strokeWidth={0.22 * h} strokeLinecap="round" />
        {faceEls}
        {feature === "redScarf" ? <P d={capsule(W(rot({ x: s.neckBase.x - 0.2 * h, y: s.neckBase.y }, s.neckBase, s.torso)), W(rot({ x: s.neckBase.x + 0.2 * h, y: s.neckBase.y }, s.neckBase, s.torso)), 0.1 * h, 0.1 * h)} p={clothP(th.red)} /> : null}
        {arm("L", mainColor)}
      </>
    );
  }
  return <g opacity={opacity}>{content}</g>;
};
