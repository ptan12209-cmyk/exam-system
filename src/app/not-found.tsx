import Link from "next/link"
import { ArrowLeft, Search } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        {/* 404 Number */}
        <div className="mb-6">
          <span className="text-[120px] font-black leading-none tracking-tighter text-[hsl(var(--foreground))]/5 select-none">
            404
          </span>
        </div>

        {/* Icon */}
        <div className="mx-auto -mt-16 mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[hsl(var(--border))]/40 bg-[hsl(var(--muted))]/20 shadow-[0_0_30px_rgba(99,102,241,0.08)]">
          <Search className="h-9 w-9 text-[hsl(var(--muted-foreground))]/60" />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))] mb-2">
          Không tìm thấy trang
        </h2>

        {/* Description */}
        <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed mb-8">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>

        {/* Action */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-6 py-3 text-sm font-medium text-[hsl(var(--background))] transition-all duration-200 hover:opacity-90 active:scale-95 shadow-lg shadow-[hsl(var(--foreground))]/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay về trang chủ
        </Link>
      </div>
    </div>
  )
}
