import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { staticFile } from "remotion";

export async function getVoiceDurationSeconds(relativePath: string): Promise<number | null> {
  try {
    const sec = await getAudioDurationInSeconds(staticFile(relativePath));
    if (!Number.isFinite(sec) || sec <= 0) return null;
    return sec;
  } catch {
    return null;
  }
}
