"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { Calendar, Clock, Loader2, User, AlertCircle, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedSelect } from "@/components/ui/animated-select"
import { Label } from "@/components/ui/label"

interface TimetableEntry {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  subject: string
  class_name: string | null
  room: string | null
  note: string | null
  color: string
}

interface TeacherOption {
  id: string
  full_name: string | null
}

const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]

export default function GeneralStudentTimetablePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<"personal" | "teachers">("personal")

  // Shared States
  const [loading, setLoading] = useState(true)
  const [studentProfile, setStudentProfile] = useState<{ id: string; full_name?: string; class?: string } | null>(null)

  // Personal Timetable States
  const [personalEntries, setPersonalEntries] = useState<TimetableEntry[]>([])

  // Teacher Timetable States
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState("")
  const [teacherEntries, setTeacherEntries] = useState<TimetableEntry[]>([])
  const [teacherLoading, setTeacherLoading] = useState(false)

  // Fetch initial profile, personal entries and linked teachers
  useEffect(() => {
    ;(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push("/login")
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, class")
          .eq("id", user.id)
          .single()
        if (profile) setStudentProfile(profile)

        // 1. Fetch personal entries
        const { data: pData } = await supabase
          .from("student_timetable_entries")
          .select("*")
          .eq("student_id", user.id)
          .order("day_of_week")
          .order("start_time")

        // 1.5. Fetch class timetable entries from teacher schedule
        let classEntries: any[] = []
        if (profile && profile.class) {
          const { data: cData } = await supabase
            .from("timetable_entries")
            .select("*")
            .eq("class_name", profile.class)
            .order("day_of_week")
            .order("start_time")
          if (cData) classEntries = cData
        }

        // Merge and deduplicate
        const merged = [...(pData || [])]
        for (const entry of classEntries) {
          const exists = merged.some(e => 
            e.day_of_week === entry.day_of_week &&
            e.start_time.slice(0, 5) === entry.start_time.slice(0, 5) &&
            e.subject.toLowerCase() === entry.subject.toLowerCase()
          )
          if (!exists) {
            merged.push({
              id: entry.id,
              day_of_week: entry.day_of_week,
              start_time: entry.start_time,
              end_time: entry.end_time,
              subject: entry.subject,
              class_name: entry.class_name,
              room: entry.room,
              note: entry.note || "Lịch học chung của lớp",
              color: entry.color || '#6366f1'
            })
          }
        }

        // Sort by day and start time
        merged.sort((a, b) => {
          if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
          return a.start_time.localeCompare(b.start_time)
        })

        setPersonalEntries(merged)

        // 2. Fetch linked teachers
        const { data: links, error: linkError } = await supabase
          .from("parent_student_links")
          .select(`
            parent_id,
            profiles:parent_id ( id, full_name, role )
          `)
          .eq("student_id", user.id)

        if (!linkError && links) {
          // Filter profile role = 'teacher' (or both teacher and parent)
          const teacherList = (links as any[])
            .map(l => l.profiles)
            .filter(p => p && p.role === "teacher") as TeacherOption[]
          setTeachers(teacherList)
          
          if (teacherList.length > 0) {
            setSelectedTeacherId(teacherList[0].id)
          }
        }
      } catch (err) {
        console.error("Error loading timetable data:", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [supabase, router])

  // Fetch teacher entries when selected teacher changes
  useEffect(() => {
    if (!selectedTeacherId) {
      setTeacherEntries([])
      return
    }

    ;(async () => {
      setTeacherLoading(true)
      try {
        const { data } = await supabase
          .from("timetable_entries")
          .select("*")
          .eq("teacher_id", selectedTeacherId)
          .order("day_of_week")
          .order("start_time")
        if (data) setTeacherEntries(data)
      } catch (err) {
        console.error("Error loading teacher timetable:", err)
      } finally {
        setTeacherLoading(false)
      }
    })()
  }, [supabase, selectedTeacherId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Group entries by day helper
  const groupEntriesByDay = (entriesList: TimetableEntry[]) => {
    const map: Record<number, TimetableEntry[]> = {}
    for (let i = 0; i < 7; i++) map[i] = []
    entriesList.forEach((entry) => map[entry.day_of_week]?.push(entry))
    return map
  }

  const personalEntriesByDay = useMemo(() => groupEntriesByDay(personalEntries), [personalEntries])
  const teacherEntriesByDay = useMemo(() => groupEntriesByDay(teacherEntries), [teacherEntries])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]/40" />
      </div>
    )
  }

  const currentDayIdx = new Date().getDay()

  return (
    <StudentShell>
      <StudentHeader 
        name={studentProfile?.full_name} 
        studentClass={studentProfile?.class} 
        onLogout={handleLogout} 
      />
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] backdrop-blur-md">
              <Calendar className="h-4 w-4 text-violet-500" /> Thời khóa biểu học sinh
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl">
              Lịch Trình Học Tập
            </h1>
            <p className="mt-4 max-w-3xl text-sm sm:text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
              Theo dõi và đồng bộ hóa lịch học cá nhân do giáo viên giao và lịch dạy chung của lớp.
            </p>
          </div>

          {/* Quick stats / active view info */}
          <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Thời khóa biểu cá nhân</p>
              <div className="mt-1.5 text-2xl font-bold">{personalEntries.length} tiết</div>
            </div>
            <div className="border-l border-[hsl(var(--border))]/40 pl-6">
              <p className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Lớp liên kết</p>
              <div className="mt-1.5 text-lg font-semibold text-violet-500">{studentProfile?.class || "Chưa xếp"}</div>
            </div>
          </div>
        </section>

        {/* Tab Selection */}
        <section className="mt-8 border-b border-[hsl(var(--border))]/20 pb-2 flex gap-4">
          <button 
            onClick={() => setActiveTab("personal")}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
              activeTab === "personal" ? "border-violet-500 text-violet-500" : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            )}
          >
            <CalendarDays className="h-4 w-4" /> TKB của tôi
          </button>
          <button 
            onClick={() => setActiveTab("teachers")}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
              activeTab === "teachers" ? "border-violet-500 text-violet-500" : "border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            )}
          >
            <User className="h-4 w-4" /> Lịch học giáo viên
          </button>
        </section>

        {/* Tab 1: Personal Schedule */}
        {activeTab === "personal" && (
          <section className="mt-6 space-y-4 animate-in fade-in duration-300">
            {personalEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] py-20 text-center max-w-xl mx-auto">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-[hsl(var(--muted-foreground))]/30 animate-bounce" strokeWidth={1.2} />
                <p className="font-semibold text-base mb-1">Chưa có lịch học cá nhân</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto px-4 leading-normal">
                  Yêu cầu Giáo viên của bạn thiết lập Thời khóa biểu riêng cho bạn từ cổng giám sát.
                </p>
              </div>
            ) : (
              [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                const dayEntries = personalEntriesByDay[dayIdx]
                if (dayEntries.length === 0) return null
                const isToday = dayIdx === currentDayIdx

                return (
                  <article
                    key={dayIdx}
                    className={cn(
                      "overflow-hidden rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm transition-all hover:border-[hsl(var(--border))]",
                      isToday && "ring-1 ring-violet-500/30"
                    )}
                  >
                    <div className={cn("border-b border-[hsl(var(--border))]/30 px-5 py-3.5 flex justify-between items-center", isToday ? "bg-violet-500/5" : "bg-[hsl(var(--muted))]/10") }>
                      <p className="text-sm font-bold tracking-tight">
                        {DAYS[dayIdx]}
                      </p>
                      {isToday && (
                        <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[9px] font-bold text-violet-500 uppercase tracking-wider animate-pulse">
                          Hôm nay
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-[hsl(var(--border))]/20 bg-[hsl(var(--background))]/10">
                      {dayEntries.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[hsl(var(--muted))]/5">
                          <div className="mt-1.5 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold tracking-tight">{entry.subject}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                              <span className="flex items-center gap-1 bg-[hsl(var(--muted))]/40 px-2.5 py-1 rounded-full">
                                <Clock className="h-3 w-3" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                              </span>
                              {entry.class_name && <span className="px-2 py-0.5 rounded-full border border-[hsl(var(--border))]/30">{entry.class_name}</span>}
                              {entry.room && <span className="px-2 py-0.5 rounded-full border border-[hsl(var(--border))]/30">{entry.room}</span>}
                            </div>
                            {entry.note && (
                              <p className="mt-2 text-xs italic text-[hsl(var(--muted-foreground))] bg-[hsl(var(--foreground))]/5 p-2.5 rounded-lg border-l-2 border-[hsl(var(--border))]">
                                {entry.note}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                )
              })
            )}
          </section>
        )}

        {/* Tab 2: Teacher Schedule */}
        {activeTab === "teachers" && (
          <section className="mt-6 space-y-6 animate-in fade-in duration-300">
            {teachers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] py-20 text-center max-w-xl mx-auto">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[hsl(var(--muted-foreground))]/30" strokeWidth={1.2} />
                <p className="font-semibold text-base mb-1">Chưa liên kết giáo viên nào</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] max-w-sm mx-auto px-4 leading-normal">
                  Vui lòng cung cấp email của bạn cho giáo viên để họ tiến hành kết nối qua cổng giám sát từ xa.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Teacher Selector Card */}
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-sm space-y-3">
                  <Label className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] tracking-wider">Chọn giáo viên giảng dạy</Label>
                  <div className="max-w-xs">
                    <AnimatedSelect 
                      value={selectedTeacherId}
                      onValueChange={setSelectedTeacherId}
                      options={teachers.map(t => ({ value: t.id, label: t.full_name || "Chưa rõ tên" }))}
                      placeholder="Chọn giáo viên..."
                    />
                  </div>
                </div>

                {/* Teacher Schedule List */}
                {teacherLoading ? (
                  <div className="py-12 flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
                  </div>
                ) : teacherEntries.length === 0 ? (
                  <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] py-12 text-center text-sm text-[hsl(var(--muted-foreground))]/60 italic">
                    Giáo viên này chưa lên lịch học chung cho các lớp.
                  </div>
                ) : (
                  [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                    const dayEntries = teacherEntriesByDay[dayIdx]
                    if (dayEntries.length === 0) return null
                    const isToday = dayIdx === currentDayIdx

                    return (
                      <article
                        key={dayIdx}
                        className={cn(
                          "overflow-hidden rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm transition-all hover:border-[hsl(var(--border))]",
                          isToday && "ring-1 ring-violet-500/30"
                        )}
                      >
                        <div className={cn("border-b border-[hsl(var(--border))]/30 px-5 py-3.5 flex justify-between items-center", isToday ? "bg-violet-500/5" : "bg-[hsl(var(--muted))]/10") }>
                          <p className="text-sm font-bold tracking-tight">
                            {DAYS[dayIdx]}
                          </p>
                          {isToday && (
                            <span className="rounded-full bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 text-[9px] font-bold text-violet-500 uppercase tracking-wider animate-pulse">
                              Hôm nay
                            </span>
                          )}
                        </div>
                        <div className="divide-y divide-[hsl(var(--border))]/20 bg-[hsl(var(--background))]/10">
                          {dayEntries.map((entry) => (
                            <div key={entry.id} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[hsl(var(--muted))]/5">
                              <div className="mt-1.5 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold tracking-tight">{entry.subject}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">
                                  <span className="flex items-center gap-1 bg-[hsl(var(--muted))]/40 px-2.5 py-1 rounded-full">
                                    <Clock className="h-3.5 w-3.5" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                  </span>
                                  {entry.class_name && <span className="px-2 py-0.5 rounded-full border border-[hsl(var(--border))]/30">{entry.class_name}</span>}
                                  {entry.room && <span className="px-2 py-0.5 rounded-full border border-[hsl(var(--border))]/30">{entry.room}</span>}
                                </div>
                                {entry.note && (
                                  <p className="mt-2 text-xs italic text-[hsl(var(--muted-foreground))] bg-[hsl(var(--foreground))]/5 p-2.5 rounded-lg border-l-2 border-[hsl(var(--border))]">
                                    {entry.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </StudentShell>
  )
}
