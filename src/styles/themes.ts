// 画风变奏的配色和材质。各节按 subtitles.ts 里 sections 的 style 切换。
// 主角识别色朱红 #D9583C、碗沿金 #DDBD74 在所有变奏里保留。

export type Material = "flat" | "woodcut" | "silhouette";

export type Theme = {
  id: StyleId;
  name: string;
  material: Material;
  // 场景
  bg: string;
  wall: string;
  wallLine: string;
  floor: string;
  floorLine: string;
  wood: string;
  woodDark: string;
  woodLine: string;
  light: string;
  lightOpacity: number;
  shadow: string;
  // 人物
  ink: string;
  inkWidth: number;
  skin: string;
  skinShade: string;
  cloth: Record<string, string>;
  rim: string | null;
  hatch: boolean;
  // 关键色
  red: string;
  gold: string;
  milk: string;
  // 文字
  text: string;
  textShadow: string;
  keyword: string;
  label: string;
  // 质感
  grain: number;
  vignette: number;
  dust: number;
};

export type StyleId = "main" | "woodcut" | "manuscript" | "main-return" | "blueprint" | "homevideo" | "main-night" | "papercut" | "main-dawn" | "parchment";

const main: Theme = {
  id: "main",
  name: "主视觉 烛光寓言",
  material: "flat",
  bg: "#1B1714",
  wall: "#3A2F27",
  wallLine: "#2A221C",
  floor: "#2E251F",
  floorLine: "#231C17",
  wood: "#8A5E3B",
  woodDark: "#5E3E26",
  woodLine: "#4A3020",
  light: "#F6D9A0",
  lightOpacity: 0.34,
  shadow: "#0E0B09",
  ink: "#24190F",
  inkWidth: 0.035,
  skin: "#E9C6A1",
  skinShade: "#C99D7A",
  cloth: {
    nurse: "#6E7A80",
    nurseShade: "#55606A",
    apron: "#E8DCC6",
    veil: "#F1E8D8",
    veilShade: "#CFC3AE",
    swaddle: "#D9583C",
    swaddleShade: "#A8402A",
    emperor: "#231A14",
    cloak: "#2E2018",
    nurse2: "#7B6F5E",
    nurse3: "#5F6B58",
    nurse4: "#76665F",
    hair: "#4A3424",
    shoe: "#3A2A1E",
  },
  rim: "#DDBD74",
  hatch: false,
  red: "#D9583C",
  gold: "#DDBD74",
  milk: "#F4EEDF",
  text: "#F3ECDD",
  textShadow: "rgba(12,8,5,0.85)",
  keyword: "#DDBD74",
  label: "#E8E0CF",
  grain: 0.06,
  vignette: 0.62,
  dust: 1,
};

const woodcut: Theme = {
  ...main,
  id: "woodcut",
  name: "木刻版画",
  material: "woodcut",
  bg: "#E9DFC6",
  wall: "#E4D8BC",
  wallLine: "#1C1712",
  floor: "#DCCDAE",
  floorLine: "#1C1712",
  wood: "#E2D2B0",
  woodDark: "#1C1712",
  woodLine: "#1C1712",
  light: "#FFF7E2",
  lightOpacity: 0.55,
  shadow: "#1C1712",
  ink: "#16120E",
  inkWidth: 0.06,
  skin: "#F1E7CF",
  skinShade: "#D9CBAA",
  cloth: {
    ...main.cloth,
    nurse: "#E2D6BA",
    nurseShade: "#1C1712",
    apron: "#F3EBD6",
    veil: "#F6EFDD",
    veilShade: "#1C1712",
    swaddle: "#C2412A",
    swaddleShade: "#7E2617",
    hair: "#16120E",
    shoe: "#16120E",
  },
  rim: null,
  hatch: true,
  red: "#C2412A",
  gold: "#B38A3A",
  milk: "#FBF6E8",
  text: "#17130F",
  textShadow: "rgba(244,236,214,0.92)",
  keyword: "#B23A24",
  label: "#2A231B",
  grain: 0.1,
  vignette: 0.32,
  dust: 0,
};

export const THEMES: Record<StyleId, Theme> = {
  main,
  woodcut,
  // 后续各节的变奏先沿用主视觉，等做到那一节再展开
  manuscript: { ...main, id: "manuscript", name: "羊皮纸手抄本" },
  "main-return": { ...main, id: "main-return", name: "主视觉返场" },
  blueprint: { ...main, id: "blueprint", name: "蓝图线稿" },
  homevideo: { ...main, id: "homevideo", name: "胶片家庭录像" },
  "main-night": { ...main, id: "main-night", name: "主视觉夜版" },
  papercut: { ...main, id: "papercut", name: "剪纸" },
  "main-dawn": { ...main, id: "main-dawn", name: "主视觉晨光版" },
  parchment: { ...main, id: "parchment", name: "羊皮纸出处卡" },
};
