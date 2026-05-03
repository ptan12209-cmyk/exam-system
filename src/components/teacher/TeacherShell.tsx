"use client"

import { useState } from "react"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { cn } from "@/lib/utils"

interface TeacherShellProps {
  children: React.ReactNode
  onLogout: () => void
  className?: string
}

export function TeacherShell({ children, onLogout, className }: TeacherShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--foreground))] selection:text-[hsl(var(--background))]">
      <TeacherSidebar 
        onLogout={onLogout} 
        collapsed={collapsed} 
        setCollapsed={setCollapsed} 
      />
      
      <main 
        className={cn(
          "min-h-screen transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
          collapsed ? "lg:pl-20" : "lg:pl-72",
          className
        )}
      >
        {children}
      </main>
    </div>
  )
}
