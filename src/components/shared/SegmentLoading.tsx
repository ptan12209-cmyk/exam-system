import { cn } from "@/lib/utils"

/**
 * Generic segment-loading skeleton shown by Next.js while a route segment's
 * JS bundle downloads / renders. Flat surfaces only — no spinners.
 */
export default function Loading({ label = "Đang tải..." }: { label?: string }) {
  return (
    <div className="min-h-screen bg-[var(--os-bg)] px-4 pt-24 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl w-full animate-pulse" aria-busy="true" aria-label={label}>
        <div className="h-3 w-28 rounded bg-[var(--os-card-elevated)] mb-6" />
        <div className="h-10 w-2/3 max-w-md rounded-xl bg-[var(--os-card)]" />
        <div className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl border border-[var(--os-border)] bg-[var(--os-card)] p-5">
              <div className="h-2.5 w-20 rounded bg-[var(--os-card-elevated)]" />
              <div className="mt-4 h-7 w-16 rounded bg-[var(--os-card-elevated)]" />
            </div>
          ))}
        </div>
        <div className={cn("mt-6 h-64 rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)]")} />
      </div>
    </div>
  )
}
