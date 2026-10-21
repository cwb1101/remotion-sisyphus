// 用同一个浏览器批量渲染指定帧的静帧，便于快速检查画面（并尽早暴露安全区报错）
// 用法：node scripts/stills.mjs <composition> <outDir> <frame,frame,...> [scale]
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [comp = 'Film', outDir = 'out/stills', list = '0', scale = '0.5'] = process.argv.slice(2);
const frames = list.split(',').map(Number);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browserExecutable = process.env.REMOTION_BROWSER_EXECUTABLE ?? null;
const browser = await openBrowser('chrome', {browserExecutable});
const composition = await selectComposition({serveUrl, id: comp, puppeteerInstance: browser, browserExecutable});
let failed = 0;
for (const frame of frames) {
	const output = path.join(outDir, `f${String(frame).padStart(4, '0')}.png`);
	try {
		await renderStill({composition, serveUrl, frame, output, scale: Number(scale), puppeteerInstance: browser, browserExecutable, overwrite: true});
		console.log('ok', frame);
	} catch (e) {
		failed++;
		console.log('FAIL', frame, String(e.message).split('\n')[0]);
	}
}
await browser.close({silent: true});
process.exit(failed ? 1 : 0);
