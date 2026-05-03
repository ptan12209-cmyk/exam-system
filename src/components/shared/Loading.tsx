"use client"

import { DotmSquare1 } from "@/components/ui/dotm-square-1"
import { cn } from "@/lib/utils"

interface LoadingProps {
  size?: number
  className?: string
  fullPage?: boolean
  label?: string
}

export function Loading({ size = 32, className, fullPage = false, label = "Đang tải..." }: LoadingProps) {
  const content = (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <DotmSquare1 
        size={size} 
        dotSize={size / 8} 
        speed={1.2} 
        bloom 
        pattern="diamond"
        color="currentColor"
      />
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] animate-pulse">
          {label}
        </p>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[hsl(var(--background))]/80 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return content
}
