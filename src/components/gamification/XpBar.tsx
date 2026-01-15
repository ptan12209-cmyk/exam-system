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
        <div className="flex items-center gap-3">
            {/* Level Badge */}
            <div className={cn(
                "flex items-center justify-center rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold shrink-0",
                size === "sm" ? "w-6 h-6 text-xs" : size === "md" ? "w-8 h-8 text-sm" : "w-10 h-10 text-base"
            )}>
                {level}
            </div>

            <div className="flex-1 min-w-0">
                {/* Progress Bar */}
                <div className={cn(
                    "w-full bg-slate-700 rounded-full overflow-hidden",
                    sizeClasses[size]
                )}>
                    <div
                        className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Details */}
                {showDetails && (
                    <div className="flex justify-between mt-1">
                        <span className="text-xs text-slate-400">
                            {displayXp.toLocaleString()} XP
                        </span>
                        <span className="text-xs text-slate-500">
                            {nextLevelXp.toLocaleString()} XP để Level {level + 1}
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
