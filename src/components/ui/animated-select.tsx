"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface AnimatedSelectProps {
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string; icon?: React.ReactNode; color?: string }>
  placeholder?: string
  className?: string
  size?: "sm" | "md" | "lg"
  disabled?: boolean
}

export function AnimatedSelect({
  value,
  onValueChange,
  options,
  placeholder = "Chọn...",
  className,
  size = "md",
  disabled = false,
}: AnimatedSelectProps) {
  const triggerSize = size === "sm" ? "sm" : "default"

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        size={triggerSize}
        className={cn(
          "w-full transition-all duration-300 ease-out",
          size === "lg" && "h-12 px-4 text-base rounded-2xl",
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="min-w-[12rem] animate-in fade-in slide-in-from-top-2 duration-200">
        <SelectGroup>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="flex items-center gap-2 py-2.5 transition-colors duration-150 hover:bg-[hsl(var(--muted))]/30"
            >
              <span className="flex items-center gap-2">
                {option.icon && (
                  <span className="shrink-0 text-muted-foreground">{option.icon}</span>
                )}
                {option.color && (
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: option.color }}
                  />
                )}
                <span>{option.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
