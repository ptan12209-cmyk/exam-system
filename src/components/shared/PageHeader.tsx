import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type PageHeaderProps = {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
  className?: string
}

/**
 * Consistent page title row for product surfaces.
 * Prefer one eyebrow across a page; skip if not needed.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-[var(--os-muted)]">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-[var(--os-fg)] sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--os-muted)]">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  )
}
