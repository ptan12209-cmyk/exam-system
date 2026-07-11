import { cn } from "@/lib/utils"

function Bone({ className }: { className?: string }) {
  return <div className={cn("os-skeleton rounded-xl", className)} />
}

/** Full-page loading shell for online-student routes */
export function StudySkeleton({
  variant = "dashboard",
}: {
  variant?: "dashboard" | "study" | "payment" | "generic"
}) {
  return (
    <div className="min-h-screen bg-[var(--os-bg)] text-[var(--os-fg)] flex flex-col">
      {/* Topbar placeholder */}
      <div className="sticky top-0 z-40 border-b border-[var(--os-border)] bg-[var(--os-card)]">
        <div className="h-1 w-full bg-[var(--os-accent)]/40" />
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Bone className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5">
              <Bone className="h-3 w-24" />
              <Bone className="h-2 w-16" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Bone className="h-8 w-8 rounded-full" />
            <Bone className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {variant === "dashboard" && <DashboardSkeleton />}
        {variant === "study" && <DriveSkeleton />}
        {variant === "payment" && <PaymentSkeleton />}
        {variant === "generic" && (
          <div className="space-y-4">
            <Bone className="h-8 w-48" />
            <Bone className="h-40 w-full" />
            <Bone className="h-40 w-full" />
          </div>
        )}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-4 w-28" />
        <Bone className="h-10 w-64 max-w-full" />
        <Bone className="h-4 w-80 max-w-full" />
      </div>
      <Bone className="h-24 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

function DriveSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Bone className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Bone className="h-6 w-40" />
            <Bone className="h-3 w-32" />
          </div>
        </div>
        <Bone className="h-11 w-full sm:w-64 rounded-xl" />
      </div>
      <Bone className="h-10 w-full max-w-md rounded-xl" />
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bone key={i} className="aspect-[4/3] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

function PaymentSkeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <Bone className="h-4 w-32" />
      <Bone className="h-8 w-56" />
      <div className="flex gap-2">
        <Bone className="h-2 flex-1 rounded-full" />
        <Bone className="h-2 flex-1 rounded-full" />
        <Bone className="h-2 flex-1 rounded-full" />
      </div>
      <Bone className="mx-auto h-56 w-56 rounded-2xl" />
      <Bone className="h-12 w-full rounded-xl" />
      <Bone className="h-20 w-full rounded-2xl" />
    </div>
  )
}

export function InlineSkeleton({ className }: { className?: string }) {
  return <Bone className={className} />
}
