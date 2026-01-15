"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getUserStats } from "@/lib/gamification"
import { XpBar } from "@/components/gamification/XpBar"
import { BadgeGrid } from "@/components/gamification/BadgeCard"
import { LeaderboardCard } from "@/components/gamification/Leaderboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Trophy,
    Target,
    Flame,
    Star,
    BookOpen,
    Loader2
} from "lucide-react"

interface UserStats {
    xp: number
    level: number
    streak_days: number
    exams_completed: number
    perfect_scores: number
}

interface Badge {
    name: string
    description: string
    icon: string
    xp_reward: number
}

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [fullName, setFullName] = useState("")
    const [stats, setStats] = useState<UserStats | null>(null)
    const [badges, setBadges] = useState<{ badge: Badge; earned_at: string }[]>([])

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            setUserId(user.id)

            // Get profile
            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", user.id)
                .single()

            if (profile) setFullName(profile.full_name || "")

            // Get stats and badges
            const { stats: userStats, badges: userBadges } = await getUserStats(user.id)
            setStats(userStats)
            setBadges(userBadges as any)

            setLoading(false)
        }

        fetchData()
    }, [router, supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/student/dashboard">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Hồ sơ của tôi</h1>
                </div>

                {/* Profile Header Card */}
                <Card className="border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-800/50 mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-3xl font-bold text-white">
                                {fullName ? fullName.charAt(0).toUpperCase() : "?"}
                            </div>

                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-white mb-2">
                                    {fullName || "Học sinh"}
                                </h2>
                                {stats && (
                                    <XpBar xp={stats.xp} size="lg" />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="pt-4 text-center">
                            <BookOpen className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                            <div className="text-2xl font-bold text-white">
                                {stats?.exams_completed || 0}
                            </div>
                            <div className="text-xs text-slate-400">Bài đã làm</div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="pt-4 text-center">
                            <Star className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                            <div className="text-2xl font-bold text-white">
                                {stats?.perfect_scores || 0}
                            </div>
                            <div className="text-xs text-slate-400">Điểm 10</div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="pt-4 text-center">
                            <Flame className="w-6 h-6 mx-auto mb-2 text-orange-400" />
                            <div className="text-2xl font-bold text-white">
                                {stats?.streak_days || 0}
                            </div>
                            <div className="text-xs text-slate-400">Ngày streak</div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="pt-4 text-center">
                            <Trophy className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                            <div className="text-2xl font-bold text-white">
                                {badges.length}
                            </div>
                            <div className="text-xs text-slate-400">Badges</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Badges Section */}
                <Card className="border-slate-700 bg-slate-800/50 mb-6">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Target className="w-5 h-5 text-yellow-500" />
                            Badges đã đạt
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {badges.length > 0 ? (
                            <BadgeGrid badges={badges} />
                        ) : (
                            <p className="text-center text-slate-500 py-8">
                                Chưa có badge nào. Hoàn thành bài thi để nhận badge đầu tiên!
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Leaderboard */}
                <LeaderboardCard currentUserId={userId || undefined} />
            </div>
        </div>
    )
}
