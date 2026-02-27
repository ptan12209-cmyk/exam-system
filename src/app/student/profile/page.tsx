"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
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
    Smartphone,
    ChevronRight
} from "lucide-react"
import { PWAInstallButton } from "@/components/PWAInstallButton"
import { cn } from "@/lib/utils"

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
            if (!user) { router.push("/login"); return }

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
            setBadges(userBadges as { badge: Badge; earned_at: string }[])

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
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        )
    }

    const NAV_ITEMS = [
        { href: "/student/dashboard", label: "Tổng quan", icon: BarChart3 },
        { href: "/student/exams", label: "Làm đề thi", icon: FileText },
    ]
    const EXPLORE_ITEMS = [
        { href: "/resources", label: "Thư viện tài liệu", icon: BookOpen },
        { href: "/arena", label: "Đấu trường", icon: Swords },
        { href: "/student/achievements", label: "Thành tích", icon: Award },
        { href: "/student/profile", label: "Hồ sơ cá nhân", icon: User, active: true },
    ]

    return (
        <div className="min-h-screen bg-background flex">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-64 glass-sidebar p-5 hidden lg:flex lg:flex-col z-50">
                <div className="flex items-center gap-3 mb-8 px-2">
                    <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                        <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-foreground">ExamHub</span>
                </div>

                <nav className="space-y-1 flex-1">
                    {NAV_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 group"
                        >
                            <item.icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                            <span className="text-sm">{item.label}</span>
                        </Link>
                    ))}

                    <div className="pt-5 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Khám phá</p>
                    </div>

                    {EXPLORE_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                item.active
                                    ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 font-semibold nav-active-indicator"
                                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            )}
                        >
                            <item.icon className={cn("w-5 h-5", item.active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
                            <span className="text-sm">{item.label}</span>
                            {item.active && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                        </Link>
                    ))}

                    <div className="pt-6 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Tiến độ</p>
                        <div className="mt-3 px-3">
                            <XpBar xp={stats?.xp || 0} size="sm" />
                        </div>
                    </div>
                </nav>

                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full font-medium text-sm group">
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
                        Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                        <GraduationCap className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-bold text-foreground">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu userName={fullName} userClass={userClass || undefined} onLogout={handleLogout} role="student" />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                {/* Desktop Header */}
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Hồ sơ cá nhân</h1>
                        <p className="text-muted-foreground">Quản lý thông tin và theo dõi tiến độ</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} userClass={userClass || undefined} onLogout={handleLogout} role="student" />
                    </div>
                </div>

                {/* Mobile Title */}
                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-foreground">Hồ sơ của tôi</h1>
                </div>

                {/* Profile Header Card */}
                <div className="glass-card rounded-2xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-2xl gradient-primary flex items-center justify-center text-4xl font-bold text-white shadow-xl shadow-indigo-500/25 overflow-hidden">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt={fullName} className="w-full h-full object-cover" />
                            ) : (
                                fullName ? fullName.charAt(0).toUpperCase() : "?"
                            )}
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-2xl font-bold text-foreground mb-1">
                                {fullName || "Học sinh"}
                            </h2>
                            {userClass && (
                                <p className="text-muted-foreground mb-3">Lớp {userClass}</p>
                            )}
                            {stats && (
                                <div className="max-w-md">
                                    <XpBar xp={stats.xp} size="lg" />
                                </div>
                            )}
                        </div>

                        <Link href="/student/profile/edit">
                            <Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90">
                                <Edit className="w-4 h-4 mr-2" />
                                Chỉnh sửa
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <StatsCard label="Bài đã làm" value={stats?.exams_completed || 0} icon={BookOpen} iconColor={STUDENT_STAT_COLORS.completed.icon} iconBgColor={STUDENT_STAT_COLORS.completed.bg} />
                    <StatsCard label="Điểm 10" value={stats?.perfect_scores || 0} icon={Star} iconColor={STUDENT_STAT_COLORS.score.icon} iconBgColor={STUDENT_STAT_COLORS.score.bg} />
                    <StatsCard label="Ngày streak" value={stats?.streak_days || 0} icon={Flame} iconColor={STUDENT_STAT_COLORS.streak.icon} iconBgColor={STUDENT_STAT_COLORS.streak.bg} />
                    <StatsCard label="Badges" value={badges.length} icon={Award} iconColor={STUDENT_STAT_COLORS.achievement.icon} iconBgColor={STUDENT_STAT_COLORS.achievement.bg} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Badges Section */}
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-border/50">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Award className="w-5 h-5 text-amber-500" />
                                    Badges đã đạt
                                </h3>
                            </div>
                            <div className="p-5">
                                {badges.length > 0 ? (
                                    <BadgeGrid badges={badges} />
                                ) : (
                                    <p className="text-center text-muted-foreground py-8">
                                        Chưa có badge nào. Hoàn thành bài thi để nhận badge đầu tiên!
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Titles Section */}
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-border/50">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Star className="w-5 h-5 text-violet-500" />
                                    Danh hiệu
                                </h3>
                            </div>
                            <div className="p-5">
                                <TitleSelector />
                            </div>
                        </div>

                        {/* Achievements Section */}
                        <div className="glass-card rounded-2xl overflow-hidden">
                            <div className="p-5 border-b border-border/50">
                                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Award className="w-5 h-5 text-indigo-500" />
                                    Thành tựu
                                </h3>
                            </div>
                            <div className="p-5">
                                <AchievementsGrid />
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                        {/* PWA Install Card */}
                        <div className="rounded-2xl gradient-primary p-6 text-white shadow-xl shadow-indigo-500/25 overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                            <div className="flex items-center gap-3 mb-4 relative">
                                <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">Cài đặt ứng dụng</h3>
                                    <p className="text-xs text-white/60">Truy cập nhanh hơn!</p>
                                </div>
                            </div>
                            <PWAInstallButton />
                        </div>

                        <LeaderboardCard currentUserId={userId || undefined} />
                    </div>
                </div>
            </main>

            <BottomNav />
        </div>
    )
}
