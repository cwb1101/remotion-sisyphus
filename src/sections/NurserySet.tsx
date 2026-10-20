// 育婴房布景：石墙 窗 门 地面 八张摇篮和摇篮里的婴儿（群像）。按图层分开画，角色插在图层之间
import React from "react";
import { Crowd } from "../components/Crowd";
import { Bowl } from "../components/Bowl";
import { castOf, screens, sections } from "../data/subtitles";
import { useTheme } from "../styles/ThemeContext";
import { CARVE, WOODGRAIN } from "../styles/Defs";
import { progress, easeInOut } from "../lib/motion";
import { rng } from "../lib/random";
import { BABY_H, BASIN, babyRoot, bowlOnRim, CRADLE_FOOT, CRADLES, DOOR, HERO_CRADLE, NURSE_CROWD, NURSE_H, RIM_Y, STAND_Y, STOOL, WALL_BASE, WINDOW } from "./world";

export type Layer = "back" | "floor" | "cradleBack" | "babies" | "cradleFront" | "actors" | "front" | "fx";
export const LAYERS: Layer[] = ["back", "floor", "cradleBack", "babies", "cradleFront", "actors", "front", "fx"];

const WORLD_L = -1400;
const WORLD_R = 5400;

/** 门：从关门音效往前 30 帧开始合上；关门之前是开着的 */
const doorCloseFrame = screens.flatMap((s) => s.sfx).find((x) => x.id === "door-close")?.frame ?? 99999;
export const doorOpen = (f: number) => 1 - easeInOut(progress(f, doorCloseFrame - 28, doorCloseFrame));

/** 窗光：第 11–12 小节（screen 7）里扫三次，表示几天过去；其余时间斜照在第三张摇篮上 */
const sweepScreen = screens[6];
export const lightOffset = (f: number): number => {
  if (f < sweepScreen.start || f >= sweepScreen.end) return 0;
  const len = (sweepScreen.end - sweepScreen.start) / 3;
  const u = ((f - sweepScreen.start) % len) / len;
  return -520 + easeInOut(u) * 1040;
};

const Cradle: React.FC<{ x: number; part: "back" | "front" }> = ({ x, part }) => {
  const th = useTheme();
  const woodcut = th.material === "woodcut";
  const sw = woodcut ? 4 : 2.5;
  const L = x - 150;
  const R = x + 150;
  if (part === "back") {
    return (
      <g>
        {/* 远侧床板 + 两头的立柱 */}
        <path d={`M${L + 6} ${RIM_Y - 52} L${R - 6} ${RIM_Y - 52} L${R - 6} ${RIM_Y + 20} L${L + 6} ${RIM_Y + 20} Z`} fill={woodcut ? th.wall : th.woodDark} stroke={th.ink} strokeWidth={sw} />
        {woodcut ? <path d={`M${L + 6} ${RIM_Y - 52} L${R - 6} ${RIM_Y - 52} L${R - 6} ${RIM_Y + 20} L${L + 6} ${RIM_Y + 20} Z`} fill={`url(#${CARVE})`} opacity={0.6} /> : null}
        <rect x={L - 10} y={RIM_Y - 92} width={20} height={150} rx={6} fill={th.wood} stroke={th.ink} strokeWidth={sw} />
        <rect x={R - 10} y={RIM_Y - 92} width={20} height={150} rx={6} fill={th.wood} stroke={th.ink} strokeWidth={sw} />
        <circle cx={L} cy={RIM_Y - 98} r={13} fill={th.wood} stroke={th.ink} strokeWidth={sw} />
        <circle cx={R} cy={RIM_Y - 98} r={13} fill={th.wood} stroke={th.ink} strokeWidth={sw} />
        {/* 褥子 */}
        <rect x={L + 14} y={RIM_Y - 14} width={272} height={22} rx={10} fill={th.cloth.apron} stroke={th.ink} strokeWidth={sw * 0.7} />
      </g>
    );
  }
  return (
    <g>
      {/* 近侧床板：比婴儿低，婴儿的头 手 膝盖露在上面 */}
      <path d={`M${L} ${RIM_Y} L${R} ${RIM_Y} L${R - 12} ${CRADLE_FOOT - 40} L${L + 12} ${CRADLE_FOOT - 40} Z`} fill={th.wood} stroke={th.ink} strokeWidth={sw} />
      <path d={`M${L} ${RIM_Y} L${R} ${RIM_Y} L${R - 12} ${CRADLE_FOOT - 40} L${L + 12} ${CRADLE_FOOT - 40} Z`} fill={`url(#${woodcut ? CARVE : WOODGRAIN})`} opacity={woodcut ? 0.75 : 0.9} />
      <path d={`M${L + 26} ${RIM_Y + 22} L${R - 26} ${RIM_Y + 22}`} stroke={th.woodLine} strokeWidth={sw * 1.4} />
      {/* 摇篮底下的弧形摇脚 */}
      <path d={`M${L - 16} ${CRADLE_FOOT - 24} Q${x} ${CRADLE_FOOT + 22} ${R + 16} ${CRADLE_FOOT - 24}`} fill="none" stroke={th.ink} strokeWidth={14} strokeLinecap="round" />
      <path d={`M${L - 16} ${CRADLE_FOOT - 24} Q${x} ${CRADLE_FOOT + 22} ${R + 16} ${CRADLE_FOOT - 24}`} fill="none" stroke={th.woodDark} strokeWidth={9} strokeLinecap="round" />
      <rect x={L - 12} y={RIM_Y - 6} width={24} height={60} rx={6} fill={th.wood} stroke={th.ink} strokeWidth={sw} />
      <rect x={R - 12} y={RIM_Y - 6} width={24} height={60} rx={6} fill={th.wood} stroke={th.ink} strokeWidth={sw} />
    </g>
  );
};

