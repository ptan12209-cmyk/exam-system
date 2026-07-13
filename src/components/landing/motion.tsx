"use client"

import { useReducedMotion } from "framer-motion"

export const easeOutQuart = [0.25, 1, 0.5, 1] as const

export const ACCENT = "oklch(0.75 0.18 290)"
export const BG = "#060510"
export const FG = "#e8e4f0"
export const MUTED = "#8C87A2"

/** Build reveal props from a boolean — safe to call inside map */
export function revealProps(reduce: boolean | null, delay = 0) {
  if (reduce) {
    return {
      initial: false as const,
    }
  }
  return {
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" as const },
    transition: { duration: 0.7, delay, ease: easeOutQuart },
  }
}

export function revealScaleProps(reduce: boolean | null, delay = 0) {
  if (reduce) {
    return {
      initial: false as const,
    }
  }
  return {
    initial: { opacity: 0, scale: 0.96 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, margin: "-40px" as const },
    transition: { duration: 0.8, delay, ease: easeOutQuart },
  }
}

export function useMotionReduce() {
  return useReducedMotion()
}
