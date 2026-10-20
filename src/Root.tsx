import { Composition, Still } from 'remotion';
import { Cover } from './Cover';
import { Film } from './Film';
import { FPS, HEIGHT, SECTIONS, WIDTH } from './data/script';

/** 预览：开头 + 第一节（0–25s） */
export const PREVIEW_FRAMES = 750;
/** 完整片 */
export const FILM_FRAMES = SECTIONS[SECTIONS.length - 1].end;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="Film" component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Still id="Cover" component={Cover} width={1080} height={1440} />
      <Composition id="Preview" component={Film} durationInFrames={PREVIEW_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
    </>
  );
};
