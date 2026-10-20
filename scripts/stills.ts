// 渲染若干单帧用于自查：npx tsx scripts/stills.ts 0 30 60 ...
import {existsSync} from 'node:fs';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';

const frames = process.argv.slice(2).map(Number);
const outDir = path.join(process.cwd(), 'out', 'stills');

(async () => {
  const serveUrl = await bundle({entryPoint: path.join(process.cwd(), 'src', 'index.ts')});
  const bundled = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
  const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? (existsSync(bundled) ? bundled : null);
  const composition = await selectComposition({serveUrl, id: 'Preview', browserExecutable});
  for (const frame of frames) {
    const output = path.join(outDir, `f${String(frame).padStart(4, '0')}.png`);
    await renderStill({composition, serveUrl, frame, output, browserExecutable, imageFormat: 'png'});
    console.log(output);
  }
})();
