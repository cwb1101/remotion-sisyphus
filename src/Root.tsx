import React from 'react';
import {Composition} from 'remotion';
import {FULL_DURATION, PREVIEW_DURATION, SCRIPT} from './data/script';
import {Video} from './Video';

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
  </>
);
