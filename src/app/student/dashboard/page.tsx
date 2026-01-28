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
    Bell
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

    // Filter exams
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
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
            {/* Sidebar - Fixed */}
            <aside className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 hidden lg:block z-50">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">ExamHub</span>
                </div>

                <nav className="space-y-1">
                    <Link
                        href="/student/dashboard"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Tổng quan
                    </Link>
                    <Link
                        href="/student/exams"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <FileText className="w-5 h-5" />
                        Làm đề thi
                    </Link>
                    <div className="pt-4 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Khám phá</p>
                    </div>
                    <Link
                        href="/resources"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BookOpen className="w-5 h-5" />
                        Thư viện tài liệu
                    </Link>
                    <Link
                        href="/arena"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Swords className="w-5 h-5" />
                        Đấu trường
                    </Link>
                    <Link
                        href="/student/achievements"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Award className="w-5 h-5" />
                        Thành tích
                    </Link>
                    <Link
                        href="/student/profile"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <User className="w-5 h-5" />
                        Hồ sơ cá nhân
                    </Link>

                    {/* XP Progress */}
                    <div className="pt-6 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tiến độ</p>
                        <div className="mt-3 px-4">
                            <XpBar xp={userXp} size="sm" />
                        </div>
                    </div>
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors w-full font-medium"
                    >
                        <LogOut className="w-5 h-5" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-gray-800 dark:text-white">ExamHub</span>
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
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            Xin chào, {profile?.full_name || "Bạn"}! 👋
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Tiếp tục hành trình học tập của bạn</p>
                    </div>
                    <div className="flex items-center gap-4">
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
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                        Xin chào, {profile?.full_name?.split(" ").pop()}! 👋
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
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

                {/* Daily Check-in Card (Mobile) */}
                <div className="lg:hidden mb-6">
                    <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-500" />
                                Điểm danh hôm nay
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <DailyCheckIn onComplete={({ xp }) => setUserXp(prev => prev + xp)} />
                        </CardContent>
                    </Card>
                </div>

                {/* Exams List */}
                <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-800 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Đề thi có sẵn</CardTitle>
                                <CardDescription className="text-gray-500 dark:text-gray-400">Chọn đề thi và bắt đầu luyện tập</CardDescription>
                            </div>
                            <FilterBar
                                searchValue={searchQuery}
                                onSearchChange={setSearchQuery}
                                searchPlaceholder="Tìm kiếm đề thi..."
                                className="w-full md:w-auto"
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {/* Subject Filter Tabs */}
                        <div className="flex items-center gap-2 p-4 overflow-x-auto border-b border-gray-50 dark:border-slate-800 hide-scrollbar">
                            <button
                                onClick={() => setSelectedSubject("all")}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                                    selectedSubject === "all"
                                        ? "bg-gray-800 dark:bg-white text-white dark:text-gray-900"
                                        : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700"
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
                                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800"
                                            : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800"
                                    )}
                                >
                                    {s.icon} {s.label}
                                </button>
                            ))}
                        </div>

                        {filteredExams.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                </div>
                                <h3 className="text-gray-800 dark:text-white font-medium mb-1">Không tìm thấy đề thi</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Thử thay đổi bộ lọc hoặc quay lại sau</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {filteredExams.map((exam) => {
                                    const subjectInfo = getSubjectInfo(exam.subject || "other")
                                    const submitted = hasSubmitted(exam.id)
                                    const submission = getSubmission(exam.id)

                                    return (
                                        <div
                                            key={exam.id}
                                            className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors gap-4"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex shrink-0 items-center justify-center text-xl shadow-sm bg-blue-100 dark:bg-blue-900/30"
                                                )}>
                                                    <span className="text-2xl">{subjectInfo.icon}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {exam.title}
                                                        </h3>
                                                        {submitted && (
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                                submission && submission.score >= 8
                                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                                    : submission && submission.score >= 5
                                                                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                                                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                            )}>
                                                                {submission?.score.toFixed(1)} điểm
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
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
                                                            <Button variant="outline" size="sm" className="border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300">
                                                                Xem kết quả
                                                            </Button>
                                                        </Link>
                                                        <Link href={`/student/exams/${exam.id}/take`}>
                                                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                                Làm lại
                                                            </Button>
                                                        </Link>
                                                    </>
                                                ) : (
                                                    <Link href={`/student/exams/${exam.id}/take`}>
                                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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
                    </CardContent>
                </Card>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
