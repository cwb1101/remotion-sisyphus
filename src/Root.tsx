import React from 'react';
import {Composition, Still} from 'remotion';
import {FULL_DURATION, PREVIEW_DURATION, SCRIPT} from './data/script';
import {Video} from './Video';
import {Cover, COVER_H, COVER_W} from './Cover';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Full"
      component={Video}
      durationInFrames={FULL_DURATION}
      fps={SCRIPT.fps}
      width={SCRIPT.width}
      height={SCRIPT.height}
      defaultProps={{tail: SCRIPT.endTail}}
    />
    <Composition
      id="Preview"
      component={Video}
      durationInFrames={PREVIEW_DURATION}
      fps={SCRIPT.fps}
      width={SCRIPT.width}
      height={SCRIPT.height}
      defaultProps={{tail: SCRIPT.previewTail, lastScene: 's1'}}
    />
    <Still id="Cover" component={Cover} width={COVER_W} height={COVER_H} />
  </>
);
