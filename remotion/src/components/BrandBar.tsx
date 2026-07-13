import React from "react";
import { BRAND } from "../lib/brand";
import { useSlideUp } from "../lib/animations";

export const BrandBar: React.FC = () => {
  const style = useSlideUp(0);
  return (
    <div
      style={{
        position: "absolute",
        top: 64,
        left: 56,
        right: 56,
        display: "flex",
        alignItems: "center",
        gap: 16,
        ...style,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "rgba(193,140,255,0.18)",
          border: "1px solid rgba(193,140,255,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: BRAND.accent,
          fontWeight: 800,
          fontSize: 26,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        S
      </div>
      <div>
        <div
          style={{
            color: BRAND.fg,
            fontSize: 28,
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: -0.5,
          }}
        >
          {BRAND.name}
        </div>
        <div
          style={{
            color: BRAND.muted,
            fontSize: 18,
            fontFamily: "ui-monospace, monospace",
            marginTop: 2,
          }}
        >
          {BRAND.domain}
        </div>
      </div>
    </div>
  );
};
