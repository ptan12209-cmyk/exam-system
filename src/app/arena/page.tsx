"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StudentHeader } from "@/components/student/StudentHeader"
import { BottomNav } from "@/components/BottomNav"
import {
  Swords,
  Play,
  Calendar,
  Clock,
  Trophy,
  Users,
  Search,
  HelpCircle,
  Eye,
  Activity,
  Award,
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"

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
  time_spent: number
  created_at: string
  student_id: string
  arena_sessions?: {
    name: string
    subject: string
    start_time: string
    end_time: string
  }
}

// Countdown Timer Component
function Countdown({ startTime, onFinish }: { startTime: string; onFinish?: () => void }) {
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    function calculate() {
      const diff = new Date(startTime).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft("Mở")
        onFinish?.()
        return
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((diff / (1000 * 60)) % 60)

      const parts = []
      if (days > 0) parts.push(`${days}d`)
      if (hours > 0) parts.push(`${hours}h`)
      parts.push(`${minutes}m`)

      setTimeLeft(parts.join(" "))
    }

    calculate()
    const timer = setInterval(calculate, 60000)
    return () => clearInterval(timer)
  }, [startTime, onFinish])

  return <span>Còn {timeLeft}</span>
}

export default function ArenaPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<ArenaSession[]>([])
  const [myResults, setMyResults] = useState<ArenaResult[]>([])
  const [rawResults, setRawResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; full_name?: string; class?: string; nickname?: string } | null>(null)
  const [selectedTab, setSelectedTab] = useState("all")
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [leaderboardTab, setLeaderboardTab] = useState("week")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, class, nickname")
        .eq("id", authUser.id)
        .single()

      setUser({
        id: authUser.id,
        full_name: profile?.full_name,
        class: profile?.class,
        nickname: profile?.nickname,
      })

      // Fetch arena sessions
      const { data: sessionsData } = await supabase
        .from("arena_sessions")
        .select("*")
        .order("start_time", { ascending: false })
      if (sessionsData) setSessions(sessionsData)

      // Fetch student's own history with session titles & metadata
      const { data: resultsData } = await supabase
        .from("arena_results")
        .select(`
          arena_id, score, rank, time_spent, created_at,
          arena_sessions:arena_id (name, subject, start_time, end_time)
        `)
        .eq("student_id", authUser.id)
        .order("created_at", { ascending: false })

      if (resultsData) setMyResults(resultsData as any)

      // Fetch all results with session details for leaderboard
      const { data: allResultsData } = await supabase
        .from("arena_results")
        .select(`
          student_id, score, time_spent,
          profiles:student_id(full_name),
          arena_sessions:arena_id(start_time)
        `)

      if (allResultsData) {
        setRawResults(allResultsData)
      }

      setLoading(false)
    } catch (error) {
      console.error("Error loading arena data:", error)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [router, supabase])

  const getMyResult = (arenaId: string) => myResults.find((r) => r.arena_id === arenaId)

  const getStatusInfo = (session: ArenaSession) => {
    if (!mounted) return { status: "loading", label: "Đang tải...", color: "bg-slate-400" }
    const now = new Date()
    const start = new Date(session.start_time)
    const end = new Date(session.end_time)
    if (now < start) return { status: "upcoming", label: "Sắp diễn ra", color: "bg-amber-500" }
    if (now >= start && now <= end) return { status: "active", label: "Đang mở", color: "bg-emerald-500" }
    return { status: "ended", label: "Đã đóng", color: "bg-[hsl(var(--muted-foreground))]/60" }
  }

  const getSubjectStyle = (subject: string) =>
    ({
      physics: { bg: "from-indigo-500 to-blue-600", label: "VẬT LÝ", emoji: "⚛️" },
      chemistry: { bg: "from-emerald-500 to-green-600", label: "HÓA HỌC", emoji: "🧪" },
      math: { bg: "from-violet-500 to-purple-600", label: "TOÁN", emoji: "📐" },
      biology: { bg: "from-lime-500 to-green-600", label: "SINH HỌC", emoji: "🧬" },
    }[subject] || { bg: "from-slate-500 to-slate-600", label: subject.toUpperCase(), emoji: "📝" })

  // Filtered sessions for main panel
  const filteredSessions = useMemo(() => {
    if (selectedTab === "history") return [] // Render history block instead

    return sessions
      .filter((s) => (selectedTab === "all" ? true : getStatusInfo(s).status === selectedTab))
      .filter((s) => selectedSubject === "all" || s.subject === selectedSubject)
      .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [sessions, selectedTab, selectedSubject, searchQuery, mounted])

  // Filtered history entries for history tab
  const filteredHistory = useMemo(() => {
    return myResults.filter((item) => {
      const subj = item.arena_sessions?.subject || ""
      const matchesSubject = selectedSubject === "all" || subj === selectedSubject
      const matchesSearch =
        !searchQuery ||
        (item.arena_sessions?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSubject && matchesSearch
    })
  }, [myResults, selectedSubject, searchQuery])

  // Advanced weekly/monthly/overall leaderboard calculation
  const leaderboardPlayers = useMemo(() => {
    const now = new Date()
    let filtered = rawResults

    if (leaderboardTab === "week") {
      const startOfWeek = new Date()
      const day = startOfWeek.getDay()
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
      startOfWeek.setDate(diff)
      startOfWeek.setHours(0, 0, 0, 0)
      filtered = rawResults.filter(
        (r) => r.arena_sessions?.start_time && new Date(r.arena_sessions.start_time) >= startOfWeek
      )
    } else if (leaderboardTab === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      filtered = rawResults.filter(
        (r) => r.arena_sessions?.start_time && new Date(r.arena_sessions.start_time) >= startOfMonth
      )
    }

    const studentGroups: Record<
      string,
      { student_id: string; score: number; games_played: number; full_name: string }
    > = {}

    filtered.forEach((r) => {
      const studentId = r.student_id
      const score = r.score
      const fullName = r.profiles?.full_name || "Học sinh"

      if (!studentGroups[studentId]) {
        studentGroups[studentId] = { student_id: studentId, score, games_played: 1, full_name: fullName }
      } else {
        studentGroups[studentId].score += score
        studentGroups[studentId].games_played += 1
      }
    })

    return Object.values(studentGroups)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [rawResults, leaderboardTab])

  const top3 = useMemo(() => {
    return leaderboardPlayers.slice(0, 3)
  }, [leaderboardPlayers])

  const leaderboardList = useMemo(() => {
    return leaderboardPlayers.slice(3, 10)
  }, [leaderboardPlayers])

  const formatSpentTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}p ${secs}s`
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) return <Loading fullPage label="Đang vào đấu trường..." />

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--foreground))] selection:text-[hsl(var(--background))]">
      <StudentHeader
        name={user?.full_name}
        studentClass={user?.class || "Học sinh"}
        onLogout={handleLogout}
        nickname={user?.nickname}
      />

      <main className="mx-auto grid max-w-7xl gap-8 px-4 pb-28 pt-6 lg:grid-cols-[1.35fr_0.65fr] lg:px-8">
        <section>
          {/* Hero Header */}
          <div className="mb-8 text-left">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <Swords className="h-3.5 w-3.5" /> Arena
            </p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Đấu trường lý thuyết</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg italic">
              "Học mà không suy nghĩ thì mờ tối, suy nghĩ mà không học thì nguy ngập." – Khổng Tử
            </p>
          </div>

          {/* Navigation Tab Bar */}
          <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: "Tất cả" },
              { key: "active", label: "Đang mở" },
              { key: "upcoming", label: "Sắp diễn ra" },
              { key: "ended", label: "Đã đóng" },
              { key: "history", label: "Lịch sử của tôi" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={cn(
                  "whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-all duration-200",
                  selectedTab === tab.key
                    ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                    : "border border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/60 hover:text-[hsl(var(--foreground))]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subject Filter Pills */}
          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1 border-t border-[hsl(var(--border))]/30 pt-3">
            <span className="text-xs font-semibold text-muted-foreground mr-2 shrink-0">Môn học:</span>
            {[
              { key: "all", label: "Tất cả môn" },
              { key: "math", label: "📐 Toán" },
              { key: "physics", label: "⚛️ Vật lý" },
              { key: "chemistry", label: "🧪 Hóa học" },
              { key: "biology", label: "🧬 Sinh học" },
            ].map((sub) => (
              <button
                key={sub.key}
                onClick={() => setSelectedSubject(sub.key)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1 text-xs font-medium transition-all duration-200 border",
                  selectedSubject === sub.key
                    ? "bg-[hsl(var(--primary))]/10 border-[hsl(var(--primary))] text-[hsl(var(--primary))]"
                    : "border-[hsl(var(--border))]/60 bg-transparent text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--foreground))]/60 hover:text-[hsl(var(--foreground))]"
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Search bar on mobile */}
          <div className="relative mb-6 md:hidden">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full rounded-2xl border border-[hsl(var(--border))]/60 bg-transparent py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[hsl(var(--foreground))]/60"
            />
          </div>

          {/* Main Sessions Render */}
          {selectedTab !== "history" ? (
            <div className="space-y-4">
              {filteredSessions.length === 0 ? (
                <div className="liquid-glass rounded-[2rem] p-12 text-center border border-[hsl(var(--border))]/60">
                  <Swords className="mx-auto mb-3 h-10 w-10 text-[hsl(var(--muted-foreground))]/30" />
                  <p className="text-[hsl(var(--muted-foreground))]">Chưa có đợt thi nào</p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const statusInfo = getStatusInfo(session)
                  const myResult = getMyResult(session.id)
                  const subjectStyle = getSubjectStyle(session.subject)
                  return (
                    <div
                      key={session.id}
                      className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="grid lg:grid-cols-[220px_1fr]">
                        <div
                          className={cn(
                            "flex min-h-[160px] items-center justify-center bg-gradient-to-br p-6 text-center text-white",
                            subjectStyle.bg
                          )}
                        >
                          <div>
                            <div className="text-5xl opacity-40">{subjectStyle.emoji}</div>
                            <div className="mt-3 text-xs font-semibold tracking-[0.2em]">
                              {subjectStyle.label}
                            </div>
                          </div>
                        </div>
                        <div className="p-6">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <h3 className="text-xl font-semibold">{session.name}</h3>
                              {session.description && (
                                <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">
                                  {session.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={cn(
                                "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white",
                                statusInfo.color
                              )}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                              {statusInfo.status === "upcoming" ? (
                                <Countdown startTime={session.start_time} />
                              ) : (
                                statusInfo.label
                              )}
                            </span>
                          </div>
                          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-4 w-4" />
                              {new Date(session.start_time).toLocaleDateString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                              })}{" "}
                              {new Date(session.start_time).toLocaleTimeString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <HelpCircle className="h-4 w-4" />
                              {session.total_questions} câu
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-4 w-4" />
                              {session.duration}p
                            </span>
                          </div>
                          <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-[hsl(var(--border))]/40">
                            <div className="text-sm text-[hsl(var(--muted-foreground))]">
                              {myResult ? (
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  Đã nộp: {myResult.score.toFixed(1)} điểm
                                </span>
                              ) : statusInfo.status === "ended" ? (
                                "Đã kết thúc"
                              ) : (
                                "Sẵn sàng tham gia"
                              )}
                            </div>
                            <div className="flex gap-2">
                              {myResult && (
                                <Link href={`/arena/${session.id}/result`}>
                                  <Button variant="outline" size="sm" className="rounded-full gap-2">
                                    <Eye className="h-4 w-4" /> Kết quả
                                  </Button>
                                </Link>
                              )}
                              {statusInfo.status === "active" && !myResult ? (
                                <Link href={`/arena/${session.id}`}>
                                  <Button className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 px-6">
                                    Vào thi <Clock className="ml-2 h-4 w-4" />
                                  </Button>
                                </Link>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            /* History Section */
            <div className="space-y-6">
              {/* Personal Dashboard Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-[2rem] bg-[hsl(var(--card))]/40 border border-[hsl(var(--border))]/60 shadow-inner">
                <div className="text-center p-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
                    Đã đấu
                  </p>
                  <p className="text-3xl font-extrabold mt-1 text-[hsl(var(--primary))]">
                    {myResults.length} <span className="text-xs font-normal text-muted-foreground">trận</span>
                  </p>
                </div>
                <div className="text-center p-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
                    Điểm trung bình
                  </p>
                  <p className="text-3xl font-extrabold mt-1">
                    {(myResults.reduce((acc, r) => acc + r.score, 0) / (myResults.length || 1)).toFixed(1)}
                  </p>
                </div>
                <div className="text-center p-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
                    Hạng cao nhất
                  </p>
                  <p className="text-3xl font-extrabold mt-1 text-amber-500">
                    {myResults.length > 0
                      ? `#${Math.min(...myResults.map((r) => r.rank || 999))}`
                      : "---"}
                  </p>
                </div>
                <div className="text-center p-2">
                  <p className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider font-semibold">
                    Thời gian TB
                  </p>
                  <p className="text-3xl font-extrabold mt-1 text-indigo-500">
                    {myResults.length > 0
                      ? formatSpentTime(
                          Math.round(
                            myResults.reduce((acc, r) => acc + r.time_spent, 0) / myResults.length
                          )
                        )
                      : "---"}
                  </p>
                </div>
              </div>

              {/* History List */}
              <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                  <div className="liquid-glass rounded-[2rem] p-12 text-center border border-[hsl(var(--border))]/60">
                    <Activity className="mx-auto mb-3 h-10 w-10 text-[hsl(var(--muted-foreground))]/30" />
                    <p className="text-[hsl(var(--muted-foreground))]">Chưa có lịch sử tham gia</p>
                  </div>
                ) : (
                  filteredHistory.map((item) => {
                    const subjectStyle = getSubjectStyle(item.arena_sessions?.subject || "")

                    return (
                      <div
                        key={item.arena_id}
                        className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br text-white text-xl font-bold shrink-0",
                              subjectStyle.bg
                            )}
                          >
                            {subjectStyle.emoji}
                          </div>
                          <div>
                            <h4 className="font-semibold text-lg">{item.arena_sessions?.name}</h4>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                              Thi lúc: {new Date(item.created_at).toLocaleDateString("vi-VN")} - Thời gian làm:{" "}
                              {formatSpentTime(item.time_spent)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                          <div className="text-right">
                            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                              {item.score.toFixed(1)} điểm
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                              <Award className="h-3 w-3 text-amber-500" />
                              Hạng {item.rank ? `#${item.rank}` : "---"}
                            </div>
                          </div>

                          <Link href={`/arena/${item.arena_id}/result`}>
                            <Button size="sm" className="rounded-full">
                              Xem chi tiết
                            </Button>
                          </Link>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </section>

        {/* Sidebar Leaderboards */}
        <aside className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
            <div className="bg-[hsl(var(--foreground))] px-6 py-5 text-[hsl(var(--background))]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Bảng vàng</h2>
                </div>
                <Trophy className="h-8 w-8 opacity-90" />
              </div>

              {/* Tab Selector */}
              <div className="mt-4 flex gap-1 rounded-lg bg-[hsl(var(--background))]/10 p-0.5 text-xs text-white">
                {[
                  { key: "week", label: "Tuần" },
                  { key: "month", label: "Tháng" },
                  { key: "all", label: "Tổng" },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setLeaderboardTab(t.key)}
                    className={cn(
                      "flex-1 rounded-md py-1.5 font-medium transition-all",
                      leaderboardTab === t.key
                        ? "bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                        : "text-white/60 hover:text-white"
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-end justify-center gap-2 pt-2">
                {[1, 0, 2].map((pos, idx) => {
                  const entry = top3[pos]
                  const heights = [112, 144, 96]
                  return (
                    <div
                      key={idx}
                      className={cn("flex w-1/3 flex-col items-center", idx === 1 && "z-10 -mx-1")}
                    >
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 text-sm font-semibold">
                        {entry?.full_name?.[0] || "?"}
                      </div>
                      <div className="text-[10px] font-semibold truncate w-full text-center mb-1">
                        {entry?.full_name || "---"}
                      </div>
                      <div className="text-[9px] text-muted-foreground truncate w-full text-center mb-2">
                        {entry?.games_played ? `(${entry.games_played} trận)` : ""}
                      </div>
                      <div
                        className={cn(
                          "flex w-full flex-col items-center justify-end rounded-t-2xl text-white shadow-lg",
                          idx === 1
                            ? "bg-gradient-to-b from-rose-500 to-red-600"
                            : idx === 0
                            ? "bg-gradient-to-b from-indigo-500 to-violet-600"
                            : "bg-gradient-to-b from-emerald-500 to-green-600"
                        )}
                        style={{ height: heights[idx] }}
                      >
                        <div className="mb-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
                          {entry?.score?.toFixed(0) || 0}
                        </div>
                        <div className="mb-2 text-xs font-bold uppercase">#{idx + 1}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Remaining Top 10 List */}
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm overflow-hidden">
            <div className="border-b border-[hsl(var(--border))]/50 p-4 px-6">
              <h3 className="text-base font-semibold tracking-tight">Top 10 Đấu trường</h3>
            </div>
            <div className="divide-y divide-[hsl(var(--border))]/40">
              {leaderboardList.map((player, i) => (
                <div
                  key={player.student_id}
                  className="flex items-center gap-3 p-4 px-6 hover:bg-[hsl(var(--muted))]/10 transition-colors"
                >
                  <span className="w-5 text-center text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                    {i + 4}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--muted))]/20 text-xs font-semibold">
                    {player.full_name?.[0] || "?"}
                  </div>
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">
                    <div>{player.full_name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {player.games_played} trận
                    </div>
                  </div>
                  <div className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600">
                    {player.score?.toFixed(0) || 0}
                  </div>
                </div>
              ))}
              {leaderboardPlayers.length === 0 && (
                <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
                  Chưa có dữ liệu xếp hạng
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
      <BottomNav />
    </div>
  )
}
