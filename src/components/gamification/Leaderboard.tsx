"use client"

import { useEffect, useState } from "react"
import { Trophy, Medal, Crown } from "lucide-react"
import { getLeaderboard } from "@/lib/gamification"
import { cn } from "@/lib/utils"

interface LeaderboardEntry {
    rank: number
    userId: string
    fullName: string
    xp: number
    level: number
}

interface LeaderboardWidgetProps {
    currentUserId?: string
    limit?: number
}

export function LeaderboardWidget({ currentUserId, limit = 10 }: LeaderboardWidgetProps) {
    const [entries, setEntries] = useState<LeaderboardEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchLeaderboard = async () => {
            const data = await getLeaderboard(limit)
            setEntries(data)
            setLoading(false)
        }
        fetchLeaderboard()
    }, [limit])

    const getRankIcon = (rank: number) => {
        switch (rank) {
            case 1:
                return <Crown className="w-5 h-5 text-yellow-500" />
            case 2:
                return <Medal className="w-5 h-5 text-slate-400" />
            case 3:
                return <Medal className="w-5 h-5 text-amber-600" />
            default:
                return <span className="w-5 text-center text-sm text-slate-500">{rank}</span>
        }
    }

    const getRankBg = (rank: number) => {
        switch (rank) {
            case 1:
                return "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30"
            case 2:
                return "bg-slate-500/10 border-slate-500/30"
            case 3:
                return "bg-amber-500/10 border-amber-500/30"
            default:
                return "bg-slate-800/30 border-slate-700/50"
        }
    }

    if (loading) {
        return (
            <div className="animate-pulse space-y-2">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="h-12 bg-slate-800/50 rounded-lg" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {entries.map((entry) => (
                <div
                    key={entry.userId}
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all",
                        getRankBg(entry.rank),
                        entry.userId === currentUserId && "ring-2 ring-blue-500"
                    )}
                >
                    <div className="w-8 flex justify-center">
                        {getRankIcon(entry.rank)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <p className={cn(
                            "font-medium truncate",
                            entry.rank === 1 ? "text-yellow-500" : "text-white"
                        )}>
                            {entry.fullName}
                            {entry.userId === currentUserId && (
                                <span className="ml-2 text-xs text-blue-400">(Bạn)</span>
                            )}
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">
                            Lv.{entry.level}
                        </span>
                        <span className="font-mono text-yellow-500">
                            {entry.xp.toLocaleString()} XP
                        </span>
                    </div>
                </div>
            ))}
        </div>
    )
}

export function LeaderboardCard({ currentUserId }: { currentUserId?: string }) {
    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold text-white">Bảng xếp hạng</h3>
            </div>
            <LeaderboardWidget currentUserId={currentUserId} limit={10} />
        </div>
    )
}
