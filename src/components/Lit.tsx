/** 受光：把一组图形按光照强度压暗（舞台上走出光区的人会没入黑暗） */
import React, {useId} from 'react';

export const Lit: React.FC<{level: number; children: React.ReactNode}> = ({level, children}) => {
	const id = useId().replace(/:/g, '');
	if (level >= 0.985) return <g>{children}</g>;
	const l = Math.max(0, level);
	return (
		<g filter={`url(#lit-${id})`}>
			<filter id={`lit-${id}`} x="-20%" y="-20%" width="140%" height="140%">
				<feComponentTransfer>
					<feFuncR type="linear" slope={l} />
					<feFuncG type="linear" slope={l} />
					<feFuncB type="linear" slope={l * 1.05} />
				</feComponentTransfer>
			</filter>
			{children}
		</g>
	);
};

/** 某点受到若干聚光灯的光照（0..1） */
export const lightAt = (x: number, spots: {x: number; width: number; intensity: number}[], ambient = 0.18) => {
	let v = ambient;
	for (const s of spots) {
		const d = Math.abs(x - s.x) / (s.width * 0.5);
		const f = d < 0.7 ? 1 : d > 1.5 ? 0 : 1 - (d - 0.7) / 0.8;
		v = Math.max(v, s.intensity * f);
	}
	return Math.min(1, v);
};
