"use client"

import { useEffect, useState } from "react"
import { Trophy, Star, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Achievement {
    id: string
    name: string
    description: string
    icon: string
    rarity: string
    xp_reward: number
}

interface AchievementUnlockProps {
    achievement: Achievement
    onClose: () => void
}

const rarityColors: Record<string, { bg: string; border: string; text: string; glow: string }> = {
    common: {
        bg: "from-slate-600 to-slate-700",
        border: "border-slate-500",
        text: "text-slate-300",
        glow: ""
    },
    rare: {
        bg: "from-blue-600 to-blue-700",
        border: "border-blue-400",
        text: "text-blue-300",
        glow: "shadow-blue-500/50"
    },
    epic: {
        bg: "from-purple-600 to-purple-700",
        border: "border-purple-400",
        text: "text-purple-300",
        glow: "shadow-purple-500/50"
    },
    legendary: {
        bg: "from-yellow-500 to-orange-500",
        border: "border-yellow-400",
        text: "text-yellow-300",
        glow: "shadow-yellow-500/50"
    }
}

export function AchievementUnlockAnimation({ achievement, onClose }: AchievementUnlockProps) {
    const [stage, setStage] = useState<"enter" | "icon" | "reveal" | "xp">("enter")
    const colors = rarityColors[achievement.rarity] || rarityColors.common

    useEffect(() => {
        const timers = [
            setTimeout(() => setStage("icon"), 300),
            setTimeout(() => setStage("reveal"), 800),
            setTimeout(() => setStage("xp"), 1500),
        ]
        return () => timers.forEach(clearTimeout)
    }, [])

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            {/* Background particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-ping"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${1 + Math.random()}s`,
                        }}
                    />
                ))}
            </div>

            {/* Modal */}
            <div
                className={cn(
                    "relative w-full max-w-sm mx-4 overflow-hidden rounded-2xl",
                    "transform transition-all duration-500",
                    stage === "enter" ? "scale-50 opacity-0" : "scale-100 opacity-100"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with gradient */}
                <div className={cn(
                    "bg-gradient-to-br p-8 text-center relative",
                    colors.bg
                )}>
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 text-white/50 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Trophy icon animation */}
                    <div className={cn(
                        "relative mb-4 transition-all duration-500",
                        stage === "enter" ? "scale-0" : "scale-100"
                    )}>
                        {/* Glow ring */}
                        <div className={cn(
                            "absolute inset-0 rounded-full animate-ping",
                            colors.glow,
                            "bg-white/20"
                        )} />

                        {/* Icon container */}
                        <div className={cn(
                            "relative w-24 h-24 mx-auto rounded-full border-4 flex items-center justify-center",
                            "bg-white/10 backdrop-blur",
                            colors.border
                        )}>
                            <span className={cn(
                                "text-5xl transition-all duration-300",
                                stage === "icon" && "animate-bounce"
                            )}>
                                {achievement.icon}
                            </span>
                        </div>
                    </div>

                    {/* "Achievement Unlocked" text */}
                    <div className={cn(
                        "transition-all duration-500",
                        stage === "reveal" || stage === "xp"
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                    )}>
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Star className="w-4 h-4 text-yellow-300 animate-pulse" />
                            <span className="text-sm font-medium text-white/80 uppercase tracking-wider">
                                Thành tựu mới
                            </span>
                            <Star className="w-4 h-4 text-yellow-300 animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-1">
                            {achievement.name}
                        </h2>
                        <p className={cn("text-sm uppercase font-medium", colors.text)}>
                            {achievement.rarity}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-slate-900 p-6 text-center">
                    <p className="text-slate-400 mb-4">
                        {achievement.description}
                    </p>

                    {/* XP Reward with animation */}
                    {achievement.xp_reward > 0 && (
                        <div className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-full",
                            "bg-yellow-500/20 border border-yellow-500/30",
                            "transition-all duration-500",
                            stage === "xp"
                                ? "opacity-100 scale-100"
                                : "opacity-0 scale-75"
                        )}>
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            <span className="text-lg font-bold text-yellow-400">
                                +{achievement.xp_reward} XP
                            </span>
                        </div>
                    )}

                    {/* Continue button */}
                    <button
                        onClick={onClose}
                        className={cn(
                            "w-full mt-6 py-3 rounded-xl font-semibold text-white",
                            "bg-gradient-to-r transition-all hover:scale-[1.02]",
                            colors.bg
                        )}
                    >
                        Tiếp tục
                    </button>
                </div>
            </div>
        </div>
    )
}

// Hook to manage achievement unlocks
export function useAchievementUnlock() {
    const [queue, setQueue] = useState<Achievement[]>([])
    const [current, setCurrent] = useState<Achievement | null>(null)

    useEffect(() => {
        if (!current && queue.length > 0) {
            setCurrent(queue[0])
            setQueue(prev => prev.slice(1))
        }
    }, [current, queue])

    const unlock = (achievement: Achievement) => {
        setQueue(prev => [...prev, achievement])
    }

    const close = () => {
        setCurrent(null)
    }

    return {
        current,
        unlock,
        close,
        AchievementPopup: current ? (
            <AchievementUnlockAnimation achievement={current} onClose={close} />
        ) : null
    }
}
