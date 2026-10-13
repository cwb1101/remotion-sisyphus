/**
 * 整片混音：按 script.ts 的帧号把每个合成音效放上时间轴（与 SfxTrack 完全相同的规则），
 * 叠加各场景的环境底噪，输出 out/film-audio.wav（48kHz / 16bit / 单声道）。
 * 视频分段渲染时静音，最后与这条音轨合成，避免分段拼接处出现爆音或断音。
 */
import fs from 'node:fs';
import path from 'node:path';
import {FPS, SCENES, SCREENS} from '../src/data/script';
import {FILM_TAIL_FRAMES} from '../src/data/film-meta';
import {OVERLAP, cueFrames, sceneRange} from '../src/data/timeline';

const SR = 48000;
const SFX = path.join(__dirname, '..', 'public', 'sfx');
const readWav = (name: string) => {
  const b = fs.readFileSync(path.join(SFX, `${name}.wav`));
  const n = (b.length - 44) / 2;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = b.readInt16LE(44 + i * 2) / 32768;
  return x;
};
const cache = new Map<string, Float32Array>();
const get = (n: string) => {
  if (!cache.has(n)) cache.set(n, readWav(n));
  return cache.get(n)!;
};

const total = SCREENS[SCREENS.length - 1].end + FILM_TAIL_FRAMES;
const out = new Float32Array(Math.ceil((total / FPS) * SR));
const place = (name: string, frame: number, vol: number, maxFrames?: number) => {
  const x = get(name);
  const i0 = Math.round((frame / FPS) * SR);
  const lim = maxFrames ? Math.round((maxFrames / FPS) * SR) : x.length;
  for (let i = 0; i < Math.min(x.length, lim) && i0 + i < out.length; i++) if (i0 + i >= 0) out[i0 + i] += x[i] * vol;
};
const half = OVERLAP / 2;
let cues = 0;
for (const sc of SCENES) {
  const r = sceneRange(sc.id);
  if (sc.bed) place(sc.bed, Math.max(0, r.start - half), 0.9, r.end - r.start + half * 2 + (sc.id === 'stairs' ? FILM_TAIL_FRAMES : 0));
  for (const s of SCREENS.filter((x) => x.scene === sc.id)) {
    for (const c of s.sfx ?? []) {
      for (const f of cueFrames(s, c)) {
        place(c.id, f, c.volume ?? 1);
        cues++;
      }
    }
  }
}
// 片尾淡出
const fadeN = Math.round((FILM_TAIL_FRAMES / FPS) * SR);
for (let i = 0; i < fadeN; i++) out[out.length - 1 - i] *= i / fadeN;

let peak = 0;
for (const v of out) peak = Math.max(peak, Math.abs(v));
// 只做峰值保护（全片响度统一交给 ffmpeg loudnorm）
const k = peak > 0.95 ? 0.95 / peak : 1;
const data = Buffer.alloc(out.length * 2);
for (let i = 0; i < out.length; i++) data.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(out[i] * k * 32767))), i * 2);
const h = Buffer.alloc(44);
h.write('RIFF', 0);
h.writeUInt32LE(36 + data.length, 4);
h.write('WAVE', 8);
h.write('fmt ', 12);
h.writeUInt32LE(16, 16);
h.writeUInt16LE(1, 20);
h.writeUInt16LE(1, 22);
h.writeUInt32LE(SR, 24);
h.writeUInt32LE(SR * 2, 28);
h.writeUInt16LE(2, 32);
h.writeUInt16LE(16, 34);
h.write('data', 36);
h.writeUInt32LE(data.length, 40);
fs.mkdirSync('out', {recursive: true});
fs.writeFileSync('out/film-audio.wav', Buffer.concat([h, data]));
console.log(
  `mix: ${cues} 个音效 + ${SCENES.filter((s) => s.bed).length} 条底噪，${(out.length / SR).toFixed(2)}s，混音峰值 ${(20 * Math.log10(peak)).toFixed(1)} dBFS${k < 1 ? '（已压到 -0.4 dBFS）' : ''}`,
);
