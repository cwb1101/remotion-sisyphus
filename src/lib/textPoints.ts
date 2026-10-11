import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import type {Pt} from './anim';

// 把文字画到离屏 canvas 上，按网格取样，得到组成字形的点（以文字中心为原点）。
// 用于“字碎成粒子”“粒子聚成字”。字体加载完成之前用 delayRender 挡住渲染。

const cache = new Map<string, Pt[]>();

const sample = (text: string, size: number, weight: number, family: string, step: number): Pt[] => {
  const w = Math.ceil(size * [...text].length * 1.2);
  const h = Math.ceil(size * 1.5);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, w / 2, h / 2);
  const data = ctx.getImageData(0, 0, w, h).data;
  const pts: Pt[] = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 140) pts.push({x: x - w / 2, y: y - h / 2});
    }
  }
  return pts;
};

export const useTextPoints = (text: string, size: number, weight: number, family: string, step: number) => {
  const key = `${text}|${size}|${weight}|${family}|${step}`;
  const [pts, setPts] = useState<Pt[] | null>(() => cache.get(key) ?? null);
  const [handle] = useState(() => (cache.has(key) ? null : delayRender(`采样文字点：${text}`)));
  useEffect(() => {
    if (pts) return;
    const fam = family.split(',')[0].trim();
    document.fonts.load(`${weight} ${size}px ${fam}`, text).then(() => {
      const p = sample(text, size, weight, fam, step);
      cache.set(key, p);
      setPts(p);
      if (handle !== null) continueRender(handle);
    });
  }, [family, handle, key, pts, size, step, text, weight]);
  return pts;
};
