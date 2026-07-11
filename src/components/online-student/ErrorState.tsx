import type { ReactNode } from "react"
import { ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  action?: ReactNode
  className?: string
}

export function ErrorState({
  title = "Đã xảy ra lỗi",
  description = "Không tải được dữ liệu. Kiểm tra mạng và thử lại.",
  onRetry,
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/5 px-6 py-14 text-center",
        className
      )}
      role="alert"
    >
      <ShieldAlert className="mb-4 h-10 w-10 text-red-400" />
      <h3 className="text-base font-bold text-[var(--os-fg)]">{title}</h3>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--os-muted)]">
        {description}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {onRetry && (
          <Button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold text-xs"
          >
            Thử lại
          </Button>
        )}
        {action}
      </div>
    </div>
  )
}
