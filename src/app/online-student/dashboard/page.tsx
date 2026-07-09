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
import { cn } from "@/lib/utils"

function SubjectSvgIcon({ value, className = "h-8 w-8" }: { value: string; className?: string }) {
  switch (value) {
    case "toan":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-toan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="100%" stopColor="#06B6D4" />
            </linearGradient>
          </defs>
          <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="url(#grad-toan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 17L9 7L11 8" stroke="url(#grad-toan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 10C14 8 16 8 16 9C16 10 14 11 14 12V14H17" stroke="url(#grad-toan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 14H8" stroke="url(#grad-toan)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 17V17.01" stroke="url(#grad-toan)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case "ly":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-ly" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A855F7" />
              <stop offset="100%" stopColor="#7C3AED" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="3" fill="url(#grad-ly)" />
          <ellipse cx="12" cy="12" rx="9" ry="3" stroke="url(#grad-ly)" strokeWidth="1.5" transform="rotate(30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3" stroke="url(#grad-ly)" strokeWidth="1.5" transform="rotate(-30 12 12)" />
          <ellipse cx="12" cy="12" rx="9" ry="3" stroke="url(#grad-ly)" strokeWidth="1.5" transform="rotate(90 12 12)" />
        </svg>
      )
    case "hoa":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-hoa" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
          </defs>
          <path d="M10 2H14V5H10V2Z" fill="url(#grad-hoa)" />
          <path d="M12 5V9" stroke="url(#grad-hoa)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M19.5 17.5L14 7V5H10V7L4.5 17.5C3.5 19.5 5 22 7.2 22H16.8C19 22 20.5 19.5 19.5 17.5Z" stroke="url(#grad-hoa)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M6.5 18H17.5" stroke="url(#grad-hoa)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "van":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-van" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
          </defs>
          <path d="M12 6.5C10.5 4.5 7 4.5 4 4.5V18.5C7 18.5 10.5 18.5 12 20.5C13.5 18.5 17 18.5 20 18.5V4.5C17 4.5 13.5 4.5 12 6.5Z" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 6.5V20.5" stroke="url(#grad-van)" strokeWidth="1.5" />
          <path d="M15 8H18" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 11H18" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 14H18" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 8H9" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 11H9" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 14H9" stroke="url(#grad-van)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "su":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-su" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#CA8A04" />
            </linearGradient>
          </defs>
          <path d="M14 2H6C4.89543 2 4 2.89543 4 3.5V20.5C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20.5V8L14 2Z" stroke="url(#grad-su)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M14 2V8H20" stroke="url(#grad-su)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 13H16" stroke="url(#grad-su)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 17H13" stroke="url(#grad-su)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "dia":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-dia" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14B8A6" />
              <stop offset="100%" stopColor="#0D9488" />
            </linearGradient>
          </defs>
          <circle cx="12" cy="12" r="9" stroke="url(#grad-dia)" strokeWidth="1.5" />
          <path d="M3.6 9H20.4" stroke="url(#grad-dia)" strokeWidth="1.5" />
          <path d="M3.6 15H20.4" stroke="url(#grad-dia)" strokeWidth="1.5" />
          <path d="M12 3C13.5 5.5 14.5 8.5 14.5 12C14.5 15.5 13.5 18.5 12 21C10.5 18.5 9.5 15.5 9.5 12C9.5 8.5 10.5 5.5 12 3Z" stroke="url(#grad-dia)" strokeWidth="1.5" />
        </svg>
      )
    case "ktpl":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-ktpl" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#E11D48" />
            </linearGradient>
          </defs>
          <path d="M12 3V21" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M19 10C19 14 16 17 12 17C8 17 5 14 5 10" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 7H17L19 10" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 7H7L5 10" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 21H15" stroke="url(#grad-ktpl)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "sinh":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-sinh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#84CC16" />
              <stop offset="100%" stopColor="#65A30D" />
            </linearGradient>
          </defs>
          <path d="M4.5 10.5C4.5 10.5 7.5 13.5 12 10.5C16.5 7.5 19.5 10.5 19.5 10.5" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M4.5 13.5C4.5 13.5 7.5 10.5 12 13.5C16.5 16.5 19.5 13.5 19.5 13.5" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 11.5V12.5" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M9 10.8V13.2" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M12 11.2V12.8" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 10.8V13.2" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M18 11.5V12.5" stroke="url(#grad-sinh)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="4.5" cy="12" r="1.5" fill="url(#grad-sinh)" />
          <circle cx="19.5" cy="12" r="1.5" fill="url(#grad-sinh)" />
        </svg>
      )
    case "anh":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad-anh" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0EA5E9" />
              <stop offset="100%" stopColor="#0284C7" />
            </linearGradient>
          </defs>
          <path d="M21 11.5C21 16.1944 16.9706 20 12 20C10.7483 20 9.5599 19.7686 8.48797 19.344C6.55168 20.3015 4.38283 20.8093 2.1 20.9729C2.7915 19.4673 3.55011 17.6534 3.73179 16.0375C2.65171 14.774 2 13.2107 2 11.5C2 6.80558 6.02944 3 12 3C17.9706 3 21 6.80558 21 11.5Z" stroke="url(#grad-anh)" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M9 14.5L12 8.5L15 14.5" stroke="url(#grad-anh)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 12.5H14" stroke="url(#grad-anh)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )
    case "dgnl_hsa":
    case "dgnl_vact":
    case "dgnl_tsa":
      const color1 = value === "dgnl_hsa" ? "#D946EF" : (value === "dgnl_vact" ? "#D946EF" : "#8B5CF6")
      const color2 = value === "dgnl_hsa" ? "#DB2777" : (value === "dgnl_vact" ? "#7C3AED" : "#EC4899")
      const id = `grad-${value}`
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color1} />
              <stop offset="100%" stopColor={color2} />
            </linearGradient>
          </defs>
          <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={`url(#${id})`} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M2 17L12 22L22 17" stroke={`url(#${id})`} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M2 12L12 17L22 12" stroke={`url(#${id})`} strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 12V22" stroke={`url(#${id})`} strokeWidth="1.5" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )
  }
}

