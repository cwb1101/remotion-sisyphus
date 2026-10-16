// 视觉方向 V1 · 暗夜冷钢
export const PALETTE = {
  night: '#0E1116',
  groundBand: '#1A2230',
  skyTop: '#141A26',
  steel: '#8A94A6',
  steelLight: '#C3CBD8',
  steelDark: '#5C6577',
  handle: '#343A46',
  snake: '#3E5C4A',
  snakeBelly: '#5B7B66',
  snakeEdge: '#22352A',
  snakeDead: '#34433B',
  personBody: '#2B3445',
  personRim: '#8A9BB5',
};

/** 每一节的光线。各节在开头从上一节的光线过渡过来。 */
export type Light = {
  base: string; // 画面底色
  ground: string; // 地面
  grass: string; // 草叶
  pool: string; // 光池颜色
  poolAlpha: number;
  poolRadius: number; // 屏幕像素
  vignette: number; // 0..1
};

export const LIGHTS: Record<'night' | 'dusk' | 'tense' | 'plain' | 'cool' | 'moon' | 'calm', Light> = {
  night: { base: '#0E1116', ground: '#141B25', grass: '#223040', pool: '#4FD1C5', poolAlpha: 0.13, poolRadius: 900, vignette: 0.7 },
  dusk: { base: '#16181B', ground: '#20262A', grass: '#34453B', pool: '#E9B47E', poolAlpha: 0.2, poolRadius: 1150, vignette: 0.5 },
  tense: { base: '#110C0F', ground: '#1A1115', grass: '#321F24', pool: '#FF5A3C', poolAlpha: 0.2, poolRadius: 760, vignette: 0.8 },
  // 侧视地平线场景（S5 起）：base = 天顶色，ground = 近处地面，grass = 远处草线
  plain: { base: '#0C0F18', ground: '#16131B', grass: '#2C2533', pool: '#E9B47E', poolAlpha: 0.17, poolRadius: 1050, vignette: 0.6 },
  cool: { base: '#0D131C', ground: '#161E29', grass: '#273548', pool: '#7FA6D6', poolAlpha: 0.15, poolRadius: 1000, vignette: 0.6 },
  moon: { base: '#080B12', ground: '#10151E', grass: '#1D2737', pool: '#9FB8E0', poolAlpha: 0.1, poolRadius: 900, vignette: 0.75 },
  calm: { base: '#0D1718', ground: '#152224', grass: '#24403F', pool: '#4FD1C5', poolAlpha: 0.17, poolRadius: 1150, vignette: 0.5 },
};
