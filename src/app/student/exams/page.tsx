"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
    Calendar,
    X,
    Eye,
    Play,
    ChevronLeft,
    ChevronDown,
    ArrowRight
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

interface Question {
    id: string
    question_text: string
    options: string[]
    correct_answer?: number
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

    const [previewExam, setPreviewExam] = useState<Exam | null>(null)
    const [previewQuestions, setPreviewQuestions] = useState<Question[]>([])
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0)
    const [showAllQuestions, setShowAllQuestions] = useState(false)

    useEffect(() => {
        async function fetchData() {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) { router.push("/login"); return }

            const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", authUser.id).single()
            setUser({ id: authUser.id, full_name: profile?.full_name, class: profile?.class })

            const { stats } = await getUserStats(authUser.id)
            setUserXp(stats.xp)

            const { data: examsData } = await supabase
                .from("exams").select("*").eq("status", "published").order("created_at", { ascending: false })
            if (examsData) setExams(examsData)

            const { data: subsData } = await supabase
                .from("submissions").select("exam_id, score").eq("student_id", authUser.id)
            if (subsData) {
                const subMap = new Map<string, number>()
                subsData.forEach((s: Submission) => {
                    const existing = subMap.get(s.exam_id)
                    if (!existing || s.score > existing) subMap.set(s.exam_id, s.score)
                })
                setSubmissions(subMap)
            }
            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

    const isExamAvailable = (exam: Exam) => {
        if (!exam.is_scheduled) return true
        const now = new Date()
        if (exam.start_time && new Date(exam.start_time) > now) return false
        if (exam.end_time && new Date(exam.end_time) < now) return false
        return true
    }

    const openPreview = async (exam: Exam) => {
        setPreviewExam(exam); setLoadingPreview(true); setCurrentPreviewIndex(0); setShowAllQuestions(false)
        const { data: questions } = await supabase
            .from("questions").select("id, question_text, options").eq("exam_id", exam.id).order("order_index")
        if (questions) setPreviewQuestions(questions)
        setLoadingPreview(false)
    }

    const closePreview = () => { setPreviewExam(null); setPreviewQuestions([]); setCurrentPreviewIndex(0) }

    const filteredExams = exams
        .filter(e => selectedSubject === "all" || e.subject === selectedSubject)
        .filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()))

    const NAV_ITEMS = [
        { href: "/student/dashboard", label: "Tổng quan", icon: BarChart3 },
        { href: "/student/exams", label: "Làm đề thi", icon: FileText, active: true },
    ]
    const EXPLORE_ITEMS = [
        { href: "/resources", label: "Thư viện tài liệu", icon: BookOpen },
        { href: "/arena", label: "Đấu trường", icon: Swords },
        { href: "/student/achievements", label: "Thành tích", icon: Award },
        { href: "/student/profile", label: "Hồ sơ cá nhân", icon: User },
    ]

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
                        <Link key={item.href} href={item.href}
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
                        <Link key={item.href} href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 group"
                        >
                            <item.icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                            <span className="text-sm">{item.label}</span>
                        </Link>
                    ))}

                    <div className="pt-6 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Tiến độ</p>
                        <div className="mt-3 px-3"><XpBar xp={userXp} size="sm" /></div>
                    </div>
                </nav>

                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full font-medium text-sm group">
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
                    <UserMenu userName={user?.full_name || ""} userClass={user?.class} onLogout={handleLogout} role="student" />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 pt-20 lg:pt-4 lg:p-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Làm đề thi</h1>
                        <p className="text-muted-foreground">{exams.length} đề thi có sẵn</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={user?.full_name || ""} userClass={user?.class} onLogout={handleLogout} role="student" />
                    </div>
                </div>

                {/* Mobile Title */}
                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-foreground">Làm đề thi</h1>
                    <p className="text-muted-foreground text-sm">{exams.length} đề thi có sẵn</p>
                </div>

                {/* Exams Card */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Đề thi có sẵn</h2>
                                <p className="text-muted-foreground text-sm">{filteredExams.length} đề thi • {submissions.size} đã hoàn thành</p>
                            </div>
                            <FilterBar searchValue={searchQuery} onSearchChange={setSearchQuery} searchPlaceholder="Tìm kiếm đề thi..." className="w-full md:w-auto" />
                        </div>
                    </div>

                    {/* Subject Filter */}
                    <div className="flex items-center gap-2 p-4 overflow-x-auto border-b border-border/30 hide-scrollbar">
                        <button onClick={() => setSelectedSubject("all")} className={cn(
                            "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                            selectedSubject === "all" ? "gradient-primary text-white shadow-md shadow-indigo-500/20" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}>Tất cả</button>
                        {SUBJECTS.filter(s => exams.some(e => e.subject === s.value)).map((s) => (
                            <button key={s.value} onClick={() => setSelectedSubject(s.value)} className={cn(
                                "px-4 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2",
                                selectedSubject === s.value
                                    ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800"
                                    : "bg-muted/30 text-muted-foreground border border-border hover:bg-muted/50"
                            )}>{s.icon} {s.label}</button>
                        ))}
                    </div>

                    {filteredExams.length === 0 ? (
                        <EmptyState icon={FileText} title="Không tìm thấy đề thi" description="Thử thay đổi bộ lọc hoặc quay lại sau" iconColor="text-indigo-500" iconBgColor="bg-indigo-50 dark:bg-indigo-900/20" />
                    ) : (
                        <div className="divide-y divide-border/30">
                            {filteredExams.map((exam) => {
                                const hasSubmitted = submissions.has(exam.id)
                                const bestScore = submissions.get(exam.id)
                                const available = isExamAvailable(exam)
                                const subjectInfo = getSubjectInfo(exam.subject || "other")

                                return (
                                    <div key={exam.id} className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-muted/30 transition-all duration-200 gap-4">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 rounded-xl flex shrink-0 items-center justify-center text-xl bg-indigo-50 dark:bg-indigo-950/30 shadow-sm">
                                                <span className="text-2xl">{subjectInfo.icon}</span>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{exam.title}</h3>
                                                    {hasSubmitted && (
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                            bestScore && bestScore >= 8 ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                                : bestScore && bestScore >= 5 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                                                    : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                        )}>{bestScore?.toFixed(1)} điểm</span>
                                                    )}
                                                    {!available && (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-muted text-muted-foreground">Chưa mở</span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{subjectInfo.label}</span>
                                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{exam.duration} phút</span>
                                                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{exam.total_questions} câu</span>
                                                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(exam.created_at).toLocaleDateString("vi-VN")}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 self-end md:self-auto">
                                            <Button variant="outline" size="sm" onClick={() => openPreview(exam)} className="border-border text-muted-foreground hover:text-foreground">
                                                <Eye className="w-4 h-4 mr-1" />Xem đề
                                            </Button>

                                            {hasSubmitted ? (
                                                <>
                                                    <Link href={`/student/exams/${exam.id}/result`}>
                                                        <Button variant="outline" size="sm" className="border-border text-muted-foreground hover:text-foreground">
                                                            <CheckCircle className="w-4 h-4 mr-1" />Kết quả
                                                        </Button>
                                                    </Link>
                                                    {available && (
                                                        <Link href={`/student/exams/${exam.id}/take`}>
                                                            <Button size="sm" className="gradient-primary text-white border-0 shadow-md shadow-indigo-500/20 hover:opacity-90">Làm lại</Button>
                                                        </Link>
                                                    )}
                                                </>
                                            ) : (
                                                <Link href={available ? `/student/exams/${exam.id}/take` : "#"}>
                                                    <Button size="sm" disabled={!available} className={cn(
                                                        available ? "gradient-primary text-white border-0 shadow-md shadow-indigo-500/20 hover:opacity-90" : "bg-muted text-muted-foreground cursor-not-allowed"
                                                    )}>
                                                        {available ? "Làm bài" : "Chưa mở"}
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

            {/* Exam Preview Modal */}
            {previewExam && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="glass-card w-full sm:max-w-2xl sm:rounded-2xl max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col rounded-t-2xl">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
                            <div>
                                <h2 className="font-bold text-foreground text-lg">{previewExam.title}</h2>
                                <p className="text-sm text-muted-foreground">{previewQuestions.length} câu hỏi • {previewExam.duration} phút</p>
                            </div>
                            <button onClick={closePreview} className="p-2 rounded-full hover:bg-muted transition-colors">
                                <X className="w-5 h-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {loadingPreview ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                                </div>
                            ) : previewQuestions.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                                    <p className="text-muted-foreground">Không có câu hỏi</p>
                                </div>
                            ) : showAllQuestions ? (
                                <div className="space-y-6">
                                    {previewQuestions.map((q, idx) => (
                                        <div key={q.id} className="bg-muted/30 rounded-xl p-4">
                                            <div className="flex items-start gap-3 mb-3">
                                                <span className="w-8 h-8 gradient-primary text-white rounded-lg flex items-center justify-center text-sm font-bold shrink-0">{idx + 1}</span>
                                                <p className="text-foreground font-medium leading-relaxed">{q.question_text}</p>
                                            </div>
                                            <div className="grid gap-2 pl-11">
                                                {q.options.map((opt, optIdx) => (
                                                    <div key={optIdx} className="p-3 bg-card rounded-lg text-foreground/80 text-sm border border-border/30">
                                                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 mr-2">{String.fromCharCode(65 + optIdx)}.</span>{opt}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    <div className="bg-muted/30 rounded-xl p-5">
                                        <div className="flex items-start gap-3 mb-4">
                                            <span className="w-10 h-10 gradient-primary text-white rounded-xl flex items-center justify-center text-lg font-bold shrink-0">{currentPreviewIndex + 1}</span>
                                            <p className="text-foreground font-medium text-lg leading-relaxed">{previewQuestions[currentPreviewIndex].question_text}</p>
                                        </div>
                                        <div className="grid gap-3 mt-4">
                                            {previewQuestions[currentPreviewIndex].options.map((opt, optIdx) => (
                                                <div key={optIdx} className="p-4 bg-card rounded-xl text-foreground/80 border-2 border-transparent hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors cursor-default">
                                                    <span className="font-bold text-indigo-600 dark:text-indigo-400 mr-3">{String.fromCharCode(65 + optIdx)}.</span>{opt}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <button onClick={() => setCurrentPreviewIndex(Math.max(0, currentPreviewIndex - 1))} disabled={currentPreviewIndex === 0}
                                            className={cn("flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors",
                                                currentPreviewIndex === 0 ? "text-muted-foreground/30" : "text-muted-foreground hover:bg-muted"
                                            )}><ChevronLeft className="w-4 h-4" />Trước</button>
                                        <span className="text-sm text-muted-foreground">{currentPreviewIndex + 1} / {previewQuestions.length}</span>
                                        <button onClick={() => setCurrentPreviewIndex(Math.min(previewQuestions.length - 1, currentPreviewIndex + 1))} disabled={currentPreviewIndex === previewQuestions.length - 1}
                                            className={cn("flex items-center gap-1 px-4 py-2 rounded-lg font-medium transition-colors",
                                                currentPreviewIndex === previewQuestions.length - 1 ? "text-muted-foreground/30" : "text-muted-foreground hover:bg-muted"
                                            )}>Tiếp<ChevronRight className="w-4 h-4" /></button>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-border/50">
                                        <p className="text-xs text-muted-foreground mb-2 font-medium">Nhảy đến câu:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {previewQuestions.map((_, idx) => (
                                                <button key={idx} onClick={() => setCurrentPreviewIndex(idx)} className={cn(
                                                    "w-8 h-8 rounded-lg text-sm font-medium transition-colors",
                                                    idx === currentPreviewIndex ? "gradient-primary text-white shadow-md shadow-indigo-500/20" : "bg-muted/50 text-muted-foreground hover:bg-muted"
                                                )}>{idx + 1}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="border-t border-border/50 p-4 shrink-0 bg-muted/30">
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowAllQuestions(!showAllQuestions)}
                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-muted-foreground hover:bg-muted transition-colors text-sm font-medium">
                                    <ChevronDown className={cn("w-4 h-4 transition-transform", showAllQuestions && "rotate-180")} />
                                    {showAllQuestions ? "Xem từng câu" : "Xem tất cả"}
                                </button>
                                <div className="flex-1" />
                                <Button variant="outline" onClick={closePreview} className="border-border">Đóng</Button>
                                <Link href={`/student/exams/${previewExam.id}/take`}>
                                    <Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90">
                                        <Play className="w-4 h-4 mr-2" />Làm bài ngay
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
