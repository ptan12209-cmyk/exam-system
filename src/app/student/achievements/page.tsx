"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { XpBar } from "@/components/gamification/XpBar"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import {
    GraduationCap,
    FileText,
    LogOut,
    Loader2,
    BookOpen,
    Swords,
    BarChart3,
    Award,
    User,
    Zap,
    Gift,
    Flame
} from "lucide-react"

export default function AchievementsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [xp, setXp] = useState(0)
    const [fullName, setFullName] = useState("")
    const [userClass, setUserClass] = useState("")
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, class")
                .eq("id", user.id)
                .single()

            if (profile) {
                setFullName(profile.full_name || "")
                setUserClass(profile.class || "")
            }

            fetch("/api/daily-checkin")
                .then(res => res.json())
                .then(data => setXp(data.xp || 0))
                .catch(() => { })

            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    function handleCheckInComplete(data: { xp: number }) {
        setXp(prev => prev + data.xp)
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
            {/* Sidebar - Fixed */}
            <aside className="fixed left-0 top-0 h-full w-64 border-r border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 hidden lg:block z-50">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/30">
                        <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-800 dark:text-white">ExamHub</span>
                </div>

                <nav className="space-y-1">
                    <Link
                        href="/student/dashboard"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BarChart3 className="w-5 h-5" />
                        Tổng quan
                    </Link>
                    <Link
                        href="/student/exams"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <FileText className="w-5 h-5" />
                        Làm đề thi
                    </Link>
                    <div className="pt-4 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Khám phá</p>
                    </div>
                    <Link
                        href="/resources"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <BookOpen className="w-5 h-5" />
                        Thư viện tài liệu
                    </Link>
                    <Link
                        href="/arena"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Swords className="w-5 h-5" />
                        Đấu trường
                    </Link>
                    <Link
                        href="/student/achievements"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                    >
                        <Award className="w-5 h-5" />
                        Thành tích
                    </Link>
                    <Link
                        href="/student/profile"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <User className="w-5 h-5" />
                        Hồ sơ cá nhân
                    </Link>

                    {/* XP Progress */}
                    <div className="pt-6 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tiến độ</p>
                        <div className="mt-3 px-4">
                            <XpBar xp={xp} size="sm" />
                        </div>
                    </div>
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
                        userName={fullName}
                        userClass={userClass || undefined}
                        onLogout={handleLogout}
                        role="student"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Thành tích</h1>
                        <p className="text-gray-500 dark:text-gray-400">Theo dõi tiến độ và thành tựu của bạn</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <UserMenu
                            userName={fullName}
                            userClass={userClass || undefined}
                            onLogout={handleLogout}
                            role="student"
                        />
                    </div>
                </div>

                {/* Mobile Title */}
                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Thành tích</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Xem tiến độ học tập</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* XP Progress */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Zap className="w-5 h-5 text-yellow-500" />
                                    Tiến trình XP
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <XpBar xp={xp} size="lg" />
                            </CardContent>
                        </Card>

                        {/* Achievements Grid */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Award className="w-5 h-5 text-blue-500" />
                                    Thành tựu
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <AchievementsGrid />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Daily Check-in */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Flame className="w-5 h-5 text-orange-500" />
                                    Điểm danh hàng ngày
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <DailyCheckIn onComplete={handleCheckInComplete} />
                            </CardContent>
                        </Card>

                        {/* Quick Links */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                <CardTitle className="text-base font-bold text-gray-800 dark:text-white">Liên kết nhanh</CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <Link href="/student/rewards" className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition font-medium">
                                    <Gift className="w-5 h-5" />
                                    Đổi thưởng
                                </Link>
                                <Link href="/student/profile" className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition font-medium">
                                    <User className="w-5 h-5" />
                                    Hồ sơ cá nhân
                                </Link>
                                <Link href="/arena" className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition font-medium">
                                    <Swords className="w-5 h-5" />
                                    Đấu trường
                                </Link>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
