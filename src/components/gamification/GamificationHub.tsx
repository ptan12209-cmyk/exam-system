"use client"

import { useState } from "react"
import { Trophy, Medal, Crown, Gift } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChallengesWidget } from "./ChallengeCard"
import { AchievementsWidget } from "./AchievementsGrid"
import { LeaderboardCard } from "./Leaderboard"
import Link from "next/link"

type TabType = "challenges" | "achievements" | "leaderboard"

interface GamificationHubProps {
    currentUserId?: string
}

export function GamificationHub({ currentUserId }: GamificationHubProps) {
    const [activeTab, setActiveTab] = useState<TabType>("challenges")

    const tabs = [
        { id: "challenges" as TabType, label: "Thử thách", icon: Trophy },
        { id: "achievements" as TabType, label: "Thành tựu", icon: Medal },
        { id: "leaderboard" as TabType, label: "Xếp hạng", icon: Crown },
    ]

    return (
        <div className="space-y-4">
            {/* Tabs */}
            <div className="flex bg-slate-800/50 rounded-lg p-1">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm font-medium transition-all",
                            activeTab === tab.id
                                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                                : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="min-h-[280px]">
                {activeTab === "challenges" && <ChallengesWidget limit={3} />}
                {activeTab === "achievements" && <AchievementsWidget limit={6} />}
                {activeTab === "leaderboard" && <LeaderboardCard currentUserId={currentUserId} compact />}
            </div>

            {/* Rewards Link */}
            <Link href="/student/rewards">
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20 hover:border-yellow-500/40 transition-all cursor-pointer group">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                            <Gift className="w-4 h-4 text-white" />
                        </div>
                        <p className="font-medium text-white text-sm">Cửa hàng phần thưởng</p>
                    </div>
                    <span className="text-slate-400 group-hover:text-white transition-colors">→</span>
                </div>
            </Link>
        </div>
    )
}
