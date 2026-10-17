import React from 'react';
import {AbsoluteFill, Audio, staticFile, useCurrentFrame} from 'remotion';
import {CHAPTERS} from './data/script';
import {Overlay} from './overlay/Overlay';
import {S1Trap} from './sections/S1Trap';
import {S2Idle} from './sections/S2Idle';
import {COLORS} from './theme';

// 每节一个组件 按章节表的帧区间出场 节与节之间靠镜头推拉衔接
const SECTIONS: React.FC[] = [S1Trap, S2Idle];

// 文字审计模式 只显示带 txt 类名的文字 其余全部隐藏 用来检查禁字区
const AUDIT_CSS = `
.audit *:not(.txt) { visibility: hidden !important; box-shadow: none !important; }
.audit *:not(.txt):not(.txt *) { background: none !important; }
.audit .txt, .audit .txt * { visibility: visible !important; }
`;

export const Film: React.FC<{textOnly?: boolean; audio?: string}> = ({textOnly = false, audio}) => {
	const frame = useCurrentFrame();
	const chapter = CHAPTERS.find((c) => frame >= c.start && frame < c.end);
	const Section = chapter ? SECTIONS[chapter.index] : undefined;
	return (
		<AbsoluteFill className={textOnly ? 'audit' : undefined} style={{background: textOnly ? '#000' : COLORS.bg}}>
			{textOnly ? <style>{AUDIT_CSS}</style> : null}
			{Section ? <Section /> : null}
			<Overlay />
			{audio && !textOnly ? <Audio src={staticFile(audio)} /> : null}
		</AbsoluteFill>
	);
};
