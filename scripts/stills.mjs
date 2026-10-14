// 渲染若干静帧用于检查：node scripts/stills.mjs 0 114 300 ...  [--props='{"subtitles":"padOnly"}'] [--out=dir]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const args = process.argv.slice(2);
const frames = args.filter((a) => /^\d+$/.test(a)).map(Number);
const propsArg = args.find((a) => a.startsWith('--props='));
const outArg = args.find((a) => a.startsWith('--out='));
const props = {audio: false, ...(propsArg ? JSON.parse(propsArg.slice(8)) : {})};
const outDir = outArg ? outArg.slice(6) : 'out/stills';
const browserExecutable = process.env.REMOTION_BROWSER || '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const composition = await selectComposition({serveUrl, id: 'Preview', inputProps: props, browserExecutable});
for (const frame of frames) {
  const output = path.join(outDir, `f${String(frame).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, frame, output, inputProps: props, browserExecutable});
  console.log(output);
}
