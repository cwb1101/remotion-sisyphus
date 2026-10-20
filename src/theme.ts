/** 寓言画风：扁平矢量插画，场景色随地点变化；字幕暖白 + 唯一强调色红 */
export const C = {
  subtitle: '#FFFAEB',
  accent: '#FC593F',
  gold: '#EEC672',

  // 人物
  skin: '#F2C9A6',
  skinShade: '#E3B08C',
  ink: '#2B2A3A',
  orange: '#F08A4B',
  orangeDark: '#D9703A',
  orangeHair: '#3B2A2A',
  orangePants: '#3C3F58',
  blue: '#7C93B5',
  blueDark: '#5D7396',
  blueHair: '#262634',
  bluePants: '#2E3245',
  shadowFigure: '#2A2D3A',

  // 深夜客厅
  nightWall: '#1E2140',
  nightWallDeep: '#151832',
  nightFloor: '#262A4D',
  sofa: '#3C4A6B',
  sofaDark: '#2F3B58',
  lamp: '#F6C177',
  cityLight: '#F8D893',
  windowNight: '#0F1430',

  // 冷灰走廊
  corridor: '#3A3F4F',
  corridorDark: '#2C303D',
  corridorStripe: '#434858',
  door: '#5A5F72',
  doorDark: '#474B5C',
  warmRoom: '#F3D9A4',
} as const;

export const FONT_SANS = '"Noto Sans SC", "Source Han Sans SC", sans-serif';
export const FONT_SERIF = '"Noto Serif SC", "Source Han Serif SC", serif';

/** 两个十六进制颜色按 t 混合 */
export const mix = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const m = (s: number) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t);
  return `#${((1 << 24) | (m(16) << 16) | (m(8) << 8) | m(0)).toString(16).slice(1)}`;
};
