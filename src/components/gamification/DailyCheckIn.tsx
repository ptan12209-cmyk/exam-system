"use client"

import { useState, useEffect } from "react"
import { Flame, Gift, Check, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface DailyCheckInProps {
    onComplete?: (data: { xp: number; streak: number }) => void
}

export function DailyCheckIn({ onComplete }: DailyCheckInProps) {
    const [status, setStatus] = useState<{
        checkedInToday: boolean
        currentStreak: number
        todayXp: number
        recentLogins: { login_date: string; xp_earned: number }[]
    } | null>(null)
    const [loading, setLoading] = useState(true)
    const [checking, setChecking] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)
    const [result, setResult] = useState<{
        xp_earned: number
        streak: number
        milestone?: number
        newAchievements?: string[]
    } | null>(null)

    useEffect(() => {
        fetchStatus()
    }, [])

    async function fetchStatus() {
        try {
            const res = await fetch("/api/daily-checkin")
            const data = await res.json()
            if (res.ok) {
                setStatus(data)
            }
        } catch (error) {
            console.error("Failed to fetch checkin status:", error)
        } finally {
            setLoading(false)
        }
    }

    async function handleCheckIn() {
        setChecking(true)
        try {
            const res = await fetch("/api/daily-checkin", { method: "POST" })
            const data = await res.json()

            if (res.ok && data.success) {
                setResult(data)
                setShowSuccess(true)
                setStatus(prev => prev ? { ...prev, checkedInToday: true, currentStreak: data.streak } : null)
                onComplete?.({ xp: data.xp_earned, streak: data.streak })
            }
        } catch (error) {
            console.error("Check-in failed:", error)
        } finally {
            setChecking(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            </div>
        )
    }

    // Already checked in today - show streak
    if (status?.checkedInToday) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl border border-orange-500/30">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                    <Flame className="w-5 h-5 text-white" />
                </div>
                <div>
                    <p className="text-sm text-slate-400">Chuỗi ngày</p>
                    <p className="text-lg font-bold text-orange-400">{status.currentStreak} ngày 🔥</p>
                </div>
                <Check className="w-5 h-5 text-green-500 ml-auto" />
            </div>
        )
    }

    return (
        <>
            {/* Check-in button */}
            <button
                onClick={handleCheckIn}
                disabled={checking}
                className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all",
                    "bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/50",
                    "hover:from-orange-500/20 hover:to-red-500/20 hover:scale-[1.02]",
                    "active:scale-[0.98]"
                )}
            >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center animate-pulse">
                    {checking ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                    ) : (
                        <Gift className="w-6 h-6 text-white" />
                    )}
                </div>
                <div className="text-left">
                    <p className="font-semibold text-white">Điểm danh hôm nay</p>
                    <p className="text-sm text-orange-400">
                        Nhận XP và giữ streak! 🔥
                    </p>
                </div>
            </button>

            {/* Success Modal */}
            {showSuccess && result && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-sm mx-4 bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden animate-in zoom-in-95">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-center relative">
                            <button
                                onClick={() => setShowSuccess(false)}
                                className="absolute top-3 right-3 text-white/70 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-white/20 flex items-center justify-center">
                                <Flame className="w-10 h-10 text-white animate-bounce" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Điểm danh thành công!</h2>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            {/* Streak */}
                            <div className="flex items-center justify-between p-4 bg-orange-500/10 rounded-xl">
                                <span className="text-slate-400">Chuỗi ngày</span>
                                <span className="text-2xl font-bold text-orange-400">
                                    {result.streak} ngày 🔥
                                </span>
                            </div>

                            {/* XP Earned */}
                            <div className="flex items-center justify-between p-4 bg-yellow-500/10 rounded-xl">
                                <span className="text-slate-400">XP nhận được</span>
                                <span className="text-2xl font-bold text-yellow-400">
                                    +{result.xp_earned} ⭐
                                </span>
                            </div>

                            {/* Milestone */}
                            {result.milestone && (
                                <div className="p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-xl text-center border border-purple-500/30">
                                    <p className="text-purple-400 font-semibold">🎉 Mốc {result.milestone} ngày!</p>
                                    <p className="text-sm text-slate-400">Bạn thật kiên trì!</p>
                                </div>
                            )}

                            {/* New Achievements */}
                            {result.newAchievements && result.newAchievements.length > 0 && (
                                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/30">
                                    <p className="text-green-400 font-semibold mb-2">🏆 Thành tựu mới!</p>
                                    {result.newAchievements.map((name, i) => (
                                        <p key={i} className="text-sm text-white">{name}</p>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="px-6 pb-6">
                            <Button
                                onClick={() => setShowSuccess(false)}
                                className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                            >
                                Tiếp tục học tập!
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// Compact version for header
export function StreakBadge() {
    const [streak, setStreak] = useState<number | null>(null)

    useEffect(() => {
        fetch("/api/daily-checkin")
            .then(res => res.json())
            .then(data => setStreak(data.currentStreak || 0))
            .catch(() => setStreak(0))
    }, [])

    if (streak === null) return null

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/20 rounded-full">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium text-orange-400">{streak}</span>
        </div>
    )
}
