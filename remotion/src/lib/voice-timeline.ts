import { FPS } from "./brand";
import { v1Config } from "../compositions/V1Hook";
import { v3Config } from "../compositions/V3Tour";
import { v6Config } from "../compositions/V6Trust";

/** Must match FullCombo.tsx layout */
const TRANSITION = Math.round(1.2 * FPS);
const END_CARD = 8 * FPS;

const T0 = 0;
const T1 = v1Config.durationInFrames;
const BRIDGE1 = T1;
const T2 = BRIDGE1 + TRANSITION;
const T3 = T2 + v3Config.durationInFrames;
const BRIDGE2 = T3;
const T4 = BRIDGE2 + TRANSITION;
const T5 = T4 + v6Config.durationInFrames;
const END = T5;

export type VoiceClip = {
  /** file under public/ */
  file: string;
  from: number;
  durationInFrames: number;
};

/**
 * Map TTS segments onto FullCombo sequences.
 * Audio shorter than slot is fine; longer gets cut by Sequence.
 */
export const FULL_COMBO_VOICE: VoiceClip[] = [
  {
    file: "voice/part-v1.mp3",
    from: T0,
    durationInFrames: v1Config.durationInFrames,
  },
  {
    file: "voice/part-bridge1.mp3",
    from: BRIDGE1,
    durationInFrames: TRANSITION,
  },
  {
    file: "voice/part-v3.mp3",
    from: T2,
    durationInFrames: v3Config.durationInFrames,
  },
  {
    file: "voice/part-bridge2.mp3",
    from: BRIDGE2,
    durationInFrames: TRANSITION,
  },
  {
    file: "voice/part-v6.mp3",
    from: T4,
    durationInFrames: v6Config.durationInFrames,
  },
  {
    file: "voice/part-end.mp3",
    from: END,
    durationInFrames: END_CARD,
  },
];
