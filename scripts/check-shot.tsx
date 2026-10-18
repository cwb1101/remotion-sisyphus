// 镜头轨道连续性检查：逐帧计算所有轨道，列出相邻两帧之间的跳变。
// 用法：npx esbuild scripts/check-shot.tsx --bundle --platform=node --outfile=out/check-shot.cjs --log-level=error && node out/check-shot.cjs
// 重卡点上的瞬变（熄灯、闪亮、变速）是故意的，会标出来；其余的跳变都要修。
import { SCREENS } from '../src/data/subtitles';
import beatmap from '../src/data/beatmap.json';
import { KEYS } from '../src/Film';
import { shotAt } from '../src/film/shot';

const heavy = new Set([beatmap.dropFrame, ...SCREENS.filter((s) => s.heavy).map((s) => s.start)]);
// 球很大时球心在几百万像素外，所以看地平线顶点（top = cy - r）而不是球心
const LIMITS: Record<string, number> = { cx: 60, top: 60, logR: 0.6, lightAngle: 8, cool: 0.2, beam: 0.25, beamDX: 40, beamRot: 3, ambient: 0.2, moonTop: 150 };
let prev: Record<string, number> | null = null;
let n = 0;
for (let f = 0; f < beatmap.durationInFrames; f++) {
  const st = shotAt(KEYS, f);
  const v: Record<string, number> = { ...st, logR: Math.log(st.r), top: st.cy - st.r };
  if (prev) {
    for (const [k, lim] of Object.entries(LIMITS)) {
      const d = Math.abs(v[k] - prev[k]);
      if (d > lim) {
        n++;
        console.log(`f${f} ${k} 跳变 ${prev[k].toFixed(3)} → ${v[k].toFixed(3)}${heavy.has(f) ? '（重卡点，故意）' : ''}`);
      }
    }
  }
  prev = v;
}
console.log(n ? `共 ${n} 处跳变` : '轨道连续，无跳变');
