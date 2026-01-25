"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { XpBar } from "@/components/gamification/XpBar"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"

export default function AchievementsPage() {
    const router = useRouter()
    const supabase = createClient()
    const [xp, setXp] = useState(0)
    const [fullName, setFullName] = useState("")
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
                .select("full_name")
                .eq("id", user.id)
                .single()

            if (profile) setFullName(profile.full_name || "")

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
            <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/student/dashboard" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-md">E</div>
                            <span className="font-bold text-xl text-blue-600 hidden md:block">ExamHub</span>
                        </Link>
                    </div>
                    <nav className="hidden lg:flex items-center gap-1">
                        <Link href="/student/dashboard" className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">🏠</Link>
                        <Link href="/student/exams" className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">📝</Link>
                        <Link href="/arena" className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">🏆</Link>
                        <Link href="/student/achievements" className="p-3 text-blue-600 bg-blue-50 dark:bg-blue-900/30 rounded-lg">🎯</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} onLogout={handleLogout} role="student" />
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
                    <Link href="/student/dashboard" className="hover:text-blue-600">Trang chủ</Link>
                    <span>›</span>
                    <span className="font-medium text-gray-800">Thành tựu</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* XP Progress */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                                ⚡ Tiến trình XP
                            </h2>
                            <XpBar xp={xp} size="lg" />
                        </div>

                        {/* Achievements Grid */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                                🏆 Thành tựu
                            </h2>
                            <AchievementsGrid />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Daily Check-in */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                                🔥 Điểm danh hàng ngày
                            </h2>
                            <DailyCheckIn onComplete={handleCheckInComplete} />
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">🔗 Liên kết nhanh</h3>
                            <div className="space-y-2">
                                <Link href="/student/rewards" className="block p-3 bg-purple-50 rounded-lg text-purple-700 hover:bg-purple-100 transition font-medium">
                                    🎁 Đổi thưởng
                                </Link>
                                <Link href="/student/profile" className="block p-3 bg-blue-50 rounded-lg text-blue-700 hover:bg-blue-100 transition font-medium">
                                    👤 Hồ sơ cá nhân
                                </Link>
                                <Link href="/arena" className="block p-3 bg-orange-50 rounded-lg text-orange-700 hover:bg-orange-100 transition font-medium">
                                    ⚔️ Đấu trường
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-blue-600 text-white py-8 mt-auto">
                <div className="max-w-7xl mx-auto px-4 text-center">
                    <p className="text-sm text-blue-200">© 2026 ExamHub. All rights reserved.</p>
                </div>
            </footer>

            <BottomNav />
        </div>
    )
}
