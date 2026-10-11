/**
 * 批量抽静帧（一次打包、一个浏览器）：node scripts/stills.mjs <合成ID> <输出目录> <帧号...|every:N>
 */
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const [id = 'Full', outDir = 'out/stills', ...rest] = process.argv.slice(2);
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable: process.env.REMOTION_BROWSER ?? null});
const composition = await selectComposition({serveUrl, id, puppeteerInstance: browser});
let frames = rest.map(Number);
if (rest[0]?.startsWith('every:')) {
	const n = Number(rest[0].split(':')[1]);
	frames = Array.from({length: Math.ceil(composition.durationInFrames / n)}, (_, i) => i * n);
}
for (const f of frames) {
	const output = path.join(outDir, `f${String(f).padStart(4, '0')}.jpg`);
	await renderStill({serveUrl, composition, frame: f, output, imageFormat: 'jpeg', jpegQuality: 85, puppeteerInstance: browser});
	process.stdout.write(`${f} `);
}
await browser.close({silent: true});
console.log('\ndone');
