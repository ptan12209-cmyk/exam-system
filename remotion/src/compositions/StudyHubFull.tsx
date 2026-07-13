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

/**
 * Silent preview target (~3 phút) khi chưa có full.mp3 —
 * ElevenLabs full của thầy ~180s.
 */
export const EXPECTED_FULL_VOICE_SEC = 180;

const defaultSeconds = (() => {
  const transitionSec =
    (Math.max(0, SCENES.length - 1) * TRANSITION_FRAMES) / FPS;
  // sum(scene) - transitions ≈ 180 → sum = 180 + transitions
  return splitBudget(EXPECTED_FULL_VOICE_SEC + transitionSec);
})();

export const studyHubFullDefaultProps: StudyHubFullProps = {
  sceneSeconds: defaultSeconds,
  voiceMode: "none",
};

const FULL_VOICE = "voice/full.mp3";

function sceneVoicePath(sceneId: string) {
  return `voice/${sceneId}.mp3`;
}

function sceneWeights(): number[] {
  return SCENES.map((s) => Math.max(s.lines.join("").length, 24));
}

/** Chia tổng thời lượng scene theo độ dài chữ script. */
function splitBudget(totalSceneSeconds: number): number[] {
  const weights = sceneWeights();
  const wSum = weights.reduce((a, b) => a + b, 0);
  const raw = weights.map((w) => (w / wSum) * totalSceneSeconds);
  const floored = raw.map((s, i) =>
    Math.max(s, SCENES[i]!.minSeconds * 0.75),
  );
  const floorSum = floored.reduce((a, b) => a + b, 0);
  if (floorSum <= 0) return raw;
  if (Math.abs(floorSum - totalSceneSeconds) < 0.01) return floored;
  return floored.map((s) => (s / floorSum) * totalSceneSeconds);
}

/**
 * TransitionSeries length = sum(seqFrames) - (n-1)*TRANSITION_FRAMES
 * Adjust last scene so total === targetFrames.
 */
function sceneFramesMatchingTotal(
  sceneSeconds: number[],
  targetFrames: number,
): number[] {
  const n = sceneSeconds.length;
  const frames = sceneSeconds.map((s) => Math.max(1, Math.round(s * FPS)));
  const transitions = TRANSITION_FRAMES * Math.max(0, n - 1);
  const current = frames.reduce((a, b) => a + b, 0) - transitions;
  const delta = targetFrames - current;
  frames[n - 1] = Math.max(1, frames[n - 1]! + delta);
  return frames;
}

export const calculateStudyHubMetadata: CalculateMetadataFunction<
  StudyHubFullProps
> = async () => {
  const n = SCENES.length;
  const transitionSec = (Math.max(0, n - 1) * TRANSITION_FRAMES) / FPS;

  // --- 1) ONE full.mp3 (e.g. 180s ElevenLabs) ---
  const fullSec = await getVoiceDurationSeconds(FULL_VOICE);
  if (fullSec != null && fullSec > 1) {
    // sum(sceneSec) = audio + transitions → after TransitionSeries ≈ audio
    const budget = fullSec + transitionSec;
    const sceneSeconds = splitBudget(budget);
    const targetFrames = Math.max(1, Math.round(fullSec * FPS));
    const frames = sceneFramesMatchingTotal(sceneSeconds, targetFrames);
    // store seconds for component (frames/FPS)
    const adjustedSeconds = frames.map((f) => f / FPS);

    return {
      durationInFrames: targetFrames,
      fps: FPS,
      width: WIDTH,
      height: HEIGHT,
      props: {
        sceneSeconds: adjustedSeconds,
        voiceMode: "full" as VoiceMode,
      },
    };
  }

  // --- 2) Per-scene s01…s12 ---
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
      TRANSITION_FRAMES * Math.max(0, n - 1);

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

  // --- 3) Silent preview ~180s layout ---
  const silentSeconds = splitBudget(EXPECTED_FULL_VOICE_SEC + transitionSec);
  const silentFrames = Math.round(EXPECTED_FULL_VOICE_SEC * FPS);
  const frames = sceneFramesMatchingTotal(silentSeconds, silentFrames);

  return {
    durationInFrames: silentFrames,
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    props: {
      sceneSeconds: frames.map((f) => f / FPS),
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
 * Voice:
 * - public/voice/full.mp3  → 1 track (e.g. 180s) drives whole video length
 * - public/voice/s01…s12   → per scene
 * - none                   → ~180s silent preview
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
      {mode === "full" ? <Audio src={staticFile(FULL_VOICE)} /> : null}

      <TransitionSeries>
        {SCENES.map((scene, i) => {
          const frames = Math.max(1, Math.round(seconds[i]! * FPS));
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
  durationInFrames: Math.round(EXPECTED_FULL_VOICE_SEC * FPS),
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
  defaultProps: studyHubFullDefaultProps,
  calculateMetadata: calculateStudyHubMetadata,
};
