import React from "react";
import { BRAND } from "../lib/brand";
import { useSlideUp } from "../lib/animations";
import { ZaloQr } from "./ZaloQr";

type Props = {
  delay?: number;
  /** show small QR in bottom bar */
  showQr?: boolean;
};

/**
 * Footer CTA — domain + Zalo via QR only (no phone digits on screen).
 */
export const BottomCta: React.FC<Props> = ({ delay = 8, showQr = false }) => {
  const style = useSlideUp(delay);
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: showQr ? "20px 40px 40px" : "28px 40px 48px",
        background:
          "linear-gradient(transparent, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.8))",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        textAlign: "center",
        ...style,
      }}
    >
      {showQr ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
          }}
        >
          <ZaloQr size={120} compact label="" />
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                color: BRAND.fg,
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {BRAND.domain}
            </div>
            <div
              style={{
                color: BRAND.accent,
                fontSize: 18,
                marginTop: 6,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Quét QR · nhắn Zalo
            </div>
            <div
              style={{
                color: BRAND.muted,
                fontSize: 15,
                marginTop: 4,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              Link bio · không cần ghi số
            </div>
          </div>
        </div>
      ) : (
        <>
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
              fontSize: 18,
              marginTop: 6,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            Link bio · Quét QR Zalo cuối video
          </div>
        </>
      )}
    </div>
  );
};
