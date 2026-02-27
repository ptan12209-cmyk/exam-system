"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { RewardsShop } from "@/components/gamification/RewardsShop"
import { XpBar } from "@/components/gamification/XpBar"
import { getUserStats } from "@/lib/gamification"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { BottomNav } from "@/components/BottomNav"
import { cn } from "@/lib/utils"
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
    Gift,
    ChevronRight
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
            if (!user) { router.push("/login"); return }
            const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
            if (profile) { setFullName(profile.full_name || ""); setUserClass(profile.class || "") }
            const { stats } = await getUserStats(user.id)
            setUserXp(stats.xp)
            setLoading(false)
        }
        fetchData()
    }, [router, supabase])

    const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

    const NAV_ITEMS = [
        { href: "/student/dashboard", label: "Tổng quan", icon: BarChart3 },
        { href: "/student/exams", label: "Làm đề thi", icon: FileText },
    ]
    const EXPLORE_ITEMS = [
        { href: "/resources", label: "Thư viện tài liệu", icon: BookOpen },
        { href: "/arena", label: "Đấu trường", icon: Swords },
        { href: "/student/achievements", label: "Thành tích", icon: Award },
        { href: "/student/rewards", label: "Đổi thưởng", icon: Gift, active: true },
        { href: "/student/profile", label: "Hồ sơ cá nhân", icon: User },
    ]

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
                        <Link key={item.href} href={item.href} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200 group">
                            <item.icon className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300" /><span className="text-sm">{item.label}</span>
                        </Link>
                    ))}
                    <div className="pt-5 pb-2"><p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Khám phá</p></div>
                    {EXPLORE_ITEMS.map((item) => (
                        <Link key={item.href} href={item.href}
                            className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group",
                                item.active ? "gradient-primary-soft text-indigo-700 dark:text-indigo-400 font-semibold nav-active-indicator" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                            )}>
                            <item.icon className={cn("w-5 h-5", item.active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500")} />
                            <span className="text-sm">{item.label}</span>
                            {item.active && <ChevronRight className="w-4 h-4 ml-auto text-indigo-400" />}
                        </Link>
                    ))}
                    <div className="pt-6 pb-2">
                        <p className="px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-widest">Tiến độ</p>
                        <div className="mt-3 px-3"><XpBar xp={userXp} size="sm" /></div>
                    </div>
                </nav>
                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-700/40">
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all w-full font-medium text-sm group">
                        <LogOut className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />Đăng xuất
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="lg:hidden fixed top-0 w-full z-50 glass-nav px-4 h-16 flex items-center justify-between safe-top">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center"><GraduationCap className="w-4 h-4 text-white" /></div>
                    <span className="text-lg font-bold text-foreground">ExamHub</span>
                </div>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <UserMenu userName={fullName} userClass={userClass || undefined} onLogout={handleLogout} role="student" />
                </div>
            </header>

            <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 pb-24 lg:pb-8">
                <div className="hidden lg:flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Cửa hàng phần thưởng</h1>
                        <p className="text-muted-foreground">Đổi XP lấy các phần thưởng hấp dẫn</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <NotificationBell />
                        <UserMenu userName={fullName} userClass={userClass || undefined} onLogout={handleLogout} role="student" />
                    </div>
                </div>

                <div className="lg:hidden mb-6">
                    <h1 className="text-xl font-bold text-foreground">Đổi thưởng</h1>
                    <p className="text-muted-foreground text-sm">Sử dụng XP để đổi phần thưởng</p>
                </div>

                {/* XP Balance Card */}
                <div className="gradient-primary rounded-2xl text-white mb-6 p-6 relative overflow-hidden shadow-xl shadow-indigo-500/20">
                    <div className="absolute inset-0 opacity-10"><div className="absolute -top-10 -right-10 w-40 h-40 rounded-full border-[20px] border-white/20" /><div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full border-[16px] border-white/20" /></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <Gift className="w-7 h-7" />
                        </div>
                        <div>
                            <p className="text-indigo-100 text-sm">XP hiện tại</p>
                            <p className="text-3xl font-bold">{userXp.toLocaleString()} XP</p>
                        </div>
                    </div>
                </div>

                {/* Rewards Shop */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-5 border-b border-border/50">
                        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                            <Gift className="w-5 h-5 text-amber-500" />Phần thưởng có sẵn
                        </h3>
                    </div>
                    <div className="p-5"><RewardsShop /></div>
                </div>
            </main>

            <BottomNav />
        </div>
    )
}
