import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {Cam} from '../lib/camera';
import {hash} from '../lib/anim';

/** 浮尘：屏幕坐标，按深度跟随相机做视差，保证画面永远有细小的运动 */
export const Dust: React.FC<{cam: Cam; frame: number; color: string; strength?: number}> = ({cam, frame, color, strength = 1}) => {
  const W = 2400;
  const H = 1400;
  const mod = (v: number, m: number) => ((v % m) + m) % m;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: 80}, (_, i) => {
        const depth = 0.25 + hash(i + 200) * 0.75;
        const x = mod(hash(i) * W - cam.x * depth * 0.5 * cam.zoom + frame * (0.25 + depth * 0.6), W) - 240;
        const y = mod(hash(i + 100) * H - cam.y * depth * 0.5 * cam.zoom - frame * 0.25 * depth, H) - 160;
        const tw = 0.6 + 0.4 * Math.sin(frame / (9 + hash(i + 5) * 14) + i);
        return <circle key={i} cx={x} cy={y} r={0.8 + depth * 2.6} fill={color} opacity={(0.05 + depth * 0.22) * tw * strength} />;
      })}
    </svg>
  );
};

export const Vignette: React.FC<{amount?: number}> = ({amount = 0.6}) => (
  <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 45%, rgba(0,0,0,${amount}) 100%)`}} />
);
