import { ShieldCheck } from "lucide-react"

/** Ops checklist for Bunny Stream (teacher-facing, no secrets). */
export function BunnySecurityChecklist() {
  return (
    <section className="mb-6 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
          <ShieldCheck className="h-5 w-5 text-amber-300" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-sm font-bold text-[#F1EDF9]">
            Checklist bảo mật video Bunny
          </h2>
          <p className="text-[11px] text-[#8C87A2] leading-relaxed">
            Cấu hình trên{" "}
            <a
              href="https://dash.bunny.net"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#C18CFF] underline underline-offset-2"
            >
              Bunny dashboard
            </a>
            {" "}— app chỉ cấp URL có quyền qua playback API. Domain site:{" "}
            <code className="rounded bg-[#0B0A13] px-1.5 py-0.5 font-mono text-[10px] text-amber-200">
              luyende.id.vn
            </code>
          </p>
          <ul className="grid gap-1.5 text-[11px] text-[#C8C4D8] sm:grid-cols-2">
            <li className="flex gap-2">
              <span className="text-amber-400 shrink-0">1.</span>
              <span>
                Stream library → <strong className="text-[#F1EDF9]">Security</strong> → bật{" "}
                <strong className="text-[#F1EDF9]">Token Authentication</strong>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 shrink-0">2.</span>
              <span>
                Copy <strong className="text-[#F1EDF9]">Token security key</strong> → Vercel env{" "}
                <code className="font-mono text-[10px] text-amber-200">BUNNY_STREAM_TOKEN_KEY</code>
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 shrink-0">3.</span>
              <span>
                Allowed domains:{" "}
                <code className="font-mono text-[10px] text-amber-200">luyende.id.vn</code>
                {" "}+ localhost (dev)
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-400 shrink-0">4.</span>
              <span>Tắt download / block hotlink nếu library hỗ trợ</span>
            </li>
            <li className="flex gap-2 sm:col-span-2">
              <span className="text-amber-400 shrink-0">5.</span>
              <span>
                Dán link <strong className="text-[#F1EDF9]">embed/play</strong> Bunny (app tự chuẩn hóa, bỏ token cũ)
              </span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}
