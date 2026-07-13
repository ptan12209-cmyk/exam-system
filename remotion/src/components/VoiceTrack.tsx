import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { FULL_COMBO_VOICE } from "../lib/voice-timeline";

type Props = {
  /** set false to mute (preview without TTS) */
  enabled?: boolean;
  volume?: number;
};

/**
 * Plays pre-generated edge-tts MP3s aligned to FullCombo chapters.
 * Generate: npm run voice:generate
 */
export const VoiceTrack: React.FC<Props> = ({
  enabled = true,
  volume = 1,
}) => {
  if (!enabled) return null;

  return (
    <>
      {FULL_COMBO_VOICE.map((clip) => (
        <Sequence
          key={clip.file}
          from={clip.from}
          durationInFrames={clip.durationInFrames}
          name={`voice:${clip.file}`}
        >
          <Audio src={staticFile(clip.file)} volume={volume} />
        </Sequence>
      ))}
    </>
  );
};
