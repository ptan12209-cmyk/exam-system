import React from "react";
import { BRAND } from "../lib/brand";
import { useSpringIn } from "../lib/animations";

export const BigText: React.FC<{
  line: string;
  sub?: string;
  delay?: number;
  size?: number;
}> = ({ line, sub, delay = 0, size = 72 }) => {
  const style = useSpringIn(delay);
  return (
    <div
      style={{
        textAlign: "center",
        padding: "0 56px",
        maxWidth: 980,
        margin: "0 auto",
        ...style,
      }}
    >
      <div
        style={{
          color: BRAND.fg,
          fontSize: size,
          fontWeight: 650,
          lineHeight: 1.12,
          letterSpacing: -1.5,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {line}
      </div>
      {sub ? (
        <div
          style={{
            color: BRAND.soft,
            fontSize: 28,
            lineHeight: 1.4,
            marginTop: 20,
            fontFamily: "system-ui, sans-serif",
            fontWeight: 450,
          }}
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
};
