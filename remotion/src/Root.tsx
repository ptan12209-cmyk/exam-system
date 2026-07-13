import React from "react";
import { Composition } from "remotion";
import {
  StudyHubFull,
  studyHubFullConfig,
} from "./compositions/StudyHubFull";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id={studyHubFullConfig.id}
      component={StudyHubFull}
      durationInFrames={studyHubFullConfig.durationInFrames}
      fps={studyHubFullConfig.fps}
      width={studyHubFullConfig.width}
      height={studyHubFullConfig.height}
      defaultProps={studyHubFullConfig.defaultProps}
      calculateMetadata={studyHubFullConfig.calculateMetadata}
    />
  );
};
