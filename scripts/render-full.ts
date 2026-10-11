// 分段渲染完整片：每节一段无声视频 → 全片音轨一次渲成 wav → 拼接并混入音轨 → out/sisyphus.mp4
// 用法：node --experimental-strip-types scripts/render-full.ts [--only=节名,节名]
// --only 只重渲指定的段落（其余段落沿用 out/parts 里已有的文件），音轨和拼接照常进行
import {execFileSync} from 'node:child_process';
import {mkdirSync, writeFileSync} from 'node:fs';
import {CUES, type Section} from '../src/data/subtitles.ts';

const BROWSER = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const browserArgs = BROWSER ? [`--browser-executable=${BROWSER}`] : [];
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const run = (args: string[]) => execFileSync('npx', args, {stdio: 'inherit'});

const order: Section[] = [];
for (const c of CUES) if (!order.includes(c.section)) order.push(c.section);
const segments = order.map((s, i) => {
  const cs = CUES.filter((c) => c.section === s);
  return {name: `${String(i + 1).padStart(2, '0')}-${s}`, from: cs[0].start, to: cs[cs.length - 1].end - 1};
});

mkdirSync('out/parts', {recursive: true});
run(['node', 'scripts/synth-sfx.mjs']);
for (const seg of segments) {
  if (only && !only.some((o) => seg.name.endsWith(o))) continue;
  console.log(`\n▶ 渲染 ${seg.name}：第 ${seg.from}–${seg.to} 帧`);
  run(['remotion', 'render', 'src/index.ts', 'Sisyphus', `out/parts/${seg.name}.mp4`, `--frames=${seg.from}-${seg.to}`, '--muted', ...browserArgs]);
}
console.log('\n▶ 渲染全片音轨');
run(['remotion', 'render', 'src/index.ts', 'Sisyphus', 'out/parts/audio.wav', '--codec=wav', ...browserArgs]);

writeFileSync('out/parts/list.txt', segments.map((s) => `file '${s.name}.mp4'`).join('\n') + '\n');
console.log('\n▶ 拼接');
run(['remotion', 'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'out/parts/list.txt', '-i', 'out/parts/audio.wav',
  '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', 'out/sisyphus.mp4']);
console.log('\n✓ out/sisyphus.mp4');
