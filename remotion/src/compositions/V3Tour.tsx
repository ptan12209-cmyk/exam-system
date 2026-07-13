import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Background } from "../components/Background";
import { BrandBar } from "../components/BrandBar";
import { BottomCta } from "../components/BottomCta";
import { BigText } from "../components/BigText";
import { SubjectGrid } from "../components/SubjectGrid";
import { DGNL, FPS, HEIGHT, SOCIAL, STEM, WIDTH } from "../lib/brand";

const DURATION = 30 * FPS;

export const V3Tour: React.FC = () => {
  return (
    <AbsoluteFill>
      <Background hueShift={12} />
      <BrandBar />

      <Sequence from={0} durationInFrames={3 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 120 }}>
          <BigText line="Tour môn học" sub="StudyHub · Dành cho các em 2k9" size={78} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={3 * FPS} durationInFrames={7 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 140 }}>
          <BigText line="Tự nhiên" sub="Toán · Lý · Hóa · Sinh" size={70} />
          <SubjectGrid items={STEM} startFrame={8} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={10 * FPS} durationInFrames={7 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 140 }}>
          <BigText line="Xã hội + Anh" sub="Văn · Sử · Địa · KTPL · Anh" size={64} />
          <SubjectGrid items={SOCIAL} startFrame={6} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={17 * FPS} durationInFrames={7 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 140 }}>
          <BigText line="ĐGNL" sub="HSA · V-ACT · TSA · Sư phạm" size={78} />
          <SubjectGrid items={DGNL} startFrame={6} />
        </AbsoluteFill>
      </Sequence>

      <Sequence from={24 * FPS} durationInFrames={6 * FPS}>
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingBottom: 160 }}>
          <BigText
            line="luyende.id.vn"
            sub="Xem GV từng môn · Zalo 0946 741 031"
            size={54}
          />
        </AbsoluteFill>
      </Sequence>

      <BottomCta delay={10} />
    </AbsoluteFill>
  );
};

export const v3Config = {
  id: "V3Tour" as const,
  component: V3Tour,
  durationInFrames: DURATION,
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};
