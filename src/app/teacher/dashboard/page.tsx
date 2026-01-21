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
    Swords
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SUBJECTS, getSubjectInfo } from "@/lib/subjects"
import { UserMenu } from "@/components/UserMenu"
import { TeacherBottomNav } from "@/components/BottomNav"

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
    subject?: string  // Môn học
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
    const [selectedSubject, setSelectedSubject] = useState<string>("all")  // Filter theo môn

    // Filter exams by subject
    const filteredExams = selectedSubject === "all"
        ? exams
        : exams.filter(e => e.subject === selectedSubject)

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
                setStats({
                    totalExams: examsData.length,
                    publishedExams: examsData.filter((e: { status: string }) => e.status === "published").length,
                    totalSubmissions: 0 // Will be fetched separately
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 border-r border-slate-700/50 bg-slate-900/80 backdrop-blur-sm p-6 hidden lg:block">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-white">ExamHub</span>
                </div>

                <nav className="space-y-2">
                    <Link
                        href="/teacher/dashboard"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <Link
                        href="/teacher/exams/create"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Tạo đề mới
                    </Link>
                    <Link
                        href="/teacher/profile"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors"
                    >
                        <Users className="w-5 h-5" />
                        Hồ sơ của tôi
                    </Link>
                    <Link
                        href="/teacher/exam-bank"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                    >
                        <BookOpen className="w-5 h-5" />
                        Ngân hàng ĐT
                    </Link>
                    <Link
                        href="/teacher/arena"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-purple-400 hover:bg-purple-500/10 transition-colors"
                    >
                        <Swords className="w-5 h-5" />
                        Đấu trường
                    </Link>
                    <Link
                        href="/teacher/analytics"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Thống kê
                    </Link>
                </nav>

                <div className="absolute bottom-6 left-6 right-6">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:bg-slate-800 transition-colors w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header - Only visible on mobile */}
            <header className="lg:hidden sticky top-0 z-50 border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/80 px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-lg font-bold text-white">ExamHub</span>
                    </div>
                    <UserMenu
                        userName={profile?.full_name || ""}
                        userClass="Giáo viên"
                        onLogout={handleLogout}
                        role="teacher"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="lg:ml-64 p-4 lg:p-8 pb-20 lg:pb-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            Xin chào, {profile?.full_name || "Giáo viên"}!
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Quản lý đề thi và xem thống kê
                        </p>
                    </div>
                    <Link href="/teacher/exams/create">
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                            <Plus className="w-4 h-4 mr-2" />
                            Tạo đề thi mới
                        </Button>
                    </Link>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {[
                        {
                            label: "Tổng đề thi",
                            value: stats.totalExams,
                            icon: FileText,
                            color: "from-blue-500 to-cyan-500"
                        },
                        {
                            label: "Đã publish",
                            value: stats.publishedExams,
                            icon: CheckCircle,
                            color: "from-green-500 to-emerald-500"
                        },
                        {
                            label: "Lượt làm bài",
                            value: stats.totalSubmissions,
                            icon: Users,
                            color: "from-purple-500 to-pink-500"
                        },
                    ].map((stat, index) => (
                        <Card key={index} className="border-slate-700 bg-slate-800/50">
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-slate-400 text-sm">{stat.label}</p>
                                        <p className="text-3xl font-bold text-white mt-1">{stat.value}</p>
                                    </div>
                                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                                        <stat.icon className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Quick Links - Kho tài liệu & Phòng Live */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Link href="/resources">
                        <Card className="border-slate-700 bg-gradient-to-br from-purple-900/50 to-pink-900/50 hover:border-purple-500 transition-all cursor-pointer">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl">
                                    📚
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white">Kho Tài Liệu & Đề</p>
                                    <p className="text-slate-400 text-sm">Upload & quản lý tài liệu</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/live">
                        <Card className="border-slate-700 bg-gradient-to-br from-green-900/50 to-emerald-900/50 hover:border-green-500 transition-all cursor-pointer">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-2xl">
                                    📺
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white">Phòng Live Chữa Đề</p>
                                    <p className="text-slate-400 text-sm">Quản lý lịch & Google Meet</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Exams List */}
                <Card className="border-slate-700 bg-slate-800/50">
                    <CardHeader>
                        <CardTitle className="text-white">Danh sách đề thi</CardTitle>
                        <CardDescription className="text-slate-400">
                            Quản lý tất cả đề thi của bạn
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Subject Filter Tabs */}
                        {exams.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-slate-700">
                                <button
                                    onClick={() => setSelectedSubject("all")}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                        selectedSubject === "all"
                                            ? "bg-blue-500 text-white"
                                            : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                    )}
                                >
                                    📚 Tất cả ({exams.length})
                                </button>
                                {SUBJECTS.filter(s => exams.some(e => e.subject === s.value)).map((s) => {
                                    const count = exams.filter(e => e.subject === s.value).length
                                    return (
                                        <button
                                            key={s.value}
                                            onClick={() => setSelectedSubject(s.value)}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                                                selectedSubject === s.value
                                                    ? `bg-gradient-to-r ${s.color} text-white`
                                                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                            )}
                                        >
                                            {s.icon} {s.label} ({count})
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {filteredExams.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-400 mb-4">{exams.length === 0 ? "Chưa có đề thi nào" : "Không có đề thi nào trong môn này"}</p>
                                {exams.length === 0 && (
                                    <Link href="/teacher/exams/create">
                                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Tạo đề thi đầu tiên
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredExams.map((exam) => {
                                    const subjectInfo = getSubjectInfo(exam.subject || "other")
                                    return (
                                        <div
                                            key={exam.id}
                                            className="flex items-center justify-between p-4 rounded-lg bg-slate-700/30 border border-slate-700 hover:border-slate-600 transition-colors"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                                                    `bg-gradient-to-br ${subjectInfo.color}`
                                                )}>
                                                    {subjectInfo.icon}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-white">{exam.title}</h3>
                                                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                                        <span className="text-xs">{subjectInfo.label}</span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {exam.duration} phút
                                                        </span>
                                                        <span>{exam.total_questions} câu</span>
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-xs",
                                                            exam.status === "published"
                                                                ? "bg-green-500/10 text-green-400"
                                                                : "bg-yellow-500/10 text-yellow-400"
                                                        )}>
                                                            {exam.status === "published" ? "Đã publish" : "Nháp"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Link href={`/teacher/exams/${exam.id}/scores`}>
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-green-400" title="Xem điểm">
                                                        <Users className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleToggleStatus(exam)}
                                                    className="text-slate-400 hover:text-white"
                                                    title={exam.status === "published" ? "Ẩn" : "Publish"}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Link href={`/teacher/exams/${exam.id}/edit`}>
                                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteExam(exam.id)}
                                                    className="text-slate-400 hover:text-red-400"
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

            {/* Mobile Bottom Navigation */}
            <TeacherBottomNav />
        </div>
    )
}
