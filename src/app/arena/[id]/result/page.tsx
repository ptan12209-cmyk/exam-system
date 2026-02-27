"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Trophy, Target, Clock, Users, Loader2, Medal, Crown, Share2, Home, Swords } from "lucide-react"
import { cn } from "@/lib/utils"

interface ArenaResult { id: string; score: number; correct_count: number; total_questions: number; time_spent: number; rank: number | null; submitted_at: string; student_id: string; profile?: { full_name: string } | null }
interface ArenaSession { id: string; name: string; subject: string }

export default function ArenaResultPage() {
    const router = useRouter(); const params = useParams(); const arenaId = params.id as string; const supabase = createClient()
    const [arena, setArena] = useState<ArenaSession | null>(null)
    const [myResult, setMyResult] = useState<ArenaResult | null>(null)
    const [leaderboard, setLeaderboard] = useState<ArenaResult[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => { fetchResults() }, [arenaId])

    const fetchResults = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/login"); return }
        setUserId(user.id)
        const { data: arenaData } = await supabase.from("arena_sessions").select("id, name, subject").eq("id", arenaId).single()
        if (arenaData) setArena(arenaData)
        const { data: myResultData } = await supabase.from("arena_results").select("*").eq("arena_id", arenaId).eq("student_id", user.id).single()
        if (myResultData) setMyResult(myResultData)
        const { data: leaderboardData } = await supabase.from("arena_results").select(`*, profile:profiles!arena_results_student_id_fkey(full_name)`).eq("arena_id", arenaId).order("score", { ascending: false }).order("time_spent", { ascending: true }).limit(50)
        if (leaderboardData) {
            const rankedData = leaderboardData.map((r: ArenaResult, idx: number) => ({ ...r, rank: idx + 1 }))
            setLeaderboard(rankedData)
            if (myResultData) { const myRank = rankedData.findIndex((r: ArenaResult) => r.student_id === user.id) + 1; if (myRank > 0) setMyResult(prev => prev ? { ...prev, rank: myRank } : prev) }
        }
        setLoading(false)
    }

    const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, "0")}` }
    const getGrade = (score: number) => {
        if (score >= 9) return { label: "Xuất sắc", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800", emoji: "🏆" }
        if (score >= 8) return { label: "Giỏi", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800", emoji: "⭐" }
        if (score >= 6.5) return { label: "Khá", color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800", emoji: "👍" }
        if (score >= 5) return { label: "Đạt", color: "text-muted-foreground bg-muted/30 border-border", emoji: "✓" }
        return { label: "Chưa đạt", color: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800", emoji: "📚" }
    }
    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        if (rank === 2) return <Medal className="w-5 h-5 text-slate-400 fill-slate-400" />
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-700 fill-amber-700" />
        return <span className="text-muted-foreground font-bold text-sm">#{rank}</span>
    }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
    if (!myResult) return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md glass-card rounded-2xl shadow-xl p-8 text-center">
                <p className="text-muted-foreground mb-6">Không tìm thấy kết quả của bạn cho bài thi này.</p>
                <Link href="/arena"><Button className="w-full gradient-primary text-white border-0">Quay lại Đấu trường</Button></Link>
            </div>
        </div>
    )

    const grade = getGrade(myResult.score)

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link href="/arena"><Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hover:bg-muted/30"><ArrowLeft className="w-5 h-5" /></Button></Link>
                        <div><h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Swords className="w-6 h-6 text-amber-600" />{arena?.name}</h1><p className="text-muted-foreground text-sm">Kết quả thi đấu</p></div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="space-y-6">
                        <div className="glass-card rounded-2xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 w-full h-1.5 gradient-primary" />
                            <div className="p-6 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/30 mb-4 text-4xl shadow-inner">{grade.emoji}</div>
                                <div className="mb-6">
                                    <div className="text-5xl font-black text-foreground mb-2 tracking-tight">{myResult.score.toFixed(1)}</div>
                                    <span className={cn("px-3 py-1 rounded-full text-sm font-bold border", grade.color)}>{grade.label}</span>
                                </div>
                                <div className="space-y-4 pt-6 border-t border-border/50">
                                    <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-muted-foreground"><Target className="w-4 h-4 text-indigo-500" /><span className="text-sm">Chính xác</span></div><span className="font-bold text-foreground">{myResult.correct_count}/{myResult.total_questions}</span></div>
                                    <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4 text-emerald-500" /><span className="text-sm">Thời gian</span></div><span className="font-bold text-foreground">{formatTime(myResult.time_spent)}</span></div>
                                    <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-muted-foreground"><Trophy className="w-4 h-4 text-yellow-500" /><span className="text-sm">Xếp hạng</span></div><span className="font-bold text-indigo-600 dark:text-indigo-400">#{myResult.rank || "-"}</span></div>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Link href="/arena"><Button variant="outline" className="w-full border-border text-muted-foreground"><Swords className="w-4 h-4 mr-2" />Đấu tiếp</Button></Link>
                            <Link href="/student/dashboard"><Button variant="outline" className="w-full border-border text-muted-foreground"><Home className="w-4 h-4 mr-2" />Trang chủ</Button></Link>
                            <Button className="w-full col-span-2 gradient-primary text-white border-0 shadow-md shadow-indigo-500/20"><Share2 className="w-4 h-4 mr-2" />Chia sẻ thành tích</Button>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <div className="glass-card rounded-2xl h-full overflow-hidden">
                            <div className="p-4 border-b border-border/50 bg-muted/10">
                                <h2 className="text-foreground flex items-center gap-2 text-lg font-bold"><Users className="w-5 h-5 text-indigo-600" />Bảng xếp hạng<span className="ml-auto text-sm font-normal text-muted-foreground">{leaderboard.length} đấu thủ</span></h2>
                            </div>
                            <div className="divide-y divide-border/30 max-h-[600px] overflow-y-auto custom-scrollbar">
                                {leaderboard.map((result, idx) => {
                                    const isMe = result.student_id === userId
                                    return (
                                        <div key={result.id} className={cn("flex items-center gap-4 p-4 transition-colors", isMe ? "bg-indigo-50/60 dark:bg-indigo-900/20" : "hover:bg-muted/20")}>
                                            <div className="w-8 flex justify-center">{getRankIcon(idx + 1)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold", isMe ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300" : "bg-muted/50 text-muted-foreground")}>{(result.profile?.full_name || "U").charAt(0).toUpperCase()}</div>
                                                    <p className={cn("font-medium text-sm truncate", isMe ? "text-indigo-700 dark:text-indigo-400" : "text-foreground")}>{result.profile?.full_name || "Ẩn danh"}{isMe && " (Bạn)"}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-6">
                                                <div className="hidden sm:block text-xs text-muted-foreground"><div>{result.correct_count} đúng</div><div>{formatTime(result.time_spent)}</div></div>
                                                <div className="font-bold text-foreground text-lg w-12 text-right">{result.score.toFixed(1)}</div>
                                            </div>
                                        </div>
                                    )
                                })}
                                {leaderboard.length === 0 && <div className="p-8 text-center text-muted-foreground">Chưa có bảng xếp hạng</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
