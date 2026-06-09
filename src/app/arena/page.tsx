"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StudentHeader } from "@/components/student/StudentHeader"
import { BottomNav } from "@/components/BottomNav"
import { Swords, Plus, Play, Calendar, Clock, Trophy, Users, Search, GraduationCap, HelpCircle } from "lucide-react"
import { Loading } from "@/components/shared/Loading"

interface ArenaSession { id: string; name: string; description: string | null; subject: string; start_time: string; end_time: string; duration: number; total_questions: number; status: string }
interface ArenaResult { arena_id: string; score: number; rank: number | null; student_id: string; profiles?: { full_name: string | null } }

export default function ArenaPage() {
  const router = useRouter(); const supabase = createClient()
  const [sessions, setSessions] = useState<ArenaSession[]>([]); const [myResults, setMyResults] = useState<ArenaResult[]>([]); const [topPlayers, setTopPlayers] = useState<ArenaResult[]>([])
  const [loading, setLoading] = useState(true); const [user, setUser] = useState<{ id: string; full_name?: string; class?: string; nickname?: string } | null>(null); const [selectedTab, setSelectedTab] = useState("all");  const [searchQuery, setSearchQuery] = useState("")
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => { (async () => { const { data: { user: authUser } } = await supabase.auth.getUser(); if (!authUser) { router.push("/login"); return } const { data: profile } = await supabase.from("profiles").select("full_name, class, nickname").eq("id", authUser.id).single(); setUser({ id: authUser.id, full_name: profile?.full_name, class: profile?.class, nickname: profile?.nickname }); const { data: sessionsData } = await supabase.from("arena_sessions").select("*").order("start_time", { ascending: false }); if (sessionsData) setSessions(sessionsData); const { data: resultsData } = await supabase.from("arena_results").select("arena_id, score, rank").eq("student_id", authUser.id); if (resultsData) setMyResults(resultsData); const { data: topData } = await supabase.from("arena_results").select("*, profiles!student_id(full_name)").order("score", { ascending: false }).limit(10); if (topData) setTopPlayers(topData); setLoading(false) })() }, [router, supabase])

  const getMyResult = (arenaId: string) => myResults.find((r) => r.arena_id === arenaId)
  const getStatusInfo = (session: ArenaSession) => { 
    if (!mounted) return { status: "loading", label: "Đang tải...", color: "bg-slate-400" };
    const now = new Date(); 
    const start = new Date(session.start_time); 
    const end = new Date(session.end_time); 
    if (now < start) return { status: "upcoming", label: "Sắp diễn ra", color: "bg-amber-500" }; 
    if (now >= start && now <= end) return { status: "active", label: "Đang mở", color: "bg-emerald-500" }; 
    return { status: "ended", label: "Đã đóng", color: "bg-[hsl(var(--muted-foreground))]/60" } 
  }
  const getSubjectStyle = (subject: string) => ({ 
    physics: { bg: "from-indigo-500 to-blue-600", label: "VẬT LÝ", emoji: "⚛️" }, 
    chemistry: { bg: "from-emerald-500 to-green-600", label: "HÓA HỌC", emoji: "🧪" }, 
    math: { bg: "from-violet-500 to-purple-600", label: "TOÁN", emoji: "📐" }, 
    biology: { bg: "from-lime-500 to-green-600", label: "SINH HỌC", emoji: "🧬" } 
  }[subject] || { bg: "from-slate-500 to-slate-600", label: subject.toUpperCase(), emoji: "📝" })
  
  const filteredSessions = useMemo(() => sessions.filter((s) => (selectedTab === "all" ? true : getStatusInfo(s).status === selectedTab)).filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase())), [sessions, selectedTab, searchQuery])
  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

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
          <div className="mb-8 text-left">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <Swords className="h-3.5 w-3.5" /> Arena
            </p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Đấu trường lý thuyết</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">
              Thi đấu theo đợt, theo dõi trạng thái mở và xem kết quả của bạn ngay trong danh sách.
            </p>
          </div>

          <div className="mb-6 flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: "all", label: "Tất cả" },
              { key: "active", label: "Đang mở" },
              { key: "upcoming", label: "Sắp diễn ra" },
              { key: "ended", label: "Đã đóng" }
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

          <div className="relative mb-6 md:hidden">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            <input 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="Tìm kiếm..." 
              className="w-full rounded-2xl border border-[hsl(var(--border))]/60 bg-transparent py-2.5 pl-9 pr-4 text-sm outline-none focus:border-[hsl(var(--foreground))]/60" 
            />
          </div>

          <div className="space-y-4">
            {filteredSessions.length === 0 ? (
              <div className="liquid-glass rounded-[2rem] p-12 text-center">
                <Swords className="mx-auto mb-3 h-10 w-10 text-[hsl(var(--muted-foreground))]/30" />
                <p className="text-[hsl(var(--muted-foreground))]">Chưa có đợt thi nào</p>
              </div>
            ) : (
              filteredSessions.map((session) => { 
                const statusInfo = getStatusInfo(session); 
                const myResult = getMyResult(session.id); 
                const subjectStyle = getSubjectStyle(session.subject); 
                return (
                  <div key={session.id} className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
                    <div className="grid lg:grid-cols-[220px_1fr]">
                      <div className={cn("flex min-h-[160px] items-center justify-center bg-gradient-to-br p-6 text-center text-white", subjectStyle.bg)}>
                        <div>
                          <div className="text-5xl opacity-40">{subjectStyle.emoji}</div>
                          <div className="mt-3 text-xs font-semibold tracking-[0.2em]">{subjectStyle.label}</div>
                        </div>
                      </div>
                      <div className="p-6">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h3 className="text-xl font-semibold">{session.name}</h3>
                            {session.description && <p className="mt-2 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">{session.description}</p>}
                          </div>
                          <span className={cn("inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white", statusInfo.color)}>
                            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
                          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{new Date(session.start_time).toLocaleDateString("vi-VN")}</span>
                          <span className="flex items-center gap-1.5"><HelpCircle className="h-4 w-4" />{session.total_questions} câu</span>
                          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{session.duration}p</span>
                        </div>
                        <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-[hsl(var(--border))]/40">
                          <div className="text-sm text-[hsl(var(--muted-foreground))]">
                            {myResult ? <span className="font-semibold text-emerald-600">{myResult.score.toFixed(1)} điểm</span> : statusInfo.status === "ended" ? "Đã kết thúc" : "Sẵn sàng tham gia"}
                          </div>
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
                )
              })
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm">
            <div className="bg-[hsl(var(--foreground))] px-6 py-5 text-[hsl(var(--background))]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] opacity-80">Tuần này</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-tight">Bảng vàng</h2>
                </div>
                <Trophy className="h-8 w-8 opacity-90" />
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-end justify-center gap-2 pt-2">
                {[1, 0, 2].map((pos, idx) => { 
                  const entry = topPlayers[pos]; 
                  const heights = [112, 144, 96]; 
                  return (
                    <div key={idx} className={cn("flex w-1/3 flex-col items-center", idx === 1 && "z-10 -mx-1")}>
                      <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 text-sm font-semibold">
                        {entry?.profiles?.full_name?.[0] || "?"}
                      </div>
                      <div className="text-[10px] font-semibold truncate w-full text-center mb-2">{entry?.profiles?.full_name || "---"}</div>
                      <div className={cn("flex w-full flex-col items-center justify-end rounded-t-2xl text-white shadow-lg", idx === 1 ? "bg-gradient-to-b from-rose-500 to-red-600" : idx === 0 ? "bg-gradient-to-b from-indigo-500 to-violet-600" : "bg-gradient-to-b from-emerald-500 to-green-600")} style={{ height: heights[idx] }}>
                        <div className="mb-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{entry?.score?.toFixed(0) || 0}</div>
                        <div className="mb-2 text-xs font-bold uppercase">#{idx + 1}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm overflow-hidden">
            <div className="border-b border-[hsl(var(--border))]/50 p-4 px-6">
              <h3 className="text-base font-semibold tracking-tight">Top 10 Đấu trường</h3>
            </div>
            <div className="divide-y divide-[hsl(var(--border))]/40">
              {topPlayers.slice(3, 10).map((player, i) => (
                <div key={i} className="flex items-center gap-3 p-4 px-6 hover:bg-[hsl(var(--muted))]/10 transition-colors">
                  <span className="w-5 text-center text-sm font-semibold text-[hsl(var(--muted-foreground))]">{i + 4}</span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--muted))]/20 text-xs font-semibold">{player.profiles?.full_name?.[0] || "?"}</div>
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">{player.profiles?.full_name || "Học sinh"}</div>
                  <div className="rounded-full bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-600">{player.score?.toFixed(0) || 0}</div>
                </div>
              ))}
              {topPlayers.length === 0 && <div className="p-12 text-center text-sm text-[hsl(var(--muted-foreground))]">Chưa có dữ liệu xếp hạng</div>}
            </div>
          </div>
        </aside>
      </main>
      <BottomNav />
    </div>
  )
}
