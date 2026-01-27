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
    Crown,
    Share2,
    Home,
    Swords
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
        if (score >= 9) return { label: "Xuất sắc", color: "text-amber-600 bg-amber-50 border-amber-200", emoji: "🏆" }
        if (score >= 8) return { label: "Giỏi", color: "text-green-600 bg-green-50 border-green-200", emoji: "⭐" }
        if (score >= 6.5) return { label: "Khá", color: "text-blue-600 bg-blue-50 border-blue-200", emoji: "👍" }
        if (score >= 5) return { label: "Đạt", color: "text-gray-600 bg-gray-50 border-gray-200", emoji: "✓" }
        return { label: "Chưa đạt", color: "text-red-600 bg-red-50 border-red-200", emoji: "📚" }
    }

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 fill-slate-400" />
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-amber-700" />
        return <span className="text-gray-400 font-bold text-sm">#{rank}</span>
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    if (!myResult) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center p-4">
                <Card className="w-full max-w-md bg-white dark:bg-slate-900 shadow-xl border-gray-200 dark:border-slate-800">
                    <CardContent className="p-8 text-center">
                        <p className="text-gray-500 dark:text-gray-400 mb-6">Không tìm thấy kết quả của bạn cho bài thi này.</p>
                        <Link href="/arena">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700">Quay lại Đấu trường</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const grade = getGrade(myResult.score)

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/arena">
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800">
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Swords className="w-6 h-6 text-orange-600" />
                                {arena?.name}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Kết quả thi đấu</p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {/* Left Column: My Score (1/3) */}
                    <div className="space-y-6">
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500" />
                            <CardContent className="p-6 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 dark:bg-slate-800 mb-4 text-4xl shadow-inner">
                                    {grade.emoji}
                                </div>
                                <div className="mb-6">
                                    <div className="text-5xl font-black text-gray-800 dark:text-white mb-2 tracking-tight">
                                        {myResult.score.toFixed(1)}
                                    </div>
                                    <span className={cn("px-3 py-1 rounded-full text-sm font-bold border", grade.color)}>
                                        {grade.label}
                                    </span>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Target className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm">Chính xác</span>
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">{myResult.correct_count}/{myResult.total_questions}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Clock className="w-4 h-4 text-green-500" />
                                            <span className="text-sm">Thời gian</span>
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-white">{formatTime(myResult.time_spent)}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                                            <Trophy className="w-4 h-4 text-yellow-500" />
                                            <span className="text-sm">Xếp hạng</span>
                                        </div>
                                        <span className="font-bold text-blue-600 dark:text-blue-400">#{myResult.rank || "-"}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/arena" className="col-span-1">
                                <Button variant="outline" className="w-full border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">
                                    <Swords className="w-4 h-4 mr-2" />
                                    Đấu tiếp
                                </Button>
                            </Link>
                            <Link href="/student/dashboard" className="col-span-1">
                                <Button variant="outline" className="w-full border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">
                                    <Home className="w-4 h-4 mr-2" />
                                    Trang chủ
                                </Button>
                            </Link>
                            <Button className="w-full col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md">
                                <Share2 className="w-4 h-4 mr-2" />
                                Chia sẻ thành tích
                            </Button>
                        </div>
                    </div>

                    {/* Right Column: Leaderboard (2/3) */}
                    <div className="md:col-span-2">
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 h-full">
                            <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/30">
                                <CardTitle className="text-gray-800 dark:text-white flex items-center gap-2 text-lg">
                                    <Users className="w-5 h-5 text-blue-600" />
                                    Bảng xếp hạng
                                    <span className="ml-auto text-sm font-normal text-gray-500 dark:text-gray-400">{leaderboard.length} đấu thủ</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-gray-50 dark:divide-slate-800 max-h-[600px] overflow-y-auto custom-scrollbar">
                                    {leaderboard.map((result, idx) => {
                                        const isMe = result.student_id === userId
                                        return (
                                            <div
                                                key={result.id}
                                                className={cn(
                                                    "flex items-center gap-4 p-4 transition-colors",
                                                    isMe ? "bg-blue-50/60 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-slate-800"
                                                )}
                                            >
                                                <div className="w-8 flex justify-center">
                                                    {getRankIcon(idx + 1)}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                                                            isMe ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400"
                                                        )}>
                                                            {(result.profile?.full_name || "U").charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="truncate">
                                                            <p className={cn(
                                                                "font-medium text-sm truncate",
                                                                isMe ? "text-blue-700 dark:text-blue-400" : "text-gray-800 dark:text-gray-200"
                                                            )}>
                                                                {result.profile?.full_name || "Ẩn danh"}
                                                                {isMe && " (Bạn)"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right flex items-center gap-6">
                                                    <div className="hidden sm:block text-xs text-gray-500 dark:text-gray-400">
                                                        <div>{result.correct_count} đúng</div>
                                                        <div>{formatTime(result.time_spent)}</div>
                                                    </div>
                                                    <div className="font-bold text-gray-800 dark:text-white text-lg w-12 text-right">
                                                        {result.score.toFixed(1)}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {leaderboard.length === 0 && (
                                        <div className="p-8 text-center text-gray-400">
                                            Chưa có bảng xếp hạng
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
