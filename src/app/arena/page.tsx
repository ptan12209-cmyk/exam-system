"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import { GraduationCap, Swords, Search, Clock, HelpCircle, Calendar, Loader2 } from "lucide-react"

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
    student_id: string
    profiles?: { full_name: string | null }
}

export default function ArenaPage() {
    const router = useRouter()
    const supabase = createClient()
    const [sessions, setSessions] = useState<ArenaSession[]>([])
    const [myResults, setMyResults] = useState<ArenaResult[]>([])
    const [topPlayers, setTopPlayers] = useState<ArenaResult[]>([])
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<{ id: string; full_name?: string } | null>(null)
    const [selectedTab, setSelectedTab] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) { router.push("/login"); return }
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", authUser.id).single()
        setUser({ id: authUser.id, full_name: profile?.full_name })
        const { data: sessionsData } = await supabase.from("arena_sessions").select("*").order("start_time", { ascending: false })
        if (sessionsData) setSessions(sessionsData)
        const { data: resultsData } = await supabase.from("arena_results").select("arena_id, score, rank").eq("student_id", authUser.id)
        if (resultsData) setMyResults(resultsData)
        const { data: topData } = await supabase.from("arena_results").select("*, profiles!student_id(full_name)").order("score", { ascending: false }).limit(10)
        if (topData) setTopPlayers(topData)
        setLoading(false)
    }

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
    const getMyResult = (arenaId: string) => myResults.find(r => r.arena_id === arenaId)

    const getStatusInfo = (session: ArenaSession) => {
        const now = new Date(); const start = new Date(session.start_time); const end = new Date(session.end_time)
        if (now < start) return { status: "upcoming", label: "Sắp diễn ra", color: "bg-amber-500" }
        if (now >= start && now <= end) return { status: "active", label: "Đang mở", color: "bg-emerald-500" }
        return { status: "ended", label: "Đã đóng", color: "bg-slate-400" }
    }

    const getSubjectStyle = (subject: string) => {
        const map: Record<string, { bg: string; label: string; emoji: string }> = {
            physics: { bg: "from-indigo-500 to-blue-600", label: "VẬT LÝ", emoji: "⚛️" },
            chemistry: { bg: "from-emerald-500 to-green-600", label: "HÓA HỌC", emoji: "🧪" },
            math: { bg: "from-violet-500 to-purple-600", label: "TOÁN", emoji: "📐" },
            biology: { bg: "from-lime-500 to-green-600", label: "SINH HỌC", emoji: "🧬" },
        }
        return map[subject] || { bg: "from-slate-500 to-slate-600", label: subject.toUpperCase(), emoji: "📝" }
    }

    const filteredSessions = sessions
        .filter(s => { if (selectedTab === "all") return true; return getStatusInfo(s).status === selectedTab })
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /><p className="text-sm text-muted-foreground">Đang tải...</p></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 glass-nav h-16 flex items-center justify-between px-4 lg:px-8 safe-top">
                <div className="flex items-center gap-4">
                    <Link href="/student/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center"><GraduationCap className="w-4 h-4 text-white" /></div>
                        <span className="font-bold text-xl text-foreground hidden md:block tracking-tight">ExamHub</span>
                    </Link>
                    <div className="hidden sm:block ml-2">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                            <input type="text" placeholder="Tìm kiếm..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-muted/50 border border-border rounded-xl text-sm w-64 focus:ring-2 focus:ring-indigo-500 text-foreground placeholder:text-muted-foreground" />
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                    <Link href="/student/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Trang chủ</Link>
                    <Link href="/resources" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Tài liệu</Link>
                </div>
                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <UserMenu userName={user?.full_name || ""} onLogout={handleLogout} role="student" />
                </div>
            </nav>

            <div className="pt-20 pb-24 lg:pb-12 px-4 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow w-full">
                {/* Left — Arena List */}
                <div className="lg:col-span-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Swords className="w-6 h-6 text-indigo-500" />Đấu trường lý thuyết
                        </h1>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
                        {[
                            { key: "all", label: "Tất cả" },
                            { key: "active", label: "Đang mở" },
                            { key: "upcoming", label: "Sắp diễn ra" },
                            { key: "ended", label: "Đã đóng" }
                        ].map(tab => (
                            <button key={tab.key} onClick={() => setSelectedTab(tab.key)}
                                className={cn("px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                                    selectedTab === tab.key ? "gradient-primary text-white shadow-lg shadow-indigo-500/20" : "text-muted-foreground hover:bg-muted/50"
                                )}>{tab.label}</button>
                        ))}
                    </div>

                    {/* Mobile search */}
                    <div className="relative mb-6 sm:hidden">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <input type="text" placeholder="Tìm kiếm..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 text-foreground" />
                    </div>

                    <div className="space-y-4">
                        {filteredSessions.length === 0 ? (
                            <div className="glass-card rounded-2xl p-12 text-center">
                                <div className="w-14 h-14 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-3"><Swords className="w-7 h-7 text-muted-foreground/40" /></div>
                                <p className="text-muted-foreground">Chưa có đợt thi nào</p>
                            </div>
                        ) : filteredSessions.map(session => {
                            const statusInfo = getStatusInfo(session)
                            const myResult = getMyResult(session.id)
                            const subjectStyle = getSubjectStyle(session.subject)
                            return (
                                <div key={session.id} className="glass-card rounded-2xl overflow-hidden flex flex-col sm:flex-row hover:shadow-xl transition-all duration-300 group">
                                    <div className={cn("sm:w-48 bg-gradient-to-br flex items-center justify-center p-6 relative flex-col text-center min-h-[120px]", subjectStyle.bg)}>
                                        <div className="text-5xl opacity-40 select-none">{subjectStyle.emoji}</div>
                                        <div className="absolute bottom-4 font-bold text-white tracking-widest text-xs uppercase">{subjectStyle.label}</div>
                                        {statusInfo.status === "active" && (
                                            <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Hot</div>
                                        )}
                                    </div>
                                    <div className="p-5 flex-1 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{session.name}</h3>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium text-white flex items-center gap-1", statusInfo.color)}>
                                                    <span className="w-1.5 h-1.5 rounded-full bg-white" />{statusInfo.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/30 pt-3 mt-1">
                                            <div className="flex items-center gap-4">
                                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(session.start_time).toLocaleDateString("vi-VN")}</span>
                                                <span className="flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" />{session.total_questions}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{session.duration}p</span>
                                            </div>
                                            {statusInfo.status === "active" && !myResult && (
                                                <Link href={`/arena/${session.id}`}>
                                                    <Button size="sm" className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90">Vào thi</Button>
                                                </Link>
                                            )}
                                            {myResult && <span className="font-bold text-emerald-600 dark:text-emerald-400">{myResult.score.toFixed(1)} điểm</span>}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right — Leaderboard */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="relative w-full h-32 rounded-2xl gradient-primary overflow-hidden shadow-xl shadow-indigo-500/20">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-md flex flex-col items-center">
                                <span className="text-sm font-normal text-indigo-100 mb-1">Tuần này</span>Bảng Vàng
                            </h2>
                        </div>
                        <span className="absolute top-2 right-2 text-4xl opacity-80">🏆</span>
                        <span className="absolute bottom-2 left-2 text-4xl opacity-80">🎖️</span>
                    </div>

                    {/* Podium */}
                    <div className="flex items-end justify-center gap-2 pt-4">
                        {/* 2nd */}
                        <div className="flex flex-col items-center w-1/3">
                            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-400 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold mb-2">{topPlayers[1]?.profiles?.full_name?.[0] || "?"}</div>
                            <div className="text-[10px] font-bold text-center text-violet-600 dark:text-violet-400 mb-1 truncate w-full">{topPlayers[1]?.profiles?.full_name || "---"}</div>
                            <div className="w-full"><div className="bg-gradient-to-b from-violet-500 to-purple-600 h-28 w-full rounded-t-xl flex flex-col items-center justify-end pb-3 text-white shadow-lg">
                                <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] mb-1">{topPlayers[1]?.score?.toFixed(0) || 0}</div>
                                <div className="text-xs font-bold uppercase mb-1">Bằng Nhãn</div><div className="text-3xl font-black">2</div>
                            </div></div>
                        </div>
                        {/* 1st */}
                        <div className="flex flex-col items-center w-1/3 z-10 -mx-1">
                            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 border-2 border-rose-400 flex items-center justify-center text-rose-600 dark:text-rose-400 font-bold mb-2 text-lg">{topPlayers[0]?.profiles?.full_name?.[0] || "?"}</div>
                            <div className="text-[11px] font-bold text-center text-rose-600 dark:text-rose-400 mb-1 truncate w-full">{topPlayers[0]?.profiles?.full_name || "---"}</div>
                            <div className="w-full relative">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-amber-500 animate-bounce text-3xl">🏆</div>
                                <div className="bg-gradient-to-b from-rose-500 to-red-600 h-36 w-full rounded-t-xl flex flex-col items-center justify-end pb-3 text-white shadow-xl ring-4 ring-white dark:ring-slate-800">
                                    <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] mb-1">{topPlayers[0]?.score?.toFixed(0) || 0}</div>
                                    <div className="text-xs font-bold uppercase mb-1">Trạng Nguyên</div><div className="text-4xl font-black">1</div>
                                </div>
                            </div>
                        </div>
                        {/* 3rd */}
                        <div className="flex flex-col items-center w-1/3">
                            <div className="w-12 h-12 rounded-full bg-sky-100 dark:bg-sky-900/30 border-2 border-sky-400 flex items-center justify-center text-sky-600 dark:text-sky-400 font-bold mb-2">{topPlayers[2]?.profiles?.full_name?.[0] || "?"}</div>
                            <div className="text-[10px] font-bold text-center text-sky-600 dark:text-sky-400 mb-1 truncate w-full">{topPlayers[2]?.profiles?.full_name || "---"}</div>
                            <div className="w-full"><div className="bg-gradient-to-b from-sky-500 to-cyan-600 h-24 w-full rounded-t-xl flex flex-col items-center justify-end pb-3 text-white shadow-lg">
                                <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] mb-1">{topPlayers[2]?.score?.toFixed(0) || 0}</div>
                                <div className="text-xs font-bold uppercase mb-1">Thám Hoa</div><div className="text-3xl font-black">3</div>
                            </div></div>
                        </div>
                    </div>

                    {/* Rest of leaderboard */}
                    <div className="glass-card rounded-2xl overflow-hidden divide-y divide-border/30">
                        {topPlayers.slice(3, 10).map((player, i) => (
                            <div key={i} className="p-3 flex items-center gap-3 hover:bg-muted/20 transition-colors">
                                <span className="text-muted-foreground font-bold w-4 text-center text-sm">{i + 4}</span>
                                <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground font-bold flex items-center justify-center text-xs">{player.profiles?.full_name?.[0] || "?"}</div>
                                <div className="flex-1 min-w-0"><div className="font-medium text-sm text-foreground truncate">{player.profiles?.full_name || "Học sinh"}</div></div>
                                <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full">
                                    <span className="text-amber-500">🪙</span>
                                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{player.score?.toFixed(0) || 0}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="gradient-primary text-white pt-12 pb-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col items-center">
                    <div className="w-full max-w-lg text-center">
                        <h3 className="font-bold text-lg mb-6 uppercase tracking-wide border-b border-white/20 pb-4 inline-block px-10">Liên hệ</h3>
                        <ul className="space-y-3 text-sm text-indigo-100 flex flex-col items-center">
                            <li className="flex items-center gap-2">🌐 examhub.id.vn</li>
                            <li className="flex items-center gap-2">📧 contact@examhub.id.vn</li>
                        </ul>
                    </div>
                    <div className="border-t border-white/10 mt-8 pt-6 w-full text-center text-xs text-indigo-200">© 2026 ExamHub. All rights reserved.</div>
                </div>
            </footer>

            <BottomNav />
        </div>
    )
}
