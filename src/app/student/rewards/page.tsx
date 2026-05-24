"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { RewardsShop } from "@/components/gamification/RewardsShop"
import { XpBar } from "@/components/gamification/XpBar"
import { getUserStats } from "@/lib/gamification"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { BottomNav } from "@/components/BottomNav"
import { Gift, FileText, Loader2, BarChart3, Award, User } from "lucide-react"

export default function RewardsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [fullName, setFullName] = useState("")
  const [userClass, setUserClass] = useState("")
  const [userXp, setUserXp] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
      setFullName(profile?.full_name || "")
      setUserClass(profile?.class || "")
      const { stats } = await getUserStats(user.id)
      setUserXp(stats.xp)
      setLoading(false)
    })()
  }, [router, supabase])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }
  
  const quickLinks = [
    { href: "/student/dashboard", label: "Tổng quan", icon: BarChart3 },
    { href: "/student/exams", label: "Đề thi", icon: FileText },
    { href: "/student/achievements", label: "Thành tích", icon: Award },
    { href: "/student/profile", label: "Hồ sơ", icon: User }
  ]

  if (loading) return <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--foreground))]/70" /></div>

  return (
    <StudentShell>
      <StudentHeader name={fullName} studentClass={userClass || undefined} onLogout={handleLogout} />
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))] backdrop-blur-md">
              <Gift className="h-3.5 w-3.5" /> Rewards
            </p>
            <h1 className="max-w-3xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">Đổi thưởng</h1>
            <p className="mt-6 max-w-2xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">
              Dùng XP để mở khóa phần thưởng và duy trì nhịp học đều hơn mỗi ngày.
            </p>
          </div>
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-sm">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">XP hiện tại</p>
            <div className="mt-2 text-3xl font-semibold">{userXp.toLocaleString()} XP</div>
            <div className="mt-4"><XpBar xp={userXp} size="sm" /></div>
          </div>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 p-4 transition-all hover:-translate-y-0.5 hover:bg-[hsl(var(--card))]">
              <item.icon className="mb-3 h-5 w-5" />
              <p className="text-sm font-medium">{item.label}</p>
            </Link>
          ))}
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 backdrop-blur-md shadow-sm p-8 md:p-12 text-center relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6 shadow-sm animate-pulse">
              <Gift className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
              Cửa Hàng Đang Nâng Cấp Hệ Thống
            </h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed mb-6">
              Để mang lại trải nghiệm đổi thưởng thú vị và bổ ích hơn, chúng tôi tạm thời đóng cửa hàng để nâng cấp sang hệ thống phần thưởng mới (xịn hơn, nhiều quà tặng đặc biệt hơn!). 
            </p>
            <div className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--muted))]/40 px-4 py-1.5 text-xs font-semibold text-[hsl(var(--muted-foreground))] border border-[hsl(var(--border))]/30">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
              <span>Vui lòng tích lũy thêm XP và quay lại sau ít ngày nhé!</span>
            </div>
          </div>
        </section>
      </main>
      <BottomNav />
    </StudentShell>
  )
}
