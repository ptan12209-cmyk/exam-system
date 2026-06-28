"use client"

import { useState, useEffect } from "react"
import { Trophy, Lock, Check, Star, Loader2, Sparkles, Compass } from "lucide-react"
import { cn } from "@/lib/utils"

interface Achievement {
    id: string
    code: string
    name: string
    description: string
    icon: string
    category: string
    rarity: string
    xp_reward: number
    condition_type: string
    condition_value: number
    is_hidden: boolean
    isUnlocked: boolean
    isFeatured: boolean
    currentValue: number
    progress: number
}

interface AchievementsData {
    achievements: Achievement[]
    grouped: Record<string, Achievement[]>
    stats: {
        total: number
        unlocked: number
        percentage: number
    }
}

const categoryNames: Record<string, string> = {
    study: "📚 Học tập",
    streak: "🔥 Chuỗi ngày",
    score: "⭐ Điểm số",
    xp: "💎 Tích lũy XP",
    level: "⬆️ Cấp độ"
}

// Premium HSL border & card background overlays for each rarity
const rarityConfig: Record<string, { card: string; glow: string; text: string; label: string }> = {
    common: {
        card: "border-[hsl(var(--border))]/70 bg-gradient-to-b from-[hsl(var(--card))]/95 to-[hsl(var(--card))]/60",
        glow: "hover:shadow-[0_15px_35px_rgba(0,0,0,0.04)] hover:border-[hsl(var(--foreground))]/15",
        text: "text-[hsl(var(--muted-foreground))]",
        label: "bg-[hsl(var(--muted))]/60 text-[hsl(var(--foreground))]/80"
    },
    rare: {
        card: "border-blue-500/35 dark:border-blue-500/20 bg-gradient-to-b from-[hsl(var(--card))]/95 to-blue-500/5",
        glow: "hover:shadow-[0_15px_35px_rgba(59,130,246,0.1)] hover:border-blue-500/55",
        text: "text-blue-600 dark:text-blue-400",
        label: "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    },
    epic: {
        card: "border-purple-500/35 dark:border-purple-500/20 bg-gradient-to-b from-[hsl(var(--card))]/95 to-purple-500/5",
        glow: "hover:shadow-[0_15px_35px_rgba(147,51,234,0.12)] hover:border-purple-500/55",
        text: "text-purple-600 dark:text-purple-400",
        label: "bg-purple-500/10 text-purple-600 dark:text-purple-400"
    },
    legendary: {
        card: "border-amber-500/35 dark:border-amber-500/20 bg-gradient-to-b from-[hsl(var(--card))]/95 to-amber-500/5",
        glow: "hover:shadow-[0_20px_45px_rgba(245,158,11,0.15)] hover:border-amber-500/55",
        text: "text-amber-600 dark:text-amber-400",
        label: "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    }
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
    const isLocked = !achievement.isUnlocked
    const showHidden = achievement.is_hidden && isLocked
    const cfg = rarityConfig[achievement.rarity] || rarityConfig.common

    return (
        <div
            className={cn(
                "group relative p-5 rounded-2xl border-2 transition-all duration-300 flex flex-col justify-between h-full min-h-[190px]",
                isLocked 
                    ? "bg-gradient-to-b from-[hsl(var(--card))]/50 to-[hsl(var(--card))]/10 border-[hsl(var(--border))]/40 opacity-45 grayscale hover:opacity-60" 
                    : cn(cfg.card, cfg.glow)
            )}
        >
            {/* Sparkle star for unlocked legendaries/epics */}
            {!isLocked && (achievement.rarity === "legendary" || achievement.rarity === "epic") && (
                <span className="absolute top-4 right-4 text-amber-500 dark:text-amber-400 animate-pulse">
                    <Sparkles className="h-4 w-4" />
                </span>
            )}

            <div>
                {/* Rarity label */}
                <div className="flex items-center justify-between mb-3">
                    <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider",
                        isLocked ? "bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]" : cfg.label
                    )}>
                        {achievement.rarity}
                    </span>
                    
                    {/* Unlocked check badge */}
                    {!isLocked && (
                        <span className="flex h-5 w-5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full items-center justify-center border border-emerald-400/20 shadow-md">
                            <Check className="w-3.5 h-3.5 text-[hsl(var(--background))] stroke-[3]" />
                        </span>
                    )}
                </div>

                {/* Icon & Name */}
                <div className="flex items-start gap-3 mt-1">
                    <div className="text-3.5xl select-none filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.1)]">
                        {showHidden ? "🔒" : achievement.icon}
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-[hsl(var(--foreground))] leading-snug group-hover:text-amber-500 transition-colors duration-200">
                            {showHidden ? "Nhiệm vụ ẩn" : achievement.name}
                        </h4>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed line-clamp-2">
                            {showHidden ? "Đạt đủ điều kiện để khám phá nhiệm vụ ẩn..." : achievement.description}
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom Panel: Progress or XP Reward */}
            <div className="mt-4 pt-3 border-t border-[hsl(var(--border))]/40">
                {/* Progress bar */}
                {!achievement.isUnlocked && !showHidden && (
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px] font-bold text-[hsl(var(--muted-foreground))]">
                            <span>Đang làm: {Math.round(achievement.progress)}%</span>
                            <span>{achievement.currentValue}/{achievement.condition_value}</span>
                        </div>
                        <div className="h-1.5 bg-[hsl(var(--muted))]/55 rounded-full overflow-hidden border border-[hsl(var(--border))]/30">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 dark:from-indigo-400 dark:to-purple-400 transition-all duration-300"
                                style={{ width: `${achievement.progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* XP Reward */}
                {achievement.xp_reward > 0 && !isLocked && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        +{achievement.xp_reward} XP Thưởng
                    </div>
                )}

                {/* Locked text */}
                {isLocked && showHidden && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Chưa mở khóa
                    </span>
                )}
            </div>
        </div>
    )
}

export function AchievementsGrid() {
    const [data, setData] = useState<AchievementsData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState<string | null>(null)

    useEffect(() => {
        fetchAchievements()
    }, [])

    async function fetchAchievements() {
        try {
            const res = await fetch("/api/achievements")
            const json = await res.json()
            if (res.ok) {
                setData(json)
            }
        } catch (error) {
            console.error("Failed to fetch achievements:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12 text-[hsl(var(--muted-foreground))] font-medium">
                Không thể tải danh sách thành tựu.
            </div>
        )
    }

    const categories = Object.keys(data.grouped).filter(k => data.grouped[k].length > 0)
    const achievements = activeCategory
        ? data.grouped[activeCategory]
        : data.achievements

    return (
        <div className="space-y-6">
            {/* Stats Header banner */}
            <div className="relative overflow-hidden p-6 bg-gradient-to-r from-purple-500/10 via-pink-500/5 to-transparent rounded-2xl border border-purple-500/20 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-[60px] pointer-events-none" />
                
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                        <Trophy className="w-6 h-6 text-[hsl(var(--background))] stroke-[2.5]" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Thành tựu đã mở</p>
                        <p className="text-3xl font-extrabold text-[hsl(var(--foreground))] tracking-tight mt-0.5">
                            {data.stats.unlocked} <span className="text-lg font-medium text-[hsl(var(--muted-foreground))]">/ {data.stats.total}</span>
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 bg-[hsl(var(--card))]/50 border border-[hsl(var(--border))]/60 px-4 py-2.5 rounded-2xl backdrop-blur-sm sm:self-center self-start">
                    <div className="text-left">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Tỷ lệ hoàn thành</p>
                        <p className="text-2xl font-black text-purple-500 tracking-tight mt-0.5">{data.stats.percentage}%</p>
                    </div>
                </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none">
                <button
                    onClick={() => setActiveCategory(null)}
                    className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200",
                        !activeCategory
                            ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-md scale-102"
                            : "bg-[hsl(var(--card))]/85 border border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))]"
                    )}
                >
                    Tất cả ({data.achievements.length})
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                            "px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200",
                            activeCategory === cat
                                ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] shadow-md scale-102"
                                : "bg-[hsl(var(--card))]/85 border border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))]"
                        )}
                    >
                        {categoryNames[cat] || cat} ({data.grouped[cat].length})
                    </button>
                ))}
            </div>

            {/* Achievements grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {achievements.map(achievement => (
                    <AchievementCard key={achievement.id} achievement={achievement} />
                ))}
            </div>
        </div>
    )
}

// Compact widget for dashboard
export function AchievementsWidget({ limit = 4 }: { limit?: number }) {
    const [achievements, setAchievements] = useState<Achievement[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/achievements")
            .then(res => res.json())
            .then(data => {
                // Show unlocked first, then closest to unlock
                const sorted = [...(data.achievements || [])]
                    .sort((a, b) => {
                        if (a.isUnlocked && !b.isUnlocked) return -1
                        if (!a.isUnlocked && b.isUnlocked) return 1
                        return b.progress - a.progress
                    })
                setAchievements(sorted.slice(0, limit))
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [limit])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-purple-500" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[hsl(var(--foreground))] flex items-center gap-2 tracking-tight">
                    <Trophy className="w-5 h-5 text-purple-500" />
                    Thành tựu gần nhất
                </h3>
                <a href="/student/achievements" className="text-xs font-bold text-purple-500 hover:underline">
                    Xem tất cả
                </a>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
                {achievements.map(a => (
                    <div
                        key={a.id}
                        className={cn(
                            "p-4 rounded-3xl border transition-all duration-300 flex flex-col justify-between min-h-[110px]",
                            a.isUnlocked
                                ? "bg-gradient-to-b from-[hsl(var(--card))] to-purple-500/5 border-purple-500/25 shadow-xs"
                                : "bg-gradient-to-b from-[hsl(var(--card))]/50 to-[hsl(var(--card))]/10 border-[hsl(var(--border))]/40 opacity-60"
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-2xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.1)] select-none">
                                {a.icon}
                            </span>
                            {a.isUnlocked && (
                                <span className="flex h-4 w-4 bg-emerald-500 rounded-full items-center justify-center border border-emerald-400/20">
                                    <Check className="w-2.5 h-2.5 text-[hsl(var(--background))] stroke-[3]" />
                                </span>
                            )}
                        </div>
                        
                        <div className="mt-2 w-full">
                            <p className="text-xs font-bold text-[hsl(var(--foreground))] truncate">{a.name}</p>
                            {!a.isUnlocked && (
                                <div className="mt-2 h-1 bg-[hsl(var(--muted))]/55 rounded-full overflow-hidden border border-[hsl(var(--border))]/20">
                                    <div
                                        className="h-full bg-purple-500"
                                        style={{ width: `${a.progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

