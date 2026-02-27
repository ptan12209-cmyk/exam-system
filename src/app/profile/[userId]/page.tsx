"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Loader2, User, BookOpen, Calendar } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface PublicProfile {
    id: string; full_name: string; avatar_url?: string | null; nickname?: string | null;
    bio?: string | null; role: "student" | "teacher"; class?: string | null; created_at: string;
}

export default function PublicProfilePage() {
    const params = useParams()
    const router = useRouter()
    const supabase = createClient()
    const userId = params.userId as string
    const [loading, setLoading] = useState(true)
    const [profile, setProfile] = useState<PublicProfile | null>(null)
    const [stats, setStats] = useState<{ total_xp?: number, streak_days?: number, correct_answers?: number, total_questions?: number, totalExams?: number, publishedExams?: number } | null>(null)

    useEffect(() => {
        async function fetchProfile() {
            if (!userId) return
            const { data: profileData, error } = await supabase.from("profiles").select("id, full_name, avatar_url, nickname, bio, role, class, created_at").eq("id", userId).single()
            if (error || !profileData) { router.push("/"); return }
            setProfile(profileData)
            if (profileData.role === "student") {
                const { data: statsData } = await supabase.from("user_stats").select("*").eq("user_id", userId).single()
                setStats(statsData)
            } else if (profileData.role === "teacher") {
                const { data: exams } = await supabase.from("exams").select("id, status").eq("teacher_id", userId)
                setStats({ totalExams: exams?.length || 0, publishedExams: exams?.filter((e: { status: string }) => e.status === "published").length || 0 })
            }
            setLoading(false)
        }
        fetchProfile()
    }, [userId, router, supabase])

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin" /></div>
    if (!profile) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold text-foreground mb-4">Không tìm thấy người dùng</h1><Link href="/"><Button className="gradient-primary text-white border-0">Quay lại trang chủ</Button></Link></div></div>

    const isStudent = profile.role === "student"
    const joinedDate = new Date(profile.created_at).toLocaleDateString("vi-VN", { month: "long", year: "numeric" })

    return (
        <div className="min-h-screen bg-background py-8">
            <div className="max-w-4xl mx-auto px-4">
                <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors"><ArrowLeft className="w-4 h-4 mr-2" />Quay lại</Link>
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className={`h-32 bg-gradient-to-r ${isStudent ? "from-indigo-500 to-violet-500" : "from-violet-500 to-indigo-600"}`} />
                    <div className="px-6 pb-6">
                        <div className="flex flex-col md:flex-row gap-6 -mt-16 md:items-end">
                            <div className={`w-32 h-32 rounded-full border-4 border-card ${isStudent ? "bg-gradient-to-r from-indigo-500 to-violet-500" : "bg-gradient-to-br from-violet-500 to-indigo-600"} flex items-center justify-center text-5xl font-bold text-white shadow-lg overflow-hidden`}>
                                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" /> : profile.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h1 className="text-3xl font-bold text-foreground mb-2">{profile.full_name}</h1>
                                {profile.nickname && <p className="text-lg text-muted-foreground mb-2">@{profile.nickname}</p>}
                                <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${isStudent ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400" : "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400"}`}><User className="w-3 h-3" />{isStudent ? "Học sinh" : "Giáo viên"}</span>
                                    {isStudent && profile.class && <span className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full text-xs font-semibold text-muted-foreground"><BookOpen className="w-3 h-3" />Lớp {profile.class}</span>}
                                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-full text-xs font-semibold text-muted-foreground"><Calendar className="w-3 h-3" />Tham gia {joinedDate}</span>
                                </div>
                            </div>
                        </div>
                        {profile.bio && <div className="mt-6 p-4 bg-muted/30 rounded-xl"><h3 className="text-sm font-semibold text-foreground mb-2">Giới thiệu</h3><p className="text-muted-foreground">{profile.bio}</p></div>}
                        {stats && (
                            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                                {isStudent ? (
                                    <>
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-center"><div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats.total_xp || 0}</div><div className="text-xs text-muted-foreground mt-1">Tổng XP</div></div>
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center"><div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.streak_days || 0}</div><div className="text-xs text-muted-foreground mt-1">Ngày streak</div></div>
                                        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl text-center"><div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.correct_answers || 0}</div><div className="text-xs text-muted-foreground mt-1">Câu đúng</div></div>
                                        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-center"><div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.total_questions || 0}</div><div className="text-xs text-muted-foreground mt-1">Tổng câu hỏi</div></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl text-center"><div className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.totalExams || 0}</div><div className="text-xs text-muted-foreground mt-1">Tổng đề thi</div></div>
                                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-center"><div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.publishedExams || 0}</div><div className="text-xs text-muted-foreground mt-1">Đã xuất bản</div></div>
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
