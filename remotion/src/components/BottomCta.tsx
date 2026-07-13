import React from "react";
import { BRAND } from "../lib/brand";
import { useSlideUp } from "../lib/animations";

export const BottomCta: React.FC<{ delay?: number }> = ({ delay = 8 }) => {
  const style = useSlideUp(delay);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "28px 40px 48px",
        background:
          "linear-gradient(transparent, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.75))",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        textAlign: "center",
        ...style,
      }}
    >
      <div
        style={{
          color: BRAND.fg,
          fontSize: 22,
          fontWeight: 600,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {BRAND.domain}
      </div>
      <div
        style={{
          color: BRAND.accent,
          fontSize: 20,
          fontFamily: "ui-monospace, monospace",
          marginTop: 6,
          letterSpacing: 0.5,
        }}
      >
        Zalo {BRAND.zaloDisplay}
      </div>
    </div>
  );
};
