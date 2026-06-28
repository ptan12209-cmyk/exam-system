"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { 
  BarChart3, BookOpen, FileText, Users, Clock, Plus, 
  Swords, ArrowRight, Eye, Calendar, Award, Flame, AlertCircle 
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { useToast } from "@/components/ui/toast"
import { useAuth } from "@/hooks/useAuth"

// Recharts components
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts"

import type { Profile, Exam, Submission } from "@/types"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function TeacherDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const { success, error: toastError } = useToast()
  const { user, profile, loading: authLoading, signOut } = useAuth({ requiredRole: "teacher" })
  
  const [exams, setExams] = useState<Exam[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [arenas, setArenas] = useState<any[]>([])
  const [totalStudents, setTotalStudents] = useState<number>(0)
  const [loadingData, setLoadingData] = useState(true)

  // Real-time Discord Study monitoring state
  interface ActiveMember {
    username: string
    discord_id: string
    status: string
    joined_at: string | null
  }
  const [discordStatus, setDiscordStatus] = useState<{ online: boolean; active_members?: ActiveMember[] } | null>(null)
  
  useEffect(() => {
    if (!user) return
    const fetchDiscordStatus = async () => {
      try {
        const res = await fetch("/api/study-sessions/bot-control", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: "status" })
        })
        if (res.ok) {
          const data = await res.json()
          setDiscordStatus(data)
        }
      } catch (err) {
        console.error("Failed to fetch discord status:", err)
      }
    }
    
    fetchDiscordStatus()
    const interval = setInterval(fetchDiscordStatus, 60000)
    return () => clearInterval(interval)
  }, [user])

  useEffect(() => {
    if (!user) return
    
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch exams
        const { data: examsData } = await supabase
          .from("exams")
          .select("*, submissions(count)")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false })
        
        let fetchedExams: Exam[] = []
        if (examsData) {
          fetchedExams = examsData.map((e: Record<string, any>) => ({
            ...e,
            submission_count: Array.isArray(e.submissions) && e.submissions.length 
              ? e.submissions[0].count 
              : 0
          })) as Exam[]
          setExams(fetchedExams)
        }

        // 2. Fetch submissions for all exams
        if (fetchedExams.length > 0) {
          const examIds = fetchedExams.map(e => e.id)
          const { data: subsData } = await supabase
            .from("submissions")
            .select(`
              id, 
              exam_id, 
              score, 
              submitted_at, 
              student_id,
              student:profiles!student_id(full_name, class, avatar_url),
              exam:exams(title, subject)
            `)
            .in("exam_id", examIds)
            .order("submitted_at", { ascending: false })
          if (subsData) {
            setSubmissions(subsData)
          }
        }

        // 3. Fetch total students count
        const { count: studentCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("role", "student")
        
        setTotalStudents(studentCount || 0)

        // 4. Fetch arena sessions
        const { data: arenasData } = await supabase
          .from("arena_sessions")
          .select(`
            id, 
            status, 
            started_at,
            exam:exams(title, subject, duration, total_questions)
          `)
          .eq("host_id", user.id)
          .order("started_at", { ascending: true })
        if (arenasData) {
          setArenas(arenasData)
        }

      } catch (err) {
        console.error("Error loading dashboard data:", err)
      } finally {
        setLoadingData(false)
      }
    }
    
    fetchDashboardData()
  }, [user, supabase])

  const handleLogout = async () => { await signOut() }

  // --- Dynamic Stats calculations ---
  const examsCreatedThisWeek = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return exams.filter(e => new Date(e.created_at || "") >= sevenDaysAgo).length
  }, [exams])

  const newSubmissionsCount = useMemo(() => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return submissions.filter(s => new Date(s.submitted_at || "") >= oneDayAgo).length
  }, [submissions])

  const activeStudentsThisWeek = useMemo(() => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const activeIds = new Set(
      submissions
        .filter(s => new Date(s.submitted_at || "") >= sevenDaysAgo)
        .map(s => s.student_id)
    )
    return activeIds.size
  }, [submissions])

  const activeStudentsPercent = useMemo(() => {
    if (totalStudents === 0) return 0
    return Math.round((activeStudentsThisWeek / totalStudents) * 100)
  }, [activeStudentsThisWeek, totalStudents])

  const upcomingArenasCount = useMemo(() => {
    return arenas.filter(a => a.status === "waiting").length
  }, [arenas])

  // --- Chart 1: 7-day Activity Data ---
  const dailyActivityData = useMemo(() => {
    const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
    const temp = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return {
        dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
        dayName: days[d.getDay()],
        submissions: 0,
        activeStudents: new Set<string>()
      }
    })
    
    submissions.forEach(s => {
      const sDate = new Date(s.submitted_at || "")
      temp.forEach(t => {
        const tDate = new Date()
        tDate.setDate(tDate.getDate() - (6 - temp.indexOf(t)))
        if (sDate.getDate() === tDate.getDate() && sDate.getMonth() === tDate.getMonth()) {
          t.submissions++
          if (s.student_id) {
            t.activeStudents.add(s.student_id)
          }
        }
      })
    })
    
    return temp.map(t => ({
      name: t.dayName,
      "Lượt nộp": t.submissions,
      "Học sinh": t.activeStudents.size
    }))
  }, [submissions])

  // --- Chart 2: Score distribution ---
  const scoreDistribution = useMemo(() => {
    let xuatSac = 0
    let gioi = 0
    let kha = 0
    let trungBinh = 0
    let yeu = 0
    
    submissions.forEach(s => {
      if (s.score >= 9) xuatSac++
      else if (s.score >= 7) gioi++
      else if (s.score >= 5) kha++
      else if (s.score >= 3) trungBinh++
      else yeu++
    })
    
    return [
      { name: "Xuất sắc (≥9)", value: xuatSac, color: "#10B981" },
      { name: "Giỏi (7-8.9)", value: gioi, color: "#3B82F6" },
      { name: "Khá (5-6.9)", value: kha, color: "#C18CFF" },
      { name: "Trung bình (3-4.9)", value: trungBinh, color: "#8C87A2" },
      { name: "Yếu (<3)", value: yeu, color: "#EF4444" }
    ].filter(item => item.value > 0)
  }, [submissions])

  const averageScore = useMemo(() => {
    if (submissions.length === 0) return 0
    return parseFloat((submissions.reduce((sum, s) => sum + s.score, 0) / submissions.length).toFixed(1))
  }, [submissions])

  // --- Recents & Lists ---
  const recentExams = useMemo(() => {
    return exams.slice(0, 5)
  }, [exams])

  const recentSubmissions = useMemo(() => {
    return submissions.slice(0, 5)
  }, [submissions])

  const waitingArenas = useMemo(() => {
    return arenas.filter(a => a.status === "waiting")
  }, [arenas])

  const formatTimeSpent = (dateStr?: string) => {
    if (!dateStr) return ""
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return "Vừa xong"
    if (minutes < 60) return `${minutes} phút trước`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} giờ trước`
    return new Date(dateStr).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
  }

  const loading = authLoading || loadingData

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Khởi động bảng điều khiển Giáo viên..." />
      </div>
    )
  }

  return (
    <TeacherShell onLogout={handleLogout} className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Mobile Top Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#8C87A2]/20 bg-[#0B0A13]/90 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8C87A2]/20">
              <BarChart3 className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <span className="text-lg font-bold tracking-tighter">ExamHub</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu userName={profile?.full_name || ""} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">
        
        {/* Title Header Section */}
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C87A2]">
              <BarChart3 className="h-3.5 w-3.5 text-[#C18CFF]" /> Teacher Overview
            </p>
            <h1 className={cn("text-4xl md:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
              Xin chào, {profile?.full_name || "Thầy/Cô"}
              <span className="mt-2 block max-w-2xl font-serif-italic text-2xl md:text-3xl text-[#8C87A2]">
                không gian giám sát & phân tích học tập tinh gọn.
              </span>
            </h1>
          </div>

          {/* Quick Actions Shortcuts */}
          <div className="flex items-center gap-3 justify-end">
            <Link href="/teacher/exams/create">
              <Button className="rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] px-5 py-5 text-xs font-bold shadow-md">
                <Plus className="mr-2 h-4 w-4 shrink-0" strokeWidth={2.5} /> Soạn đề thi mới
              </Button>
            </Link>
          </div>
        </section>

        {/* Row 1 — 4 KPI Cards */}
        <section className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* KPI 1 */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C87A2]">📝 Đề thi đã tạo</span>
              <FileText className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <div className={cn("mt-4 text-3xl font-bold font-mono text-[#F1EDF9]", jetbrainsMono.className)}>
              {exams.length}
            </div>
            <p className="mt-1 text-[10px] text-emerald-400 font-mono">
              +{examsCreatedThisWeek} đề mới tuần này
            </p>
          </div>

          {/* KPI 2 */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C87A2]">📬 Bài nộp chưa xem</span>
              <Clock className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <div className={cn("mt-4 text-3xl font-bold font-mono text-[#F1EDF9]", jetbrainsMono.className)}>
              {newSubmissionsCount}
            </div>
            <p className="mt-1 text-[10px] text-amber-400 font-mono">
              {newSubmissionsCount} bài nộp mới 24h qua
            </p>
          </div>

          {/* KPI 3 */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C87A2]">👥 Học sinh hoạt động</span>
              <Users className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <div className={cn("mt-4 text-3xl font-bold font-mono text-[#F1EDF9]", jetbrainsMono.className)}>
              {activeStudentsThisWeek}
            </div>
            <p className="mt-1 text-[10px] text-[#C18CFF] font-mono">
              {activeStudentsPercent}% tương tác tích cực
            </p>
          </div>

          {/* KPI 4 */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#8C87A2]">⚔️ Đấu trường</span>
              <Swords className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <div className={cn("mt-4 text-3xl font-bold font-mono text-[#F1EDF9]", jetbrainsMono.className)}>
              {arenas.length}
            </div>
            <p className="mt-1 text-[10px] text-amber-400 font-mono">
              {upcomingArenasCount} phòng chờ kích hoạt
            </p>
          </div>
        </section>

        {/* Row 2 — Charts (7-Day Line & Score distribution Pie) */}
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          
          {/* Left Chart: Activity 7 Days */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-6">
            <h3 className="text-sm font-bold text-[#F1EDF9] mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#C18CFF]" /> Hoạt động làm bài (7 ngày qua)
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#8C87A2" opacity={0.08} />
                  <XAxis dataKey="name" stroke="#8C87A2" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#8C87A2" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#15131F",
                      borderColor: "rgba(140, 135, 162, 0.2)",
                      borderRadius: "12px",
                    }}
                    labelStyle={{ color: "#F1EDF9", fontWeight: "bold", fontSize: "11px" }}
                    itemStyle={{ color: "#F1EDF9", fontSize: "11px" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                  <Line name="Lượt nộp bài" type="monotone" dataKey="Lượt nộp" stroke="#C18CFF" strokeWidth={2.5} activeDot={{ r: 5 }} />
                  <Line name="Học sinh tương tác" type="monotone" dataKey="Học sinh" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right Chart: Score Distribution Pie */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-6 relative flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F1EDF9] mb-4 flex items-center gap-2">
                <Award className="h-4 w-4 text-[#C18CFF]" /> Phân phối điểm số bài nộp
              </h3>
            </div>
            
            {scoreDistribution.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-6 justify-center my-auto">
                <div className="relative w-40 h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={scoreDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {scoreDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Donut Overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-[#8C87A2] uppercase tracking-wider font-mono">Điểm TB</span>
                    <span className="text-2xl font-bold font-mono text-[#F1EDF9]">{averageScore}</span>
                  </div>
                </div>

                {/* Score Legends */}
                <div className="space-y-2 flex-1 w-full text-xs">
                  {scoreDistribution.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[#8C87A2]">{item.name}</span>
                      </div>
                      <span className="font-bold font-mono text-[#F1EDF9]">{item.value} bài</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-xs text-[#8C87A2] italic my-auto">
                Chưa có dữ liệu bài nộp nào để hiển thị biểu đồ phân bố điểm.
              </div>
            )}
          </div>
        </section>

        {/* Row 3 — Lists Section (Recent Exams & Recent Submissions 1:1) */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          
          {/* Column 1: Recent Exams */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-[#8C87A2]/10 pb-4 mb-4">
              <h3 className="text-sm font-bold text-[#F1EDF9] flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-[#C18CFF]" /> Đề thi soạn gần đây
              </h3>
              <Link href="/teacher/exams" className="text-xs text-[#C18CFF] hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentExams.length > 0 ? (
              <div className="space-y-3.5">
                {recentExams.map((exam) => {
                  const subjectInfo = getSubjectInfo(exam.subject || "other")
                  return (
                    <div key={exam.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B0A13] border border-[#8C87A2]/15">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#8C87A2]/20 bg-[#15131F] text-lg">
                          {subjectInfo.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#F1EDF9] truncate max-w-[160px]">{exam.title}</span>
                            <span className={cn(
                              "text-[8px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                              exam.status === "published" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            )}>
                              {exam.status === "published" ? "Phát hành" : "Nháp"}
                            </span>
                          </div>
                          <div className="mt-1 text-[10px] text-[#8C87A2] flex items-center gap-2">
                            <span>{exam.duration} phút</span>
                            <span>•</span>
                            <span>{exam.total_questions} câu</span>
                          </div>
                        </div>
                      </div>
                      
                      <Link href={`/teacher/exams/${exam.id}/scores`}>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg border-[#8C87A2]/30 text-[10px] font-bold bg-transparent text-[#8C87A2] hover:text-[#C18CFF] hover:border-[#C18CFF]">
                          Xem
                        </Button>
                      </Link>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-[#8C87A2] italic">
                Thầy/Cô chưa tạo đề thi nào.
              </div>
            )}
          </div>

          {/* Column 2: Recent Submissions */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-[#8C87A2]/10 pb-4 mb-4">
              <h3 className="text-sm font-bold text-[#F1EDF9] flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-[#C18CFF]" /> Lượt nộp bài mới nhất
              </h3>
              <Link href="/teacher/analytics" className="text-xs text-[#C18CFF] hover:underline flex items-center gap-1">
                Xem tất cả <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {recentSubmissions.length > 0 ? (
              <div className="space-y-3.5">
                {recentSubmissions.map((sub) => {
                  const hasAvatar = !!sub.student?.avatar_url
                  const initials = sub.student?.full_name?.charAt(0).toUpperCase() || "?"
                  return (
                    <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B0A13] border border-[#8C87A2]/15">
                      <div className="flex items-center gap-3 min-w-0">
                        {hasAvatar ? (
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-[#8C87A2]/20">
                            <img src={sub.student.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#8C87A2]/20 bg-[#15131F] text-xs font-bold text-[#C18CFF]">
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#F1EDF9] truncate max-w-[120px]">{sub.student?.full_name || "Ẩn danh"}</span>
                            {sub.student?.class && (
                              <span className="text-[9px] font-mono bg-[#8C87A2]/10 text-[#8C87A2] px-1.5 py-0.5 rounded">
                                Lớp {sub.student.class}
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[10px] text-[#8C87A2] truncate max-w-[180px]" title={sub.exam?.title}>
                            Đề: {sub.exam?.title || "Không rõ"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-bold font-mono text-[#C18CFF]">{sub.score.toFixed(1)}</span>
                        <p className="text-[8px] text-[#8C87A2] mt-0.5 font-mono">
                          {formatTimeSpent(sub.submitted_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-xs text-[#8C87A2] italic">
                Chưa có lượt nộp bài thi nào.
              </div>
            )}
          </div>
        </section>

        {/* Row 4 — Discord monitor widget & Waiting Arenas */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          
          {/* Discord monitoring widget */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-[#8C87A2]/10 pb-4 mb-4">
              <h3 className="text-sm font-bold text-[#F1EDF9] flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Đài Giám Sát Discord Voice
              </h3>
              <Link href="/teacher/monitor" className="text-xs text-[#C18CFF] hover:underline flex items-center gap-1">
                Chi tiết <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {discordStatus && discordStatus.online ? (
              <div className="space-y-4">
                {discordStatus.active_members && discordStatus.active_members.length > 0 ? (
                  <div className="space-y-3.5">
                    <p className="text-xs text-[#8C87A2]">
                      Hiện tại có <strong className="text-[#F1EDF9]">{discordStatus.active_members.length}</strong> học sinh đang trong phòng voice học tập:
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {discordStatus.active_members.map((member) => (
                        <div key={member.discord_id} className="flex items-center justify-between p-2 rounded-lg bg-[#0B0A13] border border-[#8C87A2]/15 text-xs">
                          <span className="font-semibold text-[#F1EDF9] truncate max-w-[120px]">👤 {member.username}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase",
                            member.status === "AFK" ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                            member.status === "Muted" ? "bg-slate-500/10 text-slate-400 border border-slate-500/20" :
                            "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          )}>
                            {member.status === "AFK" ? "AFK" : member.status === "Muted" ? "Mute" : "Active"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-[#8C87A2] italic gap-2">
                    <span>Không có học sinh nào đang tham gia phòng voice.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-[#8C87A2] italic gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span>Không kết nối được với Discord Bot. Vui lòng kiểm tra trạng thái bot.</span>
              </div>
            )}
          </div>

          {/* Waiting Arena Sessions */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-6">
            <div className="flex items-center justify-between border-b border-[#8C87A2]/10 pb-4 mb-4">
              <h3 className="text-sm font-bold text-[#F1EDF9] flex items-center gap-2">
                <Swords className="h-4.5 w-4.5 text-[#C18CFF]" /> Trận Đấu Trường chờ kích hoạt
              </h3>
              <Link href="/teacher/arena" className="text-xs text-[#C18CFF] hover:underline flex items-center gap-1">
                Quản lý <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {waitingArenas.length > 0 ? (
              <div className="space-y-3.5">
                {waitingArenas.slice(0, 3).map((arena) => (
                  <div key={arena.id} className="p-3.5 rounded-xl bg-[#0B0A13] border border-[#8C87A2]/15 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-[#F1EDF9]">{arena.exam?.title || "Trận đấu Arena"}</h4>
                      <div className="mt-1 flex items-center gap-3 text-[10px] text-[#8C87A2]">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(arena.started_at || "").toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {arena.exam?.duration} phút
                        </span>
                      </div>
                    </div>
                    
                    <Link href={`/teacher/arena`}>
                      <Button size="sm" className="h-8 rounded-lg bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] text-[10px] font-bold px-3">
                        Vào phòng điều hành
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-xs text-[#8C87A2] italic flex flex-col items-center justify-center gap-3">
                <span>Không có trận Đấu Trường nào đang chờ kích hoạt.</span>
                <Link href="/teacher/arena">
                  <Button size="sm" variant="outline" className="h-8 rounded-lg border-[#8C87A2]/30 text-[10px] font-bold bg-transparent text-[#8C87A2] hover:text-[#C18CFF] hover:border-[#C18CFF]">
                    Tạo phòng Arena mới
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}