const Wall: React.FC = () => {
  const th = useTheme();
  const woodcut = th.material === "woodcut";
  const r = rng(4);
  const blocks: React.ReactNode[] = [];
  // 石块墙：每排错缝
  for (let row = 0; row < 14; row++) {
    const y = WALL_BASE - (row + 1) * 96;
    const off = row % 2 ? 0 : 90;
    for (let x = WORLD_L - off; x < WORLD_R; x += 180) {
      const w = 170 + r() * 8;
      blocks.push(<rect key={`${row}-${x}`} x={x + r() * 4} y={y + 4} width={w} height={88} rx={10} fill={woodcut ? th.wall : r() > 0.5 ? th.wall : "#3E322A"} stroke={th.wallLine} strokeWidth={woodcut ? 3 : 4} />);
    }
  }
  return (
    <g>
      <rect x={WORLD_L} y={WALL_BASE - 1500} width={WORLD_R - WORLD_L} height={1500} fill={th.wall} />
      {blocks}
      {woodcut ? <rect x={WORLD_L} y={WALL_BASE - 1500} width={WORLD_R - WORLD_L} height={1500} fill={`url(#${CARVE})`} opacity={0.18} /> : null}
    </g>
  );
};

const WindowAndDoor: React.FC<{ frame: number }> = ({ frame }) => {
  const th = useTheme();
  const open = doorOpen(frame);
  const { x, w, h } = DOOR;
  return (
    <g>
      {/* 拱窗 */}
      <path d={`M${WINDOW.x} ${WINDOW.y + WINDOW.h} L${WINDOW.x} ${WINDOW.y + 60} Q${WINDOW.x + WINDOW.w / 2} ${WINDOW.y - 40} ${WINDOW.x + WINDOW.w} ${WINDOW.y + 60} L${WINDOW.x + WINDOW.w} ${WINDOW.y + WINDOW.h} Z`} fill={th.light} stroke={th.ink} strokeWidth={8} />
      <line x1={WINDOW.x + WINDOW.w / 2} y1={WINDOW.y + 10} x2={WINDOW.x + WINDOW.w / 2} y2={WINDOW.y + WINDOW.h} stroke={th.ink} strokeWidth={8} />
      <line x1={WINDOW.x} y1={WINDOW.y + 150} x2={WINDOW.x + WINDOW.w} y2={WINDOW.y + 150} stroke={th.ink} strokeWidth={8} />
      {/* 门洞（黑） + 门板（按 open 旋开） */}
      <path d={`M${x - w / 2} ${WALL_BASE} L${x - w / 2} ${WALL_BASE - h + 60} Q${x} ${WALL_BASE - h - 30} ${x + w / 2} ${WALL_BASE - h + 60} L${x + w / 2} ${WALL_BASE} Z`} fill={th.material === "woodcut" ? th.ink : "#0D0907"} stroke={th.ink} strokeWidth={6} />
      <g transform={`translate(${x - w / 2} 0) scale(${Math.max(0.08, 1 - open * 0.92)} 1) translate(${-(x - w / 2)} 0)`}>
        <path d={`M${x - w / 2} ${WALL_BASE} L${x - w / 2} ${WALL_BASE - h + 60} Q${x} ${WALL_BASE - h - 30} ${x + w / 2} ${WALL_BASE - h + 60} L${x + w / 2} ${WALL_BASE} Z`} fill={th.woodDark} stroke={th.ink} strokeWidth={6} />
        <path d={`M${x - w / 2} ${WALL_BASE} L${x - w / 2} ${WALL_BASE - h + 60} Q${x} ${WALL_BASE - h - 30} ${x + w / 2} ${WALL_BASE - h + 60} L${x + w / 2} ${WALL_BASE} Z`} fill={`url(#${th.material === "woodcut" ? CARVE : WOODGRAIN})`} opacity={0.8} />
        <circle cx={x + w * 0.32} cy={WALL_BASE - h * 0.45} r={8} fill={th.gold} stroke={th.ink} strokeWidth={3} />
      </g>
    </g>
  );
};

