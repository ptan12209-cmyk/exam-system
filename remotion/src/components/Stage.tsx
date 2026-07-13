import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { BRAND } from "../lib/brand";
import { fontFamily } from "../lib/fonts";

export const StageBg: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = interpolate(frame, [0, 300], [0, 40], {
    extrapolateRight: "extend",
  });
  const pulse = interpolate(Math.sin(frame / 28), [-1, 1], [0.28, 0.5]);

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 980,
          height: 980,
          left: -200 + drift * 0.4,
          top: -280,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(196,161,255,${pulse}) 0%, transparent 62%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 820,
          height: 820,
          right: -240,
          bottom: -40 - drift * 0.25,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(255,107,157,0.28) 0%, transparent 58%)`,
        }}
      />
      {/* subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0.07,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, transparent 40%, rgba(7,6,15,0.75) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const Enter: React.FC<{
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const start = delay;
  const end = delay + Math.round(0.55 * fps);
  const t = interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 36}px) scale(${0.94 + t * 0.06})`,
        fontFamily,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export const TopBrand: React.FC = () => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 72,
        left: 56,
        right: 56,
        display: "flex",
        alignItems: "center",
        gap: 18,
        opacity: t,
        transform: `translateY(${(1 - t) * 16}px)`,
        fontFamily,
      }}
    >
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 16,
          background: "linear-gradient(135deg, #C4A1FF, #FF6B9D)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#0B0A13",
          fontWeight: 800,
          fontSize: 28,
        }}
      >
        S
      </div>
      <div>
        <div style={{ color: BRAND.fg, fontSize: 28, fontWeight: 700 }}>
          {BRAND.name}
        </div>
        <div style={{ color: BRAND.muted, fontSize: 18, fontWeight: 500 }}>
          {BRAND.domain}
        </div>
      </div>
    </div>
  );
};

export const ProgressBar: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / Math.max(1, durationInFrames - 1);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 6,
        background: "rgba(255,255,255,0.08)",
        zIndex: 50,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${p * 100}%`,
          background: "linear-gradient(90deg, #C4A1FF, #FF6B9D)",
        }}
      />
    </div>
  );
};
