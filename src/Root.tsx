import {Composition} from 'remotion';
import {HuiYi} from './huiyi/HuiYi';
import {VIDEO} from './huiyi/config';
import {getTotalFrames} from './huiyi/beat';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HuiYi"
      component={HuiYi}
      durationInFrames={getTotalFrames()}
      fps={VIDEO.fps}
      width={VIDEO.width}
      height={VIDEO.height}
    />
  );
};
