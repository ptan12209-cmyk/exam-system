import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "../lib/scenes";
import { BRAND } from "../lib/brand";
import { fontFamily } from "../lib/fonts";
import { Enter, StageBg, TopBrand, ProgressBar } from "./Stage";
import { ZaloQr } from "./ZaloQr";

const Chip: React.FC<{ label: string; i: number }> = ({ label, i }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [10 + i * 4, 22 + i * 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  return (
    <div
      style={{
        opacity: t,
        transform: `translateY(${(1 - t) * 18}px)`,
        padding: "14px 20px",
        borderRadius: 16,
        border: `1px solid ${BRAND.border}`,
        background: BRAND.bgCard,
        color: BRAND.fg,
        fontSize: 26,
        fontWeight: 600,
        fontFamily,
        backdropFilter: "blur(8px)",
      }}
    >
      {label}
    </div>
  );
};

export const SceneVisual: React.FC<{ scene: Scene }> = ({ scene }) => {
  return (
    <AbsoluteFill>
      <StageBg />
      <ProgressBar />
      <TopBrand />

      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "140px 56px 100px",
          fontFamily,
        }}
      >
        <Enter>
          {scene.visual === "hook-badge" && (
            <div
              style={{
                marginBottom: 28,
                padding: "12px 22px",
                borderRadius: 999,
                border: `1px solid ${BRAND.accent}66`,
                background: `${BRAND.accent}22`,
                color: BRAND.accent,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
                textAlign: "center",
              }}
            >
              Dành cho 2k9
            </div>
          )}

          <div
            style={{
              color: BRAND.fg,
              fontSize: scene.title.length > 18 ? 64 : 78,
              fontWeight: 800,
              lineHeight: 1.08,
              letterSpacing: -1.8,
              textAlign: "center",
              maxWidth: 920,
            }}
          >
            {scene.title}
          </div>
          <div
            style={{
              marginTop: 22,
              color: BRAND.soft,
              fontSize: 30,
              fontWeight: 500,
              lineHeight: 1.4,
              textAlign: "center",
              maxWidth: 820,
            }}
          >
            {scene.line}
          </div>

          {scene.chips && scene.chips.length > 0 && (
            <div
              style={{
                marginTop: 40,
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "center",
                maxWidth: 900,
              }}
            >
              {scene.chips.map((c, i) => (
                <Chip key={c} label={c} i={i} />
              ))}
            </div>
          )}

          {scene.visual === "end-qr" && (
            <div style={{ marginTop: 40 }}>
              <ZaloQr size={280} label="Quét QR · nhắn Zalo" />
            </div>
          )}

          {(scene.visual === "trust-device" || scene.visual === "trust-record") && (
            <div
              style={{
                marginTop: 48,
                width: 120,
                height: 120,
                borderRadius: 28,
                border: `1px solid ${BRAND.accent}55`,
                background: `linear-gradient(145deg, ${BRAND.accent}33, ${BRAND.accentHot}22)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 56,
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {scene.visual === "trust-device" ? "📱" : "🎬"}
            </div>
          )}
        </Enter>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
