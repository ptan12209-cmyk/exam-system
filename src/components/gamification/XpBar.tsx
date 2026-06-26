"use client"

import { useEffect, useState } from "react"
import { Star } from "lucide-react"
import { calculateLevel, levelProgress, xpForNextLevel } from "@/lib/gamification"
import { cn } from "@/lib/utils"

interface XpBarProps {
    xp: number
    showDetails?: boolean
    size?: "sm" | "md" | "lg"
    animated?: boolean
}

export function XpBar({ xp, showDetails = true, size = "md", animated = true }: XpBarProps) {
    const [displayXp, setDisplayXp] = useState(animated ? 0 : xp)
    const level = calculateLevel(xp)
    const progress = levelProgress(xp)
    const nextLevelXp = xpForNextLevel(level)

    useEffect(() => {
        if (!animated) {
            setDisplayXp(xp)
            return
        }

        // Animate XP counter
        const duration = 1000
        const steps = 30
        const increment = xp / steps
        let current = 0

        const timer = setInterval(() => {
            current += increment
            if (current >= xp) {
                setDisplayXp(xp)
                clearInterval(timer)
            } else {
                setDisplayXp(Math.floor(current))
            }
        }, duration / steps)

        return () => clearInterval(timer)
    }, [xp, animated])

    const sizeClasses = {
        sm: "h-1.5",
        md: "h-2",
        lg: "h-3"
    }

    return (
        <div className="flex items-center gap-4 group">
            {/* Inline CSS for premium animations */}
            <style dangerouslySetInnerHTML={{__html: `
                @keyframes shimmer-sweep {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer-sweep {
                    animation: shimmer-sweep 2.5s infinite;
                }
            `}} />

            {/* Level Badge - Premium Gaming Emblem Style */}
            <div className={cn(
                "relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-600 text-white font-bold shrink-0 shadow-lg transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 border border-white/20",
                size === "sm" ? "w-8 h-8 text-xs rounded-xl shadow-[0_0_10px_rgba(139,92,246,0.3)]" : 
                size === "md" ? "w-11 h-11 text-sm rounded-2xl shadow-[0_0_15px_rgba(139,92,246,0.4)]" : 
                "w-14 h-14 text-lg rounded-2xl shadow-[0_0_20px_rgba(139,92,246,0.5)]"
            )}>
                {/* Level label */}
                <div className="flex flex-col items-center justify-center leading-none">
                    <span className="text-[7px] uppercase font-bold tracking-wider opacity-80">Lv.</span>
                    <span className="font-extrabold">{level}</span>
                </div>
                {/* Subtle backglow */}
                <div className="absolute inset-0 rounded-[inherit] bg-inherit opacity-30 blur-sm -z-10 group-hover:blur-md transition-all" />
            </div>

            <div className="flex-1 min-w-0">
                {/* Label above the bar */}
                {showDetails && (
                    <div className="flex justify-between items-end mb-1.5 px-0.5">
                        <span className="text-[11px] font-bold text-[hsl(var(--foreground))] tracking-wide">
                            Tiến độ cấp độ
                        </span>
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">
                            {progress.toFixed(0)}%
                        </span>
                    </div>
                )}

                {/* Progress Bar Container - Glassmorphic with Neon Glow */}
                <div className={cn(
                    "w-full bg-slate-900/60 dark:bg-slate-950/50 rounded-full border border-slate-800/40 p-[2px] overflow-hidden backdrop-blur-md shadow-inner",
                    sizeClasses[size]
                )}>
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 transition-all duration-1000 cubic-bezier(0.4, 0, 0.2, 1) relative shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Shimmer reflection sweep animation */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer-sweep" />
                    </div>
                </div>

                {/* Details Footer */}
                {showDetails && (
                    <div className="flex justify-between items-center mt-1.5 px-0.5 text-[10px] font-medium tracking-wide">
                        <span className="text-slate-400 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                            <strong>{displayXp.toLocaleString()}</strong> <span className="opacity-70">XP</span>
                        </span>
                        <span className="text-slate-500">
                            Cần thêm <strong>{(nextLevelXp - xp).toLocaleString()}</strong> XP để lên Level {level + 1}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}

interface XpGainAnimationProps {
    xpGained: number
    onComplete?: () => void
}

export function XpGainAnimation({ xpGained, onComplete }: XpGainAnimationProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false)
            onComplete?.()
        }, 2000)

        return () => clearTimeout(timer)
    }, [onComplete])

    if (!visible) return null

    return (
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-3 rounded-full font-bold text-2xl shadow-lg flex items-center gap-2">
                <Star className="w-6 h-6 fill-current" />
                +{xpGained} XP
            </div>
        </div>
    )
}

interface LevelUpAnimationProps {
    newLevel: number
    onComplete?: () => void
}

export function LevelUpAnimation({ newLevel, onComplete }: LevelUpAnimationProps) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false)
            onComplete?.()
        }, 3000)

        return () => clearTimeout(timer)
    }, [onComplete])

    if (!visible) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold text-white mb-2">Level Up!</h2>
                <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg">
                    {newLevel}
                </div>
            </div>
        </div>
    )
}
