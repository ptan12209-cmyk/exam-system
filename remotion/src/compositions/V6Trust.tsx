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

const DURATION = 25 * FPS;

const IconBadge: React.FC<{ emoji: string }> = ({ emoji }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const glow = interpolate(Math.sin(frame / 18), [-1, 1], [0.15, 0.35]);
  return (
    <div
      style={{
        width: 120,
        height: 120,
        borderRadius: 28,
        margin: "0 auto 28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 56,
        border: `1px solid ${BRAND.accent}55`,
        background: `rgba(193,140,255,${glow})`,
        opacity: s,
        transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
        boxShadow: `0 20px 60px rgba(193,140,255,0.25)`,
      }}
    >
      {emoji}
    </div>
  );
};

const Beat: React.FC<{
  emoji: string;
  line: string;
  sub: string;
  size?: number;
}> = ({ emoji, line, sub, size = 64 }) => (
  <AbsoluteFill
    style={{ justifyContent: "center", alignItems: "center", paddingBottom: 140 }}
  >
    <div style={{ textAlign: "center", width: "100%" }}>
      <IconBadge emoji={emoji} />
      <BigText line={line} sub={sub} size={size} delay={4} />
    </div>
  </AbsoluteFill>
);

export const V6Trust: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background hueShift={-8} />
      <BrandBar />

      <Sequence from={0} durationInFrames={4 * FPS}>
        <Beat emoji="🛡️" line="Quyền lợi học viên" sub="Anh nói rõ — các em yên tâm" />
      </Sequence>

      <Sequence from={4 * FPS} durationInFrames={6 * FPS}>
        <Beat emoji="📱" line="1 tài khoản · 1 máy" sub="Không share — tránh bị khóa" size={58} />
      </Sequence>

      <Sequence from={10 * FPS} durationInFrames={7 * FPS}>
        <Beat
          emoji="🎬"
          line="Quay màn hình khi TT"
          sub="Có sự cố → anh hỗ trợ nhanh hơn"
          size={52}
        />
      </Sequence>

      <Sequence from={17 * FPS} durationInFrames={4 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 160 }}>
          <IconBadge emoji="💬" />
          <BigText line={`Zalo ${BRAND.zaloDisplay}`} sub="Anh hỗ trợ các em" size={48} delay={4} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={21 * FPS} durationInFrames={4 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 160 }}>
          <BigText line={BRAND.domain} sub="StudyHub · Sắp mở" size={56} />
        </AbsoluteFill>
      </Sequence>

      <BottomCta delay={10} />
    </AbsoluteFill>
  );
};

export const v6Config = {
  id: "V6Trust" as const,
  component: V6Trust,
  durationInFrames: DURATION,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};
