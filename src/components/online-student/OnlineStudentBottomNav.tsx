"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { BookOpen, Home, MessageCircle, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"
import { supportZaloUrlWithText } from "@/lib/support"
import { getOnlineSubjectInfo } from "@/lib/subjects"

/**
 * Bottom nav for online-student portal (safe-area aware).
 */
export function OnlineStudentBottomNav() {
  const pathname = usePathname()
  const [studyHref, setStudyHref] = useState("/online-student/dashboard")
  const [lastLabel, setLastLabel] = useState("Học")

  useEffect(() => {
    if (typeof window === "undefined") return
    const last = localStorage.getItem("drive_last_subject")
    if (last) {
      setStudyHref(`/online-student/study?subject=${encodeURIComponent(last)}`)
      setLastLabel(getOnlineSubjectInfo(last).label.slice(0, 8))
    } else {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith("drive_folder_")) {
          const sub = k.replace("drive_folder_", "")
          setStudyHref(`/online-student/study?subject=${encodeURIComponent(sub)}`)
          setLastLabel(getOnlineSubjectInfo(sub).label.slice(0, 8))
          break
        }
      }
    }
  }, [pathname])

  if (!pathname?.startsWith("/online-student")) return null

  const studyActive = pathname.startsWith("/online-student/study")
  const homeActive = pathname.startsWith("/online-student/dashboard")
  const payActive = pathname.startsWith("/online-student/payment")

  const itemClass = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors min-h-[44px]",
      active ? "text-[var(--os-accent)]" : "text-[var(--os-muted)]"
    )

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-[var(--os-border)] bg-[var(--os-card)]/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Điều hướng học online"
    >
      <div className="mx-auto flex max-w-lg items-stretch">
        <Link href="/online-student/dashboard" className={itemClass(homeActive)}>
          <Home className="h-5 w-5" />
          <span>Trang chủ</span>
        </Link>
        <Link href={studyHref} className={itemClass(studyActive)}>
          <BookOpen className="h-5 w-5" />
          <span>{studyActive ? "Đang học" : lastLabel}</span>
        </Link>
        <Link href="/online-student/payment" className={itemClass(payActive)}>
          <ShoppingCart className="h-5 w-5" />
          <span>Mua khóa</span>
        </Link>
        <a
          href={supportZaloUrlWithText("Hỗ trợ StudyHub Online")}
          target="_blank"
          rel="noopener noreferrer"
          className={itemClass(false)}
        >
          <MessageCircle className="h-5 w-5" />
          <span>Hỗ trợ</span>
        </a>
      </div>
    </nav>
  )
}
