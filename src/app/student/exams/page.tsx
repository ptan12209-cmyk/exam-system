"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { EmptyState } from "@/components/shared"
import { FileText } from "lucide-react"

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

const CATEGORIES = [
    { value: "all", label: "Tất cả" },
    { value: "thpt", label: "Đề thi thử THPT" },
    { value: "hsa", label: "ĐGNL HSA" },
    { value: "tsa", label: "ĐGTD TSA" },
    { value: "vact", label: "ĐGNL V-ACT" },
]

const SUBJECT_TAG_COLORS: Record<string, string> = {
    math: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    physics: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    chemistry: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
    biology: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400",
    english: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    literature: "bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400",
    history: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
    geography: "bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400",
}

export default function StudentExamsPage() {
    const router = useRouter()
    const supabase = createClient()

    const [exams, setExams] = useState<Exam[]>([])
    const [submissions, setSubmissions] = useState<Map<string, number>>(new Map())
    const [loading, setLoading] = useState(true)
    const [user, setUser] = useState<{ id: string; full_name?: string } | null>(null)
    const [filterSubject, setFilterSubject] = useState("")
    const [filterCategory, setFilterCategory] = useState("all")
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState("newest")

    useEffect(() => {
        async function fetchData() {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                router.push("/login")
                return
            }

            const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", authUser.id).single()
            setUser({ id: authUser.id, full_name: profile?.full_name })

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
        .filter(e => !filterSubject || e.subject === filterSubject)
        .filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("vi-VN")

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/student/dashboard" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">E</div>
                            <span className="font-bold text-xl text-blue-600 hidden md:block">ExamHub</span>
                        </Link>
                        <div className="hidden md:flex items-center bg-gray-100 dark:bg-slate-800 rounded-full px-4 py-2 w-80">
                            <span className="text-gray-400 mr-2">🔍</span>
                            <input
                                type="text"
                                placeholder="Tìm kiếm đề thi..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full focus:ring-0 text-gray-900 dark:text-white placeholder-gray-500"
                            />
                        </div>
                    </div>
                    <nav className="hidden lg:flex items-center gap-1">
                        <Link href="/student/dashboard" className="p-3 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"><span className="text-2xl">🏠</span></Link>
                        <Link href="/resources" className="p-3 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"><span className="text-2xl">📚</span></Link>
                        <Link href="/student/exams" className="p-3 text-blue-600 bg-blue-50 dark:bg-blue-900/40 rounded-lg"><span className="text-2xl">📝</span></Link>
                        <Link href="/arena" className="p-3 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg"><span className="text-2xl">🏆</span></Link>
                        <Link href="/student/profile" className="p-3 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">👤</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={user?.full_name || ""} onLogout={handleLogout} role="student" />
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow max-w-7xl mx-auto px-4 py-8 w-full">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <span>📝</span>
                    <span>›</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">Đề thi</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar - Filters */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Mobile Search */}
                        <div className="md:hidden flex items-center bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg px-4 py-3 shadow-sm">
                            <input
                                type="text"
                                placeholder="Tìm kiếm đề thi..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm w-full focus:ring-0 text-gray-900 dark:text-white"
                            />
                            <span className="text-blue-600">🔍</span>
                        </div>

                        {/* Filter Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg text-blue-600">Bộ lọc</h3>
                                <span className="text-gray-400">⚙️</span>
                            </div>

                            {/* Subject Filter */}
                            <div className="mb-6">
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium mb-3">
                                    <span className="text-gray-500">📚</span> Môn học
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setFilterSubject("")}
                                        className={cn(
                                            "px-3 py-1.5 text-xs rounded-md transition-colors",
                                            !filterSubject
                                                ? "bg-blue-100 text-blue-600 font-medium ring-1 ring-blue-200"
                                                : "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600"
                                        )}
                                    >
                                        Tất cả
                                    </button>
                                    {SUBJECTS.filter(s => s.value).map((s) => (
                                        <button
                                            key={s.value}
                                            onClick={() => setFilterSubject(s.value)}
                                            className={cn(
                                                "px-3 py-1.5 text-xs rounded-md transition-colors",
                                                filterSubject === s.value
                                                    ? "bg-blue-100 text-blue-600 font-medium ring-1 ring-blue-200"
                                                    : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400"
                                            )}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <hr className="border-gray-100 mb-6" />

                            {/* Category Filter */}
                            <div className="mb-2">
                                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-medium mb-3">
                                    <span className="text-gray-500">📂</span> Phân loại
                                </div>
                                <div className="flex flex-col gap-2">
                                    {CATEGORIES.map((c) => (
                                        <label key={c.value} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={filterCategory === c.value}
                                                onChange={() => setFilterCategory(c.value)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-600 h-4 w-4"
                                            />
                                            <span>{c.label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="lg:col-span-3">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Danh sách đề thi</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <span>Sắp xếp:</span>
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border-none bg-transparent font-medium text-gray-700 dark:text-gray-300 focus:ring-0 cursor-pointer"
                                >
                                    <option value="newest">Mới nhất</option>
                                    <option value="popular">Nhiều người thi</option>
                                </select>
                            </div>
                        </div>

                        {/* Exam Grid */}
                        {filteredExams.length === 0 ? (
                            <EmptyState
                                icon={FileText}
                                title="Chưa có đề thi nào"
                                description="Hãy quay lại sau khi có đề thi mới"
                                iconColor="text-blue-500"
                                iconBgColor="bg-blue-50 dark:bg-blue-900/20"
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {filteredExams.map((exam) => {
                                    const hasSubmitted = submissions.has(exam.id)
                                    const bestScore = submissions.get(exam.id)
                                    const available = isExamAvailable(exam)
                                    const subjectInfo = exam.subject ? getSubjectInfo(exam.subject) : null

                                    return (
                                        <div
                                            key={exam.id}
                                            className="bg-white dark:bg-slate-900 rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 dark:border-slate-800 flex flex-col h-full group"
                                        >
                                            <div className="p-5 flex flex-col h-full">
                                                {/* Tags */}
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex gap-2 flex-wrap">
                                                        <span className="px-2 py-1 rounded bg-orange-100 text-orange-600 text-xs font-bold uppercase tracking-wide">
                                                            THPT
                                                        </span>
                                                        {subjectInfo && (
                                                            <span className={cn(
                                                                "px-2 py-1 rounded text-xs font-bold uppercase tracking-wide",
                                                                SUBJECT_TAG_COLORS[exam.subject || ""] || "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400"
                                                            )}>
                                                                {subjectInfo.label}
                                                            </span>
                                                        )}
                                                        {hasSubmitted && (
                                                            <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-bold">
                                                                ✓ Đã làm
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="px-2 py-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
                                                        {exam.duration} phút
                                                    </span>
                                                </div>

                                                {/* Title */}
                                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                                                    {exam.title}
                                                </h3>

                                                {/* Description */}
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                                    {exam.description || `Đề thi ${exam.total_questions} câu hỏi, thời gian ${exam.duration} phút`}
                                                </p>

                                                {/* Score if submitted */}
                                                {hasSubmitted && (
                                                    <div className="mb-4 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-400 text-sm font-medium">
                                                        🏆 Điểm cao nhất: {bestScore?.toFixed(1)}
                                                    </div>
                                                )}

                                                {/* Footer */}
                                                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between">
                                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                        <div className="flex items-center gap-1">
                                                            <span>❓</span> {exam.total_questions} câu
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span>📅</span> {formatDate(exam.created_at)}
                                                        </div>
                                                    </div>
                                                    <Link href={available ? `/student/exams/${exam.id}/take` : "#"}>
                                                        <button
                                                            disabled={!available}
                                                            className={cn(
                                                                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                                                                available
                                                                    ? "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white"
                                                                    : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-gray-600"
                                                            )}
                                                        >
                                                            →
                                                        </button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {/* Pagination */}
                        {filteredExams.length > 0 && (
                            <div className="mt-8 flex justify-center">
                                <nav className="flex items-center gap-1 bg-white dark:bg-slate-900 shadow-sm rounded-lg p-1 border border-gray-100 dark:border-slate-800">
                                    <button className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">‹</button>
                                    <button className="w-9 h-9 flex items-center justify-center rounded-md bg-blue-600 text-white font-medium shadow-sm">1</button>
                                    <button className="w-9 h-9 flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800">2</button>
                                    <button className="w-9 h-9 flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800">3</button>
                                    <span className="w-9 h-9 flex items-center justify-center text-gray-400">...</span>
                                    <button className="w-9 h-9 flex items-center justify-center rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800">10</button>
                                    <button className="w-9 h-9 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800">›</button>
                                </nav>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-blue-600 text-white pt-12 pb-6 mt-auto">
                <div className="max-w-7xl mx-auto px-4 flex flex-col items-center justify-center">
                    <div className="w-full max-w-lg text-center mb-8">
                        <h4 className="font-bold text-lg mb-6 uppercase">Liên hệ</h4>
                        <ul className="space-y-3 text-sm text-blue-100">
                            <li className="flex items-center justify-center gap-3">
                                <span>🌐</span> examhub.id.vn
                            </li>
                            <li className="flex items-center justify-center gap-3">
                                <span>📧</span> contact@examhub.id.vn
                            </li>
                        </ul>
                    </div>
                    <div className="w-full border-t border-blue-400/30 pt-6 text-center text-sm text-blue-200">
                        © 2026 ExamHub. All rights reserved.
                    </div>
                </div>
            </footer>

            <BottomNav />
        </div>
    )
}
