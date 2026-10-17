import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {FONTS} from './theme';

const faces: [string, string][] = [
	[FONTS.sans, 'SourceHanSansCN-Medium.woff2'],
	[FONTS.sansHeavy, 'SourceHanSansCN-Heavy.woff2'],
	[FONTS.serifHeavy, 'SourceHanSerifCN-Heavy.woff2'],
	[FONTS.smiley, 'SmileySans-Oblique.woff2'],
];

export const fontsReady = Promise.all(
	faces.map(([family, file]) =>
		loadFont({family, url: staticFile(`fonts/${file}`), format: 'woff2'}),
	),
);
