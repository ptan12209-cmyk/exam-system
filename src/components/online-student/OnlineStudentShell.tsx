import { cn } from "@/lib/utils"
import { OnlineStudentBottomNav } from "@/components/online-student/OnlineStudentBottomNav"

interface OnlineStudentShellProps {
  readonly children: React.ReactNode
  readonly className?: string
  /** Hide mobile bottom nav (e.g. full-screen player) */
  readonly hideBottomNav?: boolean
}

export function OnlineStudentShell({
  children,
  className,
  hideBottomNav = false,
}: Readonly<OnlineStudentShellProps>) {
  return (
    <div
      className={cn(
        "os-portal min-h-screen flex flex-col bg-[var(--os-bg)] text-[var(--os-fg)]",
        !hideBottomNav && "pb-16 lg:pb-0",
        className
      )}
    >
      {children}
      {!hideBottomNav && <OnlineStudentBottomNav />}
    </div>
  )
}
