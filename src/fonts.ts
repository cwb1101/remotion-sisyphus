import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-sans-sc/900.css';
import {continueRender, delayRender} from 'remotion';
import {DATA} from './data/script';

// 思源黑体（Noto Sans SC）按 unicode-range 分片加载：先把全片会用到的字都加载完再开始渲染
const sample = `${DATA.screens.map((s) => s.text).join('')}第年痛苦改变？0123456789`;
const handle = delayRender('加载思源黑体');
Promise.all([700, 900].map((w) => document.fonts.load(`${w} 64px "Noto Sans SC"`, sample)))
	.then(() => continueRender(handle))
	.catch((err) => {
		console.error(err);
		continueRender(handle);
	});
