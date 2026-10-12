import React from 'react';
import {Composition} from 'remotion';
import {PREVIEW_DURATION, SCRIPT} from './data/script';
import {Video} from './Video';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Preview"
      component={Video}
      durationInFrames={PREVIEW_DURATION}
      fps={SCRIPT.fps}
      width={SCRIPT.width}
      height={SCRIPT.height}
      defaultProps={{tail: SCRIPT.previewTail}}
    />
  </>
);
