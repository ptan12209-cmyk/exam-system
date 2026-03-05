"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    GraduationCap,
    FileText,
    CheckCircle,
    Trophy,
    Zap,
    Clock,
    LogOut,
    Loader2,
    BookOpen,
    Swords,
    BarChart3,
    Award,
    User,
    ChevronRight,
    ArrowRight,
    ListTodo,
    Calendar
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { XpBar } from "@/components/gamification/XpBar"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { getUserStats } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import { StatsCard, FilterBar } from "@/components/shared"
import { STUDENT_STAT_COLORS } from "@/lib/student-styles"

interface Profile {
    id: string
    role: string
    full_name: string | null
    class: string | null
}

interface Exam {
    id: string
    title: string
    duration: number
    total_questions: number
    status: "draft" | "published"
    created_at: string
    subject?: string
}

interface Submission {
    id: string
    exam_id: string
    score: number
    submitted_at: string
    exam?: Exam
}

export default function StudentDashboard() {
    const router = useRouter()
    const supabase = createClient()

    const [profile, setProfile] = useState<Profile | null>(null)
    const [availableExams, setAvailableExams] = useState<Exam[]>([])
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const [userXp, setUserXp] = useState(0)
    const [selectedSubject, setSelectedSubject] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")

    const filteredExams = availableExams.filter(e => {
        const matchSubject = selectedSubject === "all" || e.subject === selectedSubject
        const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase())
        return matchSubject && matchSearch
    })

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }

            const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
            if (!profileData || profileData.role !== "student") { router.push("/teacher/dashboard"); return }

            setProfile(profileData)

            const { stats } = await getUserStats(user.id)
            setUserXp(stats.xp)

            const { data: examsData } = await supabase
                .from("exams")
                .select("*")
                .eq("status", "published")
                .order("created_at", { ascending: false })
            if (examsData) setAvailableExams(examsData)

            const { data: submissionsData } = await supabase
                .from("submissions")
                .select("*, exam:exams(*)")
                .eq("student_id", user.id)
                .order("submitted_at", { ascending: false })
            if (submissionsData) setSubmissions(submissionsData)

            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const hasSubmitted = (examId: string) => submissions.some(s => s.exam_id === examId)
    const getSubmission = (examId: string) => submissions.find(s => s.exam_id === examId)

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        )
    }

    const NAV_ITEMS = [
        { href: "/student/dashboard", label: "Tổng quan", icon: BarChart3, active: true },
        { href: "/student/exams", label: "Làm đề thi", icon: FileText },
    ]

    const EXPLORE_ITEMS = [
        { href: "/resources", label: "Thư viện tài liệu", icon: BookOpen },
        { href: "/arena", label: "Đấu trường", icon: Swords },
        { href: "/student/achievements", label: "Thành tích", icon: Award },
        { href: "/student/checklist", label: "Checklist học tập", icon: ListTodo },
        { href: "/student/profile", label: "Hồ sơ cá nhân", icon: User },
    ]

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 glass-sidebar p-5 hidden lg:flex lg:flex-col z-50">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-foreground">ExamHub</span>
                </div>

                <nav className="space-y-1 flex-1">
                    {NAV_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                item.active
                                    ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 font-semibold nav-active-indicator"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", item.active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
                            <span className="text-sm">{item.label}</span>
                            {item.active && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                        </Link>
                    ))}

                    <div className="pt-5 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Khám phá</p>
                    </div>

                    {EXPLORE_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 group"
                        >
                            <item.icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                            <span className="text-sm">{item.label}</span>
                        </Link>
                    ))}

                    {/* XP Progress */}
                    <div className="pt-6 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Tiến độ</p>
                        <div className="mt-3 px-3">
                            <XpBar xp={userXp} size="sm" />
                        </div>
                    </div>
                </nav>

                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full font-medium text-sm group"
                    >
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-foreground">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu
                        userName={profile?.full_name || ""}
                        userClass={profile?.class ?? undefined}
                        onLogout={handleLogout}
                        role="student"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Xin chào, {profile?.full_name || "Bạn"}! 👋
                        </h1>
                        <p className="text-muted-foreground">Tiếp tục hành trình học tập của bạn</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu
                            userName={profile?.full_name || ""}
                            userClass={profile?.class ?? undefined}
                            onLogout={handleLogout}
                            role="student"
                        />
                    </div>
                </div>

                {/* Mobile Title */}
                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-foreground">
                        Xin chào, {profile?.full_name?.split(" ").pop()}! 👋
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Tiếp tục học tập nào!
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <StatsCard
                        label="Đề thi"
                        value={availableExams.length}
                        icon={FileText}
                        iconColor={STUDENT_STAT_COLORS.exams.icon}
                        iconBgColor={STUDENT_STAT_COLORS.exams.bg}
                    />
                    <StatsCard
                        label="Hoàn thành"
                        value={submissions.length}
                        icon={CheckCircle}
                        iconColor={STUDENT_STAT_COLORS.completed.icon}
                        iconBgColor={STUDENT_STAT_COLORS.completed.bg}
                    />
                    <StatsCard
                        label="Điểm cao nhất"
                        value={submissions.length > 0 ? Math.max(...submissions.map(s => s.score)).toFixed(1) : "--"}
                        icon={Trophy}
                        iconColor={STUDENT_STAT_COLORS.score.icon}
                        iconBgColor={STUDENT_STAT_COLORS.score.bg}
                    />
                    <StatsCard
                        label="XP"
                        value={userXp}
                        icon={Zap}
                        iconColor={STUDENT_STAT_COLORS.xp.icon}
                        iconBgColor={STUDENT_STAT_COLORS.xp.bg}
                    />
                </div>

                {/* Daily Check-in (Mobile) */}
                <div className="lg:hidden mb-6">
                    <div className="glass-card rounded-2xl p-4">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                            <Zap className="w-4 h-4 text-amber-500" />
                            Điểm danh hôm nay
                        </h3>
                        <DailyCheckIn onComplete={({ xp }) => setUserXp(prev => prev + xp)} />
                    </div>
                </div>

                {/* Exams List */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Đề thi có sẵn</h2>
                                <p className="text-muted-foreground text-sm">Chọn đề thi và bắt đầu luyện tập</p>
                            </div>
                            <FilterBar
                                searchValue={searchQuery}
                                onSearchChange={setSearchQuery}
                                searchPlaceholder="Tìm kiếm đề thi..."
                                className="w-full md:w-auto"
                            />
                        </div>
                    </div>

                    {/* Subject Filter Tabs */}
                    <div className="flex items-center gap-2 p-4 overflow-x-auto border-b border-border/30 hide-scrollbar">
                        <button
                            onClick={() => setSelectedSubject("all")}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                                selectedSubject === "all"
                                    ? "gradient-primary text-white shadow-md shadow-indigo-500/20"
                                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                            )}
                        >
                            Tất cả
                        </button>
                        {SUBJECTS.filter(s => availableExams.some(e => e.subject === s.value)).map((s) => (
                            <button
                                key={s.value}
                                onClick={() => setSelectedSubject(s.value)}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                                    selectedSubject === s.value
                                        ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800"
                                        : "bg-muted/30 text-muted-foreground border border-border hover:bg-muted/50"
                                )}
                            >
                                {s.icon} {s.label}
                            </button>
                        ))}
                    </div>

                    {filteredExams.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <FileText className="w-8 h-8 text-muted-foreground/40" />
                            </div>
                            <h3 className="text-foreground font-semibold mb-1">Không tìm thấy đề thi</h3>
                            <p className="text-muted-foreground text-sm">Thử thay đổi bộ lọc hoặc quay lại sau</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30">
                            {filteredExams.map((exam) => {
                                const subjectInfo = getSubjectInfo(exam.subject || "other")
                                const submitted = hasSubmitted(exam.id)
                                const submission = getSubmission(exam.id)

                                return (
                                    <div
                                        key={exam.id}
                                        className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-muted/30 transition-all duration-200 gap-4"
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl flex shrink-0 items-center justify-center text-xl bg-indigo-50 dark:bg-indigo-950/30 shadow-sm">
                                                <span className="text-2xl">{subjectInfo.icon}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {exam.title}
                                                    </h3>
                                                    {submitted && (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                            submission && submission.score >= 8
                                                                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                                : submission && submission.score >= 5
                                                                    ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                        )}>
                                                            {submission?.score.toFixed(1)} điểm
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <BookOpen className="w-3.5 h-3.5" />
                                                        {subjectInfo.label}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {exam.duration} phút
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="w-3.5 h-3.5" />
                                                        {exam.total_questions} câu
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-auto">
                                            {submitted ? (
                                                <>
                                                    <Link href={`/student/exams/${exam.id}/result`}>
                                                        <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                                                            Xem kết quả
                                                        </Button>
                                                    </Link>
                                                    <Link href={`/student/exams/${exam.id}/take`}>
                                                        <Button size="sm" className="gradient-primary text-white border-0 shadow-md shadow-indigo-500/20 hover:opacity-90">
                                                            Làm lại
                                                        </Button>
                                                    </Link>
                                                </>
                                            ) : (
                                                <Link href={`/student/exams/${exam.id}/take`}>
                                                    <Button size="sm" className="gradient-primary text-white border-0 shadow-md shadow-indigo-500/20 hover:opacity-90">
                                                        Làm bài
                                                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
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
            </main>

            <BottomNav />
        </div>
    )
}
