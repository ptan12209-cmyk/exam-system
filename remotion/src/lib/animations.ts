import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/** Spring pop-in (scale + fade) */
export function useSpringIn(delay = 0, damping = 14) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping, stiffness: 120 },
  });
  return {
    opacity: s,
    transform: `scale(${interpolate(s, [0, 1], [0.88, 1])})`,
  };
}

/** Slide up + fade */
export function useSlideUp(delay = 0) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 100 },
  });
  return {
    opacity: s,
    transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
  };
}

/** Soft progress 0→1 over [from, to] frames */
export function useRange(from: number, to: number) {
  const frame = useCurrentFrame();
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}
