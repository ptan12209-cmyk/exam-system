"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { XpBar } from "@/components/gamification/XpBar"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { getUserStats } from "@/lib/gamification"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"

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
    const [userId, setUserId] = useState<string | null>(null)
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }

            const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
            if (!profileData || profileData.role !== "student") { router.push("/teacher/dashboard"); return }

            setProfile(profileData)
            setUserId(user.id)

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

    const submissionsMap = useMemo(() => {
        return new Map(submissions.map(s => [s.exam_id, s]))
    }, [submissions])

    const hasSubmitted = (examId: string) => submissionsMap.has(examId)
    const getSubmission = (examId: string) => submissionsMap.get(examId)

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Top Navbar - Fixed */}
            <nav className="fixed top-0 z-50 w-full bg-white border-b border-gray-200">
                <div className="px-3 py-3 lg:px-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            {/* Mobile menu button */}
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="inline-flex items-center p-2 text-gray-500 rounded-lg sm:hidden hover:bg-gray-100"
                            >
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <Link href="/student/dashboard" className="flex ml-2 md:mr-24 items-center">
                                <div className="bg-blue-600 text-white p-1 rounded mr-2 w-8 h-8 flex items-center justify-center font-bold text-xl">E</div>
                                <span className="text-xl font-semibold text-blue-600 hidden sm:block">ExamHub</span>
                            </Link>
                        </div>
                        {/* Search */}
                        <div className="hidden md:flex relative w-96">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <span className="text-gray-400">🔍</span>
                            </div>
                            <input
                                type="text"
                                placeholder="Tìm kiếm đề thi, tài liệu..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full p-2 pl-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        {/* Right side */}
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
                </div>
            </nav>

            {/* Sidebar - Fixed */}
            <aside className={cn(
                "fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform bg-white border-r border-gray-200",
                sidebarOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
            )}>
                <div className="h-full px-3 pb-4 overflow-y-auto flex flex-col justify-between">
                    <ul className="space-y-2 font-medium">
                        <li>
                            <Link href="/student/dashboard" className="flex items-center p-2 text-blue-600 rounded-lg bg-blue-50 group">
                                <span className="text-xl">🏠</span>
                                <span className="ml-3">Trang chủ</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/resources" className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group">
                                <span className="text-xl">📚</span>
                                <span className="ml-3">Thư viện tài liệu</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/student/exams" className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group">
                                <span className="text-xl">📝</span>
                                <span className="ml-3">Luyện đề thi</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/arena" className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group">
                                <span className="text-xl">🏆</span>
                                <span className="ml-3">Đấu trường</span>
                            </Link>
                        </li>
                        <li>
                            <Link href="/live" className="flex items-center p-2 text-gray-900 rounded-lg hover:bg-gray-100 group">
                                <span className="text-xl">📺</span>
                                <span className="ml-3">Live Stream</span>
                            </Link>
                        </li>

                        {/* Divider */}
                        <li className="pt-4 mt-4 border-t border-gray-200">
                            <span className="px-2 text-xs font-semibold text-gray-500 uppercase">Tiến độ học tập</span>
                            <div className="mt-3 px-2">
                                <XpBar xp={userXp} size="sm" />
                            </div>
                        </li>
                    </ul>

                    <div className="mt-auto pt-4 text-xs text-center text-gray-500">
                        © 2026 ExamHub Education
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="p-4 sm:ml-64 pt-20">
                {/* Banner */}
                <div className="w-full mb-8 rounded-lg overflow-hidden shadow-lg relative bg-gradient-to-r from-blue-600 to-purple-600">
                    <div className="h-48 md:h-64 flex flex-col justify-center items-center text-center p-6">
                        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wide animate-pulse">
                            Chào mừng trở lại!
                        </span>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                            Xin chào, {profile?.full_name || "Học sinh"}!
                        </h1>
                        <p className="text-blue-100 text-sm md:text-lg mb-4 max-w-2xl">
                            Tiếp tục hành trình học tập của bạn với {availableExams.length} đề thi đang chờ
                        </p>
                        <Link href="/student/exams">
                            <Button className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-8 rounded-full shadow-lg transform transition hover:scale-105">
                                Vào thi ngay
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-xl">📊</div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{availableExams.length}</p>
                                <p className="text-xs text-gray-500">Đề thi</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-xl">✅</div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{submissions.length}</p>
                                <p className="text-xs text-gray-500">Hoàn thành</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center text-xl">🏆</div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">
                                    {submissions.length > 0 ? Math.max(...submissions.map(s => s.score)).toFixed(1) : "--"}
                                </p>
                                <p className="text-xs text-gray-500">Điểm cao nhất</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-xl">⚡</div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{userXp}</p>
                                <p className="text-xs text-gray-500">XP hiện tại</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                    {/* Exams List */}
                    <div className="lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-6 bg-blue-600 rounded-full"></div>
                                <h2 className="text-xl font-bold text-gray-900 uppercase">Đề thi mới nhất</h2>
                            </div>
                            <Link href="/student/exams" className="text-sm text-blue-600 hover:underline font-medium">
                                Xem tất cả
                            </Link>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
                            {availableExams.slice(0, 5).map((exam) => {
                                const submitted = hasSubmitted(exam.id)
                                const submission = getSubmission(exam.id)
                                const subjectInfo = getSubjectInfo(exam.subject || "other")

                                return (
                                    <div key={exam.id} className="p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                                        <div className={cn(
                                            "flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center text-xl bg-blue-100"
                                        )}>
                                            {subjectInfo.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1">
                                                {exam.title}
                                            </h3>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                    {subjectInfo.label}
                                                </span>
                                                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                                                    {exam.total_questions} câu
                                                </span>
                                                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded">
                                                    {exam.duration} phút
                                                </span>
                                                {submitted && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded font-bold",
                                                        submission && submission.score >= 8 ? "bg-green-100 text-green-800" :
                                                            submission && submission.score >= 5 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"
                                                    )}>
                                                        {submission?.score.toFixed(1)} điểm
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 ml-auto">
                                                    📅 {new Date(exam.created_at).toLocaleDateString("vi-VN")}
                                                </span>
                                            </div>
                                        </div>
                                        <Link href={submitted ? `/student/exams/${exam.id}/result` : `/student/exams/${exam.id}/take`}>
                                            <Button size="sm" variant={submitted ? "outline" : "default"} className={cn(
                                                submitted ? "border-blue-600 text-blue-600" : "bg-blue-600 hover:bg-blue-700"
                                            )}>
                                                {submitted ? "Xem lại" : "Làm bài"}
                                            </Button>
                                        </Link>
                                    </div>
                                )
                            })}

                            {availableExams.length === 0 && (
                                <div className="p-8 text-center text-gray-500">
                                    <span className="text-4xl mb-2 block">📝</span>
                                    Chưa có đề thi nào
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Daily Check-in & Quick Stats */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Daily Check-in */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
                                <h2 className="text-lg font-bold text-gray-900 uppercase">Điểm danh</h2>
                            </div>
                            <DailyCheckIn onComplete={({ xp }) => setUserXp(prev => prev + xp)} />
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1 h-6 bg-purple-600 rounded-full"></div>
                                <h2 className="text-lg font-bold text-gray-900 uppercase">Truy cập nhanh</h2>
                            </div>
                            <div className="space-y-2">
                                <Link href="/arena" className="block">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 transition-colors">
                                        <span className="text-2xl">⚔️</span>
                                        <div>
                                            <p className="font-bold">Đấu trường</p>
                                            <p className="text-xs text-purple-100">Thi đấu online</p>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/resources" className="block">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-colors">
                                        <span className="text-2xl">📖</span>
                                        <div>
                                            <p className="font-bold">Tài liệu</p>
                                            <p className="text-xs text-green-100">Kho tài liệu học tập</p>
                                        </div>
                                    </div>
                                </Link>
                                <Link href="/student/achievements" className="block">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 transition-colors">
                                        <span className="text-2xl">🏅</span>
                                        <div>
                                            <p className="font-bold">Thành tích</p>
                                            <p className="text-xs text-yellow-100">Xem huy hiệu</p>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        </div>

                        {/* Recent Results */}
                        {submissions.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                                    <h2 className="text-lg font-bold text-gray-900 uppercase">Kết quả gần đây</h2>
                                </div>
                                <div className="space-y-3">
                                    {submissions.slice(0, 3).map((sub, i) => (
                                        <div key={sub.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                                            <div className="font-bold text-gray-400 w-4 text-center">{i + 1}</div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">{sub.exam?.title || "Đề thi"}</p>
                                                <p className="text-xs text-gray-500">{new Date(sub.submitted_at).toLocaleDateString("vi-VN")}</p>
                                            </div>
                                            <span className={cn(
                                                "text-sm font-bold",
                                                sub.score >= 8 ? "text-green-600" : sub.score >= 5 ? "text-yellow-600" : "text-red-600"
                                            )}>
                                                {sub.score.toFixed(1)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-blue-600 text-white pt-10 pb-6 sm:ml-64">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h3 className="font-bold text-xl mb-4">ExamHub - Hệ thống luyện đề trực tuyến</h3>
                        <p className="text-blue-200 text-sm mb-4">Nền tảng học tập và ôn luyện trực tuyến hàng đầu</p>
                        <div className="border-t border-blue-400/30 pt-4 text-sm text-blue-200">
                            © 2026 ExamHub. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>

            {/* Mobile Bottom Navigation */}
            <BottomNav />

            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-30 bg-black/50 sm:hidden" onClick={() => setSidebarOpen(false)} />
            )}
        </div>
    )
}
