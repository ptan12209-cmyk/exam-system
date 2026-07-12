"use client"

import { useState } from "react"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import Footer from "@/components/Footer"
import { SupportFab } from "@/components/support/SupportFab"
import { cn } from "@/lib/utils"

interface TeacherShellProps {
  children: React.ReactNode
  onLogout?: () => void
  className?: string
  hideSupport?: boolean
  hideFooter?: boolean
}

export function TeacherShell({
  children,
  onLogout,
  className,
  hideSupport = false,
  hideFooter = false,
}: TeacherShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--primary))]/25 selection:text-[hsl(var(--foreground))]">
      <TeacherSidebar
        onLogout={onLogout}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          collapsed ? "lg:pl-20" : "lg:pl-72"
        )}
      >
        <main className={cn("flex-1 pb-16 lg:pb-0", className)}>{children}</main>
        {!hideFooter && <Footer compact className="lg:pl-0" />}
      </div>

      {!hideSupport && (
        <SupportFab
          offsetBottomNav
          zaloMessage="Hỗ trợ StudyHub - khu vực giáo viên"
          className="lg:bottom-6"
        />
      )}
    </div>
  )
}
