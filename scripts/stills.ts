// 批量渲染静帧: 只打包一次, 再按帧号逐张出图
// 用法: npx tsx scripts/stills.ts <输出目录> <帧号,帧号,...> [mode] [scale]
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const BROWSER = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';

const main = async () => {
	const [outDir, framesArg, mode = 'normal', scaleArg = '1', comp = 'Preview'] = process.argv.slice(2);
	const frames = framesArg.split(',').map(Number);
	fs.mkdirSync(outDir, {recursive: true});
	const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
	const inputProps = {mode};
	const composition = await selectComposition({serveUrl, id: comp, inputProps, browserExecutable: BROWSER});
	for (const frame of frames) {
		const output = path.join(outDir, `${mode}-${String(frame).padStart(4, '0')}.png`);
		await renderStill({composition, serveUrl, output, frame, inputProps, scale: Number(scaleArg), browserExecutable: BROWSER});
		console.log(output);
	}
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
