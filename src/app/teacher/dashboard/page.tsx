"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
    GraduationCap,
    Plus,
    FileText,
    Users,
    BarChart3,
    Clock,
    CheckCircle,
    Eye,
    Edit,
    Trash2,
    Loader2,
    BookOpen,
    Swords,
    ArrowRight,
    ChevronRight,
    LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { StatsCard, FilterBar } from "@/components/shared"
import { STAT_COLORS } from "@/lib/shared-styles"

interface Profile {
    id: string
    role: string
    full_name: string | null
}

interface Exam {
    id: string
    title: string
    duration: number
    total_questions: number
    status: "draft" | "published"
    created_at: string
    submission_count?: number
    subject?: string
}

export default function TeacherDashboard() {
    const router = useRouter()
    const supabase = createClient()

    const [profile, setProfile] = useState<Profile | null>(null)
    const [exams, setExams] = useState<Exam[]>([])
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalExams: 0,
        publishedExams: 0,
        totalSubmissions: 0
    })
    const [selectedSubject, setSelectedSubject] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")

    const filteredExams = exams.filter(e => {
        const matchSubject = selectedSubject === "all" || e.subject === selectedSubject
        const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase())
        return matchSubject && matchSearch
    })

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) { router.push("/login"); return }

            const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
            if (!profileData || profileData.role !== "teacher") { router.push("/student/dashboard"); return }

            setProfile(profileData)

            const { data: examsData } = await supabase
                .from("exams")
                .select("*")
                .eq("teacher_id", user.id)
                .order("created_at", { ascending: false })

            if (examsData) {
                setExams(examsData)
                setStats({
                    totalExams: examsData.length,
                    publishedExams: examsData.filter((e: { status: string }) => e.status === "published").length,
                    totalSubmissions: 0
                })
            }

            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const handleDeleteExam = async (examId: string) => {
        const examToDelete = exams.find(e => e.id === examId)
        if (!confirm(`Bạn có chắc muốn xóa đề thi "${examToDelete?.title}"?`)) return

        try {
            // Notify students who submitted
            const { data: submissions } = await supabase
                .from("submissions")
                .select("student_id")
                .eq("exam_id", examId)

            if (submissions && submissions.length > 0) {
                const studentIds = [...new Set(submissions.map((s: { student_id: string }) => s.student_id))]
                const notifications = studentIds.map(studentId => ({
                    user_id: studentId,
                    type: "exam_deleted",
                    title: "Đề thi đã bị xóa",
                    message: `Đề thi "${examToDelete?.title}" đã bị giáo viên xóa khỏi hệ thống.`,
                    is_read: false
                }))
                await supabase.from("notifications").insert(notifications)
            }

            // Delete child records first (in case ON DELETE CASCADE is missing)
            await supabase.from("exam_participants").delete().eq("exam_id", examId)
            await supabase.from("exam_sessions").delete().eq("exam_id", examId)
            await supabase.from("submission_audit_log").delete().eq("exam_id", examId)
            await supabase.from("submissions").delete().eq("exam_id", examId)

            // Now delete the exam
            const { error } = await supabase.from("exams").delete().eq("id", examId)
            if (error) throw error

            setExams(exams.filter(e => e.id !== examId))
        } catch (err) {
            console.error("Delete exam error:", err)
            alert("Lỗi xóa đề thi: " + (err as Error).message)
        }
    }

    const handleToggleStatus = async (exam: Exam) => {
        const newStatus = exam.status === "published" ? "draft" : "published"
        await supabase.from("exams").update({ status: newStatus }).eq("id", exam.id)
        setExams(exams.map(e => e.id === exam.id ? { ...e, status: newStatus } : e))
    }

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
        { href: "/teacher/dashboard", label: "Tổng quan", icon: BarChart3, active: true },
        { href: "/teacher/exams/create", label: "Tạo đề mới", icon: Plus },
    ]
    const MANAGE_ITEMS = [
        { href: "/teacher/profile", label: "Hồ sơ giáo viên", icon: Users },
        { href: "/teacher/exam-bank", label: "Ngân hàng đề", icon: BookOpen },
        { href: "/teacher/arena", label: "Đấu trường", icon: Swords },
        { href: "/teacher/analytics", label: "Thống kê chi tiết", icon: BarChart3 },
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
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Quản lý</p>
                    </div>

                    {MANAGE_ITEMS.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 group"
                        >
                            <item.icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                            <span className="text-sm">{item.label}</span>
                        </Link>
                    ))}
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
                        userClass="Giáo viên"
                        onLogout={handleLogout}
                        role="teacher"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            Xin chào, {profile?.full_name || "Thầy/Cô"}! 👋
                        </h1>
                        <p className="text-muted-foreground">Quản lý đề thi và theo dõi kết quả học sinh</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu
                            userName={profile?.full_name || ""}
                            userClass="Giáo viên"
                            onLogout={handleLogout}
                            role="teacher"
                        />
                    </div>
                </div>

                {/* Mobile Title */}
                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-foreground">
                        Xin chào, {profile?.full_name?.split(" ").pop()}! 👋
                    </h1>
                    <p className="text-muted-foreground text-sm">Quản lý lớp học và đề thi của bạn.</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <StatsCard label="Tổng đề thi" value={stats.totalExams} icon={FileText} iconColor={STAT_COLORS.blue.icon} iconBgColor={STAT_COLORS.blue.bg} />
                    <StatsCard label="Đang hoạt động" value={stats.publishedExams} icon={CheckCircle} iconColor={STAT_COLORS.green.icon} iconBgColor={STAT_COLORS.green.bg} />
                    <StatsCard label="Lượt làm bài" value={stats.totalSubmissions} icon={Users} iconColor={STAT_COLORS.purple.icon} iconBgColor={STAT_COLORS.purple.bg} />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <Link href="/teacher/exams/create" className="group">
                        <div className="card-interactive border-dashed border-2 flex items-center justify-center p-6 h-full">
                            <div className="text-center">
                                <div className="w-12 h-12 gradient-primary-soft rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                    <Plus className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="font-semibold text-foreground">Tạo đề thi mới</h3>
                                <p className="text-sm text-muted-foreground mt-1">Soạn từ ngân hàng hoặc tạo mới</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/resources" className="group">
                        <div className="card-interactive p-6 flex items-center gap-4 h-full">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <BookOpen className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Kho Tài Liệu</h3>
                                <p className="text-sm text-muted-foreground">Quản lý file và bài giảng</p>
                            </div>
                        </div>
                    </Link>

                    <Link href="/live" className="group">
                        <div className="card-interactive p-6 flex items-center gap-4 h-full">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                                <Users className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">Phòng Live</h3>
                                <p className="text-sm text-muted-foreground">Tổ chức chữa đề online</p>
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Exams List */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-bold text-foreground">Danh sách đề thi gần đây</h2>
                                <p className="text-muted-foreground text-sm">Quản lý và theo dõi trạng thái các đề thi</p>
                            </div>
                            <FilterBar
                                searchValue={searchQuery}
                                onSearchChange={setSearchQuery}
                                searchPlaceholder="Tìm kiếm đề thi..."
                                className="w-full md:w-auto"
                            />
                        </div>
                    </div>

                    {/* Subject Filter */}
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
                        {SUBJECTS.filter(s => exams.some(e => e.subject === s.value)).map((s) => (
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
                            <p className="text-muted-foreground text-sm mb-6">Thử thay đổi bộ lọc hoặc tạo đề thi mới</p>
                            <Link href="/teacher/exams/create">
                                <Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Tạo đề thi ngay
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="divide-y divide-border/30">
                            {filteredExams.map((exam) => {
                                const subjectInfo = getSubjectInfo(exam.subject || "other")
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
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                                        exam.status === "published"
                                                            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                                                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                                                    )}>
                                                        {exam.status === "published" ? "Đã phát hành" : "Nháp"}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                                                    <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{subjectInfo.label}</span>
                                                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{exam.duration} phút</span>
                                                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{exam.total_questions} câu</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 self-end md:self-auto">
                                            <Link href={`/teacher/exams/${exam.id}/scores`}>
                                                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400">
                                                    <Users className="w-4 h-4 mr-1.5" />
                                                    Kết quả
                                                </Button>
                                            </Link>
                                            <div className="h-4 w-px bg-border/50 mx-0.5" />
                                            <Button variant="ghost" size="icon" onClick={() => handleToggleStatus(exam)} className="text-muted-foreground hover:text-foreground" title={exam.status === "published" ? "Ẩn đề thi" : "Phát hành"}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Link href={`/teacher/exams/${exam.id}/edit`}>
                                                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-400">
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteExam(exam.id)} className="text-muted-foreground hover:text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>

            <TeacherBottomNav />
        </div>
    )
}
