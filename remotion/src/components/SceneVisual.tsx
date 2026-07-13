import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "../lib/scenes";
import { BRAND } from "../lib/brand";
import { fontFamily } from "../lib/fonts";
import { Enter, StageBg, TopBrand, ProgressBar } from "./Stage";
import { ZaloQr } from "./ZaloQr";

const Chip: React.FC<{ label: string; i: number }> = ({ label, i }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [8 + i * 3, 20 + i * 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 14}px)`,
        padding: "12px 18px",
        borderRadius: 14,
        border: `1px solid ${BRAND.border}`,
        background: BRAND.bgCard,
        color: BRAND.fg,
        fontSize: 24,
        fontWeight: 600,
        fontFamily,
      }}
    >
      {label}
    </div>
  );
};

const RowCard: React.FC<{ text: string; i: number }> = ({ text, i }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [12 + i * 5, 26 + i * 5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <div
      style={{
        opacity: t,
        transform: `translateX(${(1 - t) * 24}px)`,
        width: "100%",
        maxWidth: 880,
        padding: "16px 22px",
        marginBottom: 12,
        borderRadius: 16,
        border: `1px solid ${BRAND.border}`,
        background: "rgba(255,255,255,0.05)",
        color: BRAND.soft,
        fontSize: 26,
        fontWeight: 500,
        fontFamily,
        textAlign: "left",
      }}
    >
      {text}
    </div>
  );
};

export const SceneVisual: React.FC<{ scene: Scene }> = ({ scene }) => {
  const isPromo = scene.visual === "promo";
  const isCta = scene.visual === "cta-qr";
  const isTrial = scene.visual === "trial";

  return (
    <AbsoluteFill>
      <StageBg />
      <ProgressBar />
      <TopBrand />

      <AbsoluteFill
        style={{
          justifyContent: isCta ? "flex-start" : "center",
          alignItems: "center",
          padding: isCta ? "160px 48px 80px" : "150px 48px 90px",
          fontFamily,
        }}
      >
        <Enter style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {scene.section ? (
            <div
              style={{
                marginBottom: 18,
                color: BRAND.accent,
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 2.5,
                textTransform: "uppercase",
              }}
            >
              {scene.section}
            </div>
          ) : null}

          {isTrial && (
            <div
              style={{
                marginBottom: 20,
                padding: "10px 20px",
                borderRadius: 999,
                background: "linear-gradient(90deg, #C4A1FF, #FF6B9D)",
                color: "#0B0A13",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: 1,
              }}
            >
              ƯU ĐÃI ĐẶC BIỆT
            </div>
          )}

          <div
            style={{
              color: BRAND.fg,
              fontSize: scene.title.length > 22 ? 56 : 72,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1.6,
              textAlign: "center",
              maxWidth: 940,
            }}
          >
            {scene.title}
          </div>

          <div
            style={{
              marginTop: 18,
              color: BRAND.soft,
              fontSize: 28,
              fontWeight: 500,
              lineHeight: 1.45,
              textAlign: "center",
              maxWidth: 860,
            }}
          >
            {scene.line}
          </div>

          {scene.chips && (
            <div
              style={{
                marginTop: 36,
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
                maxWidth: 920,
              }}
            >
              {scene.chips.map((c, i) => (
                <Chip key={c} label={c} i={i} />
              ))}
            </div>
          )}

          {scene.rows && (
            <div
              style={{
                marginTop: 32,
                width: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {scene.rows.map((r, i) => (
                <RowCard key={r} text={isPromo ? r : `• ${r}`} i={i} />
              ))}
            </div>
          )}

          {scene.bullets && (
            <div
              style={{
                marginTop: 32,
                width: "100%",
                maxWidth: 820,
              }}
            >
              {scene.bullets.map((b, i) => (
                <RowCard key={b} text={`✓  ${b}`} i={i} />
              ))}
            </div>
          )}

          {isCta && (
            <div style={{ marginTop: 36 }}>
              <ZaloQr size={260} label="Quét QR · học thử ngay" />
            </div>
          )}
        </Enter>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
