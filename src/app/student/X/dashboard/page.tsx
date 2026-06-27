"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  Swords,
  Trophy,
  Zap,
  CheckCircle,
  Award,
  ListTodo,
  Timer,
  Video,
  ChevronRight,
  Search,
  Sparkles,
  GraduationCap
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"
import { getUserStats, calculateLevel, xpForNextLevel, levelProgress } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { ChallengesWidget } from "@/components/gamification/ChallengeCard"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

import type { Profile, Exam, Submission } from "@/types"

export default function StudentXDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [availableExams, setAvailableExams] = useState<Exam[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [arenaSessions, setArenaSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0, exams_completed: 0, perfect_scores: 0 })
  const [userXp, setUserXp] = useState(0)
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  // 1. Calculate Countdown to THPT 2027
  useEffect(() => {
    const targetDate = new Date("2027-06-11T07:30:00").getTime()

    const updateCountdown = () => {
      const difference = targetDate - Date.now()

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds })
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [])

  // 2. Fetch Data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!profileData) {
        await supabase.auth.signOut()
        router.push("/login?error=profile_not_found")
        return
      }

      // Authorization guard: Student X only
      if (profileData.role !== "student" || profileData.nickname !== "X") {
        router.push("/student/dashboard")
        return
      }

      setProfile(profileData)

      // Fetch gamification stats
      const { stats } = await getUserStats(user.id)
      setStudentStats(stats)
      setUserXp(stats.xp)

      // Fetch exams assigned to 'x'
      const { data: examsData } = await supabase
        .from("exams")
        .select("*")
        .eq("status", "published")
        .eq("assigned_to", "x")
        .order("created_at", { ascending: false })

      if (examsData) {
        setAvailableExams(examsData)
      }

      // Fetch submissions
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("*, exam:exams(*)")
        .eq("student_id", user.id)
        .order("submitted_at", { ascending: false })
      if (submissionsData) setSubmissions(submissionsData)

      // Fetch waiting arena sessions
      const { data: arenaData } = await supabase
        .from("arena_sessions")
        .select("*")
        .eq("status", "waiting")
        .order("start_time", { ascending: true })
      if (arenaData) setArenaSessions(arenaData)

      setLoading(false)
    }

    fetchData()
  }, [router, supabase])

  // 3. Computed Statistics
  const filteredExams = useMemo(() => {
    return availableExams.filter((exam) => {
      const matchSubject = selectedSubject === "all" || exam.subject === selectedSubject
      const matchSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchSubject && matchSearch
    })
  }, [availableExams, searchQuery, selectedSubject])

  const submissionsThisWeek = useMemo(() => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    return submissions.filter(s => new Date(s.submitted_at) >= oneWeekAgo).length
  }, [submissions])

  const averageScore = useMemo(() => {
    if (submissions.length === 0) return 0
    const total = submissions.reduce((sum, s) => sum + s.score, 0)
    return parseFloat((total / submissions.length).toFixed(1))
  }, [submissions])

  const bestScore = useMemo(() => {
    if (submissions.length === 0) return "--"
    return Math.max(...submissions.map((s) => s.score)).toFixed(1)
  }, [submissions])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const hasSubmitted = (examId: string) => submissions.some((s) => s.exam_id === examId)
  const getSubmission = (examId: string) => submissions.find((s) => s.exam_id === examId)

  // Rank name and color helper
  const rank = useMemo(() => {
    const level = studentStats.level
    if (level >= 40) return { name: "Diamond", color: "text-[#B9F2FF]", border: "border-[#B9F2FF]/60 bg-[#B9F2FF]/10" }
    if (level >= 30) return { name: "Platinum", color: "text-[#E8E8E8]", border: "border-[#E8E8E8]/60 bg-[#E8E8E8]/10" }
    if (level >= 20) return { name: "Gold", color: "text-[#FFD700]", border: "border-[#FFD700]/60 bg-[#FFD700]/10" }
    if (level >= 10) return { name: "Silver", color: "text-[#C0C0C0]", border: "border-[#C0C0C0]/60 bg-[#C0C0C0]/10" }
    return { name: "Bronze", color: "text-[#CD7F32]", border: "border-[#CD7F32]/60 bg-[#CD7F32]/10" }
  }, [studentStats.level])

  // XP Progress Calculation
  const xpProgress = useMemo(() => {
    const currentLevel = studentStats.level
    const currentLevelThreshold = Math.pow(currentLevel - 1, 2) * 100
    const nextLevelThreshold = Math.pow(currentLevel, 2) * 100
    const xpInCurrentLevel = userXp - currentLevelThreshold
    const xpRequiredForLevel = nextLevelThreshold - currentLevelThreshold
    
    return {
      percent: Math.min((xpInCurrentLevel / xpRequiredForLevel) * 100, 100),
      current: xpInCurrentLevel,
      required: xpRequiredForLevel,
      nextTotal: nextLevelThreshold
    }
  }, [studentStats.level, userXp])

  // Helper for dynamic timing badges
  const getExamTimeBadge = (exam: Exam) => {
    if (!exam.is_scheduled || !exam.start_time) {
      return { label: "Tự do", className: "bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20" }
    }
    const now = Date.now()
    const start = new Date(exam.start_time).getTime()
    const end = exam.end_time ? new Date(exam.end_time).getTime() : Infinity

    if (now > end) {
      return { label: "Quá hạn", className: "bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20" }
    }

    const startDate = new Date(exam.start_time)
    const today = new Date()
    const tomorrow = new Date()
    tomorrow.setDate(today.getDate() + 1)

    const isToday = startDate.toDateString() === today.toDateString()
    const isTomorrow = startDate.toDateString() === tomorrow.toDateString()

    if (isToday) {
      return { label: "Hôm nay", className: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20 animate-pulse" }
    }
    if (isTomorrow) {
      return { label: "Ngày mai", className: "bg-[#8B5CF6]/10 text-[#8B5CF6] border-[#8B5CF6]/20" }
    }
    return { 
      label: startDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }), 
      className: "bg-[#2D2D6B]/30 text-[#94A3B8] border-[#2D2D6B]/50" 
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F23] flex items-center justify-center">
        <Loading label="Khởi động không gian Dream Engine..." />
      </div>
    )
  }

  return (
    <StudentShell className={cn("bg-[#0F0F23] text-[#F1F5F9]", inter.className)}>
      {/* 1. Custom Topbar */}
      <StudentTopbar
        name={profile?.full_name}
        userXp={userXp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
      />

      {/* 2. Navigation Tabs */}
      <StudentNavTabs />

      {/* Main Layout Area */}
      <main className="mx-auto max-w-7xl w-full px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Row 1: Welcome Hero Section & Profile Details */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-stretch">
          
          {/* Welcome Card */}
          <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-2xl p-6 lg:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#6366F1]/5 rounded-full blur-3xl pointer-events-none" />
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-[#22C55E] animate-ping" />
                <span className={cn("text-[10px] font-bold uppercase tracking-[0.25em] text-[#94A3B8]", jetbrainsMono.className)}>
                  Dream Engine V2 Active
                </span>
              </div>
              <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[#F1F5F9] font-normal leading-tight", instrumentSerif.className)}>
                Chào mừng trở lại, X! 👋
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#94A3B8] italic max-w-xl">
                "Học nhi thời tập chi, bất diệc duyệt hồ? Học mà thường ôn tập, chẳng cũng vui lắm sao?" – Khổng Tử
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#available-exams">
                <Button className="rounded-xl bg-[#6366F1] hover:bg-[#6366F1]/95 text-white font-semibold px-5 py-4 transition-all duration-200">
                  Làm đề giao riêng
                </Button>
              </a>
              <Link href="/student/X/timetable">
                <Button variant="outline" className="rounded-xl border-[#2D2D6B] hover:border-[#6366F1] text-[#94A3B8] hover:text-[#F1F5F9] bg-transparent px-5 py-4">
                  Xem thời khóa biểu
                </Button>
              </Link>
            </div>
          </div>

          {/* Gamified Profile Aura Card */}
          <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar with Custom Rank Ring */}
              <div className={cn("relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 shadow-lg bg-[#0F0F23]", rank.border)}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url ?? undefined} alt={profile.full_name ?? undefined} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#F1F5F9]">{profile?.full_name?.[0] || "X"}</span>
                )}
                {/* Level Tag */}
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#1E1E4A] border border-[#2D2D6B] text-[10px] font-bold text-[#8B5CF6]">
                  {studentStats.level}
                </div>
              </div>

              <div>
                <span className={cn("text-xs font-bold uppercase tracking-widest", rank.color)}>
                  {rank.name} Rank 🏆
                </span>
                <h3 className="text-xl font-bold text-[#F1F5F9] mt-0.5">{profile?.full_name || "Học sinh X"}</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Lớp học: Lớp X • THPT 2027</p>
              </div>
            </div>

            {/* In-Card XP Progress */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-mono text-[#94A3B8]">
                <span>Tiến trình cấp {studentStats.level}</span>
                <span>
                  <strong className="text-[#F59E0B]">{xpProgress.current}</strong> / {xpProgress.required} XP
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-[#0F0F23] overflow-hidden border border-[#2D2D6B]/50">
                <div 
                  className="h-full bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] transition-all duration-700 ease-out" 
                  style={{ width: `${xpProgress.percent}%` }}
                />
              </div>
              <p className="text-[10px] text-right text-[#94A3B8]">
                Còn <strong className="text-[#6366F1]">{xpProgress.nextTotal - userXp} XP</strong> để lên cấp {studentStats.level + 1}
              </p>
            </div>

            {/* Daily Checkin Wrapper */}
            <div className="mt-6 border-t border-[#2D2D6B]/40 pt-4">
              <DailyCheckIn onComplete={({ xp }) => setUserXp((prev) => prev + xp)} />
            </div>
          </div>
        </section>

        {/* Row 2: KPI Metrics Cards */}
        <section className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          
          {/* Card 1: Exams Completed */}
          <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-xl p-5 hover:border-[#6366F1]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">📝 Đề đã làm</span>
              <FileText className="h-4 w-4 text-[#94A3B8]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[#F1F5F9] mt-3">{submissions.length}</p>
            <p className="text-xs text-[#22C55E] mt-1.5 font-medium">Tuần này: +{submissionsThisWeek}</p>
          </div>

          {/* Card 2: Average Score */}
          <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-xl p-5 hover:border-[#6366F1]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">⭐ Điểm TB</span>
              <Trophy className="h-4 w-4 text-[#F59E0B]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[#F1F5F9] mt-3">{averageScore} <span className="text-lg font-normal text-[#94A3B8]">/10</span></p>
            <p className="text-xs text-[#6366F1] mt-1.5 font-medium">Kỷ lục điểm: {bestScore}</p>
          </div>

          {/* Card 3: Class Rank */}
          <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-xl p-5 hover:border-[#6366F1]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">🏆 Hạng lớp</span>
              <Award className="h-4 w-4 text-[#8B5CF6]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[#F1F5F9] mt-3">#12 <span className="text-lg font-normal text-[#94A3B8]">/35</span></p>
            <p className="text-xs text-[#22C55E] mt-1.5 font-medium">Top 15% của lớp</p>
          </div>

          {/* Card 4: Streak */}
          <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-xl p-5 hover:border-[#6366F1]/40 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">🔥 Streak học</span>
              <Sparkles className="h-4 w-4 text-[#F97316]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[#F1F5F9] mt-3">{studentStats.streak_days} <span className="text-lg font-normal text-[#94A3B8]">ngày</span></p>
            <p className="text-xs text-[#F97316] mt-1.5 font-medium">Kỷ lục: 14 ngày</p>
          </div>
        </section>

        {/* Row 3: Main Dashboard Content Grid */}
        <section className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
          
          {/* Left Panel: Assigned Exams & Arena */}
          <div className="space-y-8">
            
            {/* Assigned Exams Timeline */}
            <div id="available-exams" className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-2xl overflow-hidden shadow-xl">
              <div className="flex flex-col gap-4 border-b border-[#2D2D6B]/40 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className={cn("text-3xl text-[#F1F5F9] font-normal", instrumentSerif.className)}>Nhiệm vụ đề thi của X</h2>
                  <p className="text-xs text-[#94A3B8] mt-1">Các đề thi độc quyền được giáo viên giao trực tiếp</p>
                </div>
                
                {/* Search Inputs */}
                <div className="flex items-center gap-2 rounded-xl border border-[#2D2D6B] bg-[#0F0F23] px-3 py-1.5 w-full max-w-xs">
                  <Search className="h-4 w-4 text-[#94A3B8]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Tìm đề thi..."
                    className="bg-transparent text-xs w-full outline-none text-[#F1F5F9] placeholder-[#94A3B8]"
                  />
                </div>
              </div>

              {/* Subject Filters */}
              <div className="flex gap-1.5 overflow-x-auto border-b border-[#2D2D6B]/40 p-4">
                <button
                  onClick={() => setSelectedSubject("all")}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors whitespace-nowrap border",
                    selectedSubject === "all"
                      ? "bg-[#6366F1] text-white border-transparent shadow-sm"
                      : "border-[#2D2D6B] text-[#94A3B8] hover:border-[#6366F1]"
                  )}
                >
                  Tất cả
                </button>
                {SUBJECTS.filter((subject) => availableExams.some((exam) => exam.subject === subject.value)).map((subject) => (
                  <button
                    key={subject.value}
                    onClick={() => setSelectedSubject(subject.value)}
                    className={cn(
                      "rounded-lg px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-colors whitespace-nowrap border",
                      selectedSubject === subject.value
                        ? "bg-[#6366F1] text-white border-transparent shadow-sm"
                        : "border-[#2D2D6B] text-[#94A3B8] hover:border-[#6366F1]"
                    )}
                  >
                    {subject.label}
                  </button>
                ))}
              </div>

              {/* Exams Listing */}
              {filteredExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <FileText className="mb-4 h-12 w-12 text-[#2D2D6B]/40" />
                  <h3 className="text-base font-semibold text-[#F1F5F9]">Không tìm thấy đề thi phù hợp</h3>
                  <p className="mt-1 text-xs text-[#94A3B8] max-w-xs">Hãy đổi bộ lọc môn học hoặc từ khóa tìm kiếm.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#2D2D6B]/30">
                  {filteredExams.map((exam) => {
                    const subjectInfo = getSubjectInfo(exam.subject || "other")
                    const submitted = hasSubmitted(exam.id)
                    const submission = getSubmission(exam.id)
                    const timeBadge = getExamTimeBadge(exam)

                    return (
                      <div key={exam.id} className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between hover:bg-[#0F0F23]/20 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#2D2D6B] bg-[#0F0F23]">
                            <span className="text-xl">{subjectInfo.icon}</span>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-[#F1F5F9]">{exam.title}</h3>
                              {submitted && submission && (
                                <span className={cn("rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#22C55E]", jetbrainsMono.className)}>
                                  {submission.score.toFixed(1)} ĐIỂM
                                </span>
                              )}
                              <span className={cn("rounded-lg border px-2 py-0.5 text-[9px] font-bold tracking-wider whitespace-nowrap", timeBadge.className)}>
                                {timeBadge.label.toUpperCase()}
                              </span>
                            </div>
                            <div className={cn("mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-[#94A3B8]", jetbrainsMono.className)}>
                              <span className="flex items-center gap-1.5">
                                <BookOpen className="h-3 w-3" />
                                {subjectInfo.label}
                              </span>
                              <span className="flex items-center gap-1.5">
                                <Clock className="h-3 w-3" />
                                {exam.duration} phút
                              </span>
                              <span className="flex items-center gap-1.5">
                                <FileText className="h-3 w-3" />
                                {exam.total_questions} câu hỏi
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end lg:self-auto">
                          {submitted ? (
                            <>
                              <Link href={`/student/exams/${exam.id}/result`}>
                                <Button variant="outline" size="sm" className="rounded-lg border-[#2D2D6B] hover:border-[#6366F1] text-[#94A3B8] hover:text-[#F1F5F9] bg-transparent text-xs">
                                  Xem kết quả
                                </Button>
                              </Link>
                              <Link href={`/student/exams/${exam.id}/take`}>
                                <Button size="sm" className="rounded-lg bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold text-xs">
                                  Làm lại
                                </Button>
                              </Link>
                            </>
                          ) : (
                            <Link href={`/student/exams/${exam.id}/take`}>
                              <Button size="sm" className="rounded-lg bg-[#6366F1] hover:bg-[#6366F1]/90 text-white font-semibold text-xs px-4">
                                Làm bài
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Arena Waiting Sessions */}
            <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Swords className="h-5 w-5 text-[#8B5CF6] animate-pulse" />
                  <h3 className={cn("text-2xl text-[#F1F5F9] font-normal", instrumentSerif.className)}>Đấu trường sắp mở</h3>
                </div>
                <span className="text-xs text-[#94A3B8] font-mono">Đồng bộ trực tiếp</span>
              </div>

              {arenaSessions.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-[#2D2D6B]/60 rounded-xl">
                  <p className="text-xs text-[#94A3B8]">Hiện chưa có phòng đấu trường nào đang chờ mở.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {arenaSessions.map((session) => (
                    <div key={session.id} className="flex justify-between items-center bg-[#0F0F23]/60 border border-[#2D2D6B]/40 rounded-xl p-4 hover:border-[#8B5CF6]/50 transition-colors">
                      <div>
                        <h4 className="text-sm font-bold text-[#F1F5F9]">{session.name}</h4>
                        <p className="text-xs text-[#94A3B8] mt-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Bắt đầu: {new Date(session.start_time).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Link href="/arena">
                        <Button size="sm" className="rounded-lg bg-[#8B5CF6] hover:bg-[#8B5CF6]/90 text-white text-xs px-4">
                          Vào phòng
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right Panel: Countdown & Challenges */}
          <div className="space-y-6">
            
            {/* 1. THPT 2027 Countdown Widget */}
            <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-[#6366F1]/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#6366F1] mb-4 font-semibold">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>Đếm ngược THPT Quốc Gia 2027</span>
              </div>
              
              <div className="grid grid-cols-4 gap-2 text-center">
                {[
                  { label: "Ngày", value: timeLeft.days },
                  { label: "Giờ", value: timeLeft.hours },
                  { label: "Phút", value: timeLeft.minutes },
                  { label: "Giây", value: timeLeft.seconds }
                ].map((item) => (
                  <div key={item.label} className="bg-[#0F0F23] border border-[#2D2D6B]/30 rounded-xl p-2.5">
                    <span className={cn("text-2xl font-bold text-[#F1F5F9]", jetbrainsMono.className)}>
                      {String(item.value).padStart(2, '0')}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider text-[#94A3B8] mt-1">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-[10px] text-[#94A3B8]">
                  Ngày thi dự kiến: <span className="text-[#6366F1] font-bold">11/06/2027</span>
                </p>
              </div>
            </div>

            {/* 2. Daily Challenges Widget */}
            <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-2xl p-6 shadow-xl">
              <ChallengesWidget limit={3} />
            </div>

            {/* 3. Quick Navigation Tools */}
            <div className="bg-[#1A1A3E] border border-[#2D2D6B]/40 rounded-2xl p-6 shadow-xl">
              <h3 className={cn("text-2xl text-[#F1F5F9] font-normal mb-4", instrumentSerif.className)}>Công cụ học tập</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: "/resources", label: "Tài liệu", icon: BookOpen },
                  { href: "/arena", label: "Đấu trường", icon: Swords },
                  { href: "https://theieltsdictionary.com/", label: "IELTS", icon: GraduationCap, isExternal: true },
                  { href: "/student/achievements", label: "Thành tích", icon: Award },
                  { href: "/student/X/timetable", label: "Lịch học X", icon: Calendar },
                  { href: "/student/X/checklist", label: "Nhiệm vụ X", icon: ListTodo },
                  { href: "/student/co-study", label: "Pomodoro", icon: Timer },
                  { href: "/live", label: "Học Live", icon: Video },
                ].map((item) => {
                  const itemContent = (
                    <div className="flex flex-col justify-between p-3.5 h-20 bg-[#0F0F23]/60 hover:bg-[#1E1E4A] border border-[#2D2D6B]/40 hover:border-[#6366F1]/50 rounded-xl transition-all duration-200 group">
                      <item.icon className="h-4.5 w-4.5 text-[#94A3B8] group-hover:text-[#6366F1] transition-colors" />
                      <span className="text-xs font-semibold text-[#F1F5F9]">{item.label}</span>
                    </div>
                  )
                  return item.isExternal ? (
                    <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
                      {itemContent}
                    </a>
                  ) : (
                    <Link key={item.href} href={item.href}>
                      {itemContent}
                    </Link>
                  )
                })}
              </div>
            </div>

          </div>

        </section>

      </main>
    </StudentShell>
  )
}
