"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"
import { OnlineStudentBottomNav } from "@/components/online-student/OnlineStudentBottomNav"
import { EmailVerifyBanner } from "@/components/online-student/EmailVerifyBanner"
import Footer from "@/components/Footer"
import { SupportFab } from "@/components/support/SupportFab"
import { getOrCreateDeviceId, syncDeviceIdCookie } from "@/lib/device-id"

interface OnlineStudentShellProps {
  readonly children: React.ReactNode
  readonly className?: string
  /** Hide mobile bottom nav (e.g. full-screen intercept) */
  readonly hideBottomNav?: boolean
  /** Hide floating support FAB */
  readonly hideSupport?: boolean
  /** Hide site footer / copyright */
  readonly hideFooter?: boolean
  /** Zalo prefills */
  readonly supportMessage?: string
}

/**
 * Online-student layout chrome: brand surface, footer copyright, support FAB, bottom nav.
 */
export function OnlineStudentShell({
  children,
  className,
  hideBottomNav = false,
  hideSupport = false,
  hideFooter = false,
  supportMessage,
}: Readonly<OnlineStudentShellProps>) {
  // Seed device cookie early so my-subjects / folders / playback pass single-device gate
  useEffect(() => {
    const id = getOrCreateDeviceId()
    syncDeviceIdCookie(id)
  }, [])

  return (
    <div
      className={cn(
        "os-portal min-h-screen flex flex-col bg-[var(--os-bg)] text-[var(--os-fg)]",
        !hideBottomNav && "pb-16 lg:pb-0",
        className
      )}
    >
      <EmailVerifyBanner />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>

      {!hideFooter && <Footer />}

      {!hideSupport && (
        <SupportFab
          offsetBottomNav={!hideBottomNav}
          zaloMessage={supportMessage ?? "Hỗ trợ StudyHub Online"}
        />
      )}

      {!hideBottomNav && <OnlineStudentBottomNav />}
    </div>
  )
}
