/**
 * 开发用：一次打包，渲染多张静帧，便于逐帧检查。
 * 用法：npx tsx scripts/stills.ts out/stills 0 15 30 45 ...
 */
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import fs from 'fs';
import path from 'path';

const [outDir, ...frames] = process.argv.slice(2);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

const main = async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
  const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? 'Film', browserExecutable });
  for (const fr of frames.map(Number)) {
    const output = path.join(outDir, `f${String(fr).padStart(4, '0')}.png`);
    await renderStill({ serveUrl, composition, frame: fr, output, browserExecutable });
    console.log(output);
  }
};
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
