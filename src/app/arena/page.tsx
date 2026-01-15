"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    Swords,
    Clock,
    Users,
    Trophy,
    Sparkles,
    Beaker,
    Loader2,
    Play,
    Calendar,
    Target
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ArenaSession {
    id: string
    name: string
    description: string | null
    subject: string
    start_time: string
    end_time: string
    duration: number
    total_questions: number
    status: string
}

interface ArenaResult {
    arena_id: string
    score: number
    rank: number | null
}

export default function ArenaPage() {
    const router = useRouter()
    const supabase = createClient()

    const [sessions, setSessions] = useState<ArenaSession[]>([])
    const [myResults, setMyResults] = useState<ArenaResult[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedSubject, setSelectedSubject] = useState<string>("all")
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push("/login")
            return
        }
        setUserId(user.id)

        // Fetch arena sessions
        const { data: sessionsData } = await supabase
            .from("arena_sessions")
            .select("*")
            .order("start_time", { ascending: false })

        if (sessionsData) {
            setSessions(sessionsData)
        }

        // Fetch my results
        const { data: resultsData } = await supabase
            .from("arena_results")
            .select("arena_id, score, rank")
            .eq("student_id", user.id)

        if (resultsData) {
            setMyResults(resultsData)
        }

        setLoading(false)
    }

    const getMyResult = (arenaId: string) => {
        return myResults.find(r => r.arena_id === arenaId)
    }

    const getStatusInfo = (session: ArenaSession) => {
        const now = new Date()
        const start = new Date(session.start_time)
        const end = new Date(session.end_time)

        if (now < start) {
            const diff = start.getTime() - now.getTime()
            const hours = Math.floor(diff / (1000 * 60 * 60))
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            return {
                status: "upcoming",
                label: `Mở sau ${hours}h ${mins}m`,
                color: "text-yellow-400",
                bg: "bg-yellow-500/10"
            }
        }

        if (now >= start && now <= end) {
            return {
                status: "active",
                label: "Đang diễn ra",
                color: "text-green-400",
                bg: "bg-green-500/10"
            }
        }

        return {
            status: "ended",
            label: "Đã kết thúc",
            color: "text-slate-400",
            bg: "bg-slate-500/10"
        }
    }

    const handleJoin = (sessionId: string) => {
        router.push(`/arena/${sessionId}`)
    }

    const filteredSessions = sessions.filter(s =>
        selectedSubject === "all" || s.subject === selectedSubject
    )

    const activeSessions = filteredSessions.filter(s => getStatusInfo(s).status === "active")
    const upcomingSessions = filteredSessions.filter(s => getStatusInfo(s).status === "upcoming")
    const endedSessions = filteredSessions.filter(s => getStatusInfo(s).status === "ended")

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 mb-6">
                        <Swords className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-3">
                        Đấu Trường Lý Thuyết
                    </h1>
                    <p className="text-slate-400 max-w-md mx-auto">
                        Thử thách kiến thức của bạn với các đề thi Vật Lý và Hóa Học.
                        40 câu hỏi, độ khó tăng dần!
                    </p>
                </div>

                {/* Subject Filter */}
                <div className="flex justify-center gap-3 mb-8">
                    <button
                        onClick={() => setSelectedSubject("all")}
                        className={cn(
                            "px-6 py-3 rounded-xl font-medium transition-all",
                            selectedSubject === "all"
                                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        )}
                    >
                        Tất cả
                    </button>
                    <button
                        onClick={() => setSelectedSubject("physics")}
                        className={cn(
                            "px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2",
                            selectedSubject === "physics"
                                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        )}
                    >
                        <Sparkles className="w-4 h-4" />
                        Vật Lý
                    </button>
                    <button
                        onClick={() => setSelectedSubject("chemistry")}
                        className={cn(
                            "px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2",
                            selectedSubject === "chemistry"
                                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        )}
                    >
                        <Beaker className="w-4 h-4" />
                        Hóa Học
                    </button>
                </div>

                {/* Active Battles */}
                {activeSessions.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            Đang diễn ra
                        </h2>
                        <div className="grid gap-4">
                            {activeSessions.map(session => {
                                const myResult = getMyResult(session.id)
                                return (
                                    <Card key={session.id} className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 overflow-hidden">
                                        <CardContent className="p-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-xl flex items-center justify-center",
                                                        session.subject === "physics"
                                                            ? "bg-blue-500/20"
                                                            : "bg-green-500/20"
                                                    )}>
                                                        {session.subject === "physics"
                                                            ? <Sparkles className="w-6 h-6 text-blue-400" />
                                                            : <Beaker className="w-6 h-6 text-green-400" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-bold text-white">{session.name}</h3>
                                                        <div className="flex items-center gap-4 text-sm text-slate-400 mt-1">
                                                            <span className="flex items-center gap-1">
                                                                <Target className="w-4 h-4" />
                                                                {session.total_questions} câu
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="w-4 h-4" />
                                                                {session.duration} phút
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {myResult ? (
                                                    <div className="text-right">
                                                        <div className="text-2xl font-bold text-white">{myResult.score.toFixed(1)}</div>
                                                        <div className="text-sm text-slate-400">
                                                            {myResult.rank ? `Hạng ${myResult.rank}` : "Đã làm"}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <Button
                                                        onClick={() => handleJoin(session.id)}
                                                        size="lg"
                                                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                                                    >
                                                        <Play className="w-5 h-5 mr-2" />
                                                        Vào thi
                                                    </Button>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Upcoming */}
                {upcomingSessions.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-yellow-400" />
                            Sắp diễn ra
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {upcomingSessions.map(session => {
                                const statusInfo = getStatusInfo(session)
                                return (
                                    <Card key={session.id} className="border-slate-700 bg-slate-800/50">
                                        <CardContent className="p-5">
                                            <div className="flex items-start gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center",
                                                    session.subject === "physics"
                                                        ? "bg-blue-500/20"
                                                        : "bg-green-500/20"
                                                )}>
                                                    {session.subject === "physics"
                                                        ? <Sparkles className="w-5 h-5 text-blue-400" />
                                                        : <Beaker className="w-5 h-5 text-green-400" />
                                                    }
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-white">{session.name}</h3>
                                                    <p className={cn("text-sm", statusInfo.color)}>
                                                        {statusInfo.label}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                                                        <span>{session.total_questions} câu</span>
                                                        <span>{session.duration} phút</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* History */}
                {endedSessions.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-slate-400" />
                            Đã kết thúc
                        </h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {endedSessions.slice(0, 6).map(session => {
                                const myResult = getMyResult(session.id)
                                return (
                                    <Card key={session.id} className="border-slate-700 bg-slate-800/30">
                                        <CardContent className="p-4">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-lg flex items-center justify-center",
                                                        session.subject === "physics"
                                                            ? "bg-blue-500/10"
                                                            : "bg-green-500/10"
                                                    )}>
                                                        {session.subject === "physics"
                                                            ? <Sparkles className="w-4 h-4 text-blue-400" />
                                                            : <Beaker className="w-4 h-4 text-green-400" />
                                                        }
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-white text-sm">{session.name}</h3>
                                                        <p className="text-xs text-slate-500">
                                                            {new Date(session.end_time).toLocaleDateString("vi-VN")}
                                                        </p>
                                                    </div>
                                                </div>

                                                {myResult ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-bold">{myResult.score.toFixed(1)}</span>
                                                        {myResult.rank && myResult.rank <= 3 && (
                                                            <span className="text-yellow-400">🏆</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-500 text-sm">Chưa tham gia</span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* No sessions */}
                {filteredSessions.length === 0 && (
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="py-12 text-center">
                            <Swords className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                            <p className="text-slate-400">Chưa có đợt thi nào</p>
                            <p className="text-slate-500 text-sm mt-1">
                                Các đợt thi mới sẽ xuất hiện ở đây
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* Back Button */}
                <div className="mt-8 text-center">
                    <Link href="/student/dashboard">
                        <Button variant="outline" className="border-slate-600 text-slate-400">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Về Dashboard
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    )
}
