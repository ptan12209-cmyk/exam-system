"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getUserStats } from "@/lib/gamification"
import { XpBar } from "@/components/gamification/XpBar"
import { BadgeGrid } from "@/components/gamification/BadgeCard"
import { LeaderboardCard } from "@/components/gamification/Leaderboard"
import { TitleSelector } from "@/components/gamification/TitleSelector"
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import { StatsCard } from "@/components/shared"
import { STUDENT_STAT_COLORS } from "@/lib/student-styles"
import { BookOpen, Star, Flame, Award } from "lucide-react"
import { PWAInstallButton } from "@/components/PWAInstallButton"

interface UserStats {
    xp: number
    level: number
    streak_days: number
    exams_completed: number
    perfect_scores: number
}

interface Badge {
    name: string
    description: string
    icon: string
    xp_reward: number
}

export default function ProfilePage() {
    const router = useRouter()
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)
    const [fullName, setFullName] = useState("")
    const [userClass, setUserClass] = useState("")
    const [profile, setProfile] = useState<{ avatar_url?: string | null, nickname?: string | null, bio?: string | null } | null>(null)
    const [stats, setStats] = useState<UserStats | null>(null)
    const [badges, setBadges] = useState<{ badge: Badge; earned_at: string }[]>([])

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push("/login")
                return
            }

            setUserId(user.id)

            const { data: profileData } = await supabase
                .from("profiles")
                .select("full_name, class, avatar_url, nickname, bio")
                .eq("id", user.id)
                .single()

            if (profileData) {
                setFullName(profileData.full_name || "")
                setUserClass(profileData.class || "")
                setProfile(profileData)
            }

            const { stats: userStats, badges: userBadges } = await getUserStats(user.id)
            setStats(userStats)
            setBadges(userBadges as any)

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
            <div className="min-h-screen bg-gray-100 dark:bg-slate-900 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex flex-col">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
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
                        <Link href="/student/dashboard" className="p-3 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">🏠</Link>
                        <Link href="/student/exams" className="p-3 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">📝</Link>
                        <Link href="/arena" className="p-3 text-gray-500 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg">🏆</Link>
                        <Link href="/student/profile" className="p-3 text-blue-600 bg-blue-50 dark:bg-blue-900/40 rounded-lg">👤</Link>
                    </nav>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} onLogout={handleLogout} role="student" />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow max-w-5xl mx-auto px-4 py-8 w-full">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                    <Link href="/student/dashboard" className="hover:text-blue-600 dark:hover:text-blue-400">Trang chủ</Link>
                    <span>›</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">Hồ sơ của tôi</span>
                </div>

                {/* Profile Header */}
                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6 mb-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg overflow-hidden relative">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                            ) : (
                                fullName ? fullName.charAt(0).toUpperCase() : "?"
                            )}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                                {fullName || "Học sinh"}
                            </h1>
                            {userClass && (
                                <p className="text-gray-500 dark:text-gray-400 mb-3">Lớp {userClass}</p>
                            )}
                            {stats && (
                                <div className="max-w-md">
                                    <XpBar xp={stats.xp} size="lg" />
                                </div>
                            )}
                        </div>

                        <Link href="/student/profile/edit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm">
                            ✏️ Chỉnh sửa
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatsCard
                        label="Bài đã làm"
                        value={stats?.exams_completed || 0}
                        icon={BookOpen}
                        iconColor={STUDENT_STAT_COLORS.completed.icon}
                        iconBgColor={STUDENT_STAT_COLORS.completed.bg}
                    />
                    <StatsCard
                        label="Điểm 10"
                        value={stats?.perfect_scores || 0}
                        icon={Star}
                        iconColor={STUDENT_STAT_COLORS.score.icon}
                        iconBgColor={STUDENT_STAT_COLORS.score.bg}
                    />
                    <StatsCard
                        label="Ngày streak"
                        value={stats?.streak_days || 0}
                        icon={Flame}
                        iconColor={STUDENT_STAT_COLORS.streak.icon}
                        iconBgColor={STUDENT_STAT_COLORS.streak.bg}
                    />
                    <StatsCard
                        label="Badges"
                        value={badges.length}
                        icon={Award}
                        iconColor={STUDENT_STAT_COLORS.achievement.icon}
                        iconBgColor={STUDENT_STAT_COLORS.achievement.bg}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Badges Section */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                                🎯 Badges đã đạt
                            </h2>
                            {badges.length > 0 ? (
                                <BadgeGrid badges={badges} />
                            ) : (
                                <p className="text-center text-gray-500 py-8">
                                    Chưa có badge nào. Hoàn thành bài thi để nhận badge đầu tiên!
                                </p>
                            )}
                        </div>

                        {/* Titles Section */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                                👑 Danh hiệu
                            </h2>
                            <TitleSelector />
                        </div>

                        {/* Achievements Section */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-100 dark:border-slate-800 p-6">
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2 mb-4">
                                🏆 Thành tựu
                            </h2>
                            <AchievementsGrid />
                        </div>
                    </div>

                    {/* Right Column - Leaderboard */}
                    <div className="space-y-6">
                        {/* PWA Install Card */}
                        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-2xl">📱</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Cài đặt ứng dụng</h3>
                                    <p className="text-xs text-blue-100">Truy cập nhanh hơn!</p>
                                </div>
                            </div>
                            <PWAInstallButton />
                        </div>

                        <LeaderboardCard currentUserId={userId || undefined} />
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
