import Link from "next/link"
import { MARKETING, REEL_LIST } from "@/data/marketing-reels"

export const metadata = {
  title: "Marketing Reels Kit · StudyHub",
  description: "Bộ khung video 9:16 cho FB/TikTok — 2k9",
  robots: { index: false, follow: false },
}

export default function MarketingReelsIndexPage() {
  return (
    <div className="min-h-[100dvh] bg-[#060510] px-4 py-10 text-[#e8e4f0]">
      <div className="mx-auto max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c18cff]">
          StudyHub · Marketing kit
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reels / TikTok (code)</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#8c87a2]">
          Giọng nam · xưng <strong className="text-[#c8c4d8]">anh / các em</strong> · domain{" "}
          <strong className="text-[#c8c4d8]">{MARKETING.domain}</strong> · Zalo{" "}
          <strong className="text-[#c8c4d8]">{MARKETING.zalo}</strong>
        </p>

        <ul className="mt-8 space-y-3">
          {REEL_LIST.map((r) => (
            <li key={r.id}>
              <Link
                href={`/marketing/reels/${r.id}`}
                className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#c18cff]/40 hover:bg-[#c18cff]/5"
              >
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#c18cff]">
                  {r.id} · {r.durationSec}s · 9:16
                </span>
                <span className="text-[17px] font-semibold">{r.title}</span>
                <span className="text-[13px] text-[#8c87a2]">{r.purpose}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-2xl border border-white/10 p-5 text-[13px] leading-relaxed text-[#8c87a2]">
          <p className="font-semibold text-[#e8e4f0]">Cách dùng nhanh</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>Mở concept → bấm «Chế độ quay»</li>
            <li>OBS / điện thoại quay màn hình khung dọc 1080×1920</li>
            <li>Phát (Space) + đọc voice theo script / phụ đề</li>
            <li>Đăng TikTok + FB Reels · CTA: bio {MARKETING.domain}</li>
          </ol>
          <p className="mt-3">
            Script chi tiết:{" "}
            <code className="rounded bg-white/5 px-1 text-[12px]">docs/marketing/</code>
          </p>
        </div>

        <p className="mt-6 text-center text-[12px]">
          <Link href="/" className="text-[#c18cff] hover:underline">
            ← Trang intro khóa học
          </Link>
        </p>
      </div>
    </div>
  )
}
