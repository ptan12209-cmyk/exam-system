"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    Star,
    Flame,
    Edit,
    Smartphone
} from "lucide-react"
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
                        href="/student/profile"
                        className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                    >
                        <User className="w-5 h-5" />
                        Hồ sơ cá nhân
                    </Link>

                    {/* XP Progress */}
                    <div className="pt-6 pb-2">
                        <p className="px-4 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tiến độ</p>
                        <div className="mt-3 px-4">
                            <XpBar xp={stats?.xp || 0} size="sm" />
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
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Hồ sơ cá nhân</h1>
                        <p className="text-gray-500 dark:text-gray-400">Quản lý thông tin và theo dõi tiến độ</p>
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
                    <h1 className="text-xl font-bold text-gray-800 dark:text-white">Hồ sơ của tôi</h1>
                </div>

                {/* Profile Header Card */}
                <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 mb-6">
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Avatar */}
                            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-4xl font-bold text-white shadow-lg overflow-hidden">
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                                ) : (
                                    fullName ? fullName.charAt(0).toUpperCase() : "?"
                                )}
                            </div>

                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                                    {fullName || "Học sinh"}
                                </h2>
                                {userClass && (
                                    <p className="text-gray-500 dark:text-gray-400 mb-3">Lớp {userClass}</p>
                                )}
                                {stats && (
                                    <div className="max-w-md">
                                        <XpBar xp={stats.xp} size="lg" />
                                    </div>
                                )}
                            </div>

                            <Link href="/student/profile/edit">
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Chỉnh sửa
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>

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
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Award className="w-5 h-5 text-yellow-500" />
                                    Badges đã đạt
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                {badges.length > 0 ? (
                                    <BadgeGrid badges={badges} />
                                ) : (
                                    <p className="text-center text-gray-500 py-8">
                                        Chưa có badge nào. Hoàn thành bài thi để nhận badge đầu tiên!
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Titles Section */}
                        <Card className="border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                            <CardHeader className="border-b border-gray-100 dark:border-slate-800">
                                <CardTitle className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <Star className="w-5 h-5 text-purple-500" />
                                    Danh hiệu
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <TitleSelector />
                            </CardContent>
                        </Card>

                        {/* Achievements Section */}
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

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* PWA Install Card */}
                        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-purple-600 text-white overflow-hidden">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                        <Smartphone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Cài đặt ứng dụng</h3>
                                        <p className="text-xs text-blue-100">Truy cập nhanh hơn!</p>
                                    </div>
                                </div>
                                <PWAInstallButton />
                            </CardContent>
                        </Card>

                        <LeaderboardCard currentUserId={userId || undefined} />
                    </div>
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    )
}
