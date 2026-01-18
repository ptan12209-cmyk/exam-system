"use client"

import { useState, useEffect } from "react"
import { Trophy, Clock, CheckCircle2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Challenge {
    id: string
    title: string
    description: string
    icon: string
    xp_reward: number
    target_type: string
    target_value: number
    start_date: string
    end_date: string
    userProgress: number
    completed: boolean
    completedAt: string | null
    progressPercent: number
}

interface ChallengeCardProps {
    challenge: Challenge
    compact?: boolean
}

export function ChallengeCard({ challenge, compact = false }: ChallengeCardProps) {
    const progressPercent = Math.min(challenge.progressPercent, 100)

    return (
        <div className={cn(
            "relative overflow-hidden rounded-xl border transition-all",
            challenge.completed
                ? "bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30"
                : "bg-slate-800/50 border-slate-700 hover:border-blue-500/30"
        )}>
            {/* Completed overlay */}
            {challenge.completed && (
                <div className="absolute top-2 right-2">
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
            )}

            <div className={cn("p-4", compact && "p-3")}>
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                    <div className={cn(
                        "rounded-lg flex items-center justify-center shrink-0",
                        compact ? "w-10 h-10 text-xl" : "w-12 h-12 text-2xl",
                        challenge.completed ? "bg-green-500/20" : "bg-blue-500/20"
                    )}>
                        {challenge.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h4 className={cn(
                            "font-semibold text-white",
                            compact ? "text-sm" : "text-base"
                        )}>
                            {challenge.title}
                        </h4>
                        {!compact && (
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                                {challenge.description}
                            </p>
                        )}
                        {compact && (
                            <p className="text-xs text-slate-400 mt-0.5">
                                {challenge.description.split('.')[0]}
                            </p>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={cn(
                                "h-full transition-all duration-500",
                                challenge.completed
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500"
                                    : "bg-gradient-to-r from-blue-500 to-purple-500"
                            )}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>

                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                            {challenge.userProgress} / {challenge.target_value}
                        </span>
                        <span className={cn(
                            "font-medium",
                            challenge.completed ? "text-green-500" : "text-yellow-500"
                        )}>
                            +{challenge.xp_reward} XP
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

interface ChallengesWidgetProps {
    limit?: number
}

export function ChallengesWidget({ limit = 3 }: ChallengesWidgetProps) {
    const [challenges, setChallenges] = useState<Challenge[]>([])
    const [daysRemaining, setDaysRemaining] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchChallenges()
    }, [])

    async function fetchChallenges() {
        try {
            const res = await fetch("/api/challenges")
            const data = await res.json()
            if (res.ok) {
                setChallenges(data.challenges || [])
                setDaysRemaining(data.daysRemaining || 0)
            }
        } catch (error) {
            console.error("Failed to fetch challenges:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
        )
    }

    if (challenges.length === 0) {
        return (
            <div className="text-center py-8 text-slate-400">
                <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Chưa có thử thách nào</p>
            </div>
        )
    }

    const displayChallenges = challenges.slice(0, limit)
    const completedCount = challenges.filter(c => c.completed).length

    return (
        <div className="space-y-4">
            {/* Header with timer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium text-white">
                        Thử thách tuần này
                    </span>
                    <span className="text-xs text-slate-400">
                        ({completedCount}/{challenges.length})
                    </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="w-4 h-4" />
                    <span>Còn {daysRemaining} ngày</span>
                </div>
            </div>

            {/* Challenge cards */}
            <div className="space-y-3">
                {displayChallenges.map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} compact />
                ))}
            </div>

            {/* See all link */}
            {challenges.length > limit && (
                <button className="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    Xem tất cả thử thách →
                </button>
            )}
        </div>
    )
}

// Full challenges page component
export function ChallengesPage() {
    const [challenges, setChallenges] = useState<Challenge[]>([])
    const [daysRemaining, setDaysRemaining] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchChallenges()
    }, [])

    async function fetchChallenges() {
        try {
            const res = await fetch("/api/challenges")
            const data = await res.json()
            if (res.ok) {
                setChallenges(data.challenges || [])
                setDaysRemaining(data.daysRemaining || 0)
            }
        } catch (error) {
            console.error("Failed to fetch challenges:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    const activeChallenge = challenges.filter(c => !c.completed)
    const completedChallenges = challenges.filter(c => c.completed)

    return (
        <div className="space-y-8">
            {/* Timer Header */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-500/30">
                <div className="flex items-center gap-3">
                    <Trophy className="w-8 h-8 text-yellow-500" />
                    <div>
                        <h2 className="text-xl font-bold text-white">Thử thách tuần</h2>
                        <p className="text-sm text-slate-400">
                            Hoàn thành để nhận XP bonus
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-white">{daysRemaining}</p>
                    <p className="text-xs text-slate-400">ngày còn lại</p>
                </div>
            </div>

            {/* Active Challenges */}
            {activeChallenge.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Đang thực hiện</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        {activeChallenge.map(challenge => (
                            <ChallengeCard key={challenge.id} challenge={challenge} />
                        ))}
                    </div>
                </div>
            )}

            {/* Completed Challenges */}
            {completedChallenges.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        Đã hoàn thành
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        {completedChallenges.map(challenge => (
                            <ChallengeCard key={challenge.id} challenge={challenge} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
