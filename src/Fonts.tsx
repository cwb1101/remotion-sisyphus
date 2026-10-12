import '@fontsource/noto-serif-sc/500.css';
import '@fontsource/noto-serif-sc/600.css';
import '@fontsource/noto-serif-sc/700.css';
import '@fontsource/noto-serif-sc/900.css';
import '@fontsource/noto-sans-sc/300.css';
import '@fontsource/noto-sans-sc/400.css';
import {useEffect, useState} from 'react';
import {continueRender, delayRender} from 'remotion';
import {SCREENS} from './data/script';

/** 把字幕里用到的字形全部加载完再开始渲染，避免首帧回退字体 */
export const useFonts = () => {
  const [handle] = useState(() => delayRender('加载思源宋体 / 思源黑体'));
  useEffect(() => {
    const zh = SCREENS.map((s) => s.text).join('') + '0123456789';
    const en = SCREENS.map((s) => `${s.options?.note ?? ''}${s.options?.index ?? ''}`).join('') + 'DON QUIXOTE';
    Promise.all([
      ...[500, 600, 700, 900].map((w) => document.fonts.load(`${w} 64px "Noto Serif SC"`, zh)),
      ...[300, 400].map((w) => document.fonts.load(`${w} 26px "Noto Sans SC"`, en + zh)),
    ])
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }, [handle]);
};
