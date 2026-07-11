import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--os-border)] bg-[var(--os-card)]/50 px-6 py-14 text-center",
        className
      )}
    >
      {icon && (
        <div className="mb-4 text-[var(--os-muted)] opacity-70 [&_svg]:h-12 [&_svg]:w-12">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[var(--os-fg)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--os-muted)]">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
