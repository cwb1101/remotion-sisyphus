/**
 * 字体：思源黑体 / 思源宋体（Google 发行名 Noto Sans SC / Noto Serif SC，字形相同），本地打包，不走网络。
 * 渲染前按全片字幕实际用到的字符预加载，避免首帧闪回退字体。
 */
import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import '@fontsource/noto-serif-sc/900.css';
import {continueRender, delayRender} from 'remotion';
import {ALL_TEXT} from './data/script';

const specs = [
	'400 30px "Noto Sans SC"',
	'700 72px "Noto Sans SC"',
	'900 72px "Noto Sans SC"',
	'900 150px "Noto Serif SC"',
];

const handle = delayRender('Loading Source Han (Noto CJK) fonts');
Promise.all(specs.map((s) => document.fonts.load(s, ALL_TEXT)))
	.then((res) => {
		const missing = res.filter((faces) => faces.length === 0).length;
		if (missing > 0) console.warn(`[fonts] ${missing} font spec(s) resolved no faces`);
		continueRender(handle);
	})
	.catch((e) => {
		console.error('[fonts] failed', e);
		continueRender(handle);
	});