const Floor: React.FC = () => {
  const th = useTheme();
  const woodcut = th.material === "woodcut";
  const lines = [];
  for (let i = 0; i < 9; i++) {
    const y = WALL_BASE + 18 + i * i * 9 + i * 22;
    lines.push(<line key={i} x1={WORLD_L} x2={WORLD_R} y1={y} y2={y} stroke={th.floorLine} strokeWidth={woodcut ? 3 : 4} opacity={woodcut ? 0.9 : 0.8} />);
  }
  return (
    <g>
      <rect x={WORLD_L} y={WALL_BASE} width={WORLD_R - WORLD_L} height={1200} fill={th.floor} />
      {lines}
      <line x1={WORLD_L} x2={WORLD_R} y1={WALL_BASE} y2={WALL_BASE} stroke={th.ink} strokeWidth={6} />
    </g>
  );
};

/** 窗户斜射进来的光：主视觉是暖色光柱，木刻是留白的光斑加放射排线 */
export const LightShaft: React.FC<{ frame: number }> = ({ frame }) => {
  const th = useTheme();
  const dx = lightOffset(frame);
  const wx = WINDOW.x + WINDOW.w / 2;
  const fx = 1180 + dx;
  const poly = `M${WINDOW.x + 10} ${WINDOW.y + 40} L${WINDOW.x + WINDOW.w - 10} ${WINDOW.y + 20} L${fx + 240} ${CRADLE_FOOT + 40} L${fx - 240} ${CRADLE_FOOT + 60} Z`;
  if (th.material === "woodcut") {
    const rays = Array.from({ length: 9 }, (_, i) => {
      const t = i / 8;
      return <line key={i} x1={WINDOW.x + 20 + t * (WINDOW.w - 40)} y1={WINDOW.y + 40} x2={fx - 220 + t * 440} y2={CRADLE_FOOT + 50} stroke={th.ink} strokeWidth={2} opacity={0.35} />;
    });
    return (
      <g>
        <path d={poly} fill={th.light} opacity={th.lightOpacity} />
        {rays}
      </g>
    );
  }
  return (
    <g style={{ mixBlendMode: "screen" }}>
      <defs>
        <linearGradient id="shaftGrad" x1={wx} y1={WINDOW.y} x2={fx} y2={CRADLE_FOOT} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={th.light} stopOpacity={0.55} />
          <stop offset="1" stopColor={th.light} stopOpacity={0.12} />
        </linearGradient>
      </defs>
      <path d={poly} fill="url(#shaftGrad)" opacity={th.lightOpacity * 2} />
      <ellipse cx={fx} cy={CRADLE_FOOT + 30} rx={330} ry={70} fill={th.light} opacity={0.12} />
    </g>
  );
};

/** 空中失焦的尘埃，主视觉才有 */
export const Dust: React.FC<{ frame: number }> = ({ frame }) => {
  const th = useTheme();
  if (!th.dust) return null;
  const r = rng(77);
  const ps = Array.from({ length: 70 }, () => ({ x: WORLD_L + 1600 + r() * 4200, y: 200 + r() * 900, s: 1.5 + r() * 4, v: 0.15 + r() * 0.35, ph: r() * 6.28 }));
  return (
    <g style={{ mixBlendMode: "screen" }}>
      <defs>
        <radialGradient id="dustGrad">
          <stop offset="0" stopColor="#FFE9B8" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFE9B8" stopOpacity="0" />
        </radialGradient>
      </defs>
      {ps.map((p, i) => (
        <circle key={i} cx={p.x + Math.sin(frame * 0.012 + p.ph) * 30} cy={p.y - ((frame * p.v) % 300) + Math.cos(frame * 0.02 + p.ph) * 10} r={p.s * 2.4} fill="url(#dustGrad)" opacity={0.55} />
      ))}
    </g>
  );
};

