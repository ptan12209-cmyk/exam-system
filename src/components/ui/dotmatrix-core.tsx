"use client"

import React, { CSSProperties } from "react"
import { cn } from "@/lib/utils"

export type DotMatrixPattern = "diamond" | "full" | "outline" | "rose" | "cross" | "rings"

export interface DotMatrixCommonProps {
  size?: number
  dotSize?: number
  color?: string
  speed?: number
  ariaLabel?: string
  className?: string
  muted?: boolean
  bloom?: boolean
  halo?: number
  animated?: boolean
  hoverAnimated?: boolean
  dotClassName?: string
  pattern?: DotMatrixPattern
  opacityBase?: number
  opacityMid?: number
  opacityPeak?: number
  cellPadding?: number
  boxSize?: number
  minSize?: number
}

export interface DotAnimationParams {
  isActive: boolean
  index: number
  row: number
  col: number
  reducedMotion: boolean
  phase: "idle" | "playing"
}

export type DotAnimationResolver = (params: DotAnimationParams) => {
  className?: string
  style?: CSSProperties
}

export const trBlPathNormFromIndex = (index: number) => {
  // Simple diagonal path normalization
  return (index % 5) / 4
}

interface DotMatrixBaseProps extends DotMatrixCommonProps {
  phase: "idle" | "playing"
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  reducedMotion: boolean
  animationResolver: DotAnimationResolver
}

export function DotMatrixBase({
  size = 24,
  dotSize = 3,
  color = "currentColor",
  speed = 1,
  ariaLabel = "Loading",
  className,
  muted,
  bloom,
  halo = 0,
  pattern = "full",
  opacityBase = 0.1,
  opacityMid = 0.4,
  opacityPeak = 1,
  cellPadding,
  boxSize,
  minSize,
  dotClassName,
  phase,
  onMouseEnter,
  onMouseLeave,
  reducedMotion,
  animationResolver,
}: DotMatrixBaseProps) {
  const dimension = 5
  const totalDots = dimension * dimension

  // Determine if a dot is active based on the pattern
  const isDotActive = (index: number) => {
    const row = Math.floor(index / dimension)
    const col = index % dimension
    
    switch (pattern) {
      case "diamond":
        return Math.abs(row - 2) + Math.abs(col - 2) <= 2
      case "outline":
        return row === 0 || row === 4 || col === 0 || col === 4
      case "cross":
        return row === 2 || col === 2
      case "rose":
        return (row + col) % 2 === 0
      case "rings":
        const dist = Math.max(Math.abs(row - 2), Math.abs(col - 2))
        return dist === 0 || dist === 2
      case "full":
      default:
        return true
    }
  }

  const gridStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${dimension}, 1fr)`,
    gap: cellPadding ? `${cellPadding}px` : "2px",
    width: boxSize ? `${boxSize}px` : size ? `${size}px` : "auto",
    height: boxSize ? `${boxSize}px` : size ? `${size}px` : "auto",
    minWidth: minSize ? `${minSize}px` : "auto",
    minHeight: minSize ? `${minSize}px` : "auto",
    color,
    "--dmx-speed": `${1 / speed}s`,
    "--dmx-opacity-base": opacityBase,
    "--dmx-opacity-mid": opacityMid,
    "--dmx-opacity-peak": opacityPeak,
    "--dmx-halo": halo,
  } as CSSProperties

  return (
    <div
      role="status"
      aria-label={ariaLabel}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "dotmatrix-root inline-block shrink-0",
        muted && "opacity-50",
        bloom && "dmx-bloom",
        className
      )}
      style={gridStyle}
    >
      {Array.from({ length: totalDots }).map((_, i) => {
        const row = Math.floor(i / dimension)
        const col = i % dimension
        const isActive = isDotActive(i)
        
        const { className: resolverClass, style: resolverStyle } = animationResolver({
          isActive,
          index: i,
          row,
          col,
          reducedMotion,
          phase,
        })

        return (
          <span
            key={i}
            className={cn(
              "dmx-dot block rounded-full transition-opacity",
              isActive ? "bg-current" : "opacity-0",
              resolverClass,
              dotClassName
            )}
            style={{
              width: `${dotSize}px`,
              height: `${dotSize}px`,
              ...resolverStyle,
            }}
          />
        )
      })}
    </div>
  )
}
