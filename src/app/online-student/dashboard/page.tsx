"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Loading } from "@/components/shared/Loading"
import { ONLINE_SUBJECTS } from "@/lib/subjects"
import { BookOpen, ChevronRight, ShieldAlert, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function OnlineStudentDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ full_name: string | null; role: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [mySubjects, setMySubjects] = useState<string[]>([])

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()

      if (!profileData || (profileData.role !== "online_student" && profileData.role !== "student")) {
        router.push("/login")
        return
      }

      setProfile(profileData)

      // Fetch assigned online subjects
      try {
        const res = await fetch("/api/online-study/my-subjects")
        const data = await res.json()
        if (res.ok && data.success) {
          setMySubjects(data.data || [])
        }
      } catch (e) {
        console.error("Lỗi lấy môn học:", e)
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

  // Filter subjects based on permissions
  const allowedSubjects = useMemo(() => {
    if (mySubjects.includes("all")) {
      return ONLINE_SUBJECTS
    }
    return ONLINE_SUBJECTS.filter(s => mySubjects.includes(s.value))
  }, [mySubjects])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Khởi động không gian học tập trực tuyến..." />
      </div>
    )
  }

  return (
    <OnlineStudentShell>
      <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />
      
      <main className="mx-auto max-w-7xl w-full px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Welcome Section */}
        <section className="mb-8">
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 lg:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div>
              <div className="flex items-center gap-3 justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C18CFF]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#8C87A2] font-mono">
                    E-Learning Portal
                  </span>
                </div>
                

              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight font-serif-italic">
                Chào mừng, {profile?.full_name || "Học viên"}!
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#8C87A2] italic max-w-2xl">
                "Hành trình vạn dặm bắt đầu từ một bước chân. Hãy chọn môn học trực tuyến đã đăng ký để bắt đầu bài học."
              </p>
            </div>
          </div>
        </section>

        {/* Subjects Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[#C18CFF]" />
              <h2 className="text-lg font-bold text-[#F1EDF9] tracking-tight uppercase font-mono">Môn học của bạn</h2>
            </div>
            {mySubjects.includes("all") && (
              <span className="text-[9px] font-bold bg-[#C18CFF]/15 text-[#C18CFF] border border-[#C18CFF]/20 px-2 py-0.5 rounded-full font-mono">
                Cấp quyền tất cả môn học
              </span>
            )}
          </div>

          {allowedSubjects.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[#8C87A2]/30 bg-[#15131F]/10 p-16 text-center max-w-xl mx-auto mt-6">
              <ShieldAlert className="mx-auto h-12 w-12 text-[#8C87A2]/50" />
              <h3 className="mt-4 text-base font-bold text-[#F1EDF9]">Chưa có môn học trực tuyến</h3>
              <p className="mt-2 text-xs text-[#8C87A2] leading-relaxed">
                Tài khoản của bạn hiện chưa được giáo viên cấp quyền truy cập môn học online nào. Thầy/Cô có thể cấp quyền theo từng môn học trong mục quản trị. Vui lòng liên hệ giáo viên để đăng ký lớp học trực tuyến.
              </p>
              <div className="mt-6 flex justify-center">
                <Link href="/student/portal">
                  <Button className="rounded-xl border border-[#8C87A2]/20 bg-[#15131F] text-xs font-bold text-[#F1EDF9] hover:bg-[#15131F]/80 flex items-center gap-1">
                    <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Trang Chủ
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {allowedSubjects.map((subject) => (
                <Link 
                  key={subject.value}
                  href={`/online-student/study?subject=${subject.value}`}
                  className="group flex flex-col justify-between p-5 h-44 bg-[#15131F] border border-[#8C87A2]/20 hover:border-[#C18CFF] rounded-2xl transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-[#8C87A2]/20 group-hover:bg-[#C18CFF] transition-colors" />

                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B0A13] border border-[#8C87A2]/20 group-hover:border-[#C18CFF]/50 transition-colors">
                      <span className="text-2xl">{subject.icon}</span>
                    </div>
                    <ChevronRight className="h-5 w-5 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors transform group-hover:translate-x-1" />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#F1EDF9] tracking-tight group-hover:text-[#C18CFF] transition-colors">
                      {subject.label}
                    </h3>
                    <p className="text-xs text-[#8C87A2] mt-1.5 font-mono">
                      Học trực tuyến
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </main>
    </OnlineStudentShell>
  )
}
