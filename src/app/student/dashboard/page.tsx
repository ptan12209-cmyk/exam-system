"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  BookOpen,
  Clock,
  FileText,
  Search,
  Swords,
  Trophy,
  Zap,
  CheckCircle,
  Award,
  ListTodo,
  Timer,
  Video,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Calendar,
  Globe2,
  ArrowLeft
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"
import { getUserStats } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { ChallengesWidget } from "@/components/gamification/ChallengeCard"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { GradeOnboardingModal } from "@/components/student/GradeOnboardingModal"
import { useAuth } from "@/hooks/useAuth"

import type { Profile, Exam, Submission } from "@/types"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function StudentDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const { user, profile: authProfile, loading: authLoading, signOut } = useAuth({ requiredRole: "student" })
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (authProfile) {
      setProfile(authProfile as unknown as Profile)
    }
  }, [authProfile])

  const [availableExams, setAvailableExams] = useState<Exam[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [userXp, setUserXp] = useState(0)
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0, exams_completed: 0, perfect_scores: 0 })
  const [selectedSubject, setSelectedSubject] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const [classRank, setClassRank] = useState<number | null>(null)
  const [classSize, setClassSize] = useState<number | null>(null)
  const [maxStreak, setMaxStreak] = useState<number>(0)
  
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

  useEffect(() => {
    if (!user || !profile) return

    const fetchData = async () => {
      const { stats } = await getUserStats(user.id)
      setStudentStats(stats)
      setUserXp(stats.xp)

      const isX = profile.nickname === "X"

      // Fetch exams
      let examsQuery = supabase
        .from("exams")
        .select("*")
        .eq("status", "published")
        .eq("assigned_to", isX ? "x" : "normal")

      if (!isX && profile.grade !== null) {
        examsQuery = examsQuery.or(`target_grade.is.null,target_grade.eq.${profile.grade}`)
      }

      const { data: examsData } = await examsQuery.order("created_at", { ascending: false })
      if (examsData) {
        if (isX) {
          setAvailableExams(examsData)
        } else {
          const studentClassSuffix = profile.class_suffix?.toUpperCase()
          const visibleExams = examsData.filter((exam: any) => {
            if (exam.target_classes && exam.target_classes.length > 0) {
              return studentClassSuffix && exam.target_classes.map((c: string) => c.toUpperCase()).includes(studentClassSuffix)
            }
            return true
          })
          setAvailableExams(visibleExams)
        }
      }

      // Fetch submissions
      const { data: submissionsData } = await supabase
        .from("submissions")
        .select("*, exam:exams(*)")
        .eq("student_id", user.id)
        .order("submitted_at", { ascending: false })
      if (submissionsData) setSubmissions(submissionsData)

      // Calculate class rank
      if (profile.class) {
        const { data: classProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("class", profile.class)

        if (classProfiles && classProfiles.length > 0) {
          const studentIds = classProfiles.map((p: { id: string }) => p.id)
          const { data: classStats } = await supabase
            .from("student_stats")
            .select("user_id, xp")
            .in("user_id", studentIds)

          if (classStats) {
            const sortedStats = [...classStats].sort((a, b) => b.xp - a.xp)
            const rankIndex = sortedStats.findIndex(s => s.user_id === user.id)
            setClassRank(rankIndex !== -1 ? rankIndex + 1 : classProfiles.length)
            setClassSize(classProfiles.length)
          } else {
            setClassRank(1)
            setClassSize(classProfiles.length)
          }
        } else {
          setClassRank(1)
          setClassSize(1)
        }
      } else {
        setClassRank(1)
        setClassSize(1)
      }

      // Fetch max streak from daily_logins
      const { data: maxStreakData } = await supabase
        .from("daily_logins")
        .select("streak_day")
        .eq("user_id", user.id)
        .order("streak_day", { ascending: false })
        .limit(1)

      if (maxStreakData && maxStreakData.length > 0) {
        setMaxStreak(Math.max(maxStreakData[0].streak_day, stats.streak_days))
      } else {
        setMaxStreak(stats.streak_days)
      }

      setLoadingData(false)
    }

    fetchData()
  }, [user, profile, router, supabase])

  // Helper for dynamic timing badges (Dream Engine flat style)
  const getExamTimeBadge = (exam: Exam) => {
    if (!exam.is_scheduled || !exam.start_time) {
      return { label: "Tự do", className: "bg-[#8C87A2]/10 text-[#8C87A2] border-[#8C87A2]/20" }
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
      return { label: "Hôm nay", className: "bg-[#C18CFF]/15 text-[#C18CFF] border-[#C18CFF]/30 animate-pulse" }
    }
    if (isTomorrow) {
      return { label: "Ngày mai", className: "bg-[#8C87A2]/10 text-[#F1EDF9] border-[#8C87A2]/20" }
    }
    return { 
      label: startDate.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }), 
      className: "bg-[#8C87A2]/5 text-[#8C87A2] border-[#8C87A2]/20" 
    }
  }

  const filteredExams = useMemo(() => {
    return availableExams.filter((exam) => {
      const matchSubject = selectedSubject === "all" || exam.subject === selectedSubject
      const matchSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase())
      return matchSubject && matchSearch
    })
  }, [availableExams, searchQuery, selectedSubject])

  const handleLogout = async () => {
    await signOut()
  }

  const loading = authLoading || loadingData

  const hasSubmitted = (examId: string) => submissions.some((submission) => submission.exam_id === examId)
  const getSubmission = (examId: string) => submissions.find((submission) => submission.exam_id === examId)

  const unsubmittedExams = useMemo(() => {
    return availableExams.filter(exam => !hasSubmitted(exam.id))
  }, [availableExams, submissions])

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
    return Math.max(...submissions.map((submission) => submission.score)).toFixed(1)
  }, [submissions])

  const rank = useMemo(() => {
    const level = studentStats.level
    if (level >= 40) return { name: "Diamond", color: "text-[#B9F2FF]", border: "border-[#B9F2FF]/60 bg-[#B9F2FF]/10" }
    if (level >= 30) return { name: "Platinum", color: "text-[#E8E8E8]", border: "border-[#E8E8E8]/60 bg-[#E8E8E8]/10" }
    if (level >= 20) return { name: "Gold", color: "text-[#FFD700]", border: "border-[#FFD700]/60 bg-[#FFD700]/10" }
    if (level >= 10) return { name: "Silver", color: "text-[#C0C0C0]", border: "border-[#C0C0C0]/60 bg-[#C0C0C0]/10" }
    return { name: "Bronze", color: "text-[#CD7F32]", border: "border-[#CD7F32]/60 bg-[#CD7F32]/10" }
  }, [studentStats.level])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Khởi động không gian học tập..." />
      </div>
    )
  }

  return (
    <StudentShell className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Topbar Component */}
      <StudentTopbar
        name={profile?.full_name}
        userXp={userXp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
        nickname={profile?.nickname}
        studentClass={profile?.class}
      />

      {/* Navigation Tabs Component */}
      <StudentNavTabs />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl w-full px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Welcome Section */}
        <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-stretch">
          
          {/* Welcome Hero Card */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 lg:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C18CFF]" />
                  <span className={cn("text-[9px] font-bold uppercase tracking-[0.25em] text-[#8C87A2]", jetbrainsMono.className)}>
                    {profile?.nickname === "X" ? "Dream Engine Edition" : "ExamHub Student Panel"}
                  </span>
                </div>
                
                <Link href="/student/portal">
                  <Button variant="ghost" size="sm" className="h-8 rounded-xl border border-[#8C87A2]/20 text-[10px] font-bold hover:bg-[#0B0A13] text-[#8C87A2] hover:text-[#F1EDF9] flex items-center gap-1 shrink-0">
                    <ArrowLeft className="h-3.5 w-3.5" /> Cổng học tập
                  </Button>
                </Link>
              </div>
              <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
                {profile?.nickname === "X" ? "Chào mừng trở lại, X! 👋" : `Xin chào, ${profile?.full_name || "bạn"} 👋`}
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#8C87A2] italic max-w-xl">
                {profile?.nickname === "X" 
                  ? '"Học nhi thời tập chi, bất diệc duyệt hồ? Học mà thường ôn tập, chẳng cũng vui lắm sao?" – Khổng Tử' 
                  : '"Hành trình vạn dặm bắt đầu từ một bước chân. Mỗi câu hỏi đúng mang bạn đến gần hơn mục tiêu."'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#available-exams">
                <Button className="rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-semibold px-5 py-4 transition-all duration-200 shadow-sm">
                  {profile?.nickname === "X" ? "Làm đề giao riêng" : "Luyện tập ngay"}
                </Button>
              </a>
              {profile?.nickname === "X" ? (
                <Link href="/student/timetable">
                  <Button variant="outline" className="rounded-xl border-[#8C87A2]/40 hover:border-[#C18CFF] text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent px-5 py-4 transition-all">
                    Xem thời khóa biểu
                  </Button>
                </Link>
              ) : (
                <Link href="/student/analytics">
                  <Button variant="outline" className="rounded-xl border-[#8C87A2]/40 hover:border-[#C18CFF] text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent px-5 py-4 transition-all">
                    Xem chi tiết tiến độ
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Gamified Profile Info Card */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar with Custom Rank Ring */}
              <div className={cn("relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 shadow-sm bg-[#0B0A13]", rank.border)}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url ?? undefined} alt={profile.full_name ?? undefined} className="h-full w-full rounded-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-[#F1EDF9]">{profile?.full_name?.[0] || (profile?.nickname === "X" ? "X" : "H")}</span>
                )}
                {/* Level Tag */}
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#15131F] border border-[#8C87A2]/40 text-[10px] font-bold text-[#C18CFF]">
                  {studentStats.level}
                </div>
              </div>

              <div>
                <span className={cn("text-xs font-bold uppercase tracking-widest", rank.color)}>
                  {rank.name} Rank 🏆
                </span>
                <h3 className="text-xl font-bold text-[#F1EDF9] mt-0.5">{profile?.full_name || (profile?.nickname === "X" ? "Học sinh X" : "Học sinh")}</h3>
                <p className="text-xs text-[#8C87A2] mt-0.5">
                  Lớp học: {profile?.nickname === "X" ? "Lớp X • THPT 2027" : (profile?.class || "Chưa thiết lập")}
                </p>
              </div>
            </div>

            {/* In-Card XP Progress */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs font-mono text-[#8C87A2]">
                <span>Tiến trình cấp {studentStats.level}</span>
                <span>
                  <strong className="text-[#C18CFF]">{xpProgress.current}</strong> / {xpProgress.required} XP
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#0B0A13] overflow-hidden border border-[#8C87A2]/20">
                <div 
                  className="h-full bg-[#C18CFF] transition-all duration-700 ease-out" 
                  style={{ width: `${xpProgress.percent}%` }}
                />
              </div>
              <p className="text-[10px] text-right text-[#8C87A2]">
                Còn <strong className="text-[#C18CFF]">{xpProgress.nextTotal - userXp} XP</strong> để lên cấp {studentStats.level + 1}
              </p>
            </div>

            {/* Daily Checkin Widget */}
            <div className="mt-6 border-t border-[#8C87A2]/25 pt-4">
              <DailyCheckIn onComplete={({ xp }) => setUserXp((prev) => prev + xp)} />
            </div>
          </div>
        </section>

        {/* Row 2: KPI Metrics Cards */}
        <section className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {/* Card 1: Exams Completed */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">📝 Đề đã làm</span>
              <FileText className="h-4 w-4 text-[#8C87A2]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[#F1EDF9] mt-3">{submissions.length}</p>
            <p className="text-xs text-[#8C87A2] mt-1.5 font-medium font-mono">Tuần này: +{submissionsThisWeek}</p>
          </div>

          {/* Card 2: Average Score */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">⭐ Điểm TB</span>
              <Trophy className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[#F1EDF9] mt-3">{averageScore} <span className="text-lg font-normal text-[#8C87A2]">/10</span></p>
            <p className="text-xs text-[#8C87A2] mt-1.5 font-medium font-mono">Kỷ lục điểm: {bestScore}</p>
          </div>

          {/* Card 3: Class Rank */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">🏆 Hạng lớp</span>
              <Award className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[#F1EDF9] mt-3">
              {classRank !== null ? `#${classRank}` : "--"}{" "}
              <span className="text-lg font-normal text-[#8C87A2]">/{classSize ?? "--"}</span>
            </p>
            <p className="text-xs text-[#8C87A2] mt-1.5 font-medium">
              {classRank !== null && classSize ? `Top ${Math.round((classRank / classSize) * 100)}% của lớp` : "Đang tính..."}
            </p>
          </div>

          {/* Card 4: Streak */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 hover:border-[#C18CFF]/30 transition-colors">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#8C87A2] uppercase tracking-wider font-mono">🔥 Streak</span>
              <Sparkles className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-[#F1EDF9] mt-3">
              {studentStats.streak_days} <span className="text-lg font-normal text-[#8C87A2]">ngày</span>
            </p>
            <p className="text-xs text-[#8C87A2] mt-1.5 font-medium">Kỷ lục: {maxStreak} ngày</p>
          </div>
        </section>

        {/* Row 3: Main Layout Content Grid */}
        <section className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.8fr] lg:items-start">
          
          {/* Left Panel: Assigned Exams */}
          <div className="space-y-8">
            
            {/* Assigned Exams Timeline */}
            <div id="available-exams" className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl overflow-hidden shadow-sm">
              <div className="flex flex-col gap-4 border-b border-[#8C87A2]/20 p-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className={cn("text-3xl text-[#F1EDF9] font-normal", instrumentSerif.className)}>
                    {profile?.nickname === "X" ? "Nhiệm vụ đề thi của X" : "Đề thi có sẵn"}
                  </h2>
                  <p className="text-xs text-[#8C87A2] mt-1">
                    {profile?.nickname === "X" ? "Các đề thi độc quyền được giáo viên giao trực tiếp" : "Chọn đề thi và bắt đầu luyện tập"}
                  </p>
                </div>
                
                {/* Search Bar */}
                <div className="flex items-center gap-2 rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] px-3 py-1.5 w-full max-w-xs">
                  <Search className="h-4 w-4 text-[#8C87A2]" />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder={profile?.nickname === "X" ? "Tìm đề thi..." : "Tìm kiếm đề thi..."}
                    className="bg-transparent text-xs w-full outline-none text-[#F1EDF9] placeholder-[#8C87A2]"
                  />
                </div>
              </div>

              {/* Subject Filters */}
              <div className="flex gap-1.5 overflow-x-auto border-b border-[#8C87A2]/20 p-4">
                <button
                  onClick={() => setSelectedSubject("all")}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all whitespace-nowrap border",
                    selectedSubject === "all"
                      ? "bg-[#C18CFF] text-[#0B0A13] border-transparent shadow-sm"
                      : "border-[#8C87A2]/40 text-[#8C87A2] hover:border-[#C18CFF]"
                  )}
                >
                  Tất cả
                </button>
                {SUBJECTS.filter((subject) => availableExams.some((exam) => exam.subject === subject.value)).map((subject) => (
                  <button
                    key={subject.value}
                    onClick={() => setSelectedSubject(subject.value)}
                    className={cn(
                      "rounded-lg px-3.5 py-1.5 text-[10px] font-bold tracking-wider uppercase transition-all whitespace-nowrap border",
                      selectedSubject === subject.value
                        ? "bg-[#C18CFF] text-[#0B0A13] border-transparent shadow-sm"
                        : "border-[#8C87A2]/40 text-[#8C87A2] hover:border-[#C18CFF]"
                    )}
                  >
                    {subject.label}
                  </button>
                ))}
              </div>

              {/* Exams Listing */}
              {filteredExams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                  <FileText className="mb-4 h-12 w-12 text-[#8C87A2]/20" />
                  <h3 className="text-base font-semibold text-[#F1EDF9]">Không tìm thấy đề thi phù hợp</h3>
                  <p className="mt-1 text-xs text-[#8C87A2] max-w-xs">Hãy đổi bộ lọc môn học hoặc từ khóa tìm kiếm.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#8C87A2]/10 bg-[#15131F]">
                  {filteredExams.map((exam) => {
                    const subjectInfo = getSubjectInfo(exam.subject || "other")
                    const submitted = hasSubmitted(exam.id)
                    const submission = getSubmission(exam.id)

                    return (
                      <div key={exam.id} className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between hover:bg-[#0B0A13]/40 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#8C87A2]/20 bg-[#0B0A13]">
                            <span className="text-xl">{subjectInfo.icon}</span>
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-sm sm:text-base font-bold text-[#F1EDF9]">{exam.title}</h3>
                              {submitted && submission && (
                                <span className={cn("rounded-lg border border-[#C18CFF]/40 bg-[#C18CFF]/10 px-2 py-0.5 text-[9px] font-bold tracking-wider text-[#C18CFF]", jetbrainsMono.className)}>
                                  {submission.score.toFixed(1)} ĐIỂM
                                </span>
                              )}
                              {profile?.nickname === "X" && (
                                <span className={cn("rounded-lg border px-2 py-0.5 text-[9px] font-bold tracking-wider whitespace-nowrap", getExamTimeBadge(exam).className)}>
                                  {getExamTimeBadge(exam).label.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div className={cn("mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-[#8C87A2]", jetbrainsMono.className)}>
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
                                <Button variant="outline" size="sm" className="rounded-lg border-[#8C87A2]/40 hover:border-[#C18CFF] text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent text-xs transition-colors">
                                  Xem kết quả
                                </Button>
                              </Link>
                              <Link href={`/student/exams/${exam.id}/take`}>
                                <Button size="sm" className="rounded-lg bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-semibold text-xs transition-colors">
                                  Làm lại
                                </Button>
                              </Link>
                            </>
                          ) : (
                            <Link href={`/student/exams/${exam.id}/take`}>
                              <Button size="sm" className="rounded-lg bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-semibold text-xs px-4 transition-colors">
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

          </div>

          {/* Right Panel: Challenges & Quick Tools */}
          <div className="space-y-6">
            
            {/* 1. THPT 2027 Countdown Widget (For student X only) */}
            {profile?.nickname === "X" && (
              <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#C18CFF] mb-4 font-semibold">
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
                    <div key={item.label} className="bg-[#0B0A13] border border-[#8C87A2]/20 rounded-xl p-2.5">
                      <span className={cn("text-2xl font-bold text-[#F1EDF9]", jetbrainsMono.className)}>
                        {String(item.value).padStart(2, '0')}
                      </span>
                      <span className="block text-[9px] uppercase tracking-wider text-[#8C87A2] mt-1">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-[10px] text-[#8C87A2]">
                    Ngày thi dự kiến: <span className="text-[#C18CFF] font-bold">11/06/2027</span>
                  </p>
                </div>
              </div>
            )}

            {/* Daily Challenges Widget */}
            <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 shadow-sm">
              <ChallengesWidget limit={3} />
            </div>

            {/* Quick Navigation Tools */}
            <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 shadow-sm">
              <h3 className={cn("text-2xl text-[#F1EDF9] font-normal mb-4", instrumentSerif.className)}>Công cụ học tập</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: "/resources", label: "Tài liệu", icon: BookOpen },
                  { href: "/arena", label: "Đấu trường", icon: Swords },
                  { href: "https://theieltsdictionary.com/", label: "IELTS", icon: GraduationCap, isExternal: true },
                  { href: "/student/achievements", label: "Thành tích", icon: Award },
                  ...(profile?.nickname === "X"
                    ? [
                        { href: "/student/timetable", label: "Lịch học X", icon: Calendar },
                        { href: "/student/checklist", label: "Nhiệm vụ X", icon: ListTodo }
                      ]
                    : [
                        { href: "/student/checklist", label: "Checklist / Planner", icon: ListTodo }
                      ]
                  ),
                  { href: "/student/co-study", label: profile?.nickname === "X" ? "Pomodoro" : "Pomodoro YPT", icon: Timer },
                  { href: "/live", label: profile?.nickname === "X" ? "Học Live" : "Lớp Live", icon: Video },
                  ...((profile?.role as string) === "online_student"
                    ? [
                        { href: "/online-student/dashboard", label: "Học Online 🌐", icon: Globe2 }
                      ]
                    : []
                  ),
                ].map((item) => {
                  const itemContent = (
                    <div className="flex flex-col justify-between p-3.5 h-20 bg-[#0B0A13] hover:bg-[#0B0A13]/80 border border-[#8C87A2]/20 hover:border-[#C18CFF]/50 rounded-xl transition-all duration-200 group">
                      <item.icon className="h-4.5 w-4.5 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors" />
                      <span className="text-xs font-semibold text-[#F1EDF9]">{item.label}</span>
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

      {profile && profile.grade === null && (
        <GradeOnboardingModal
          userId={profile.id}
          onComplete={(selectedGrade, selectedClassSuffix) => {
            setProfile(prev => prev ? {
              ...prev,
              grade: selectedGrade,
              class_suffix: selectedClassSuffix,
              class: `${selectedGrade}${selectedClassSuffix}`
            } : null)
            window.location.reload()
          }}
        />
      )}
    </StudentShell>
  )
}
