"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    GraduationCap,
    FileText,
    Clock,
    LogOut,
    Loader2,
    BookOpen,
    Swords,
    BarChart3,
    Award,
    User,
    ChevronRight,
    CheckCircle,
    Calendar
} from "lucide-react"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { XpBar } from "@/components/gamification/XpBar"
import { getUserStats } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import { FilterBar, EmptyState } from "@/components/shared"

interface Exam {
    id: string
    title: string
    description?: string
    duration: number
    total_questions: number
    status: string
    subject?: string
    created_at: string
    is_scheduled?: boolean
    start_time?: string
    end_time?: string
}

interface Submission {
    exam_id: string
    score: number
}

export default function StudentExamsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [exams, setExams] = useState<Exam[]>([])
    const [submissions, setSubmissions] = useState<Map<string, number>>(new Map())
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<{ id: string; full_name?: string; class?: string } | null>(null)
    const [userXp, setUserXp] = useState(0)
    const [selectedSubject, setSelectedSubject] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        async function fetchData() {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push("/login")
                return
            }

            const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", authUser.id).single()
            setUser({ id: authUser.id, full_name: profile?.full_name, class: profile?.class })

            const { stats } = await getUserStats(authUser.id)
            setUserXp(stats.xp)

            const { data: examsData } = await supabase
                .from("exams")
                .select("*")
                .eq("status", "published")
                .order("created_at", { ascending: false })

            if (examsData) setExams(examsData)

            const { data: subsData } = await supabase
                .from("submissions")
                .select("exam_id, score")
                .eq("student_id", authUser.id)

            if (subsData) {
                const subMap = new Map<string, number>()
                subsData.forEach((s: Submission) => {
                    const existing = subMap.get(s.exam_id)
                    if (!existing || s.score > existing) {
                        subMap.set(s.exam_id, s.score)
                    }
                })
                setSubmissions(subMap)
            }

            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const isExamAvailable = (exam: Exam) => {
        if (!exam.is_scheduled) return true
        const now = new Date()
        if (exam.start_time && new Date(exam.start_time) > now) return false
        if (exam.end_time && new Date(exam.end_time) < now) return false
        return true
    }

    const filteredExams = exams
        .filter(e => selectedSubject === "all" || e.subject === selectedSubject)
        .filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))

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
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Tổng quan
                    </Link>
                    <Link
                        href="/student/exams"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
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
                        userName={user?.full_name || ""}
                        userClass={user?.class ?? undefined}
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
                            Danh sách đề thi
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Chọn đề thi và bắt đầu luyện tập</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <UserMenu
                            userName={user?.full_name || ""}
                            userClass={user?.class ?? undefined}
                            onLogout={handleLogout}
                            role="student"
                        />
                    </div>
                </div>

                {/* Mobile Title */}
                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                        Làm đề thi
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        {exams.length} đề thi có sẵn
                    </p>
                </div>

                {/* Exams Card */}
                <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-800 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Đề thi có sẵn</CardTitle>
                                <CardDescription className="text-gray-500 dark:text-gray-400">
                                    {filteredExams.length} đề thi • {submissions.size} đã hoàn thành
                                </CardDescription>
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
                            {SUBJECTS.filter(s => exams.some(e => e.subject === s.value)).map((s) => (
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
                            <EmptyState
                                icon={FileText}
                                title="Không tìm thấy đề thi"
                                description="Thử thay đổi bộ lọc hoặc quay lại sau"
                                iconColor="text-blue-500"
                                iconBgColor="bg-blue-50 dark:bg-blue-900/20"
                            />
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {filteredExams.map((exam) => {
                                    const hasSubmitted = submissions.has(exam.id)
                                    const bestScore = submissions.get(exam.id)
                                    const available = isExamAvailable(exam)
                                    const subjectInfo = getSubjectInfo(exam.subject || "other")

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
                                                        {hasSubmitted && (
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                                bestScore && bestScore >= 8
                                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                                    : bestScore && bestScore >= 5
                                                                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                                                        : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                            )}>
                                                                {bestScore?.toFixed(1)} điểm
                                                            </span>
                                                        )}
                                                        {!available && (
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-slate-800 text-gray-500">
                                                                Chưa mở
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
                                                        <span className="flex items-center gap-1">
                                                            <Calendar className="w-3.5 h-3.5" />
                                                            {new Date(exam.created_at).toLocaleDateString("vi-VN")}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 self-end md:self-auto">
                                                {hasSubmitted ? (
                                                    <>
                                                        <Link href={`/student/exams/${exam.id}/result`}>
                                                            <Button variant="outline" size="sm" className="border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300">
                                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                                Kết quả
                                                            </Button>
                                                        </Link>
                                                        {available && (
                                                            <Link href={`/student/exams/${exam.id}/take`}>
                                                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                                    Làm lại
                                                                </Button>
                                                            </Link>
                                                        )}
                                                    </>
                                                ) : (
                                                    <Link href={available ? `/student/exams/${exam.id}/take` : "#"}>
                                                        <Button
                                                            size="sm"
                                                            disabled={!available}
                                                            className={cn(
                                                                available
                                                                    ? "bg-blue-600 hover:bg-blue-700"
                                                                    : "bg-gray-200 text-gray-500 cursor-not-allowed"
                                                            )}
                                                        >
                                                            {available ? "Làm bài" : "Chưa mở"}
                                                            <ChevronRight className="w-4 h-4 ml-1" />
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
