import {mix} from './anim';

/**
 * 简化的透视相机。世界坐标：x 向右，y 向上（地面 y=0），z 向画面深处。
 * 单位约为厘米：真人身高约 175。
 */
export interface Cam {
  x: number;
  y: number;
  z: number;
  /** 焦距（像素） */
  f: number;
  /** 地平线在屏幕上的 x、y（俯仰用它近似） */
  cx: number;
  cy: number;
  /** 摇镜头：所有层（包括天空）一起平移的像素 */
  panX?: number;
  panY?: number;
}

export interface Projected {
  x: number;
  y: number;
  /** 该深度上的缩放：1 世界单位 = s 像素 */
  s: number;
  /** 离相机的深度 */
  d: number;
}

export const NEAR = 4;

export const project = (cam: Cam, x: number, y: number, z: number): Projected => {
  const d = Math.max(NEAR, z - cam.z);
  const s = cam.f / d;
  return {
    x: cam.cx + (x - cam.x) * s + (cam.panX ?? 0),
    y: cam.cy - (y - cam.y) * s + (cam.panY ?? 0),
    s,
    d,
  };
};

/** 按深度把颜色混向雾色：越远越淡 */
export const fogged = (color: string, fogColor: string, d: number, density: number) =>
  mix(color, fogColor, 1 - Math.exp(-d / density));

export const fogAmount = (d: number, density: number) => 1 - Math.exp(-d / density);

type V3 = [number, number, number];

/** 用近裁剪面裁掉相机身后的部分，避免穿过相机的墙面投影变形 */
export const clipNear = (pts: V3[], zNear: number): V3[] => {
  const out: V3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ina = a[2] >= zNear;
    const inb = b[2] >= zNear;
    if (ina) {
      out.push(a);
    }
    if (ina !== inb) {
      const t = (zNear - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zNear]);
    }
  }
  return out;
};

/** 把世界坐标多边形投影成 SVG points 字符串（已做近裁剪），整块在相机后则返回 null */
export const polyPoints = (cam: Cam, pts: V3[]): string | null => {
  const clipped = clipNear(pts, cam.z + NEAR + 1);
  if (clipped.length < 3) {
    return null;
  }
  return clipped
    .map(([x, y, z]) => {
      const p = project(cam, x, y, z);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');
};
