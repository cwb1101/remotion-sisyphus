import { Composition } from 'remotion';
import { Film } from './Film';
import { FPS, HEIGHT, WIDTH } from './data/script';

/** 预览：开头 + 第一节（0–25s） */
export const PREVIEW_FRAMES = 750;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Preview"
      component={Film}
      durationInFrames={PREVIEW_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
