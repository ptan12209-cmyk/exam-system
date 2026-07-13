import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Sequence,
  staticFile,
} from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { SceneVisual } from "../components/SceneVisual";
import {
  FPS,
  HEIGHT,
  PAD_AFTER_SPEECH,
  SCENES,
  TRANSITION_FRAMES,
  WIDTH,
  type Scene,
} from "../lib/scenes";
import { getVoiceDurationSeconds } from "../lib/get-audio-duration";
import { fontFamily } from "../lib/fonts";

export type StudyHubFullProps = {
  /** seconds per scene (audio-driven when files exist) */
  sceneSeconds: number[];
};

const defaultSeconds = SCENES.map((s) => s.minSeconds);

export const studyHubFullDefaultProps: StudyHubFullProps = {
  sceneSeconds: defaultSeconds,
};

function voicePath(sceneId: string) {
  return `voice/${sceneId}.mp3`;
}

export const calculateStudyHubMetadata: CalculateMetadataFunction<
  StudyHubFullProps
> = async () => {
  const sceneSeconds: number[] = [];

  for (const scene of SCENES) {
    const audioSec = await getVoiceDurationSeconds(voicePath(scene.id));
    if (audioSec != null) {
      sceneSeconds.push(Math.max(scene.minSeconds, audioSec + PAD_AFTER_SPEECH));
    } else {
      sceneSeconds.push(scene.minSeconds);
    }
  }

  const sceneFrames = sceneSeconds.map((s) => Math.ceil(s * FPS));
  const transitionTotal = TRANSITION_FRAMES * Math.max(0, SCENES.length - 1);
  // TransitionSeries shortens by transition duration between each pair
  const durationInFrames =
    sceneFrames.reduce((a, b) => a + b, 0) - transitionTotal;

  return {
    durationInFrames: Math.max(1, durationInFrames),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    props: {
      sceneSeconds,
    },
  };
};

const SceneWithVoice: React.FC<{
  scene: Scene;
  durationInFrames: number;
}> = ({ scene, durationInFrames }) => {
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneVisual scene={scene} />
      <Audio src={staticFile(voicePath(scene.id))} />
      {/* invisible duration anchor */}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <AbsoluteFill />
      </Sequence>
    </AbsoluteFill>
  );
};

/**
 * Single long video: scene-driven, voice-synced duration.
 * Generate voice first: npm run voice:generate
 */
export const StudyHubFull: React.FC<StudyHubFullProps> = ({
  sceneSeconds,
}) => {
  const seconds =
    sceneSeconds?.length === SCENES.length ? sceneSeconds : defaultSeconds;

  return (
    <AbsoluteFill style={{ backgroundColor: "#07060F", fontFamily }}>
      <TransitionSeries>
        {SCENES.map((scene, i) => {
          const frames = Math.ceil(seconds[i]! * FPS);
          return (
            <React.Fragment key={scene.id}>
              <TransitionSeries.Sequence durationInFrames={frames}>
                <SceneWithVoice scene={scene} durationInFrames={frames} />
              </TransitionSeries.Sequence>
              {i < SCENES.length - 1 ? (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({
                    durationInFrames: TRANSITION_FRAMES,
                  })}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};

export const studyHubFullConfig = {
  id: "StudyHubFull" as const,
  component: StudyHubFull,
  // Fallback until calculateMetadata runs
  durationInFrames: Math.ceil(
    defaultSeconds.reduce((a, b) => a + b, 0) * FPS -
      TRANSITION_FRAMES * (SCENES.length - 1),
  ),
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
  defaultProps: studyHubFullDefaultProps,
  calculateMetadata: calculateStudyHubMetadata,
};
