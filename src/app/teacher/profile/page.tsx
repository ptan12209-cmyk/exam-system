"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    FileText,
    Users,
    CheckCircle,
    Clock,
    BarChart3,
    Loader2
} from "lucide-react"
import { PageHeader, PageContainer, StatsCard } from "@/components/teacher"
import { STAT_COLORS } from "@/lib/teacher-styles"
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
                // This is a naive loop, but fine for now as per original code logic
                let totalSubs = 0
                for (const exam of exams) {
                    const { count } = await supabase
                        .from("submissions")
                        .select("*", { count: "exact", head: true })
                        .eq("exam_id", exam.id)
                    totalSubs += count || 0
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
        <PageContainer maxWidth="4xl">
            <PageHeader title="Hồ sơ giáo viên" />

            {/* Profile Header Card */}
            <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm mb-6 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                <CardContent className="pt-0 relative z-10">
                    <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-10 md:pl-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-4xl font-bold text-gray-400 dark:text-gray-500 shadow-md">
                            {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}
                        </div>

                        <div className="flex-1 text-center md:text-left mb-4">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                                {profile?.full_name || "Giáo viên"}
                            </h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                                {profile?.email}
                            </p>
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold border border-blue-100 dark:border-blue-900">
                                <Users className="w-3 h-3" />
                                Giảng viên chính thức
                            </div>
                        </div>

                        <div className="mb-6 md:pr-6">
                            <Button className="bg-white dark:bg-slate-800 border dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700">
                                Chỉnh sửa hồ sơ
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatsCard
                    label="Tổng đề thi"
                    value={stats.totalExams}
                    icon={FileText}
                    iconColor={STAT_COLORS.blue.icon}
                    iconBgColor={STAT_COLORS.blue.bg}
                />
                <StatsCard
                    label="Đã phát hành"
                    value={stats.publishedExams}
                    icon={CheckCircle}
                    iconColor={STAT_COLORS.green.icon}
                    iconBgColor={STAT_COLORS.green.bg}
                />
                <StatsCard
                    label="Bản nháp"
                    value={stats.draftExams}
                    icon={Clock}
                    iconColor={STAT_COLORS.yellow.icon}
                    iconBgColor={STAT_COLORS.yellow.bg}
                />
                <StatsCard
                    label="Lượt làm bài"
                    value={stats.totalSubmissions}
                    icon={Users}
                    iconColor={STAT_COLORS.purple.icon}
                    iconBgColor={STAT_COLORS.purple.bg}
                />
            </div>

            {/* Recent Activity */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Exams List */}
                <Card className="border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm md:col-span-2">
                    <CardHeader className="border-b border-gray-50 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                        <CardTitle className="text-gray-800 dark:text-white flex items-center gap-2 text-base">
                            <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                                        className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center border",
                                                exam.status === "published"
                                                    ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900"
                                                    : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-900"
                                            )}>
                                                {exam.status === "published" ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{exam.title}</p>
                                                <p className="text-xs text-gray-400">
                                                    {new Date(exam.created_at).toLocaleDateString("vi-VN")}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                            exam.status === "published"
                                                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800"
                                                : "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800"
                                        )}>
                                            {exam.status === "published" ? "Đã phát hành" : "Bản nháp"}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 px-4">
                                <div className="w-12 h-12 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FileText className="w-6 h-6 text-gray-300 dark:text-gray-500" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 mb-4">Chưa có đề thi nào.</p>
                                <Link href="/teacher/exams/create">
                                    <Button variant="outline" size="sm">Tạo đề đầu tiên</Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    )
}
