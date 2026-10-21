import '@fontsource/noto-sans-sc/400.css';
import '@fontsource/noto-sans-sc/700.css';
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/noto-serif/400-italic.css';
import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {KEYWORDS, LABELS, SCREENS, SECTIONS, TOPIC} from './data/script';

const ALL_TEXT = Array.from(
	new Set(
		[TOPIC, ...SCREENS.map((s) => s.text), ...SECTIONS.flatMap((s) => [s.title, s.titleEn]), ...Object.values(KEYWORDS), ...Object.values(LABELS), '0123456789']
			.join('')
			.split(''),
	),
).join('');

const SPECS = [
	'400 20px "Noto Sans SC"',
	'700 64px "Noto Sans SC"',
	'700 64px "Noto Serif SC"',
	'600 64px "Barlow Condensed"',
	'400 14px "JetBrains Mono"',
	'italic 400 30px "Noto Serif"',
];

/** 等所有用到的字形（含中文分片）加载完再出帧 */
export const useFontsReady = () => {
	const [handle] = useState(() => delayRender('加载字体'));
	useEffect(() => {
		Promise.all(SPECS.map((s) => document.fonts.load(s, ALL_TEXT)))
			.then(() => document.fonts.ready)
			.then(() => continueRender(handle))
			.catch((err) => {
				console.error(err);
				continueRender(handle);
			});
	}, [handle]);
};