/** 除第三张以外的七张摇篮里的婴儿（群像） */
const BabyCrowd: React.FC = () => {
  const others = CRADLES.filter((_, i) => i !== HERO_CRADLE);
  return (
    <Crowd
      members={others.map((cx) => ({ ...babyRoot(cx), facing: 1 }))}
      build="infant"
      costume="baby"
      h={BABY_H}
      seed={41}
      idle="babyLie"
      cues={castOf("babies")}
      heightJitter={0.07}
      timeJitter={10}
      turnedAway={2}
    />
  );
};

/** 另外四个奶妈：背对摇篮站着（群像） */
const NurseCrowd: React.FC = () => {
  const th = useTheme();
  return (
    <Crowd
      members={NURSE_CROWD.map((m) => ({ x: m.x, y: STAND_Y, facing: m.facing, scale: m.h, color: th.cloth[m.color] }))}
      build="adult"
      costume="nurse"
      h={NURSE_H}
      seed={57}
      idle="standBack"
      cues={castOf("nurses")}
      heightJitter={0.03}
      timeJitter={12}
    />
  );
};

/** 水盆只在第二节（喂奶擦身）出现，之后几天过去了 */
const BASIN_UNTIL = sections.find((s) => s.id === "setup")!.end;

/** 凳子上的水盆：盆身和水画在人物后面，盆口前沿画在人物前面，手伸进去才像在水里 */
const Basin: React.FC<{ part: "back" | "front" }> = ({ part }) => {
  const th = useTheme();
  const { x, rim, w } = BASIN;
  const sw = th.material === "woodcut" ? 4 : 2.5;
  if (part === "front") return <path d={`M${x - w / 2} ${rim} A${w / 2} ${w * 0.14} 0 0 0 ${x + w / 2} ${rim}`} fill="none" stroke={th.woodDark} strokeWidth={9} />;
  return (
    <g>
      <rect x={STOOL.x - 52} y={STOOL.top} width={104} height={14} rx={4} fill={th.wood} stroke={th.ink} strokeWidth={sw} />
      <path d={`M${STOOL.x - 44} ${STOOL.top + 14} L${STOOL.x - 56} ${STAND_Y + 4} M${STOOL.x + 44} ${STOOL.top + 14} L${STOOL.x + 56} ${STAND_Y + 4}`} stroke={th.woodDark} strokeWidth={9} strokeLinecap="round" />
      <path d={`M${x - w / 2} ${rim} L${x - w * 0.4} ${STOOL.top} L${x + w * 0.4} ${STOOL.top} L${x + w / 2} ${rim} Z`} fill={th.wood} stroke={th.ink} strokeWidth={sw} />
      <ellipse cx={x} cy={rim} rx={w / 2} ry={w * 0.14} fill={th.material === "woodcut" ? "#F6F1E2" : "#8FA3A8"} stroke={th.ink} strokeWidth={sw} />
    </g>
  );
};

export const NurserySet: React.FC<{ layer: Layer; frame: number }> = ({ layer, frame }) => {
  const th = useTheme();
  if (layer === "back")
    return (
      <>
        <Wall />
        <WindowAndDoor frame={frame} />
      </>
    );
  // 木刻的光斑画在墙和地面上（人物后面），主视觉的光柱用滤色叠在最上面
  if (layer === "floor")
    return (
      <>
        <Floor />
        {th.material === "woodcut" ? <LightShaft frame={frame} /> : null}
      </>
    );
  if (layer === "cradleBack") return <>{CRADLES.map((x) => <Cradle key={x} x={x} part="back" />)}</>;
  if (layer === "babies") return <BabyCrowd />;
  if (layer === "cradleFront")
    return (
      <>
        {CRADLES.map((x, i) => (
          <React.Fragment key={x}>
            <Cradle x={x} part="front" />
            {i !== HERO_CRADLE ? <Bowl {...bowlOnRim(x)} fill={1} frame={frame} /> : null}
          </React.Fragment>
        ))}
      </>
    );
  const basin = frame < BASIN_UNTIL;
  if (layer === "actors")
    return (
      <>
        <NurseCrowd />
        {basin ? <Basin part="back" /> : null}
      </>
    );
  if (layer === "front") return basin ? <Basin part="front" /> : null;
  if (layer === "fx")
    return (
      <>
        {th.material !== "woodcut" ? <LightShaft frame={frame} /> : null}
        <Dust frame={frame} />
      </>
    );
  return null;
};
