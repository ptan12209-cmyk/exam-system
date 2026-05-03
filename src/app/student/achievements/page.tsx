"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { XpBar } from "@/components/gamification/XpBar"
import { BottomNav } from "@/components/BottomNav"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { Award, User, Swords, Gift, Flame } from "lucide-react"
import { Loading } from "@/components/shared/Loading"

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
      if (!user) { router.push("/login"); return }
      const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
      if (profile) { setFullName(profile.full_name || ""); setUserClass(profile.class || "") }
      fetch("/api/daily-checkin").then((res) => res.json()).then((data) => setXp(data.xp || 0)).catch(() => {})
      setLoading(false)
    }
    fetchData()
  }, [router, supabase])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
  const handleCheckInComplete = (data: { xp: number }) => setXp((prev) => prev + data.xp)
  const quickLinks = [
    { href: "/student/rewards", label: "Đổi thưởng", icon: Gift },
    { href: "/student/profile", label: "Hồ sơ", icon: User },
    { href: "/arena", label: "Đấu trường", icon: Swords },
  ]

  if (loading) return <Loading fullPage label="Đang tổng hợp thành tích..." />

  return (
    <StudentShell>
      <StudentHeader name={fullName} studentClass={userClass || undefined} onLogout={handleLogout} />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] backdrop-blur-md">
              <Award className="h-4 w-4" /> Achievements
            </div>
            <h1 className="max-w-3xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">Thành tích</h1>
            <p className="mt-6 max-w-2xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">Theo dõi tiến độ, XP và những cột mốc bạn đã đạt được trong hành trình học tập.</p>
          </div>

          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">XP hiện tại</p>
            <div className="mt-2 text-3xl font-semibold">{xp.toLocaleString()} XP</div>
            <div className="mt-4"><XpBar xp={xp} size="sm" /></div>
          </div>
        </section>

        <section className="mt-10 grid gap-3 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 p-5 backdrop-blur-md transition-[transform,background-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:bg-[hsl(var(--card))]">
              <item.icon className="mb-3 h-5 w-5" />
              <p className="text-sm font-medium">{item.label}</p>
            </Link>
          ))}
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <section className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
            <div className="border-b border-[hsl(var(--border))]/50 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Award className="h-5 w-5" /> Thành tựu</h2>
              <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Các mốc tiến bộ của bạn được cập nhật theo thời gian.</p>
            </div>
            <div className="p-5"><AchievementsGrid /></div>
          </section>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
              <div className="border-b border-[hsl(var(--border))]/50 p-5">
                <h2 className="flex items-center gap-2 text-lg font-semibold"><Flame className="h-5 w-5" /> Điểm danh mỗi ngày</h2>
              </div>
              <div className="p-5"><DailyCheckIn onComplete={handleCheckInComplete} /></div>
            </section>

            <section className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
              <div className="border-b border-[hsl(var(--border))]/50 p-5">
                <h2 className="text-base font-semibold">Liên kết nhanh</h2>
              </div>
              <div className="space-y-2 p-4">
                <Link href="/student/rewards" className="flex items-center gap-3 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-3 font-medium backdrop-blur-md transition-[background-color,transform] duration-200 hover:bg-[hsl(var(--muted))]/20">
                  <Gift className="h-5 w-5" /> Đổi thưởng
                </Link>
                <Link href="/student/profile" className="flex items-center gap-3 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-3 font-medium backdrop-blur-md transition-[background-color,transform] duration-200 hover:bg-[hsl(var(--muted))]/20">
                  <User className="h-5 w-5" /> Hồ sơ cá nhân
                </Link>
                <Link href="/arena" className="flex items-center gap-3 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-3 font-medium backdrop-blur-md transition-[background-color,transform] duration-200 hover:bg-[hsl(var(--muted))]/20">
                  <Swords className="h-5 w-5" /> Đấu trường
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
      <BottomNav />
    </StudentShell>
  )
}
