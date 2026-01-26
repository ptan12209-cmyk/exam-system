"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ArrowLeft,
    FileText,
    Users,
    CheckCircle,
    Clock,
    BarChart3,
    Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfileData {
    full_name: string | null
    email: string | null
}

interface ExamStats {
    totalExams: number
    publishedExams: number
    draftExams: number
    totalSubmissions: number
}

export default function TeacherProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<ProfileData | null>(null)
    const [stats, setStats] = useState<ExamStats>({
        totalExams: 0,
        publishedExams: 0,
        draftExams: 0,
        totalSubmissions: 0
    })
    const [recentExams, setRecentExams] = useState<{ id: string; title: string; status: string; created_at: string }[]>([])

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
                .select("full_name")
                .eq("id", user.id)
                .single()

            setProfile({
                full_name: profileData?.full_name || null,
                email: user.email || null
            })

            // Get exams
            const { data: exams } = await supabase
                .from("exams")
                .select("id, title, status, created_at")
                .eq("teacher_id", user.id)
                .order("created_at", { ascending: false })

            if (exams) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const published = exams.filter((e: any) => e.status === "published").length
                setStats({
                    totalExams: exams.length,
                    publishedExams: published,
                    draftExams: exams.length - published,
                    totalSubmissions: 0
                })
                setRecentExams(exams.slice(0, 5))

                // Count total submissions
                // Optimized: Fetch all submissions count in one query instead of looping
                const examIds = exams.map((e) => e.id)
                let totalSubs = 0

                if (examIds.length > 0) {
                    const { count } = await supabase
                        .from("submissions")
                        .select("*", { count: "exact", head: true })
                        .in("exam_id", examIds)

                    totalSubs = count || 0
                }
                setStats(prev => ({ ...prev, totalSubmissions: totalSubs }))
            }

            setLoading(false)
        }

        fetchData()
    }, [router, supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/teacher/dashboard">
                        <Button variant="ghost" size="icon" className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Hồ sơ giáo viên</h1>
                </div>

                {/* Profile Header Card */}
                <Card className="border-gray-200 bg-white shadow-sm mb-6 overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                    <CardContent className="pt-0 relative z-10">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-10 md:pl-6">
                            {/* Avatar */}
                            <div className="w-24 h-24 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-4xl font-bold text-gray-400 shadow-md">
                                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}
                            </div>

                            <div className="flex-1 text-center md:text-left mb-4">
                                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                                    {profile?.full_name || "Giáo viên"}
                                </h2>
                                <p className="text-gray-500 text-sm mb-2">
                                    {profile?.email}
                                </p>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold border border-blue-100">
                                    <Users className="w-3 h-3" />
                                    Giảng viên chính thức
                                </div>
                            </div>

                            <div className="mb-6 md:pr-6">
                                <Button className="bg-white border text-gray-700 hover:bg-gray-50">
                                    Chỉnh sửa hồ sơ
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-gray-200 bg-white shadow-sm">
                        <CardContent className="pt-6 text-center">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3 text-blue-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="text-2xl font-bold text-gray-800">
                                {stats.totalExams}
                            </div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tổng đề thi</div>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 bg-white shadow-sm">
                        <CardContent className="pt-6 text-center">
                            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3 text-green-600">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <div className="text-2xl font-bold text-gray-800">
                                {stats.publishedExams}
                            </div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Đã phát hành</div>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 bg-white shadow-sm">
                        <CardContent className="pt-6 text-center">
                            <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center mx-auto mb-3 text-yellow-600">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="text-2xl font-bold text-gray-800">
                                {stats.draftExams}
                            </div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Bản nháp</div>
                        </CardContent>
                    </Card>

                    <Card className="border-gray-200 bg-white shadow-sm">
                        <CardContent className="pt-6 text-center">
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3 text-purple-600">
                                <Users className="w-5 h-5" />
                            </div>
                            <div className="text-2xl font-bold text-gray-800">
                                {stats.totalSubmissions}
                            </div>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Lượt làm bài</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Activity */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Recent Exams List */}
                    <Card className="border-gray-200 bg-white shadow-sm md:col-span-2">
                        <CardHeader className="border-b border-gray-50 bg-gray-50/50">
                            <CardTitle className="text-gray-800 flex items-center gap-2 text-base">
                                <BarChart3 className="w-5 h-5 text-blue-600" />
                                Đề thi gần đây
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {recentExams.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {recentExams.map((exam) => (
                                        <Link
                                            key={exam.id}
                                            href={`/teacher/exams/${exam.id}/scores`}
                                            className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-10 h-10 rounded-lg flex items-center justify-center border",
                                                    exam.status === "published"
                                                        ? "bg-green-50 text-green-600 border-green-100"
                                                        : "bg-yellow-50 text-yellow-600 border-yellow-100"
                                                )}>
                                                    {exam.status === "published" ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-800 group-hover:text-blue-600 transition-colors">{exam.title}</p>
                                                    <p className="text-xs text-gray-400">
                                                        {new Date(exam.created_at).toLocaleDateString("vi-VN")}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={cn(
                                                "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                exam.status === "published"
                                                    ? "bg-green-50 text-green-700 border-green-200"
                                                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                            )}>
                                                {exam.status === "published" ? "Đã phát hành" : "Bản nháp"}
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 px-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FileText className="w-6 h-6 text-gray-300" />
                                    </div>
                                    <p className="text-gray-500 mb-4">Chưa có đề thi nào.</p>
                                    <Link href="/teacher/exams/create">
                                        <Button variant="outline" size="sm">Tạo đề đầu tiên</Button>
                                    </Link>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
