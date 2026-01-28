"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RewardsShop } from "@/components/gamification/RewardsShop"
import { XpBar } from "@/components/gamification/XpBar"
import { getUserStats } from "@/lib/gamification"
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
    Gift
} from "lucide-react"

export default function RewardsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [fullName, setFullName] = useState("")
    const [userClass, setUserClass] = useState("")
    const [userXp, setUserXp] = useState(0)
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

            const { stats } = await getUserStats(user.id)
            setUserXp(stats.xp)

            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
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
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                        <Award className="w-5 h-5" />
                        Thành tích
                    </Link>
                    <Link
                        href="/student/rewards"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                    >
                        <Gift className="w-5 h-5" />
                        Đổi thưởng
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
                            <XpBar xp={userXp} size="sm" />
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
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Cửa hàng phần thưởng</h1>
                        <p className="text-gray-500 dark:text-gray-400">Đổi XP lấy các phần thưởng hấp dẫn</p>
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
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Đổi thưởng</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Sử dụng XP để đổi phần thưởng</p>
                </div>

                {/* XP Balance Card */}
                <Card className="border-0 shadow-md bg-gradient-to-r from-yellow-500 to-orange-500 text-white mb-6">
                    <CardContent className="p-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <Gift className="w-7 h-7" />
                            </div>
                            <div>
                                <p className="text-yellow-100 text-sm">XP hiện tại</p>
                                <p className="text-3xl font-bold">{userXp.toLocaleString()} XP</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Rewards Shop */}
                <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                    <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                        <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <Gift className="w-5 h-5 text-orange-500" />
                            Phần thưởng có sẵn
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <RewardsShop />
                    </CardContent>
                </Card>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
