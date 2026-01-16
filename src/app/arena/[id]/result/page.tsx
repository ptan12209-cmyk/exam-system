"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Trophy,
    Target,
    Clock,
    Users,
    Loader2,
    Medal,
    Crown
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ArenaResult {
    id: string
    score: number
    correct_count: number
    total_questions: number
    time_spent: number
    rank: number | null
    submitted_at: string
    student_id: string
    profile?: { full_name: string } | null
}

interface ArenaSession {
    id: string
    name: string
    subject: string
}

export default function ArenaResultPage() {
    const router = useRouter()
    const params = useParams()
    const arenaId = params.id as string
    const supabase = createClient()

    const [arena, setArena] = useState<ArenaSession | null>(null)
    const [myResult, setMyResult] = useState<ArenaResult | null>(null)
    const [leaderboard, setLeaderboard] = useState<ArenaResult[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        fetchResults()
    }, [arenaId])

    const fetchResults = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push("/login")
            return
        }
        setUserId(user.id)

        // Fetch arena info
        const { data: arenaData } = await supabase
            .from("arena_sessions")
            .select("id, name, subject")
            .eq("id", arenaId)
            .single()

        if (arenaData) {
            setArena(arenaData)
        }

        // Fetch my result
        const { data: myResultData } = await supabase
            .from("arena_results")
            .select("*")
            .eq("arena_id", arenaId)
            .eq("student_id", user.id)
            .single()

        if (myResultData) {
            setMyResult(myResultData)
        }

        // Fetch leaderboard with profiles
        const { data: leaderboardData } = await supabase
            .from("arena_results")
            .select(`
                *,
                profile:profiles!arena_results_student_id_fkey(full_name)
            `)
            .eq("arena_id", arenaId)
            .order("score", { ascending: false })
            .order("time_spent", { ascending: true })
            .limit(50)

        if (leaderboardData) {
            // Calculate ranks
            const rankedData = leaderboardData.map((r: ArenaResult, idx: number) => ({
                ...r,
                rank: idx + 1
            }))
            setLeaderboard(rankedData)

            // Update my rank from leaderboard
            if (myResultData) {
                const myRank = rankedData.findIndex((r: ArenaResult) => r.student_id === user.id) + 1
                if (myRank > 0) {
                    setMyResult(prev => prev ? { ...prev, rank: myRank } : prev)
                }
            }
        }

        setLoading(false)
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    const getGrade = (score: number) => {
        if (score >= 9) return { label: "Xuất sắc", color: "text-yellow-400", emoji: "🏆" }
        if (score >= 8) return { label: "Giỏi", color: "text-green-400", emoji: "⭐" }
        if (score >= 6.5) return { label: "Khá", color: "text-blue-400", emoji: "👍" }
        if (score >= 5) return { label: "Đạt", color: "text-slate-400", emoji: "✓" }
        return { label: "Chưa đạt", color: "text-red-400", emoji: "📚" }
    }

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-300" />
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />
        return <span className="text-slate-400 font-bold">{rank}</span>
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    if (!myResult) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
                <Card className="w-full max-w-md border-slate-700 bg-slate-800/50">
                    <CardContent className="p-6 text-center">
                        <p className="text-slate-400">Không tìm thấy kết quả</p>
                        <Link href="/arena">
                            <Button className="mt-4">Quay lại Đấu trường</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const grade = getGrade(myResult.score)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/arena">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{arena?.name}</h1>
                        <p className="text-slate-400 text-sm">Kết quả thi đấu</p>
                    </div>
                </div>

                {/* My Score Card */}
                <Card className="border-slate-700 bg-gradient-to-br from-purple-500/10 to-pink-500/10 mb-8">
                    <CardContent className="p-8">
                        <div className="text-center">
                            <div className="text-6xl mb-2">{grade.emoji}</div>
                            <div className="text-5xl font-bold text-white mb-2">
                                {myResult.score.toFixed(1)}
                            </div>
                            <div className={cn("text-xl font-medium mb-6", grade.color)}>
                                {grade.label}
                            </div>

                            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                                <div className="p-4 bg-slate-800/50 rounded-xl">
                                    <Target className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                                    <div className="text-xl font-bold text-white">
                                        {myResult.correct_count}/{myResult.total_questions}
                                    </div>
                                    <div className="text-xs text-slate-500">Số đúng</div>
                                </div>
                                <div className="p-4 bg-slate-800/50 rounded-xl">
                                    <Clock className="w-5 h-5 text-green-400 mx-auto mb-2" />
                                    <div className="text-xl font-bold text-white">
                                        {formatTime(myResult.time_spent)}
                                    </div>
                                    <div className="text-xs text-slate-500">Thời gian</div>
                                </div>
                                <div className="p-4 bg-slate-800/50 rounded-xl">
                                    <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                                    <div className="text-xl font-bold text-white">
                                        #{myResult.rank || "-"}
                                    </div>
                                    <div className="text-xs text-slate-500">Xếp hạng</div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Leaderboard */}
                <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Bảng xếp hạng ({leaderboard.length} người tham gia)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {leaderboard.map((result, idx) => {
                                const isMe = result.student_id === userId
                                return (
                                    <div
                                        key={result.id}
                                        className={cn(
                                            "flex items-center gap-4 p-3 rounded-lg transition-colors",
                                            isMe
                                                ? "bg-purple-500/20 border border-purple-500/30"
                                                : "hover:bg-slate-700/30"
                                        )}
                                    >
                                        <div className="w-8 text-center">
                                            {getRankIcon(idx + 1)}
                                        </div>
                                        <div className="flex-1">
                                            <span className={cn(
                                                "font-medium",
                                                isMe ? "text-purple-300" : "text-white"
                                            )}>
                                                {result.profile?.full_name || "Học sinh"}
                                                {isMe && " (Bạn)"}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-bold text-white">
                                                {result.score.toFixed(1)}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                {result.correct_count}/{result.total_questions} • {formatTime(result.time_spent)}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="mt-8 flex justify-center gap-4">
                    <Link href="/arena">
                        <Button variant="outline" className="border-slate-600 text-slate-400">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Về Đấu trường
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
