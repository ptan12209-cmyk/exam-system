import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_URL,
  SUPPORT_ZALO,
  SUPPORT_ZALO_URL,
} from "@/lib/support"
import { cn } from "@/lib/utils"

/** Compact one-line copyright (player chrome, modals). */
export function CopyrightNotice({ className }: { className?: string }) {
  return (
    <p className={cn("text-[10px] leading-relaxed text-[var(--os-muted)]", className)}>
      © {new Date().getFullYear()} StudyHub · luyende.id.vn. Nội dung thuộc bản quyền.
      Nghiêm cấm sao chép, ghi hình, phát tán trái phép.
    </p>
  )
}

export default function Footer({
  className,
  compact = false,
}: {
  className?: string
  /** Slimmer bar for dense teacher/admin screens */
  compact?: boolean
}) {
  const year = new Date().getFullYear()

  return (
    <footer
      className={cn(
        "mt-auto w-full border-t border-[var(--os-border)] bg-[var(--os-card)]/90",
        compact ? "py-4" : "py-6 sm:py-8",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:px-6",
          compact
            ? "items-start sm:flex-row sm:items-center sm:justify-between"
            : "sm:flex-row sm:items-start sm:justify-between"
        )}
      >
        <div className="text-left max-w-xl">
          <p className="text-sm font-semibold text-[var(--os-fg)]">
            StudyHub Education Portal
          </p>
          <p className="mt-1 text-xs text-[var(--os-muted)]">
            © {year} StudyHub · luyende.id.vn. Bảo lưu mọi quyền.
          </p>
          {!compact && (
            <p className="mt-2 text-[10px] leading-relaxed text-[var(--os-muted)]/90">
              Nội dung bài giảng, video và tài liệu thuộc bản quyền StudyHub.
              Nghiêm cấm sao chép, ghi hình, phát tán trái phép.
            </p>
          )}
        </div>

        <div
          className={cn(
            "flex flex-col gap-1.5 text-[11px] text-[var(--os-muted)]",
            "sm:items-end sm:text-right"
          )}
        >
          <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--os-muted)]/80">
            Hỗ trợ
          </p>
          <p>
            Zalo:{" "}
            <a
              href={SUPPORT_ZALO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[var(--os-accent)] hover:underline"
            >
              {SUPPORT_ZALO}
            </a>
          </p>
          <p>
            Email:{" "}
            <a
              href={SUPPORT_EMAIL_URL}
              className="font-medium text-[var(--os-fg)] hover:text-[var(--os-accent)] hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
