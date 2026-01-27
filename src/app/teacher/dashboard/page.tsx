"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    GraduationCap,
    Plus,
    FileText,
    Users,
    BarChart3,
    LogOut,
    Clock,
    CheckCircle,
    Eye,
    Edit,
    Trash2,
    Loader2,
    BookOpen,
    Swords,
    Search,
    Filter
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"
import { NotificationBell } from "@/components/NotificationBell"
import { StatsCard, FilterBar } from "@/components/teacher"
import { STAT_COLORS } from "@/lib/teacher-styles"

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

    // Filter exams by subject and search
    const filteredExams = exams.filter(e => {
        const matchSubject = selectedSubject === "all" || e.subject === selectedSubject
        const matchSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase())
        return matchSubject && matchSearch
    })

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push("/login")
                return
            }

            // Get profile
            const { data: profileData } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()

            if (!profileData || profileData.role !== "teacher") {
                router.push("/student/dashboard")
                return
            }

            setProfile(profileData)

            // Get exams
            const { data: examsData } = await supabase
                .from("exams")
                .select("*")
                .eq("teacher_id", user.id)
                .order("created_at", { ascending: false })

            if (examsData) {
                setExams(examsData)

                // Get submission counts
                // This would ideally be a separate query or join, but for now we'll mock or fetch later
                // For simplicity in this UI refactor, we just count exams

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
        if (!confirm("Bạn có chắc muốn xóa đề thi này?")) return

        await supabase.from("exams").delete().eq("id", examId)
        setExams(exams.filter(e => e.id !== examId))
    }

    const handleToggleStatus = async (exam: Exam) => {
        const newStatus = exam.status === "published" ? "draft" : "published"
        await supabase
            .from("exams")
            .update({ status: newStatus })
            .eq("id", exam.id)

        setExams(exams.map(e =>
            e.id === exam.id ? { ...e, status: newStatus } : e
        ))
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 hidden lg:block z-50">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">ExamHub</span>
                </div>

                <nav className="space-y-1">
                    <Link
                        href="/teacher/dashboard"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Tổng quan
                    </Link>
                    <Link
                        href="/teacher/exams/create"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Tạo đề mới
                    </Link>
                    <div className="pt-4 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quản lý</p>
                    </div>
                    <Link
                        href="/teacher/profile"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Users className="w-5 h-5" />
                        Hồ sơ giáo viên
                    </Link>
                    <Link
                        href="/teacher/exam-bank"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BookOpen className="w-5 h-5" />
                        Ngân hàng đề
                    </Link>
                    <Link
                        href="/teacher/arena"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Swords className="w-5 h-5" />
                        Đấu trường
                    </Link>
                    <Link
                        href="/teacher/analytics"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Thống kê chi tiết
                    </Link>
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
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                            Xin chào, {profile?.full_name || "Thầy/Cô"}! 👋
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">Quản lý đề thi và theo dõi kết quả học sinh</p>
                    </div>
                    <div className="flex items-center gap-4">
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
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">
                        Xin chào, {profile?.full_name?.split(" ").pop()}! 👋
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                        Quản lý lớp học và đề thi của bạn.
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <StatsCard
                        label="Tổng đề thi"
                        value={stats.totalExams}
                        icon={FileText}
                        iconColor={STAT_COLORS.blue.icon}
                        iconBgColor={STAT_COLORS.blue.bg}
                    />
                    <StatsCard
                        label="Đang hoạt động"
                        value={stats.publishedExams}
                        icon={CheckCircle}
                        iconColor={STAT_COLORS.green.icon}
                        iconBgColor={STAT_COLORS.green.bg}
                    />
                    <StatsCard
                        label="Lượt làm bài"
                        value={stats.totalSubmissions}
                        icon={Users}
                        iconColor={STAT_COLORS.purple.icon}
                        iconBgColor={STAT_COLORS.purple.bg}
                    />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <Link href="/teacher/exams/create" className="group">
                        <Card className="border-dashed border-2 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all cursor-pointer h-full flex items-center justify-center p-6">
                            <div className="text-center">
                                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800 transition-colors">
                                    <Plus className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <h3 className="font-semibold text-gray-800 dark:text-white">Tạo đề thi mới</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Soạn từ ngân hàng hoặc tạo mới</p>
                            </div>
                        </Card>
                    </Link>

                    <Link href="/resources" className="group">
                        <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:shadow-md transition-all cursor-pointer h-full">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                    <BookOpen className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">Kho Tài Liệu</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Quản lý file và bài giảng</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/live" className="group">
                        <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:shadow-md transition-all cursor-pointer h-full">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <Users className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Phòng Live</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Tổ chức chữa đề online</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Exams List */}
                <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-800 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Danh sách đề thi gần đây</CardTitle>
                                <CardDescription className="text-gray-500 dark:text-gray-400">Quản lý và theo dõi trạng thái các đề thi</CardDescription>
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
                            <div className="text-center py-16 px-4">
                                <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                                </div>
                                <h3 className="text-gray-800 dark:text-white font-medium mb-1">Không tìm thấy đề thi</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Thử thay đổi bộ lọc hoặc tạo đề thi mới</p>
                                <Link href="/teacher/exams/create">
                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        <Plus className="w-4 h-4 mr-2" />
                                        Tạo đề thi ngay
                                    </Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-800">
                                {filteredExams.map((exam) => {
                                    const subjectInfo = getSubjectInfo(exam.subject || "other")
                                    return (
                                        <div
                                            key={exam.id}
                                            className="group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors gap-4"
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-xl flex shrink-0 items-center justify-center text-xl shadow-sm",
                                                    `bg-gradient-to-br ${subjectInfo.color.replace('text-', '').replace('from-', 'from-').replace('to-', 'to-')}`
                                                )}>
                                                    <span className="text-2xl">{subjectInfo.icon}</span>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-semibold text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {exam.title}
                                                        </h3>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                                            exam.status === "published"
                                                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                                : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                                        )}>
                                                            {exam.status === "published" ? "Đã phát hành" : "Nháp"}
                                                        </span>
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
                                                <Link href={`/teacher/exams/${exam.id}/scores`}>
                                                    <Button variant="ghost" size="sm" className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                        <Users className="w-4 h-4 mr-2" />
                                                        Kết quả
                                                    </Button>
                                                </Link>
                                                <div className="h-4 w-px bg-gray-200 dark:bg-slate-700 mx-1"></div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleToggleStatus(exam)}
                                                    className="text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                                    title={exam.status === "published" ? "Ẩn đề thi" : "Phát hành"}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Link href={`/teacher/exams/${exam.id}/edit`}>
                                                    <Button variant="ghost" size="icon" className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteExam(exam.id)}
                                                    className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
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
            <TeacherBottomNav />
        </div>
    )
}
