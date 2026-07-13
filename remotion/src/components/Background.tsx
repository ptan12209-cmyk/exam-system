import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { BRAND } from "../lib/brand";

export const Background: React.FC<{ hueShift?: number }> = ({ hueShift = 0 }) => {
  const frame = useCurrentFrame();
  const pulse = interpolate(Math.sin(frame / 40), [-1, 1], [0.35, 0.55]);
  const drift = interpolate(frame, [0, 300], [0, 30], {
    extrapolateRight: "extend",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          left: -120 + drift * 0.3,
          top: -200,
          borderRadius: "50%",
          background: `radial-gradient(circle, oklch(0.55 0.2 ${290 + hueShift} / ${pulse}), transparent 65%)`,
          filter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 700,
          height: 700,
          right: -180,
          bottom: 80 - drift * 0.2,
          borderRadius: "50%",
          background: `radial-gradient(circle, oklch(0.4 0.16 ${320 + hueShift} / 0.4), transparent 60%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, transparent 0%, rgba(6,5,16,0.2) 50%, rgba(6,5,16,0.85) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
