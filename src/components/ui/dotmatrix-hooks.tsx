"use client"

import { useState, useEffect } from "react"

interface UseDotMatrixPhasesProps {
  animated: boolean
  hoverAnimated: boolean
  speed: number
}

export function useDotMatrixPhases({ animated, hoverAnimated }: UseDotMatrixPhasesProps) {
  // Initialize state based on initial props to avoid setting it immediately in useEffect
  const [phase, setPhase] = useState<"idle" | "playing">(() => {
    return animated && !hoverAnimated ? "playing" : "idle"
  })

  const onMouseEnter = () => {
    if (hoverAnimated) setPhase("playing")
  }

  const onMouseLeave = () => {
    if (hoverAnimated) setPhase("idle")
  }

  useEffect(() => {
    // Only update if props change significantly
    if (animated && !hoverAnimated) {
      setPhase("playing")
    } else if (!animated) {
      setPhase("idle")
    }
  }, [animated, hoverAnimated])

  return {
    phase,
    onMouseEnter,
    onMouseLeave,
  }
}

export function usePrefersReducedMotion() {
  // Initialize with the current value to avoid setState on mount
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    
    const handler = (event: MediaQueryListEvent) => setReducedMotion(event.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return reducedMotion
}
