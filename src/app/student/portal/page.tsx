"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Loading } from "@/components/shared/Loading"
import { BookOpen, FileText, Globe2, LogOut, ArrowRight, ShieldAlert } from "lucide-react"

export default function StudentPortalSelection() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ full_name: string | null; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasOnlinePermission, setHasOnlinePermission] = useState(false)

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()

      if (!profileData) {
        router.push("/login")
        return
      }

      setProfile(profileData)

      // If user is teacher or admin, redirect straight to teacher dashboard
      if (profileData.role === "teacher" || profileData.role === "admin") {
        router.push("/teacher/dashboard")
        return
      }

      // Check online learning subject permissions
      try {
        const res = await fetch("/api/online-study/my-subjects")
        const data = await res.json()
        if (res.ok && data.success) {
          const subjects = data.data || []
          setHasOnlinePermission(subjects.length > 0)
        }
      } catch (e) {
        console.error("Lỗi kiểm tra quyền môn học online:", e)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang kết nối cổng học tập..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0A13] text-[#F1EDF9] flex flex-col justify-between relative overflow-hidden">
      
      {/* Background Decorative Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8C87A2/5_1px,transparent_1px),linear-gradient(to_bottom,#8C87A2/5_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8C87A2]/30 bg-[#15131F] shadow-sm">
            <span className="text-base font-bold text-[#C18CFF] font-serif-italic">E</span>
          </div>
          <span className="text-lg font-bold tracking-tighter text-[#F1EDF9]">ExamHub</span>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-500 border border-red-500/10 hover:bg-red-500/5 rounded-xl transition-all"
        >
          <LogOut className="h-3.5 w-3.5" /> Đăng xuất
        </button>
      </header>

      {/* Main Selection Area */}
      <main className="max-w-4xl w-full mx-auto px-6 py-12 flex-1 flex flex-col justify-center relative z-10">
        
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-normal tracking-tight font-serif-italic mb-3">
            Chọn cổng học tập của bạn
          </h1>
          <p className="text-sm text-[#8C87A2] italic">
            Chào mừng quay lại, {profile?.full_name || "Học viên"}. Hãy chọn không gian học tập bên dưới để bắt đầu.
          </p>
        </div>

        {/* 2 Big Choice Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          
          {/* Choice 1: Practice & Exercises Dashboard */}
          <Link href="/student/dashboard" className="group">
            <div className="h-64 p-6 bg-[#15131F] border border-[#8C87A2]/20 hover:border-[#C18CFF] rounded-[2rem] flex flex-col justify-between transition-all duration-300 relative overflow-hidden group-hover:-translate-y-1">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#8C87A2]/20 group-hover:bg-[#C18CFF] transition-colors" />
              
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-[#0B0A13] border border-[#8C87A2]/20 flex items-center justify-center text-[#C18CFF]">
                  <FileText className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-[#8C87A2] group-hover:text-[#C18CFF] transition-all transform group-hover:translate-x-1" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-[#F1EDF9] tracking-tight group-hover:text-[#C18CFF] transition-colors">
                  Luyện đề & Bài tập
                </h3>
                <p className="text-xs text-[#8C87A2] mt-1.5 leading-relaxed">
                  Làm đề thi trắc nghiệm, bài tập tự luyện và theo dõi bảng xếp hạng thi đua học tập.
                </p>
              </div>
            </div>
          </Link>

          {/* Choice 2: Online Lectures E-learning Portal */}
          {hasOnlinePermission ? (
            /* Allowed: click to go online dashboard */
            <Link href="/online-student/dashboard" className="group">
              <div className="h-64 p-6 bg-[#15131F] border border-[#8C87A2]/20 hover:border-[#C18CFF] rounded-[2rem] flex flex-col justify-between transition-all duration-300 relative overflow-hidden group-hover:-translate-y-1">
                <div className="absolute top-0 left-0 w-full h-1 bg-[#8C87A2]/20 group-hover:bg-[#C18CFF] transition-colors" />
                
                <div className="flex justify-between items-start">
                  <div className="h-12 w-12 rounded-2xl bg-[#0B0A13] border border-[#8C87A2]/20 flex items-center justify-center text-[#C18CFF]">
                    <Globe2 className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-[#8C87A2] group-hover:text-[#C18CFF] transition-all transform group-hover:translate-x-1" />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-[#F1EDF9] tracking-tight group-hover:text-[#C18CFF] transition-colors">
                    Học Online Trực Tuyến
                  </h3>
                  <p className="text-xs text-[#8C87A2] mt-1.5 leading-relaxed">
                    Xem video bài giảng chuyên sâu và tài liệu ôn tập được biên soạn trực tiếp từ giáo viên.
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            /* Blocked: Show locked layout */
            <div className="h-64 p-6 bg-[#15131F]/30 border border-[#8C87A2]/10 rounded-[2rem] flex flex-col justify-between relative overflow-hidden cursor-not-allowed">
              <div className="flex justify-between items-start">
                <div className="h-12 w-12 rounded-2xl bg-[#0B0A13]/40 border border-[#8C87A2]/10 flex items-center justify-center text-[#8C87A2]">
                  <Globe2 className="h-6 w-6 opacity-40" />
                </div>
                <span className="text-[9px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-mono flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> Chưa cấp quyền
                </span>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-[#8C87A2] tracking-tight">
                  Học Online Trực Tuyến
                </h3>
                <p className="text-xs text-[#8C87A2]/70 mt-1.5 leading-relaxed">
                  Cổng học trực tuyến hiện đang khóa. Vui lòng liên hệ với thầy/cô để được cấp quyền mở môn học online.
                </p>
              </div>
            </div>
          )}

        </div>

      </main>

      {/* Footer PWA Labels */}
      <footer className="max-w-7xl w-full mx-auto px-6 py-6 text-center text-[10px] text-[#8C87A2]/40 font-mono">
        © 2026 ExamHub E-Learning platform. All rights reserved.
      </footer>

    </div>
  )
}
