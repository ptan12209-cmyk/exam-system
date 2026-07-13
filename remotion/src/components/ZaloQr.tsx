import React, { useEffect, useState } from "react";
import { continueRender, delayRender, Img } from "remotion";
import { BRAND } from "../lib/brand";

/** Zalo deep link — QR only, never print phone digits on frame (TikTok policy). */
export const ZALO_QR_PAYLOAD = `https://zalo.me/${BRAND.zalo}`;

type Props = {
  size?: number;
  label?: string;
  /** compact = no outer label stack */
  compact?: boolean;
};

/**
 * Renders QR for Zalo contact. Uses delayRender until PNG data URL is ready.
 */
export const ZaloQr: React.FC<Props> = ({
  size = 280,
  label = "Quét Zalo · hỗ trợ",
  compact = false,
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [handle] = useState(() =>
    delayRender("Generating Zalo QR", { timeoutInMilliseconds: 30000 })
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(ZALO_QR_PAYLOAD, {
          width: size * 2,
          margin: 2,
          color: { dark: "#0B0A13", light: "#FFFFFF" },
          errorCorrectionLevel: "M",
        });
        if (!cancelled) setDataUrl(url);
      } catch (e) {
        console.error("[ZaloQr]", e);
      } finally {
        if (!cancelled) continueRender(handle);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, size]);

  if (!dataUrl) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 20,
          background: "rgba(255,255,255,0.08)",
        }}
      />
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          display: "inline-block",
          padding: 16,
          borderRadius: 24,
          background: "#fff",
          boxShadow: "0 16px 48px rgba(193,140,255,0.25)",
        }}
      >
        <Img
          src={dataUrl}
          width={size}
          height={size}
          style={{ display: "block", borderRadius: 8 }}
        />
      </div>
      {!compact && label ? (
        <div
          style={{
            marginTop: 18,
            color: BRAND.soft,
            fontSize: 22,
            fontWeight: 600,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
