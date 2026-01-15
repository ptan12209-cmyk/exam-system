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
                const published = exams.filter(e => e.status === "published").length
                setStats({
                    totalExams: exams.length,
                    publishedExams: published,
                    draftExams: exams.length - published,
                    totalSubmissions: 0
                })
                setRecentExams(exams.slice(0, 5))

                // Count total submissions
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/teacher/dashboard">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Hồ sơ giáo viên</h1>
                </div>

                {/* Profile Header Card */}
                <Card className="border-slate-700 bg-gradient-to-br from-slate-800/80 to-slate-800/50 mb-6">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-6">
                            {/* Avatar */}
                            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-3xl font-bold text-white">
                                {profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : "?"}
                            </div>

                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-white mb-1">
                                    {profile?.full_name || "Giáo viên"}
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    {profile?.email}
                                </p>
                                <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
                                    👨‍🏫 Giáo viên
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="pt-4 text-center">
                            <FileText className="w-6 h-6 mx-auto mb-2 text-blue-400" />
                            <div className="text-2xl font-bold text-white">
                                {stats.totalExams}
                            </div>
                            <div className="text-xs text-slate-400">Tổng đề thi</div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="pt-4 text-center">
                            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-400" />
                            <div className="text-2xl font-bold text-white">
                                {stats.publishedExams}
                            </div>
                            <div className="text-xs text-slate-400">Đã publish</div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="pt-4 text-center">
                            <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
                            <div className="text-2xl font-bold text-white">
                                {stats.draftExams}
                            </div>
                            <div className="text-xs text-slate-400">Bản nháp</div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-700 bg-slate-800/50">
                        <CardContent className="pt-4 text-center">
                            <Users className="w-6 h-6 mx-auto mb-2 text-purple-400" />
                            <div className="text-2xl font-bold text-white">
                                {stats.totalSubmissions}
                            </div>
                            <div className="text-xs text-slate-400">Lượt làm bài</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recent Exams */}
                <Card className="border-slate-700 bg-slate-800/50 mb-6">
                    <CardHeader>
                        <CardTitle className="text-white flex items-center gap-2">
                            <BarChart3 className="w-5 h-5 text-blue-500" />
                            Đề thi gần đây
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentExams.length > 0 ? (
                            <div className="space-y-3">
                                {recentExams.map((exam) => (
                                    <Link
                                        key={exam.id}
                                        href={`/teacher/exams/${exam.id}/scores`}
                                        className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-700 hover:border-blue-500/50 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${exam.status === "published"
                                                    ? "bg-green-500/10 text-green-400"
                                                    : "bg-yellow-500/10 text-yellow-400"
                                                }`}>
                                                {exam.status === "published" ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{exam.title}</p>
                                                <p className="text-xs text-slate-400">
                                                    {new Date(exam.created_at).toLocaleDateString("vi-VN")}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${exam.status === "published"
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-yellow-500/20 text-yellow-400"
                                            }`}>
                                            {exam.status === "published" ? "Đã publish" : "Bản nháp"}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 py-8">
                                Chưa có đề thi nào. <Link href="/teacher/exams/create" className="text-blue-400 hover:underline">Tạo đề đầu tiên →</Link>
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link href="/teacher/exams/create">
                        <Card className="border-slate-700 bg-gradient-to-br from-blue-900/50 to-purple-900/50 hover:border-blue-500 transition-all cursor-pointer">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-xl">
                                    ➕
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white">Tạo đề thi mới</p>
                                    <p className="text-slate-400 text-sm">Upload PDF và nhập đáp án</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link href="/resources/upload">
                        <Card className="border-slate-700 bg-gradient-to-br from-purple-900/50 to-pink-900/50 hover:border-purple-500 transition-all cursor-pointer">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xl">
                                    📤
                                </div>
                                <div>
                                    <p className="text-lg font-bold text-white">Upload tài liệu</p>
                                    <p className="text-slate-400 text-sm">Chia sẻ tài liệu cho nhóm</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>
        </div>
    )
}
