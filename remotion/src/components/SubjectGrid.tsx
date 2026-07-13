import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SubjectChip } from "../lib/brand";
import { BRAND } from "../lib/brand";

export const SubjectGrid: React.FC<{
  items: SubjectChip[];
  startFrame?: number;
}> = ({ items, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 16,
        width: 720,
        margin: "28px auto 0",
      }}
    >
      {items.map((item, i) => {
        const s = spring({
          frame: frame - startFrame - i * 4,
          fps,
          config: { damping: 14, stiffness: 140 },
        });
        const y = interpolate(s, [0, 1], [28, 0]);
        return (
          <div
            key={item.label}
            style={{
              opacity: s,
              transform: `translateY(${y}px) scale(${interpolate(s, [0, 1], [0.92, 1])})`,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "18px 20px",
              borderRadius: 20,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.06)",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <span style={{ fontSize: 36 }}>{item.icon}</span>
            <span
              style={{
                color: BRAND.fg,
                fontSize: 26,
                fontWeight: 600,
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

/** Full-frame centered content helper */
export const CenterStage: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <AbsoluteFill
    style={{
      justifyContent: "center",
      alignItems: "center",
      paddingBottom: 140,
    }}
  >
    {children}
  </AbsoluteFill>
);
