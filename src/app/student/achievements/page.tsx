"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { AchievementsGrid } from "@/components/gamification/AchievementsGrid"
import { DailyCheckIn } from "@/components/gamification/DailyCheckIn"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { Award, User, Swords, Gift, Flame } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { getUserStats } from "@/lib/gamification"
import { cn } from "@/lib/utils"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function AchievementsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [xp, setXp] = useState(0)
  const [fullName, setFullName] = useState("")
  const [userClass, setUserClass] = useState("")
  const [loading, setLoading] = useState(true)
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0 })

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      
      const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
      if (profile) { 
        setFullName(profile.full_name || "")
        setUserClass(profile.class || "") 
      }
      
      const { stats } = await getUserStats(user.id)
      setStudentStats(stats)
      setXp(stats.xp)
      
      setLoading(false)
    }
    fetchData()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }
  
  const handleCheckInComplete = (data: { xp: number }) => {
    setXp((prev) => prev + data.xp)
    setStudentStats(prev => ({
      ...prev,
      xp: prev.xp + data.xp,
      streak_days: prev.streak_days + 1
    }))
  }

  const xpProgress = useMemo(() => {
    const currentLevel = studentStats.level
    const currentLevelThreshold = Math.pow(currentLevel - 1, 2) * 100
    const nextLevelThreshold = Math.pow(currentLevel, 2) * 100
    const xpInCurrentLevel = xp - currentLevelThreshold
    const xpRequiredForLevel = nextLevelThreshold - currentLevelThreshold
    
    return {
      percent: Math.min((xpInCurrentLevel / xpRequiredForLevel) * 100, 100),
      current: xpInCurrentLevel,
      required: xpRequiredForLevel,
      nextTotal: nextLevelThreshold
    }
  }, [studentStats.level, xp])

  const quickLinks = [
    { href: "/student/rewards", label: "Đổi phần thưởng", icon: Gift },
    { href: "/student/profile", label: "Hồ sơ cá nhân", icon: User },
    { href: "/arena", label: "Đấu trường Arena", icon: Swords },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tổng hợp thành tích..." />
      </div>
    )
  }

  return (
    <StudentShell className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Topbar */}
      <StudentTopbar
        name={fullName}
        userXp={xp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Header Section */}
        <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-4 py-2 text-xs uppercase tracking-[0.2em] text-[#8C87A2]">
              <Award className="h-4 w-4 text-[#C18CFF]" /> Achievements
            </div>
            <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
              Thành tích học tập
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#8C87A2] max-w-2xl">
              Theo dõi tiến độ, điểm kinh nghiệm XP và những cột mốc vinh quang bạn đã đạt được trong hành trình chinh phục tri thức.
            </p>
          </div>

          {/* XP Progress Card */}
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-[#8C87A2] font-mono">TỔNG XP ĐÃ TÍCH LŨY</span>
              <span className="text-xs text-[#C18CFF] font-bold">Cấp {studentStats.level}</span>
            </div>
            <div className="text-3xl font-bold font-mono text-[#F1EDF9]">{xp.toLocaleString()} XP</div>
            
            <div className="mt-4 space-y-2">
              <div className="h-2 w-full rounded-full bg-[#0B0A13] overflow-hidden border border-[#8C87A2]/20">
                <div 
                  className="h-full bg-[#C18CFF] transition-all duration-700 ease-out" 
                  style={{ width: `${xpProgress.percent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[#8C87A2] font-mono">
                <span>Tiến trình cấp: {xpProgress.current} / {xpProgress.required} XP</span>
                <span>Còn {xpProgress.nextTotal - xp} XP lên cấp {studentStats.level + 1}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Links Grid */}
        <section className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-3">
          {quickLinks.map((item) => (
            <Link 
              key={item.href} 
              href={item.href} 
              className="flex items-center gap-3.5 rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-5 hover:border-[#C18CFF]/50 transition-colors group"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#8C87A2]/20 bg-[#0B0A13] text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors">
                <item.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#F1EDF9]">{item.label}</p>
                <p className="text-[10px] text-[#8C87A2] mt-0.5 font-mono">Truy cập nhanh</p>
              </div>
            </Link>
          ))}
        </section>

        {/* Details Grid */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-start">
          
          {/* Left Block: Badges / Achievements List */}
          <section className="overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]">
            <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
              <h2 className="flex items-center gap-2 text-lg font-bold text-[#F1EDF9]">
                <Award className="h-5 w-5 text-[#C18CFF]" /> Bộ sưu tập huy hiệu
              </h2>
              <p className="text-xs text-[#8C87A2] mt-0.5">Các cột mốc quan trọng được tự động mở khóa.</p>
            </div>
            <div className="p-5">
              <AchievementsGrid />
            </div>
          </section>

          {/* Right Block: Daily Checkin & Fast Actions */}
          <div className="space-y-6">
            {/* Daily Checkin Panel */}
            <section className="overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]">
              <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
                <h2 className="flex items-center gap-2 text-sm font-bold text-[#F1EDF9]">
                  <Flame className="h-5 w-5 text-[#C18CFF]" /> Điểm danh tích lũy
                </h2>
              </div>
              <div className="p-5">
                <DailyCheckIn onComplete={handleCheckInComplete} />
              </div>
            </section>

            {/* Quick Action Navigation */}
            <section className="overflow-hidden rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]">
              <div className="border-b border-[#8C87A2]/20 p-5 bg-[#0B0A13]/30">
                <h2 className="text-sm font-bold text-[#F1EDF9]">Tiện ích mở rộng</h2>
              </div>
              <div className="space-y-2 p-4">
                <Link href="/student/rewards" className="flex items-center gap-3 rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] px-4 py-3 font-semibold text-[#8C87A2] hover:text-[#F1EDF9] hover:border-[#C18CFF] hover:bg-[#C18CFF]/15 transition-all">
                  <Gift className="h-4 w-4 text-[#C18CFF]" /> Shop đổi thưởng
                </Link>
                <Link href="/student/profile" className="flex items-center gap-3 rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] px-4 py-3 font-semibold text-[#8C87A2] hover:text-[#F1EDF9] hover:border-[#C18CFF] hover:bg-[#C18CFF]/15 transition-all">
                  <User className="h-4 w-4 text-[#C18CFF]" /> Hồ sơ cá nhân
                </Link>
                <Link href="/arena" className="flex items-center gap-3 rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] px-4 py-3 font-semibold text-[#8C87A2] hover:text-[#F1EDF9] hover:border-[#C18CFF] hover:bg-[#C18CFF]/15 transition-all">
                  <Swords className="h-4 w-4 text-[#C18CFF]" /> Vào đấu trường Arena
                </Link>
              </div>
            </section>
          </div>

        </div>

      </main>
    </StudentShell>
  )
}
