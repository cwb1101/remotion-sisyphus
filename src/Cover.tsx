import React from 'react';
import { AbsoluteFill } from 'remotion';
import './fonts';
import { Stage3x4 } from './coverStage';
import { ChatBubble } from './components/ChatBubble';
import { EmotionBall } from './components/EmotionBall';
import { WATERMARK } from './components/Overlays';
import { Person } from './components/Person';
import { C, FONT_SANS, FONT_SERIF } from './theme';

/**
 * 3:4 封面（1080×1440）：沿用片中的寓言画风。
 * 上：开头那组反差——三百字的长消息 vs 一个「嗯」
 * 中：大标题「比冷暴力更磨人的 情感漠视」
 * 下：深夜沙发，中间隔着靠垫，小橙抱着发光的红球，小蓝低头看手机
 */
export const Cover: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: '#151832' }}>
      <Stage3x4>
        <defs>
          <linearGradient id="cv-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1B1F3F" />
            <stop offset="55%" stopColor="#1E2140" />
            <stop offset="100%" stopColor="#141630" />
          </linearGradient>
          <linearGradient id="cv-bubble" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F9A877" />
            <stop offset="100%" stopColor="#EC8045" />
          </linearGradient>
          <linearGradient id="cv-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0D1230" />
            <stop offset="100%" stopColor="#24305E" />
          </linearGradient>
          <radialGradient id="cv-lamp">
            <stop offset="0%" stopColor={C.lamp} stopOpacity={0.45} />
            <stop offset="100%" stopColor={C.lamp} stopOpacity={0} />
          </radialGradient>
          <filter id="cv-soft">
            <feGaussianBlur stdDeviation="4" />
          </filter>
          <filter id="cv-bokeh">
            <feGaussianBlur stdDeviation="20" />
          </filter>
        </defs>
        <rect width={1080} height={1440} fill="url(#cv-bg)" />
        <g filter="url(#cv-bokeh)">
          <circle cx={900} cy={160} r={150} fill={C.lamp} opacity={0.18} />
          <circle cx={120} cy={520} r={120} fill="#6F8CC9" opacity={0.16} />
        </g>

        {/* ── 上：三百字 vs 一个字 ── */}
        <g transform="translate(0 0)">
          <rect x={300} y={120} width={700} height={300} rx={48} fill="#000" opacity={0.22} transform="translate(8 12)" />
          <rect x={300} y={120} width={700} height={300} rx={48} fill="url(#cv-bubble)" />
          <g filter="url(#cv-soft)" opacity={0.55}>
            {[0, 1, 2, 3].map((i) => (
              <rect key={i} x={350} y={168 + i * 58} width={i === 3 ? 320 : 600 - (i % 2) * 80} height={24} rx={12} fill="#FFE0C9" />
            ))}
          </g>
          <text x={520} y={254} fontFamily={FONT_SANS} fontWeight={700} fontSize={52} fill="#FFF7EE">
            好难受
          </text>
          <text x={960} y={396} textAnchor="end" fontFamily={FONT_SANS} fontWeight={500} fontSize={30} fill="#FFF1E4" opacity={0.85}>
            312
          </text>
          <ChatBubble x={220} y={500} text="嗯" fill="#4F86D6" size={96} />
          <circle cx={346} cy={566} r={10} fill="#8FB0DD" />
        </g>

        {/* ── 中：大标题 ── */}
        <g>
          <text x={540} y={720} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={900} fontSize={92} fill={C.subtitle} letterSpacing="0.06em" style={{ textShadow: '0 4px 18px rgba(0,0,0,0.4)' }}>
            比冷暴力更磨人的
          </text>
          <text x={540} y={900} textAnchor="middle" fontFamily={FONT_SANS} fontWeight={900} fontSize={190} fill={C.accent} letterSpacing="0.04em">
            情感漠视
          </text>
          <rect x={300} y={936} width={480} height={4} rx={2} fill={C.gold} opacity={0.7} />
          <text x={540} y={1004} textAnchor="middle" fontFamily={FONT_SERIF} fontWeight={700} fontSize={46} fill={C.subtitle} letterSpacing="0.12em" style={{ textShadow: '0 3px 12px rgba(0,0,0,0.5)' }}>
            TA什么都没做错 你却很委屈
          </text>
        </g>

        {/* ── 下：深夜沙发，中间隔着一个靠垫 ── */}
        <g transform="translate(540 1262) scale(0.62)">
          {Array.from({ length: 14 }).map((_, i) => (
            <rect key={i} x={-980 + i * 140} y={-60 - ((i * 37) % 5) * 30} width={100} height={300} fill="#252A52" opacity={0.6} />
          ))}
          <circle cx={700} cy={-180} r={420} fill="url(#cv-lamp)" />
          <rect x={660} y={-120} width={14} height={124} fill="#C9A46A" />
          <path d="M 612 -120 L 722 -120 L 698 -200 L 636 -200 Z" fill={C.lamp} />
          <rect x={-1000} y={150} width={2000} height={300} fill={C.nightFloor} />
          <rect x={-600} y={-100} width={1200} height={150} rx={46} fill={C.sofa} />
          <rect x={-585} y={50} width={1170} height={56} rx={24} fill={C.sofaDark} />
          <rect x={-600} y={94} width={1200} height={62} rx={18} fill="#283350" />
          {[-1, 1].map((sd) => (
            <rect key={sd} x={sd === -1 ? -665 : 575} y={-36} width={90} height={150} rx={40} fill={C.sofa} />
          ))}
          <rect x={-56} y={-62} width={112} height={118} rx={30} fill="#56658A" transform="rotate(-4 0 0)" />
          <rect x={-44} y={-50} width={88} height={94} rx={24} fill="none" stroke="#6C7CA2" strokeWidth={3} strokeDasharray="6 7" transform="rotate(-4 0 0)" />
          <Person x={-300} y={40} scale={1.7} who="orange" legs="sit" armL={{ up: -14, bend: 30 }} armR={{ up: -14, bend: 30 }} look={{ x: 0.6, y: 0.5 }} mouth={-0.6} brows={0.9} />
          <EmotionBall uid="cv-ball" x={-300} y={40 - 34 * 1.7 + 6} r={32} glow={1} />
          <Person x={300} y={40} scale={1.7} who="blue" legs="sit" armL={{ up: -32, bend: 92 }} armR={{ up: -32, bend: 92 }} look={{ x: 0.1, y: 0.9 }} mouth={0} phoneGlow={1} />
          <g transform={`translate(300 ${40 - 50 * 1.7})`}>
            <rect x={-20} y={-30} width={40} height={60} rx={8} fill="#141824" />
            <rect x={-16} y={-25} width={32} height={50} rx={5} fill="#BFD8FF" />
            <circle r={70} fill="#BFD8FF" opacity={0.12} />
          </g>
        </g>
        {/* 底部压暗 + 暗角 */}
        <rect y={1300} width={1080} height={140} fill="#0B0D1C" opacity={0.35} />
      </Stage3x4>
      {/* 右上角水印：与成片一致 */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: 40,
          padding: '6px 12px 7px',
          border: '1px solid rgba(255, 250, 235, 1)',
          borderRadius: 2,
          opacity: 0.35,
          fontFamily: FONT_SANS,
          fontWeight: 500,
          fontSize: 22,
          lineHeight: '26px',
          letterSpacing: '0.12em',
          color: '#FFFAEB',
          whiteSpace: 'nowrap',
        }}
      >
        {WATERMARK}
      </div>
    </AbsoluteFill>
  );
};
