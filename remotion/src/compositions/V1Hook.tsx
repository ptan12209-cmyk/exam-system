import React from "react";
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background } from "../components/Background";
import { BrandBar } from "../components/BrandBar";
import { BottomCta } from "../components/BottomCta";
import { BigText } from "../components/BigText";
import { BRAND, FPS, HEIGHT, WIDTH } from "../lib/brand";

const DURATION = 15 * FPS; // 15s

const Pill: React.FC<{ label: string; delay: number }> = ({ label, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 12 } });
  return (
    <div
      style={{
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
        padding: "10px 18px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.06)",
        color: BRAND.fg,
        fontSize: 22,
        fontWeight: 600,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {label}
    </div>
  );
};

export const V1Hook: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background />
      <BrandBar />

      {/* Beat 0: 0–3s */}
      <Sequence from={0} durationInFrames={3 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120 }}>
          <div
            style={{
              marginBottom: 24,
              padding: "10px 20px",
              borderRadius: 999,
              border: `1px solid ${BRAND.accent}66`,
              background: `${BRAND.accent}22`,
              color: "#E8D4FF",
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Dành cho 2k9
          </div>
          <BigText line="2k9 ơi" sub="Ôn video rải Drive mệt chưa?" delay={4} size={88} />
        </AbsoluteFill>
      </Sequence>

      {/* Beat 1: 3–7s */}
      <Sequence from={3 * FPS} durationInFrames={4 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120 }}>
          <BigText line="1 cổng học online" sub="StudyHub · Video theo môn" size={72} />
        </AbsoluteFill>
      </Sequence>

      {/* Beat 2: 7–11s */}
      <Sequence from={7 * FPS} durationInFrames={4 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120 }}>
          <BigText line="THPT + ĐGNL" sub="Đủ môn · Có giáo viên theo khóa" size={76} />
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
              marginTop: 36,
              padding: "0 48px",
            }}
          >
            {["Toán", "Lý", "Hóa", "ĐGNL"].map((t, i) => (
              <Pill key={t} label={t} delay={6 + i * 3} />
            ))}
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Beat 3: 11–15s */}
      <Sequence from={11 * FPS} durationInFrames={4 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 160 }}>
          <BigText
            line={BRAND.domain}
            sub={`Zalo ${BRAND.zaloDisplay} · Sắp mở`}
            size={56}
          />
        </AbsoluteFill>
      </Sequence>

      <BottomCta delay={12} />
    </AbsoluteFill>
  );
};

export const v1Config = {
  id: "V1Hook" as const,
  component: V1Hook,
  durationInFrames: DURATION,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};
