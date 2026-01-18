"use client"

import { useState, useEffect } from "react"
import { Trophy, Lock, Check, Star, Loader2 } from "lucide-react"
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
    xp: "💰 Tích lũy XP",
    level: "⬆️ Cấp độ"
}

const rarityColors: Record<string, string> = {
    common: "border-slate-500 bg-slate-500/10",
    rare: "border-blue-500 bg-blue-500/10",
    epic: "border-purple-500 bg-purple-500/10",
    legendary: "border-yellow-500 bg-yellow-500/10"
}

const rarityGlow: Record<string, string> = {
    common: "",
    rare: "shadow-blue-500/20",
    epic: "shadow-purple-500/30",
    legendary: "shadow-yellow-500/40 shadow-lg"
}

export function AchievementCard({ achievement }: { achievement: Achievement }) {
    const isLocked = !achievement.isUnlocked
    const showHidden = achievement.is_hidden && isLocked

    return (
        <div
            className={cn(
                "relative p-4 rounded-xl border-2 transition-all",
                isLocked ? "opacity-60 grayscale" : rarityColors[achievement.rarity],
                !isLocked && rarityGlow[achievement.rarity]
            )}
        >
            {/* Unlocked badge */}
            {!isLocked && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Icon */}
            <div className="text-4xl mb-3">
                {showHidden ? "❓" : achievement.icon}
            </div>

            {/* Name */}
            <h4 className="font-semibold text-white mb-1">
                {showHidden ? "???" : achievement.name}
            </h4>

            {/* Description */}
            <p className="text-xs text-slate-400 mb-3 line-clamp-2">
                {showHidden ? "Hoàn thành để mở khóa..." : achievement.description}
            </p>

            {/* Progress bar */}
            {!achievement.isUnlocked && !showHidden && (
                <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{Math.round(achievement.progress)}%</span>
                        <span>{achievement.currentValue}/{achievement.condition_value}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                            style={{ width: `${achievement.progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* XP Reward */}
            {achievement.xp_reward > 0 && !isLocked && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 rounded-full text-xs text-yellow-400">
                    +{achievement.xp_reward} XP
                </div>
            )}

            {/* Rarity label */}
            <div className={cn(
                "absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-medium uppercase",
                achievement.rarity === "legendary" && "bg-yellow-500/20 text-yellow-400",
                achievement.rarity === "epic" && "bg-purple-500/20 text-purple-400",
                achievement.rarity === "rare" && "bg-blue-500/20 text-blue-400",
                achievement.rarity === "common" && "bg-slate-500/20 text-slate-400"
            )}>
                {achievement.rarity}
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
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12 text-slate-400">
                Không thể tải thành tựu
            </div>
        )
    }

    const categories = Object.keys(data.grouped).filter(k => data.grouped[k].length > 0)
    const displayCategory = activeCategory || categories[0]
    const achievements = activeCategory
        ? data.grouped[activeCategory]
        : data.achievements

    return (
        <div className="space-y-6">
            {/* Stats header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Thành tựu đã mở</p>
                        <p className="text-2xl font-bold text-white">
                            {data.stats.unlocked} / {data.stats.total}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold text-purple-400">{data.stats.percentage}%</p>
                    <p className="text-xs text-slate-400">Hoàn thành</p>
                </div>
            </div>

            {/* Category tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setActiveCategory(null)}
                    className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                        !activeCategory
                            ? "bg-purple-500 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                    )}
                >
                    Tất cả
                </button>
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all",
                            activeCategory === cat
                                ? "bg-purple-500 text-white"
                                : "bg-slate-800 text-slate-400 hover:text-white"
                        )}
                    >
                        {categoryNames[cat] || cat}
                    </button>
                ))}
            </div>

            {/* Achievements grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-purple-500" />
                    Thành tựu
                </h3>
                <a href="/student/achievements" className="text-sm text-purple-400 hover:underline">
                    Xem tất cả
                </a>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {achievements.map(a => (
                    <div
                        key={a.id}
                        className={cn(
                            "p-3 rounded-lg border text-center",
                            a.isUnlocked
                                ? "bg-purple-500/10 border-purple-500/30"
                                : "bg-slate-800/50 border-slate-700 opacity-60"
                        )}
                    >
                        <div className="text-2xl mb-1">{a.icon}</div>
                        <p className="text-xs text-white font-medium truncate">{a.name}</p>
                        {!a.isUnlocked && (
                            <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-500"
                                    style={{ width: `${a.progress}%` }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
