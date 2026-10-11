/**
 * 世界层：套上全片唯一摄像机的变换；甩镜头时按摄像机速度加水平/垂直运动模糊。
 */
import React, {useId} from 'react';
import {AbsoluteFill} from 'remotion';
import {Cam, camTransform} from '../lib/camera';

export const World: React.FC<{cam: Cam; frame: number; children: React.ReactNode}> = ({cam, frame, children}) => {
	const id = useId().replace(/:/g, '');
	const v = cam;
	const bx = Math.min(28, Math.abs(v.vx) * 0.09);
	const by = Math.min(28, Math.abs(v.vy) * 0.09);
	const bz = Math.min(6, v.vz * 60);
	const blur = bx + by + bz > 0.6;
	return (
		<AbsoluteFill>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
				{blur && (
					<filter id={`mb-${id}`} filterUnits="userSpaceOnUse" x={-200} y={-200} width={2320} height={1480}>
						<feGaussianBlur stdDeviation={`${bx + bz} ${by + bz}`} />
					</filter>
				)}
				<g filter={blur ? `url(#mb-${id})` : undefined}>
					<g transform={camTransform(cam)}>{children}</g>
				</g>
			</svg>
		</AbsoluteFill>
	);
};
