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
  sceneSeconds: number[];
  /** When false, no Audio tags (teacher drops ElevenLabs later or silent export) */
  playVoice: boolean;
};

const defaultSeconds = SCENES.map((s) => s.minSeconds);

export const studyHubFullDefaultProps: StudyHubFullProps = {
  sceneSeconds: defaultSeconds,
  playVoice: true,
};

function voicePath(sceneId: string) {
  return `voice/${sceneId}.mp3`;
}

export const calculateStudyHubMetadata: CalculateMetadataFunction<
  StudyHubFullProps
> = async () => {
  const sceneSeconds: number[] = [];
  let missing = 0;

  for (const scene of SCENES) {
    const audioSec = await getVoiceDurationSeconds(voicePath(scene.id));
    if (audioSec != null) {
      sceneSeconds.push(Math.max(scene.minSeconds, audioSec + PAD_AFTER_SPEECH));
    } else {
      missing += 1;
      sceneSeconds.push(scene.minSeconds);
    }
  }
  // Only bake Audio when every scene has a file (ElevenLabs drop-in)
  const anyVoice = missing === 0;

  const sceneFrames = sceneSeconds.map((s) => Math.ceil(s * FPS));
  const transitionTotal = TRANSITION_FRAMES * Math.max(0, SCENES.length - 1);
  const durationInFrames =
    sceneFrames.reduce((a, b) => a + b, 0) - transitionTotal;

  return {
    durationInFrames: Math.max(1, durationInFrames),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    props: {
      sceneSeconds,
      // Only attach <Audio> if all or most files exist — avoid crash mid-render
      playVoice: anyVoice,
    },
  };
};

const SceneBlock: React.FC<{
  scene: Scene;
  durationInFrames: number;
  playVoice: boolean;
}> = ({ scene, durationInFrames, playVoice }) => {
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneVisual scene={scene} />
      {playVoice ? (
        <Audio src={staticFile(voicePath(scene.id))} />
      ) : null}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <AbsoluteFill />
      </Sequence>
    </AbsoluteFill>
  );
};

/**
 * Video giới thiệu khóa học (bao quát).
 * Voice: thầy dùng ElevenLabs → đặt file public/voice/s01.mp3 … s12.mp3
 * Script: docs/marketing/ELEVENLABS_SCRIPT.md
 */
export const StudyHubFull: React.FC<StudyHubFullProps> = ({
  sceneSeconds,
  playVoice,
}) => {
  const seconds =
    sceneSeconds?.length === SCENES.length ? sceneSeconds : defaultSeconds;
  const voiceOn = playVoice !== false;

  return (
    <AbsoluteFill style={{ backgroundColor: "#07060F", fontFamily }}>
      <TransitionSeries>
        {SCENES.map((scene, i) => {
          const frames = Math.ceil(seconds[i]! * FPS);
          return (
            <React.Fragment key={scene.id}>
              <TransitionSeries.Sequence durationInFrames={frames}>
                <SceneBlock
                  scene={scene}
                  durationInFrames={frames}
                  playVoice={voiceOn}
                />
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
