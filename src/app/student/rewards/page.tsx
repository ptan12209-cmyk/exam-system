"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { RewardsShop } from "@/components/gamification/RewardsShop"
import { getUserStats } from "@/lib/gamification"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { Gift, FileText, Loader2, BarChart3, Award, User } from "lucide-react"
import { cn } from "@/lib/utils"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function RewardsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0 })

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single()
      setFullName(profile?.full_name || "")
      
      const { stats } = await getUserStats(user.id)
      setStudentStats(stats)
      
      setLoading(false)
    })()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }
  
  const quickLinks = [
    { href: "/student/dashboard", label: "Dashboard chính", icon: BarChart3 },
    { href: "/student/exams", label: "Đề thi & Kết quả", icon: FileText },
    { href: "/student/achievements", label: "Thành tựu đạt được", icon: Award },
    { href: "/student/profile", label: "Hồ sơ cá nhân", icon: User }
  ]

  const xpProgress = useMemo(() => {
    const currentLevel = studentStats.level
    const currentLevelThreshold = Math.pow(currentLevel - 1, 2) * 100
    const nextLevelThreshold = Math.pow(currentLevel, 2) * 100
    const xpInCurrentLevel = studentStats.xp - currentLevelThreshold
    const xpRequiredForLevel = nextLevelThreshold - currentLevelThreshold
    
    return {
      percent: Math.min((xpInCurrentLevel / xpRequiredForLevel) * 100, 100),
      current: xpInCurrentLevel,
      required: xpRequiredForLevel,
      nextTotal: nextLevelThreshold
    }
  }, [studentStats.level, studentStats.xp])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C18CFF]" />
      </div>
    )
  }

  return (
    <StudentShell className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Topbar */}
      <StudentTopbar
        name={fullName}
        userXp={studentStats.xp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Title Header Section */}
        <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#8C87A2]">
              <Gift className="h-3.5 w-3.5 text-[#C18CFF]" /> Rewards Shop
            </div>
            <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
              Đổi phần thưởng
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#8C87A2] max-w-2xl">
              Tích lũy điểm kinh nghiệm XP từ việc làm bài tập để mở khóa các danh hiệu và phần thưởng độc quyền từ giáo viên.
            </p>
          </div>

          {/* Current Balance Card */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 shadow-sm">
            <span className="text-[10px] text-[#8C87A2] uppercase font-mono">ĐIỂM XP HIỆN TẠI</span>
            <div className="mt-2 text-3xl font-bold font-mono text-[#F1EDF9]">{studentStats.xp.toLocaleString()} XP</div>
            
            <div className="mt-4 space-y-2">
              <div className="h-1.5 w-full rounded-full bg-[#0B0A13] overflow-hidden border border-[#8C87A2]/20">
                <div 
                  className="h-full bg-[#C18CFF]" 
                  style={{ width: `${xpProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#8C87A2] font-mono">
                <span>Cấp {studentStats.level}</span>
                <span>Còn {xpProgress.nextTotal - studentStats.xp} XP lên cấp {studentStats.level + 1}</span>
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

        {/* Rewards Shop Grid */}
        <section className="mt-8 rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-[#F1EDF9] mb-6 flex items-center gap-2">
            <Gift className="h-5 w-5 text-[#C18CFF]" /> Cửa hàng đổi quà
          </h2>
          <RewardsShop initialXp={studentStats.xp} />
        </section>

      </main>
    </StudentShell>
  )
}
