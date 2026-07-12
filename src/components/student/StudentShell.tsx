import { cn } from "@/lib/utils"
import Footer from "@/components/Footer"
import { SupportFab } from "@/components/support/SupportFab"

interface StudentShellProps {
  readonly children: React.ReactNode
  readonly className?: string
  readonly hideSupport?: boolean
  readonly hideFooter?: boolean
}

/**
 * Student app chrome: background + optional footer copyright + support FAB.
 * Mobile bottom padding for root MobileNav.
 */
export function StudentShell({
  children,
  className,
  hideSupport = false,
  hideFooter = false,
}: Readonly<StudentShellProps>) {
  return (
    <div
      className={cn(
        "min-h-screen flex flex-col bg-[hsl(var(--background))] text-[hsl(var(--foreground))] pb-20 lg:pb-0",
        className
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      {!hideFooter && <Footer compact />}
      {!hideSupport && (
        <SupportFab
          offsetBottomNav
          zaloMessage="Hỗ trợ StudyHub - khu vực học sinh"
        />
      )}
    </div>
  )
}
