import React from "react";
import { Composition } from "remotion";
import { PoseTest, POSE_TEST_FRAMES } from "./PoseTest";
import { Film, PREVIEW_END } from "./Film";
import { FPS } from "./lib/rhythm";
import { loadFonts } from "./styles/fonts";

loadFonts();

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Preview" component={Film} durationInFrames={PREVIEW_END} fps={FPS} width={1920} height={1080} />
    <Composition id="PoseTest" component={PoseTest} durationInFrames={POSE_TEST_FRAMES} fps={FPS} width={1920} height={1080} />
  </>
);
