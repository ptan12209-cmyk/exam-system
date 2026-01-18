"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Trophy, Flame, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { XpBar } from "@/components/gamification/XpBar"

export default function AchievementsPage() {
    const [xp, setXp] = useState(0)

    useEffect(() => {
        // Fetch user XP
        fetch("/api/daily-checkin")
            .then(res => res.json())
            .then(data => setXp(data.xp || 0))
            .catch(() => { })
    }, [])

    function handleCheckInComplete(data: { xp: number }) {
        setXp(prev => prev + data.xp)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/80 sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link href="/student/dashboard">
                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-purple-500" />
                                Thành tựu
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                {/* XP Bar */}
                <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <XpBar xp={xp} size="lg" />
                </div>

                {/* Daily Check-in */}
                <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Flame className="w-5 h-5 text-orange-500" />
                        Điểm danh hàng ngày
                    </h2>
                    <DailyCheckIn onComplete={handleCheckInComplete} />
                </div>

                {/* Achievements */}
                <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
                    <AchievementsGrid />
                </div>
            </main>
        </div>
    )
}
