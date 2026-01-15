"use client"

import { cn } from "@/lib/utils"

interface Badge {
    name: string
    description: string
    icon: string
    xp_reward: number
}

interface BadgeCardProps {
    badge: Badge
    earned?: boolean
    earnedAt?: string
    size?: "sm" | "md" | "lg"
}

export function BadgeCard({ badge, earned = false, earnedAt, size = "md" }: BadgeCardProps) {
    const sizeClasses = {
        sm: "w-16 h-16",
        md: "w-24 h-24",
        lg: "w-32 h-32"
    }

    const iconSizes = {
        sm: "text-2xl",
        md: "text-4xl",
        lg: "text-5xl"
    }

    return (
        <div className={cn(
            "flex flex-col items-center gap-2 p-3 rounded-xl transition-all",
            earned
                ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
                : "bg-slate-800/50 border border-slate-700 opacity-50 grayscale"
        )}>
            <div className={cn(
                "rounded-full flex items-center justify-center bg-slate-700/50",
                sizeClasses[size]
            )}>
                <span className={iconSizes[size]}>{badge.icon}</span>
            </div>
            <div className="text-center">
                <p className={cn(
                    "font-semibold text-white",
                    size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
                )}>
                    {badge.name}
                </p>
                {size !== "sm" && (
                    <p className="text-xs text-slate-400 mt-0.5">
                        {badge.description}
                    </p>
                )}
                {earned && earnedAt && size === "lg" && (
                    <p className="text-xs text-yellow-500 mt-1">
                        {new Date(earnedAt).toLocaleDateString("vi-VN")}
                    </p>
                )}
            </div>
            {earned && badge.xp_reward > 0 && (
                <span className="text-xs text-yellow-500 font-medium">
                    +{badge.xp_reward} XP
                </span>
            )}
        </div>
    )
}

interface BadgeGridProps {
    badges: { badge: Badge; earned_at?: string }[]
    earnedBadgeIds?: Set<string>
}

export function BadgeGrid({ badges }: BadgeGridProps) {
    return (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {badges.map((item, index) => (
                <BadgeCard
                    key={index}
                    badge={item.badge}
                    earned={true}
                    earnedAt={item.earned_at}
                    size="md"
                />
            ))}
        </div>
    )
}

interface NewBadgeAnimationProps {
    badge: Badge
    onComplete?: () => void
}

export function NewBadgeAnimation({ badge, onComplete }: NewBadgeAnimationProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in"
            onClick={onComplete}
        >
            <div className="text-center animate-in zoom-in-50 duration-500">
                <div className="text-lg text-yellow-500 mb-4 font-medium">
                    🏆 Badge Mới!
                </div>
                <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500 flex items-center justify-center mb-4">
                    <span className="text-6xl">{badge.icon}</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    {badge.name}
                </h2>
                <p className="text-slate-400 mb-4">
                    {badge.description}
                </p>
                {badge.xp_reward > 0 && (
                    <span className="inline-block px-4 py-2 bg-yellow-500/20 text-yellow-500 rounded-full font-medium">
                        +{badge.xp_reward} XP
                    </span>
                )}
                <p className="text-xs text-slate-500 mt-6">
                    Click để đóng
                </p>
            </div>
        </div>
    )
}
