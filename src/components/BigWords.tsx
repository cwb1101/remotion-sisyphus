import React from 'react';
import { script, section } from '../data/script';
import { BigWord, bigWordOutAt } from './BigWord';

/** 画面里所有“砸下来的大字”（屏幕坐标，不受镜头影响），只取 id ≤ lastScreen 的屏。 */
export const BigWords: React.FC<{ lastScreen: number }> = ({ lastScreen }) => {
  const list = script.screens.filter((s) => s.bigWord && s.id <= lastScreen);
  return (
    <>
      {list.map((s) => {
        const next = list.find((o) => o.section === s.section && o.startFrame > s.startFrame);
        return <BigWord key={s.id} s={s} dimAt={next ? next.startFrame - 2 : null} outAt={bigWordOutAt(s, section(s.section).endFrame)} />;
      })}
    </>
  );
};
