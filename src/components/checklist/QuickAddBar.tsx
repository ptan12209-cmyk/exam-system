"use client"

import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuickAddBarProps {
  onAdd: (title: string) => Promise<void>
}

export function QuickAddBar({ onAdd }: QuickAddBarProps) {
  const [value, setValue] = useState("")
  const [adding, setAdding] = useState(false)

  const handleSubmit = async () => {
    const trimmed = value.trim()
    if (!trimmed || adding) return
    setAdding(true)
    try {
      await onAdd(trimmed)
      setValue("")
    } finally {
      setAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="group relative flex items-center gap-3 rounded-[1.5rem] border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))]/80 px-4 py-3 shadow-sm backdrop-blur-md transition-all focus-within:border-[hsl(var(--foreground))]/20 focus-within:shadow-md">
      <div className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
        value.trim() 
          ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" 
          : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]"
      )}>
        {adding ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Plus className="h-3.5 w-3.5" />
        )}
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Thêm nhanh mục tiêu học tập... (Enter ↵)"
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]/50"
        disabled={adding}
      />
      {value.trim() && (
        <button
          onClick={handleSubmit}
          disabled={adding}
          className="shrink-0 rounded-full bg-[hsl(var(--foreground))] px-4 py-1.5 text-[11px] font-bold text-[hsl(var(--background))] transition-all hover:bg-[hsl(var(--foreground))]/90 active:scale-95 disabled:opacity-50"
        >
          Thêm
        </button>
      )}
    </div>
  )
}
