"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { getUserStats } from "@/lib/gamification"
import { BadgeGrid } from "@/components/gamification/BadgeCard"
import { LeaderboardCard } from "@/components/gamification/Leaderboard"
import { TitleSelector } from "@/components/gamification/TitleSelector"
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid"
import { PWAInstallButton } from "@/components/PWAInstallButton"
import { StatsCard } from "@/components/shared"
import { STUDENT_STAT_COLORS } from "@/lib/student-styles"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { Award, BookOpen, Edit, Flame, Smartphone, Star, Swords, User } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function ProfilePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [fullName, setFullName] = useState("")
  const [userClass, setUserClass] = useState("")
  const [profile, setProfile] = useState<{ avatar_url?: string | null; nickname?: string | null; bio?: string | null } | null>(null)
  const [stats, setStats] = useState<{ xp: number; level: number; streak_days: number; exams_completed: number; perfect_scores: number } | null>(null)
  const [badges, setBadges] = useState<{ badge: { name: string; description: string; icon: string; xp_reward: number }; earned_at: string }[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      setUserId(user.id)
      
      const { data: profileData } = await supabase.from("profiles").select("full_name, class, avatar_url, nickname, bio").eq("id", user.id).single()
      if (profileData) {
        setFullName(profileData.full_name || "")
        setUserClass(profileData.class || "")
        setProfile(profileData)
      }
      
      const { stats: userStats, badges: userBadges } = await getUserStats(user.id)
      setStats(userStats)
      setBadges(userBadges as unknown as typeof badges)
      setLoading(false)
    }
    fetchData()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const xpProgress = useMemo(() => {
    if (!stats) return { percent: 0, current: 0, required: 100, nextTotal: 100 }
    const currentLevel = stats.level
    const currentLevelThreshold = Math.pow(currentLevel - 1, 2) * 100
    const nextLevelThreshold = Math.pow(currentLevel, 2) * 100
    const xpInCurrentLevel = stats.xp - currentLevelThreshold
    const xpRequiredForLevel = nextLevelThreshold - currentLevelThreshold
    
    return {
      percent: Math.min((xpInCurrentLevel / xpRequiredForLevel) * 100, 100),
      current: xpInCurrentLevel,
      required: xpRequiredForLevel,
      nextTotal: nextLevelThreshold
    }
  }, [stats])

  let avatarContent: React.ReactNode = "?"
  if (profile?.avatar_url) {
    avatarContent = (
      <Image 
        src={profile.avatar_url} 
        alt={fullName || "Avatar"} 
        width={96} 
        height={96} 
        className="h-full w-full object-cover" 
      />
    )
  } else if (fullName) {
    avatarContent = fullName.charAt(0).toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tải hồ sơ..." />
      </div>
    )
  }

  const quickLinks = [
    { href: "/student/achievements", label: "Hộp thành tích", icon: Award },
    { href: "/student/rewards", label: "Cửa hàng đổi quà", icon: User },
    { href: "/arena", label: "Đấu trường Arena", icon: Swords },
    { href: "/student/exams", label: "Đề thi của tôi", icon: BookOpen },
  ]

  return (
    <StudentShell className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Topbar */}
      <StudentTopbar
        name={fullName}
        userXp={stats?.xp || 0}
        level={stats?.level || 1}
        streak={stats?.streak_days || 0}
        onLogout={handleLogout}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Title Header Section */}
        <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#8C87A2]">
              <User className="h-4 w-4 text-[#C18CFF]" /> Profile Card
            </div>
            <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
              Hồ sơ cá nhân
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#8C87A2] max-w-2xl">
              Quản lý thông tin tài khoản cá nhân, theo dõi tiến trình thăng cấp và bộ sưu tập huy hiệu đạt được.
            </p>
          </div>

          {/* XP Summary Box */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 shadow-sm">
            <span className="text-[10px] text-[#8C87A2] uppercase font-mono">XP tích lũy hiện tại</span>
            <div className="mt-2 text-3xl font-bold font-mono text-[#F1EDF9]">{(stats?.xp || 0).toLocaleString()} XP</div>
            
            <div className="mt-4 space-y-2">
              <div className="h-1.5 w-full rounded-full bg-[#0B0A13] overflow-hidden border border-[#8C87A2]/20">
                <div 
                  className="h-full bg-[#C18CFF] transition-all duration-700 ease-out" 
                  style={{ width: `${xpProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#8C87A2] font-mono">
                <span>Cấp {stats?.level || 1}</span>
                <span>Còn {xpProgress.nextTotal - (stats?.xp || 0)} XP để lên cấp {(stats?.level || 1) + 1}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links Grid */}
        <section className="mt-8 grid gap-4 grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className="flex items-center gap-3 rounded-xl border border-[#8C87A2]/20 bg-[#15131F] p-4 hover:border-[#C18CFF]/50 transition-colors group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#8C87A2]/20 bg-[#0B0A13] text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-[#F1EDF9]">{item.label}</span>
            </Link>
          ))}
        </section>

        {/* Main Details Section */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
          
          <div className="space-y-6">
            
            {/* Profile Detail Card */}
            <div className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#0B0A13] text-4xl font-bold text-[#C18CFF]">
                  {avatarContent}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[#F1EDF9]">{fullName || "Học sinh"}</h2>
                  {userClass && <p className="mt-1 text-sm text-[#8C87A2] font-mono uppercase">Lớp {userClass}</p>}
                  {profile?.nickname && <p className="mt-1 text-xs text-[#C18CFF] font-mono">@{profile.nickname}</p>}
                  <p className="mt-3 text-xs text-[#8C87A2] leading-relaxed max-w-md">{profile?.bio || "Chưa có giới thiệu bản thân."}</p>
                </div>
                <Link href="/student/profile/edit" className="shrink-0 w-full md:w-auto">
                  <Button className="rounded-xl border border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] hover:border-[#C18CFF] hover:bg-[#C18CFF]/15 bg-transparent py-5 px-5 text-xs font-semibold w-full md:w-auto">
                    <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa hồ sơ
                  </Button>
                </Link>
              </div>
            </div>

            {/* Stats Cards (Dream Engine Solid Borders) */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatsCard 
                label="Bài đã làm" 
                value={stats?.exams_completed || 0} 
                icon={BookOpen} 
                iconColor="text-emerald-400" 
                iconBgColor="bg-emerald-500/10 border border-emerald-500/25" 
                className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 shadow-none hover:border-[#C18CFF]/30 transition-colors"
              />
              <StatsCard 
                label="Điểm 10" 
                value={stats?.perfect_scores || 0} 
                icon={Star} 
                iconColor="text-[#C18CFF]" 
                iconBgColor="bg-[#C18CFF]/15 border border-[#C18CFF]/25" 
                className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 shadow-none hover:border-[#C18CFF]/30 transition-colors"
              />
              <StatsCard 
                label="Streak" 
                value={stats?.streak_days || 0} 
                icon={Flame} 
                iconColor="text-orange-400" 
                iconBgColor="bg-orange-500/10 border border-orange-500/25" 
                className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 shadow-none hover:border-[#C18CFF]/30 transition-colors"
              />
              <StatsCard 
                label="Huy hiệu" 
                value={badges.length} 
                icon={Award} 
                iconColor="text-amber-400" 
                iconBgColor="bg-amber-500/10 border border-amber-500/25" 
                className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 shadow-none hover:border-[#C18CFF]/30 transition-colors"
              />
            </div>

            {/* Badges Panel */}
            <section className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]">
              <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
                <h3 className="flex items-center gap-2 text-base font-bold text-[#F1EDF9]">
                  <Award className="h-5 w-5 text-[#C18CFF]" /> Badge đã đạt
                </h3>
              </div>
              <div className="p-5">
                {badges.length > 0 ? (
                  <BadgeGrid badges={badges} />
                ) : (
                  <p className="py-8 text-center text-xs text-[#8C87A2]">Hoàn thành bài thi để nhận huy hiệu đầu tiên.</p>
                )}
              </div>
            </section>

            {/* Titles Panel */}
            <section className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]">
              <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
                <h3 className="flex items-center gap-2 text-base font-bold text-[#F1EDF9]">
                  <Star className="h-5 w-5 text-[#C18CFF]" /> Danh hiệu trang bị
                </h3>
              </div>
              <div className="p-5">
                <TitleSelector />
              </div>
            </section>

            {/* Achievements Grid Panel */}
            <section className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]">
              <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
                <h3 className="flex items-center gap-2 text-base font-bold text-[#F1EDF9]">
                  <Award className="h-5 w-5 text-[#C18CFF]" /> Cột mốc thành tựu
                </h3>
              </div>
              <div className="p-5">
                <AchievementsGrid />
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            {/* PWA App installation */}
            <div className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#8C87A2]/20 bg-[#0B0A13] text-[#C18CFF]">
                  <Smartphone className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#F1EDF9]">Cài đặt ứng dụng</h3>
                  <p className="text-[10px] text-[#8C87A2] font-mono">TRUY CẬP NHANH HƠN</p>
                </div>
              </div>
              <PWAInstallButton />
            </div>

            {/* Leaderboard Card */}
            <div className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-5 shadow-sm">
              <LeaderboardCard currentUserId={userId || undefined} />
            </div>
          </aside>
        </section>
      </main>
    </StudentShell>
  )
}
