"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Loader2, User, Mail, Award, BookOpen, Calendar } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PublicProfile {
    id: string
    full_name: string
    avatar_url?: string | null
    nickname?: string | null
    bio?: string | null
    role: "student" | "teacher"
    class?: string | null
    created_at: string
}

export default function PublicProfilePage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const userId = params.userId as string

    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<PublicProfile | null>(null)
    const [stats, setStats] = useState<any>(null)

    useEffect(() => {
        async function fetchProfile() {
            if (!userId) return

            // Get public profile info
            const { data: profileData, error } = await supabase
                .from("profiles")
                .select("id, full_name, avatar_url, nickname, bio, role, class, created_at")
                .eq("id", userId)
                .single()

            if (error || !profileData) {
                router.push("/")
                return
            }

            setProfile(profileData)

            // Get stats based on role
            if (profileData.role === "student") {
                const { data: statsData } = await supabase
                    .from("user_stats")
                    .select("*")
                    .eq("user_id", userId)
                    .single()

                setStats(statsData)
            } else if (profileData.role === "teacher") {
                const { data: exams } = await supabase
                    .from("exams")
                    .select("id, status")
                    .eq("teacher_id", userId)

                setStats({
                    totalExams: exams?.length || 0,
                    publishedExams: exams?.filter((e: { status: string }) => e.status === "published").length || 0
                })
            }

            setLoading(false)
        }

        fetchProfile()
    }, [userId, router, supabase])

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        )
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                        Không tìm thấy người dùng
                    </h1>
                    <Link href="/">
                        <Button>Quay lại trang chủ</Button>
                    </Link>
                </div>
            </div>
        )
    }

    const isStudent = profile.role === "student"
    const joinedDate = new Date(profile.created_at).toLocaleDateString("vi-VN", {
        month: "long",
        year: "numeric"
    })

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 py-8">
            <div className="max-w-4xl mx-auto px-4">
                {/* Back button */}
                <Link href="/" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại
                </Link>

                {/* Profile Card */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800 overflow-hidden">
                    {/* Header gradient */}
                    <div className={`h-32 bg-gradient-to-r ${isStudent ? "from-blue-500 to-purple-500" : "from-purple-500 to-blue-600"}`} />

                    {/* Profile content */}
                    <div className="px-6 pb-6">
                        <div className="flex flex-col md:flex-row gap-6 -mt-16 md:items-end">
                            {/* Avatar */}
                            <div className={`w-32 h-32 rounded-full border-4 border-white dark:border-slate-900 ${isStudent ? "bg-gradient-to-r from-blue-500 to-purple-500" : "bg-gradient-to-br from-purple-500 to-blue-600"} flex items-center justify-center text-5xl font-bold text-white shadow-lg overflow-hidden`}>
                                {profile.avatar_url ? (
                                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                ) : (
                                    profile.full_name.charAt(0).toUpperCase()
                                )}
                            </div>

                            {/* Name and role */}
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                    {profile.full_name}
                                </h1>
                                {profile.nickname && (
                                    <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                                        @{profile.nickname}
                                    </p>
                                )}
                                <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${isStudent ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"}`}>
                                        <User className="w-3 h-3" />
                                        {isStudent ? "Học sinh" : "Giáo viên"}
                                    </span>
                                    {isStudent && profile.class && (
                                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300">
                                            <BookOpen className="w-3 h-3" />
                                            Lớp {profile.class}
                                        </span>
                                    )}
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-slate-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300">
                                        <Calendar className="w-3 h-3" />
                                        Tham gia {joinedDate}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Bio */}
                        {profile.bio && (
                            <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Giới thiệu
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400">
                                    {profile.bio}
                                </p>
                            </div>
                        )}

                        {/* Stats */}
                        {stats && (
                            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {isStudent ? (
                                    <>
                                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                                {stats.total_xp || 0}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                Tổng XP
                                            </div>
                                        </div>
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {stats.streak_days || 0}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                Ngày streak
                                            </div>
                                        </div>
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                {stats.correct_answers || 0}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                Câu đúng
                                            </div>
                                        </div>
                                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-center">
                                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                                {stats.total_questions || 0}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                Tổng câu hỏi
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                                {stats.totalExams || 0}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                Tổng đề thi
                                            </div>
                                        </div>
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                                {stats.publishedExams || 0}
                                            </div>
                                            <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                Đã xuất bản
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
