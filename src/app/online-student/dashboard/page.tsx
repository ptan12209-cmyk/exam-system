"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Loading } from "@/components/shared/Loading"
import { ONLINE_SUBJECTS } from "@/lib/subjects"
import { BookOpen, ChevronRight, GraduationCap } from "lucide-react"

export default function OnlineStudentDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<{ full_name: string | null; role: string } | null>(null)
  const [loading, setLoading] = useState(true)

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

      if (!profileData || profileData.role !== "online_student") {
        router.push("/login")
        return
      }

      setProfile(profileData)
      setLoading(false)
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
        <Loading label="Khởi động không gian học tập trực tuyến..." />
      </div>
    )
  }

  return (
    <OnlineStudentShell>
      <OnlineStudentTopbar name={profile?.full_name} onLogout={handleLogout} />
      
      <main className="mx-auto max-w-7xl w-full px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Welcome Section */}
        <section className="mb-10">
          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 lg:p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C18CFF]" />
                <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#8C87A2] font-mono">
                  E-Learning Portal
                </span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight font-serif-italic">
                Chào mừng, {profile?.full_name || "Học viên"}!
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#8C87A2] italic max-w-2xl">
                "Hành trình vạn dặm bắt đầu từ một bước chân. Hãy chọn môn học để xem video bài giảng và tài liệu ôn tập trên Bunny.net."
              </p>
            </div>
          </div>
        </section>

        {/* Subjects Grid */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="h-5 w-5 text-[#C18CFF]" />
            <h2 className="text-lg font-bold text-[#F1EDF9] tracking-tight uppercase font-mono">Danh sách môn học</h2>
          </div>

          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {ONLINE_SUBJECTS.map((subject) => (
              <Link 
                key={subject.value}
                href={`/online-student/study?subject=${subject.value}`}
                className="group flex flex-col justify-between p-5 h-44 bg-[#15131F] border border-[#8C87A2]/20 hover:border-[#C18CFF] rounded-2xl transition-all duration-300 relative overflow-hidden"
              >
                {/* Subject Color Line */}
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
        </section>

      </main>
    </OnlineStudentShell>
  )
}