function getSubjectTheme(value: string) {
  switch (value) {
    case "toan": return { text: "text-blue-400", border: "hover:border-blue-500/50", glow: "hover:shadow-[0_0_30px_rgba(59,130,246,0.18)]", iconBg: "bg-blue-950/20 border-blue-900/30" }
    case "ly": return { text: "text-purple-400", border: "hover:border-purple-500/50", glow: "hover:shadow-[0_0_30px_rgba(168,85,247,0.18)]", iconBg: "bg-purple-950/20 border-purple-900/30" }
    case "hoa": return { text: "text-green-400", border: "hover:border-green-500/50", glow: "hover:shadow-[0_0_30px_rgba(16,185,129,0.18)]", iconBg: "bg-green-950/20 border-green-900/30" }
    case "van": return { text: "text-amber-400", border: "hover:border-amber-500/50", glow: "hover:shadow-[0_0_30px_rgba(245,158,11,0.18)]", iconBg: "bg-amber-950/20 border-amber-900/30" }
    case "su": return { text: "text-yellow-400", border: "hover:border-yellow-500/50", glow: "hover:shadow-[0_0_30px_rgba(234,179,8,0.18)]", iconBg: "bg-yellow-950/20 border-yellow-900/30" }
    case "dia": return { text: "text-teal-400", border: "hover:border-teal-500/50", glow: "hover:shadow-[0_0_30px_rgba(20,184,166,0.18)]", iconBg: "bg-teal-950/20 border-teal-900/30" }
    case "ktpl": return { text: "text-rose-400", border: "hover:border-rose-500/50", glow: "hover:shadow-[0_0_30px_rgba(244,63,94,0.18)]", iconBg: "bg-rose-950/20 border-rose-900/30" }
    case "sinh": return { text: "text-lime-400", border: "hover:border-lime-500/50", glow: "hover:shadow-[0_0_30px_rgba(132,204,22,0.18)]", iconBg: "bg-lime-950/20 border-lime-900/30" }
    case "anh": return { text: "text-sky-400", border: "hover:border-sky-500/50", glow: "hover:shadow-[0_0_30px_rgba(14,165,233,0.18)]", iconBg: "bg-sky-950/20 border-sky-900/30" }
    case "dgnl_hsa":
    case "dgnl_vact": return { text: "text-fuchsia-400", border: "hover:border-fuchsia-500/50", glow: "hover:shadow-[0_0_30px_rgba(217,70,239,0.18)]", iconBg: "bg-fuchsia-950/20 border-fuchsia-900/30" }
    case "dgnl_tsa": return { text: "text-violet-400", border: "hover:border-violet-500/50", glow: "hover:shadow-[0_0_30px_rgba(139,92,246,0.18)]", iconBg: "bg-violet-950/20 border-violet-900/30" }
    default: return { text: "text-gray-400", border: "hover:border-gray-500/50", glow: "hover:shadow-[0_0_30px_rgba(107,114,128,0.18)]", iconBg: "bg-gray-950/20 border-gray-900/30" }
  }
}

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
            {/* Ambient Background Glows */}
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#C18CFF]/5 blur-[80px] pointer-events-none" />
            <div className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-[#3B82F6]/5 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#C18CFF]" />
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#8C87A2] font-mono">
                    StudyHub E-Learning Portal
                  </span>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight font-serif-italic">
                Chào mừng, {profile?.full_name || "Học viên"}!
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#8C87A2] max-w-2xl">
                Hệ thống học tập qua bài giảng video và tài liệu tự học trực tuyến. Hãy lựa chọn môn học bên dưới để bắt đầu bài giảng của bạn.
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
              {allowedSubjects.map((subject) => {
                const theme = getSubjectTheme(subject.value)
                return (
                  <Link 
                    key={subject.value}
                    href={`/online-student/study?subject=${subject.value}`}
                    className={cn(
                      "group flex flex-col justify-between p-5 h-44 bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl transition-all duration-300 relative overflow-hidden",
                      theme.border,
                      theme.glow
                    )}
                  >
                    {/* Top Accent Gradient Border */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-[#8C87A2]/10 group-hover:bg-gradient-to-r group-hover:from-[#C18CFF] group-hover:to-[#3B82F6] transition-all" />

                    <div className="flex items-center justify-between">
                      <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl border bg-[#0B0A13] transition-colors duration-300", theme.iconBg)}>
                        <SubjectSvgIcon value={subject.value} className="h-7 w-7" />
                      </div>
                      <ChevronRight className="h-5 w-5 text-[#8C87A2] group-hover:text-[#C18CFF] transition-colors transform group-hover:translate-x-1" />
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-[#F1EDF9] tracking-tight group-hover:text-[#C18CFF] transition-colors">
                        {subject.label}
                      </h3>
                      <p className="text-xs text-[#8C87A2] mt-1.5 font-mono">
                        Bài giảng & tài liệu
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </main>
    </OnlineStudentShell>
  )
}
