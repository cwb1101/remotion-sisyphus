/** 开发用：打包一次，批量渲染指定帧的静帧。用法：tsx scripts/stills.ts 60 150 240 ... */
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const SHELL = process.env.REMOTION_BROWSER ?? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

(async () => {
  const frames = process.argv.slice(2).map(Number);
  const serveUrl = await bundle({entryPoint: path.join(__dirname, '..', 'src', 'index.ts')});
  const browserExecutable = fs.existsSync(SHELL) ? SHELL : undefined;
  const composition = await selectComposition({serveUrl, id: 'Preview', browserExecutable});
  fs.mkdirSync('out/stills', {recursive: true});
  for (const frame of frames) {
    const output = `out/stills/f${String(frame).padStart(4, '0')}.png`;
    await renderStill({serveUrl, composition, frame, output, browserExecutable});
    console.log(output);
  }
})();
