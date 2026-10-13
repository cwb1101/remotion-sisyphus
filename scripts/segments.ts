/** 打印分段渲染的帧区间：每个场景一段（name start end，闭区间），最后一段包含片尾 */
import {SCENES, SCREENS} from '../src/data/script';
import {FILM_TAIL_FRAMES} from '../src/data/film-meta';
import {sceneRange} from '../src/data/timeline';

const total = SCREENS[SCREENS.length - 1].end + FILM_TAIL_FRAMES;
SCENES.forEach((s, i) => {
  const a = i === 0 ? 0 : sceneRange(s.id).start;
  const b = i === SCENES.length - 1 ? total - 1 : sceneRange(SCENES[i + 1].id).start - 1;
  console.log(`${String(i).padStart(2, '0')}-${s.id} ${a} ${b}`);
});
