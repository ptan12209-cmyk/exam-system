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
    profiles?: {
        full_name: string | null
    }
}

const SUBJECT_COLORS: Record<string, string> = {
    physics: "bg-blue-600",
    chemistry: "bg-green-600",
    math: "bg-purple-600",
    biology: "bg-yellow-600",
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

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (!authUser) {
            router.push("/login")
            return
        }

        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", authUser.id).single()
        setUser({ id: authUser.id, full_name: profile?.full_name })

        const { data: sessionsData } = await supabase
            .from("arena_sessions")
            .select("*")
            .order("start_time", { ascending: false })
        if (sessionsData) setSessions(sessionsData)

        const { data: resultsData } = await supabase
            .from("arena_results")
            .select("arena_id, score, rank")
            .eq("student_id", authUser.id)
        if (resultsData) setMyResults(resultsData)

        // Get top players
        const { data: topData } = await supabase
            .from("arena_results")
            .select("*, profiles!student_id(full_name)")
            .order("score", { ascending: false })
            .limit(10)
        if (topData) setTopPlayers(topData)

        setLoading(false)
    }

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const getMyResult = (arenaId: string) => myResults.find(r => r.arena_id === arenaId)

    const getStatusInfo = (session: ArenaSession) => {
        const now = new Date()
        const start = new Date(session.start_time)
        const end = new Date(session.end_time)
        if (now < start) return { status: "upcoming", label: "Sắp diễn ra", color: "bg-yellow-500" }
        if (now >= start && now <= end) return { status: "active", label: "Đang mở", color: "bg-green-500" }
        return { status: "ended", label: "Đang đóng", color: "bg-gray-500" }
    }

    const filteredSessions = sessions
        .filter(s => {
            if (selectedTab === "all") return true
            if (selectedTab === "active") return getStatusInfo(s).status === "active"
            if (selectedTab === "upcoming") return getStatusInfo(s).status === "upcoming"
            if (selectedTab === "ended") return getStatusInfo(s).status === "ended"
            return true
        })
        .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 lg:px-8">
                <div className="flex items-center gap-4">
                    <Link href="/student/dashboard" className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">E</div>
                        <span className="font-bold text-xl text-blue-600 hidden md:block tracking-tight">ExamHub</span>
                    </Link>
                    <div className="hidden sm:block ml-2">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Tìm kiếm..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-blue-600"
                            />
                            <span className="absolute left-3 top-2 text-gray-400">🔍</span>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
                    <Link href="/student/dashboard" className="hover:text-blue-600 flex items-center gap-1">🏠 Trang chủ</Link>
                    <Link href="/resources" className="hover:text-blue-600 flex items-center gap-1">📚 Tài liệu</Link>
                </div>
                <div className="flex items-center gap-3">
                    <NotificationBell />
                    <UserMenu userName={user?.full_name || ""} onLogout={handleLogout} role="student" />
                </div>
            </nav>

            {/* Main Content */}
            <div className="pt-20 pb-12 px-4 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow w-full">
                {/* Left - Arena List */}
                <div className="lg:col-span-8">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                        <Link href="/student/dashboard" className="hover:text-blue-600">🏠</Link>
                        <span>›</span>
                        <span className="font-medium text-gray-800">Đấu trường lý thuyết</span>
                    </div>

                    {/* Title */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2 uppercase tracking-wide">
                            ĐẤU TRƯỜNG LÝ THUYẾT 🎮
                        </h1>
                    </div>

                    {/* Status Tabs */}
                    <div className="flex items-center gap-6 border-b border-gray-200 mb-6 overflow-x-auto">
                        {[
                            { key: "all", label: "Tất cả" },
                            { key: "vip", label: "Vip" },
                            { key: "active", label: "Đang mở" },
                            { key: "upcoming", label: "Sắp diễn ra" },
                            { key: "ended", label: "Đã đóng" }
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setSelectedTab(tab.key)}
                                className={cn(
                                    "pb-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors",
                                    selectedTab === tab.key
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative mb-8">
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                        />
                        <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
                    </div>

                    {/* Arena List */}
                    <div className="space-y-4">
                        {filteredSessions.length === 0 ? (
                            <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-100">
                                <span className="text-5xl mb-4 block">🎮</span>
                                <p className="text-gray-500">Chưa có đợt thi nào</p>
                            </div>
                        ) : (
                            filteredSessions.map(session => {
                                const statusInfo = getStatusInfo(session)
                                const myResult = getMyResult(session.id)

                                return (
                                    <div
                                        key={session.id}
                                        className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-100 overflow-hidden flex flex-col sm:flex-row"
                                    >
                                        {/* Left Icon Area */}
                                        <div className={cn(
                                            "sm:w-48 bg-gray-500 flex items-center justify-center p-6 relative flex-col text-center",
                                            session.subject === "physics" && "bg-blue-600",
                                            session.subject === "chemistry" && "bg-green-600",
                                            session.subject === "math" && "bg-purple-600"
                                        )}>
                                            <div className="text-6xl font-black text-white/30 select-none">
                                                {session.subject === "physics" ? "⚛️" : session.subject === "chemistry" ? "🧪" : "📐"}
                                            </div>
                                            <div className="absolute bottom-4 font-bold text-white tracking-widest text-sm uppercase">
                                                {session.subject === "physics" ? "VẬT LÝ" : session.subject === "chemistry" ? "HÓA HỌC" : "TOÁN"}
                                            </div>
                                            {statusInfo.status === "active" && (
                                                <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    Hot
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-5 flex-1 flex flex-col justify-between">
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">{session.name}</h3>
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    <span className={cn(
                                                        "px-2.5 py-0.5 rounded text-xs font-medium text-white flex items-center gap-1",
                                                        statusInfo.color
                                                    )}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                                        {statusInfo.label}
                                                    </span>
                                                    <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-blue-600 text-white">
                                                        Lớp 12
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3 mt-1">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1">
                                                        <span>📅</span>
                                                        {new Date(session.start_time).toLocaleDateString("vi-VN")} - {new Date(session.end_time).toLocaleDateString("vi-VN")}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span>❓</span> {session.total_questions}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span>⏱️</span> {session.duration}p
                                                    </div>
                                                </div>
                                                {statusInfo.status === "active" && !myResult && (
                                                    <Link href={`/arena/${session.id}`}>
                                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                            Vào thi
                                                        </Button>
                                                    </Link>
                                                )}
                                                {myResult && (
                                                    <span className="font-bold text-green-600">{myResult.score.toFixed(1)} điểm</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {filteredSessions.length > 0 && (
                        <div className="flex items-center justify-center gap-2 mt-8">
                            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">‹</button>
                            <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-blue-600 text-white font-medium border border-blue-600">1</button>
                            <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">›</button>
                        </div>
                    )}
                </div>

                {/* Right - Leaderboard */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Leaderboard Banner */}
                    <div className="relative w-full h-32 rounded-xl bg-gradient-to-r from-red-500 to-yellow-500 overflow-hidden shadow-lg">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <h2 className="text-3xl font-black text-white uppercase tracking-widest drop-shadow-md flex flex-col items-center">
                                <span className="text-sm font-normal text-yellow-100 mb-1">Tuần này</span>
                                Bảng Vàng
                            </h2>
                        </div>
                        <span className="absolute top-2 right-2 text-4xl opacity-80">🏆</span>
                        <span className="absolute bottom-2 left-2 text-4xl opacity-80">🎖️</span>
                    </div>

                    {/* Podium - Top 3 */}
                    <div className="flex items-end justify-center gap-2 pt-4">
                        {/* 2nd Place */}
                        <div className="flex flex-col items-center w-1/3">
                            <div className="w-12 h-12 rounded-full bg-purple-100 border-2 border-purple-400 flex items-center justify-center text-purple-600 font-bold mb-2">
                                {topPlayers[1]?.profiles?.full_name?.[0] || "?"}
                            </div>
                            <div className="text-[10px] font-bold text-center text-purple-600 mb-1 truncate w-full">
                                {topPlayers[1]?.profiles?.full_name || "---"}
                            </div>
                            <div className="w-full relative">
                                <div className="bg-gradient-to-b from-purple-500 to-violet-600 h-28 w-full rounded-t-lg flex flex-col items-center justify-end pb-3 text-white shadow-lg">
                                    <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] mb-1">
                                        {topPlayers[1]?.score?.toFixed(0) || 0}
                                    </div>
                                    <div className="text-xs font-bold uppercase mb-1">Bằng Nhãn</div>
                                    <div className="text-3xl font-black">2</div>
                                </div>
                            </div>
                        </div>

                        {/* 1st Place */}
                        <div className="flex flex-col items-center w-1/3 z-10 -mx-1">
                            <div className="w-14 h-14 rounded-full bg-red-100 border-2 border-red-400 flex items-center justify-center text-red-600 font-bold mb-2 text-lg">
                                {topPlayers[0]?.profiles?.full_name?.[0] || "?"}
                            </div>
                            <div className="text-[11px] font-bold text-center text-red-600 mb-1 truncate w-full">
                                {topPlayers[0]?.profiles?.full_name || "---"}
                            </div>
                            <div className="w-full relative">
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-yellow-500 animate-bounce text-3xl">🏆</div>
                                <div className="bg-gradient-to-b from-red-500 to-rose-600 h-36 w-full rounded-t-lg flex flex-col items-center justify-end pb-3 text-white shadow-xl ring-4 ring-white">
                                    <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] mb-1">
                                        {topPlayers[0]?.score?.toFixed(0) || 0}
                                    </div>
                                    <div className="text-xs font-bold uppercase mb-1">Trạng Nguyên</div>
                                    <div className="text-4xl font-black">1</div>
                                </div>
                            </div>
                        </div>

                        {/* 3rd Place */}
                        <div className="flex flex-col items-center w-1/3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 border-2 border-blue-400 flex items-center justify-center text-blue-600 font-bold mb-2">
                                {topPlayers[2]?.profiles?.full_name?.[0] || "?"}
                            </div>
                            <div className="text-[10px] font-bold text-center text-blue-600 mb-1 truncate w-full">
                                {topPlayers[2]?.profiles?.full_name || "---"}
                            </div>
                            <div className="w-full relative">
                                <div className="bg-gradient-to-b from-blue-500 to-cyan-600 h-24 w-full rounded-t-lg flex flex-col items-center justify-end pb-3 text-white shadow-lg">
                                    <div className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] mb-1">
                                        {topPlayers[2]?.score?.toFixed(0) || 0}
                                    </div>
                                    <div className="text-xs font-bold uppercase mb-1">Thám Hoa</div>
                                    <div className="text-3xl font-black">3</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Rest of Leaderboard */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
                        {topPlayers.slice(3, 10).map((player, i) => (
                            <div key={i} className="p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                                <span className="text-gray-400 font-bold w-4 text-center">{i + 4}</span>
                                <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-xs">
                                    {player.profiles?.full_name?.[0] || "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm text-gray-800 truncate">
                                        {player.profiles?.full_name || "Học sinh"}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-full">
                                    <span className="text-yellow-500">🪙</span>
                                    <span className="text-xs font-bold text-gray-700">{player.score?.toFixed(0) || 0}</span>
                                </div>
                                {i < 2 && <span className="text-yellow-400">🎖️</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-blue-600 text-white pt-12 pb-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 lg:px-8 flex flex-col items-center">
                    <div className="w-full max-w-lg text-center">
                        <h3 className="font-bold text-lg mb-6 uppercase tracking-wide border-b border-blue-400/30 pb-4 inline-block px-10">Liên hệ</h3>
                        <ul className="space-y-3 text-sm text-blue-100 flex flex-col items-center">
                            <li className="flex items-center gap-2">🌐 examhub.id.vn</li>
                            <li className="flex items-center gap-2">📧 contact@examhub.id.vn</li>
                        </ul>
                    </div>
                    <div className="border-t border-blue-800 mt-8 pt-6 w-full text-center text-xs text-blue-300">
                        © 2026 ExamHub. All rights reserved.
                    </div>
                </div>
            </footer>

            <BottomNav />
        </div>
    )
}
