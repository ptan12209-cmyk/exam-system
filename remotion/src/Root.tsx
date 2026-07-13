import React from "react";
import { Composition } from "remotion";
import { V1Hook, v1Config } from "./compositions/V1Hook";
import { V3Tour, v3Config } from "./compositions/V3Tour";
import { V6Trust, v6Config } from "./compositions/V6Trust";
import { FullCombo, fullComboConfig } from "./compositions/FullCombo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={fullComboConfig.id}
        component={FullCombo}
        durationInFrames={fullComboConfig.durationInFrames}
        fps={fullComboConfig.fps}
        width={fullComboConfig.width}
        height={fullComboConfig.height}
      />
      <Composition
        id={v1Config.id}
        component={V1Hook}
        durationInFrames={v1Config.durationInFrames}
        fps={v1Config.fps}
        width={v1Config.width}
        height={v1Config.height}
      />
      <Composition
        id={v3Config.id}
        component={V3Tour}
        durationInFrames={v3Config.durationInFrames}
        fps={v3Config.fps}
        width={v3Config.width}
        height={v3Config.height}
      />
      <Composition
        id={v6Config.id}
        component={V6Trust}
        durationInFrames={v6Config.durationInFrames}
        fps={v6Config.fps}
        width={v6Config.width}
        height={v6Config.height}
      />
    </>
  );
};
