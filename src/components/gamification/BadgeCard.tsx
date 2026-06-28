"use client"

import { cn } from "@/lib/utils"
import { Award, CheckCircle2, Sparkles } from "lucide-react"

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
        sm: "w-14 h-14",
        md: "w-20 h-20",
        lg: "w-28 h-28"
    }

    const iconSizes = {
        sm: "text-xl",
        md: "text-3xl",
        lg: "text-4xl"
    }

    return (
        <div className={cn(
            "group relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all duration-300",
            earned
                ? "bg-gradient-to-b from-[hsl(var(--card))]/90 to-[hsl(var(--card))]/60 border-amber-500/35 dark:border-amber-500/20 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:-translate-y-1.5 hover:border-amber-500/50 hover:shadow-[0_20px_40px_rgba(245,158,11,0.08)]"
                : "bg-gradient-to-b from-[hsl(var(--card))]/40 to-[hsl(var(--card))]/10 border-[hsl(var(--border))]/40 opacity-40 grayscale hover:opacity-50"
        )}>
            {/* Sparkle effect on hover for earned badges */}
            {earned && (
                <span className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-amber-500 animate-pulse">
                    <Sparkles className="h-3.5 w-3.5" />
                </span>
            )}

            {/* Icon container */}
            <div className={cn(
                "rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-6",
                earned
                    ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 shadow-inner"
                    : "bg-[hsl(var(--muted))]/25 border border-[hsl(var(--border))]/50",
                sizeClasses[size]
            )}>
                <span className={cn(
                    iconSizes[size],
                    "filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)] select-none"
                )}>
                    {badge.icon}
                </span>
            </div>

            {/* Content text */}
            <div className="text-center w-full">
                <p className={cn(
                    "font-bold text-[hsl(var(--foreground))] transition-colors duration-200 group-hover:text-amber-500",
                    size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-base"
                )}>
                    {badge.name}
                </p>
                {size !== "sm" && (
                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 px-1 leading-relaxed line-clamp-2">
                        {badge.description}
                    </p>
                )}
                {earned && earnedAt && size === "lg" && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1.5 flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {new Date(earnedAt).toLocaleDateString("vi-VN")}
                    </p>
                )}
            </div>

            {/* XP Reward pill */}
            {earned && badge.xp_reward > 0 && (
                <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full mt-auto">
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300"
            onClick={onComplete}
        >
            <div className="relative max-w-md w-full mx-4 text-center p-8 rounded-[2.5rem] border border-amber-500/30 bg-gradient-to-b from-[hsl(var(--card))] to-[hsl(var(--card))]/90 shadow-[0_25px_60px_-15px_rgba(245,158,11,0.25)] animate-in zoom-in-95 duration-300 overflow-hidden">
                {/* Radial glow background */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />

                {/* Animated light shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite] pointer-events-none" />

                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                    <Award className="h-4 w-4 animate-bounce" />
                    Đạt huy chương mới!
                </div>

                <div className="w-28 h-28 mx-auto rounded-full bg-gradient-to-br from-amber-500/15 to-orange-500/15 border-2 border-amber-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-pulse">
                    <span className="text-5xl filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)] select-none">
                        {badge.icon}
                    </span>
                </div>

                <h2 className="text-2xl font-black text-[hsl(var(--foreground))] mb-2 tracking-tight">
                    {badge.name}
                </h2>
                
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-xs mx-auto leading-relaxed">
                    {badge.description}
                </p>

                {badge.xp_reward > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-[hsl(var(--background))] rounded-full font-extrabold text-sm shadow-[0_10px_20px_rgba(245,158,11,0.2)]">
                        +{badge.xp_reward} XP Thưởng
                    </span>
                )}

                <p className="text-xs text-[hsl(var(--muted-foreground))]/60 mt-8 font-medium">
                    Nhấp vào bất kỳ đâu để tiếp tục hành trình
                </p>
            </div>
        </div>
    )
}

