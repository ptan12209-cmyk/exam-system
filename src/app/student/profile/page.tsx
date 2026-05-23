"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { getUserStats } from "@/lib/gamification"
import { XpBar } from "@/components/gamification/XpBar"
import { BadgeGrid } from "@/components/gamification/BadgeCard"
import { LeaderboardCard } from "@/components/gamification/Leaderboard"
import { TitleSelector } from "@/components/gamification/TitleSelector"
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid"
import { PWAInstallButton } from "@/components/PWAInstallButton"
import { BottomNav } from "@/components/BottomNav"
import { StatsCard } from "@/components/shared"
import { STUDENT_STAT_COLORS } from "@/lib/student-styles"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { Award, BookOpen, Edit, Flame, Smartphone, Star, Swords, User } from "lucide-react"
import { Loading } from "@/components/shared/Loading"

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
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

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
  let avatarContent: React.ReactNode = "?"
  if (profile?.avatar_url) {
    avatarContent = <Image src={profile.avatar_url} alt={fullName} width={96} height={96} className="h-full w-full object-cover" />
  } else if (fullName) {
    avatarContent = fullName.charAt(0).toUpperCase()
  }

  if (loading) return <Loading fullPage label="Đang tải hồ sơ..." />

  const quickLinks = [
    { href: "/student/achievements", label: "Thành tích", icon: Award },
    { href: "/student/rewards", label: "Đổi thưởng", icon: User },
    { href: "/arena", label: "Đấu trường", icon: Swords },
    { href: "/student/exams", label: "Đề thi", icon: BookOpen },
  ]

  return (
    <StudentShell>
      <StudentHeader name={fullName} studentClass={userClass || undefined} onLogout={handleLogout} />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] backdrop-blur-md"><User className="h-4 w-4" /> Profile</div>
            <h1 className="max-w-3xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">Hồ sơ cá nhân</h1>
            <p className="mt-6 max-w-2xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">Quản lý thông tin, theo dõi tiến độ và xem các cột mốc học tập của bạn.</p>
          </div>
          <div className="liquid-glass rounded-[2rem] p-6 shadow-sm"><p className="text-sm text-[hsl(var(--muted-foreground))]">XP hiện tại</p><div className="mt-2 text-3xl font-semibold">{stats?.xp || 0}</div><div className="mt-4"><XpBar xp={stats?.xp || 0} size="sm" /></div></div>
        </section>
        <section className="mb-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => <Link key={item.href} href={item.href} className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 p-5 backdrop-blur-md transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[hsl(var(--card))]"><item.icon className="mb-3 h-5 w-5" /><p className="text-sm font-medium">{item.label}</p></Link>)}
        </section>
        <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/20 text-4xl font-semibold">
                  {avatarContent}
                </div>
                <div className="flex-1"><h2 className="text-2xl font-semibold">{fullName || "Học sinh"}</h2>{userClass && <p className="mt-1 text-[hsl(var(--muted-foreground))]">Lớp {userClass}</p>}{profile?.nickname && <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">@{profile.nickname}</p>}<div className="mt-4 max-w-md"><XpBar xp={stats?.xp || 0} size="lg" /></div></div>
                <Link href="/student/profile/edit"><Button className="rounded-full"><Edit className="mr-2 h-4 w-4" /> Chỉnh sửa</Button></Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatsCard label="Bài đã làm" value={stats?.exams_completed || 0} icon={BookOpen} iconColor={STUDENT_STAT_COLORS.completed.icon} iconBgColor={STUDENT_STAT_COLORS.completed.bg} />
              <StatsCard label="Điểm 10" value={stats?.perfect_scores || 0} icon={Star} iconColor={STUDENT_STAT_COLORS.score.icon} iconBgColor={STUDENT_STAT_COLORS.score.bg} />
              <StatsCard label="Streak" value={stats?.streak_days || 0} icon={Flame} iconColor={STUDENT_STAT_COLORS.streak.icon} iconBgColor={STUDENT_STAT_COLORS.streak.bg} />
              <StatsCard label="Badges" value={badges.length} icon={Award} iconColor={STUDENT_STAT_COLORS.achievement.icon} iconBgColor={STUDENT_STAT_COLORS.achievement.bg} />
            </div>
            <section className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]"><div className="border-b border-[hsl(var(--border))]/50 p-5"><h3 className="flex items-center gap-2 text-lg font-semibold"><Award className="h-5 w-5" /> Badge đã đạt</h3></div><div className="p-5">{badges.length > 0 ? <BadgeGrid badges={badges} /> : <p className="py-8 text-center text-[hsl(var(--muted-foreground))]">Hoàn thành bài thi để nhận badge đầu tiên.</p>}</div></section>
            <section className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]"><div className="border-b border-[hsl(var(--border))]/50 p-5"><h3 className="flex items-center gap-2 text-lg font-semibold"><Star className="h-5 w-5" /> Danh hiệu</h3></div><div className="p-5"><TitleSelector /></div></section>
            <section className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]"><div className="border-b border-[hsl(var(--border))]/50 p-5"><h3 className="flex items-center gap-2 text-lg font-semibold"><Award className="h-5 w-5" /> Thành tựu</h3></div><div className="p-5"><AchievementsGrid /></div></section>
          </div>
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6"><div className="mb-4 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/20"><Smartphone className="h-6 w-6" /></div><div><h3 className="text-lg font-semibold">Cài đặt ứng dụng</h3><p className="text-xs text-[hsl(var(--muted-foreground))]">Truy cập nhanh hơn</p></div></div><PWAInstallButton /></div>
            <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5"><LeaderboardCard currentUserId={userId || undefined} /></div>
          </aside>
        </section>
      </main>
      <BottomNav />
    </StudentShell>
  )
}
