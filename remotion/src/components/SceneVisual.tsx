import React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Scene } from "../lib/scenes";
import { BRAND } from "../lib/brand";
import { fontFamily } from "../lib/fonts";
import { StageBg, TopBrand, ProgressBar } from "./Stage";
import { ZaloQr } from "./ZaloQr";

/**
 * Hiện đúng từng câu voice (scene.lines) — dòng đầu title, các dòng sau lần lượt hiện.
 * Chips chỉ là highlight phụ, không nói khác nội dung lines.
 */
export const SceneVisual: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const isCta = scene.visual === "cta-qr";
  const isTrial = scene.visual === "trial";
  const isPromo = scene.visual === "promo";

  const [title, ...rest] = scene.lines;
  const n = Math.max(1, rest.length);

  // Chia thời gian scene cho từng dòng phụ (khớp nhịp nói)
  const lineStart = (i: number) => {
    const usable = Math.max(1, durationInFrames - Math.round(0.35 * fps));
    return Math.round((i / n) * usable * 0.85) + Math.round(0.2 * fps);
  };

  const titleT = interpolate(frame, [0, Math.round(0.4 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill>
      <StageBg />
      <ProgressBar />
      <TopBrand />

      <AbsoluteFill
        style={{
          justifyContent: isCta ? "flex-start" : "center",
          alignItems: "center",
          padding: isCta ? "150px 44px 70px" : "140px 44px 80px",
          fontFamily,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 920,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Section */}
          <div
            style={{
              opacity: titleT,
              marginBottom: 14,
              color: BRAND.accent,
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: 2.4,
              textTransform: "uppercase",
            }}
          >
            {scene.section}
          </div>

          {isTrial && (
            <div
              style={{
                opacity: titleT,
                marginBottom: 16,
                padding: "10px 18px",
                borderRadius: 999,
                background: "linear-gradient(90deg, #C4A1FF, #FF6B9D)",
                color: "#0B0A13",
                fontSize: 18,
                fontWeight: 800,
              }}
            >
              ƯU ĐÃI ĐẶC BIỆT
            </div>
          )}

          {/* Dòng 1 = đúng câu mở voice */}
          <div
            style={{
              opacity: titleT,
              transform: `translateY(${(1 - titleT) * 28}px)`,
              color: BRAND.fg,
              fontSize:
                (title?.length ?? 0) > 28 ? 48 : (title?.length ?? 0) > 18 ? 58 : 70,
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: -1.4,
              textAlign: "center",
              marginBottom: 20,
            }}
          >
            {title}
          </div>

          {/* Các câu tiếp = đúng script, hiện lần lượt */}
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: isPromo ? 10 : 12,
              alignItems: "stretch",
            }}
          >
            {rest.map((line, i) => {
              const start = lineStart(i);
              const t = interpolate(frame, [start, start + Math.round(0.45 * fps)], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
                easing: Easing.bezier(0.16, 1, 0.3, 1),
              });
              return (
                <div
                  key={`${scene.id}-${i}`}
                  style={{
                    opacity: t,
                    transform: `translateY(${(1 - t) * 16}px)`,
                    padding: isPromo ? "14px 18px" : "12px 16px",
                    borderRadius: 14,
                    border: `1px solid ${BRAND.border}`,
                    background: isPromo
                      ? "rgba(196,161,255,0.08)"
                      : "rgba(255,255,255,0.05)",
                    color: BRAND.soft,
                    fontSize: isPromo ? 24 : 26,
                    fontWeight: 500,
                    lineHeight: 1.4,
                    textAlign: "left",
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {/* Chips = từ khóa đã nói trong lines (highlight) */}
          {scene.chips && scene.chips.length > 0 && (
            <div
              style={{
                marginTop: 28,
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
              }}
            >
              {scene.chips.map((c, i) => {
                const start = Math.round(0.5 * fps) + i * 4;
                const t = interpolate(frame, [start, start + 12], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: Easing.bezier(0.16, 1, 0.3, 1),
                });
                return (
                  <span
                    key={c}
                    style={{
                      opacity: t,
                      padding: "10px 16px",
                      borderRadius: 12,
                      border: `1px solid ${BRAND.accent}55`,
                      background: `${BRAND.accent}18`,
                      color: BRAND.fg,
                      fontSize: 22,
                      fontWeight: 600,
                    }}
                  >
                    {c}
                  </span>
                );
              })}
            </div>
          )}

          {isCta && (
            <div
              style={{
                marginTop: 28,
                opacity: interpolate(
                  frame,
                  [Math.round(0.55 * durationInFrames), Math.round(0.7 * durationInFrames)],
                  [0, 1],
                  { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
                ),
              }}
            >
              <ZaloQr size={240} label="Quét mã QR Zalo trên màn hình" />
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
