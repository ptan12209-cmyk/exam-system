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
import { BigText } from "../components/BigText";
import { ZaloQr } from "../components/ZaloQr";
import { V1Hook, v1Config } from "./V1Hook";
import { V3Tour, v3Config } from "./V3Tour";
import { V6Trust, v6Config } from "./V6Trust";
import { VoiceTrack } from "../components/VoiceTrack";
import { BRAND, FPS, HEIGHT, WIDTH } from "../lib/brand";

/** Short bridge between chapters (no phone) */
const TRANSITION = Math.round(1.2 * FPS);
/** End card with QR */
const END_CARD = 8 * FPS;

const T0 = 0;
const T1 = v1Config.durationInFrames;
const BRIDGE1 = T1;
const T2 = BRIDGE1 + TRANSITION;
const T3 = T2 + v3Config.durationInFrames;
const BRIDGE2 = T3;
const T4 = BRIDGE2 + TRANSITION;
const T5 = T4 + v6Config.durationInFrames;
const END = T5;
const TOTAL = END + END_CARD;

const ChapterTitle: React.FC<{ chapter: string; title: string }> = ({
  chapter,
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 14 } });
  const fadeOut = interpolate(frame, [TRANSITION - 10, TRANSITION], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <Background hueShift={20} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity: s * fadeOut,
          transform: `scale(${interpolate(s, [0, 1], [0.94, 1])})`,
        }}
      >
        <div
          style={{
            color: BRAND.accent,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            fontFamily: "system-ui, sans-serif",
            marginBottom: 16,
          }}
        >
          {chapter}
        </div>
        <div
          style={{
            color: BRAND.fg,
            fontSize: 56,
            fontWeight: 650,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: -1,
          }}
        >
          {title}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill>
      <Background />
      <BrandBar />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 40,
          opacity: s,
        }}
      >
        <BigText
          line="Các em vào đây"
          sub={`${BRAND.domain} · StudyHub · Sắp mở`}
          size={58}
          delay={2}
        />
        <div style={{ marginTop: 40 }}>
          <ZaloQr size={300} label="Quét QR · nhắn Zalo với anh" />
        </div>
        <div
          style={{
            marginTop: 28,
            color: BRAND.muted,
            fontSize: 20,
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
            maxWidth: 640,
            lineHeight: 1.45,
            padding: "0 48px",
          }}
        >
          Không cần ghi số điện thoại · Link bio cũng trỏ về web
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Full TikTok/FB long-form: V1 → V3 → V6 + end QR card.
 * ~70s content + bridges + end ≈ 80s @ 30fps
 */
/**
 * Full TikTok/FB long-form with optional baked-in TTS.
 * 1) npm run voice:generate
 * 2) npm run render:full
 * Without step 1, visual still works; Studio may warn missing static files.
 */
export const FullCombo: React.FC<{ voice?: boolean }> = ({ voice = true }) => {
  return (
    <AbsoluteFill>
      <VoiceTrack enabled={voice} />

      <Sequence from={T0} durationInFrames={v1Config.durationInFrames}>
        <V1Hook />
      </Sequence>

      <Sequence from={BRIDGE1} durationInFrames={TRANSITION}>
        <ChapterTitle chapter="Phần 2" title="Tour các môn" />
      </Sequence>

      <Sequence from={T2} durationInFrames={v3Config.durationInFrames}>
        <V3Tour />
      </Sequence>

      <Sequence from={BRIDGE2} durationInFrames={TRANSITION}>
        <ChapterTitle chapter="Phần 3" title="Quyền lợi & an toàn" />
      </Sequence>

      <Sequence from={T4} durationInFrames={v6Config.durationInFrames}>
        <V6Trust />
      </Sequence>

      <Sequence from={END} durationInFrames={END_CARD}>
        <EndCard />
      </Sequence>
    </AbsoluteFill>
  );
};

export const fullComboConfig = {
  id: "FullCombo" as const,
  component: FullCombo,
  durationInFrames: TOTAL,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
  /** human-readable */
  durationSec: TOTAL / FPS,
};
