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

export type VoiceMode = "none" | "full" | "per-scene";

export type StudyHubFullProps = {
  sceneSeconds: number[];
  voiceMode: VoiceMode;
};

const defaultSeconds = SCENES.map((s) => s.minSeconds);

export const studyHubFullDefaultProps: StudyHubFullProps = {
  sceneSeconds: defaultSeconds,
  voiceMode: "none",
};

const FULL_VOICE = "voice/full.mp3";

function sceneVoicePath(sceneId: string) {
  return `voice/${sceneId}.mp3`;
}

/** Weight scene length by script size (better than equal split for one full track). */
function sceneWeights(): number[] {
  return SCENES.map((s) => {
    const chars = s.lines.join("").length;
    return Math.max(chars, 20);
  });
}

function splitBudget(totalSceneSeconds: number): number[] {
  const weights = sceneWeights();
  const wSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / wSum) * totalSceneSeconds);
  // Floor to minSeconds then re-normalize overflow by scaling
  const floored = raw.map((s, i) => Math.max(s, SCENES[i]!.minSeconds * 0.85));
  const floorSum = floored.reduce((a, b) => a + b, 0);
  if (floorSum <= totalSceneSeconds) {
    const extra = totalSceneSeconds - floorSum;
    const rSum = raw.reduce((a, b) => a + b, 0);
    return floored.map((s, i) => s + (raw[i]! / rSum) * extra);
  }
  // If mins too large, scale all proportionally to budget
  return floored.map((s) => (s / floorSum) * totalSceneSeconds);
}

export const calculateStudyHubMetadata: CalculateMetadataFunction<
  StudyHubFullProps
> = async () => {
  const transitionSec =
    (Math.max(0, SCENES.length - 1) * TRANSITION_FRAMES) / FPS;

  // --- Priority 1: single full.mp3 (ElevenLabs one-shot) ---
  const fullSec = await getVoiceDurationSeconds(FULL_VOICE);
  if (fullSec != null && fullSec > 1) {
    // TransitionSeries duration = sum(scenes) - transitions
    // Want ≈ fullSec → sum(scenes) = fullSec + transitionSec
    const budget = fullSec + transitionSec;
    const sceneSeconds = splitBudget(budget);
    const durationInFrames = Math.ceil(fullSec * FPS);

    return {
      durationInFrames: Math.max(1, durationInFrames),
      fps: FPS,
      width: WIDTH,
      height: HEIGHT,
      props: {
        sceneSeconds,
        voiceMode: "full" as VoiceMode,
      },
    };
  }

  // --- Priority 2: per-scene s01.mp3 … s12.mp3 ---
  const sceneSeconds: number[] = [];
  let missing = 0;
  for (const scene of SCENES) {
    const audioSec = await getVoiceDurationSeconds(sceneVoicePath(scene.id));
    if (audioSec != null) {
      sceneSeconds.push(Math.max(scene.minSeconds, audioSec + PAD_AFTER_SPEECH));
    } else {
      missing += 1;
      sceneSeconds.push(scene.minSeconds);
    }
  }

  if (missing === 0) {
    const sceneFrames = sceneSeconds.map((s) => Math.ceil(s * FPS));
    const durationInFrames =
      sceneFrames.reduce((a, b) => a + b, 0) -
      TRANSITION_FRAMES * Math.max(0, SCENES.length - 1);

    return {
      durationInFrames: Math.max(1, durationInFrames),
      fps: FPS,
      width: WIDTH,
      height: HEIGHT,
      props: {
        sceneSeconds,
        voiceMode: "per-scene" as VoiceMode,
      },
    };
  }

  // --- Silent / visual only ---
  const sceneFrames = defaultSeconds.map((s) => Math.ceil(s * FPS));
  const durationInFrames =
    sceneFrames.reduce((a, b) => a + b, 0) -
    TRANSITION_FRAMES * Math.max(0, SCENES.length - 1);

  return {
    durationInFrames: Math.max(1, durationInFrames),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    props: {
      sceneSeconds: defaultSeconds,
      voiceMode: "none" as VoiceMode,
    },
  };
};

const SceneBlock: React.FC<{
  scene: Scene;
  durationInFrames: number;
  playPerSceneVoice: boolean;
}> = ({ scene, durationInFrames, playPerSceneVoice }) => {
  return (
    <AbsoluteFill style={{ fontFamily }}>
      <SceneVisual scene={scene} />
      {playPerSceneVoice ? (
        <Audio src={staticFile(sceneVoicePath(scene.id))} />
      ) : null}
      <Sequence from={0} durationInFrames={durationInFrames}>
        <AbsoluteFill />
      </Sequence>
    </AbsoluteFill>
  );
};

/**
 * Voice options:
 * 1) public/voice/full.mp3  — ONE ElevenLabs export (preferred for teacher)
 * 2) public/voice/s01.mp3 … s12.mp3 — split files
 * 3) no files — silent video
 */
export const StudyHubFull: React.FC<StudyHubFullProps> = ({
  sceneSeconds,
  voiceMode,
}) => {
  const seconds =
    sceneSeconds?.length === SCENES.length ? sceneSeconds : defaultSeconds;
  const mode = voiceMode ?? "none";

  return (
    <AbsoluteFill style={{ backgroundColor: "#07060F", fontFamily }}>
      {mode === "full" ? (
        <Audio src={staticFile(FULL_VOICE)} />
      ) : null}

      <TransitionSeries>
        {SCENES.map((scene, i) => {
          const frames = Math.ceil(seconds[i]! * FPS);
          return (
            <React.Fragment key={scene.id}>
              <TransitionSeries.Sequence durationInFrames={frames}>
                <SceneBlock
                  scene={scene}
                  durationInFrames={frames}
                  playPerSceneVoice={mode === "per-scene"}
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
