"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentTopbar } from "@/components/student/StudentTopbar"
import { StudentNavTabs } from "@/components/student/StudentNavTabs"
import { XTimetable } from "./_components/XTimetable"
import { Calendar, Clock, Loader2, User, AlertCircle, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { AnimatedSelect } from "@/components/ui/animated-select"
import { Label } from "@/components/ui/label"
import { getUserStats } from "@/lib/gamification"

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

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

export default function GeneralStudentTimetablePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // Navigation / Tabs
  const [activeTab, setActiveTab] = useState<"personal" | "teachers">("personal")

  // Shared States
  const [loading, setLoading] = useState(true)
  const [studentProfile, setStudentProfile] = useState<{ id: string; full_name?: string; class?: string; nickname?: string | null } | null>(null)
  const [studentStats, setStudentStats] = useState({ xp: 0, level: 1, streak_days: 0 })

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
          .select("id, full_name, class, nickname")
          .eq("id", user.id)
          .single()
        if (profile) setStudentProfile(profile)

        // Fetch student gamification stats
        const { stats } = await getUserStats(user.id)
        setStudentStats(stats)

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
      <div className="min-h-screen bg-[var(--os-bg)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--os-accent)]" />
      </div>
    )
  }

  if (studentProfile?.nickname === "X") {
    return <XTimetable />
  }

  const currentDayIdx = new Date().getDay()

  return (
    <StudentShell className={cn("bg-[var(--os-bg)] text-[var(--os-fg)]", inter.className)}>
      {/* Topbar */}
      <StudentTopbar
        name={studentProfile?.full_name || ""}
        userXp={studentStats.xp}
        level={studentStats.level}
        streak={studentStats.streak_days}
        onLogout={handleLogout}
        nickname={studentProfile?.nickname}
        studentClass={studentProfile?.class}
      />

      {/* NavTabs */}
      <StudentNavTabs />

      <main className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">
        
        {/* Title Header Section */}
        <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--os-border)] bg-[var(--os-card)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--os-muted)]">
              <Calendar className="h-4 w-4 text-[var(--os-accent)]" /> Timetable Schedule
            </div>
            <h1 className={cn("text-4xl sm:text-5xl lg:text-6xl text-[var(--os-fg)] font-normal leading-tight", instrumentSerif.className)}>
              Thời khóa biểu lớp
            </h1>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--os-muted)] max-w-2xl">
              Theo dõi và đồng bộ hóa lịch học cá nhân do giáo viên phân bổ cũng như lịch học chính thức của lớp.
            </p>
          </div>

          {/* Quick stats box */}
          <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-2xl p-6 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-[var(--os-muted)] uppercase tracking-wider font-mono">Lịch cá nhân</p>
              <div className="mt-1 text-2xl font-bold font-mono text-[var(--os-fg)]">{personalEntries.length} tiết</div>
            </div>
            <div className="border-l border-[var(--os-border)] pl-6">
              <p className="text-[10px] font-bold text-[var(--os-muted)] uppercase tracking-wider font-mono">Lớp học hiện tại</p>
              <div className="mt-1 text-lg font-bold text-[var(--os-accent)]">{studentProfile?.class || "Chưa xếp"}</div>
            </div>
          </div>
        </section>

        {/* Tab Selection */}
        <section className="mt-8 border-b border-[var(--os-border)] pb-2 flex gap-4">
          <button 
            onClick={() => setActiveTab("personal")}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
              activeTab === "personal" ? "border-[var(--os-accent)] text-[var(--os-accent)]" : "border-transparent text-[var(--os-muted)] hover:text-[var(--os-fg)]"
            )}
          >
            <CalendarDays className="h-4 w-4" /> TKB của tôi
          </button>
          <button 
            onClick={() => setActiveTab("teachers")}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 transition-all flex items-center gap-2",
              activeTab === "teachers" ? "border-[var(--os-accent)] text-[var(--os-accent)]" : "border-transparent text-[var(--os-muted)] hover:text-[var(--os-fg)]"
            )}
          >
            <User className="h-4 w-4" /> Lịch học giáo viên
          </button>
        </section>

        {/* Tab 1: Personal Schedule */}
        {activeTab === "personal" && (
          <section className="mt-6 space-y-4 animate-in fade-in duration-300">
            {personalEntries.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--os-border)] bg-[var(--os-card)] py-20 text-center max-w-xl mx-auto">
                <Calendar className="mx-auto mb-4 h-12 w-12 text-[var(--os-muted)]/30 animate-bounce" strokeWidth={1.2} />
                <p className="font-bold text-base text-[var(--os-fg)] mb-1">Chưa có lịch học cá nhân</p>
                <p className="text-xs text-[var(--os-muted)] max-w-sm mx-auto px-4 leading-relaxed">
                  Liên hệ Giáo viên của bạn để được phân bổ thời khóa biểu học tập bổ trợ từ bảng điều khiển giám sát.
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
                      "overflow-hidden rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] shadow-sm transition-all hover:border-[var(--os-accent)]/50",
                      isToday && "ring-1 ring-[var(--os-accent)]/30"
                    )}
                  >
                    <div className={cn("border-b border-[var(--os-border)] px-5 py-3.5 flex justify-between items-center", isToday ? "bg-[var(--os-accent)]/5" : "bg-[var(--os-bg)]/40") }>
                      <p className="text-sm font-bold tracking-tight text-[var(--os-fg)]">
                        {DAYS[dayIdx]}
                      </p>
                      {isToday && (
                        <span className="rounded-full bg-[var(--os-accent)]/15 border border-[var(--os-accent)]/30 px-2.5 py-0.5 text-[9px] font-bold text-[var(--os-accent)] uppercase tracking-wider animate-pulse font-mono">
                          Hôm nay
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-[var(--os-border)] bg-[var(--os-card)]">
                      {dayEntries.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--os-bg)]/40">
                          <div className="mt-1.5 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold tracking-tight text-[var(--os-fg)]">{entry.subject}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[10px] font-bold text-[var(--os-muted)] font-mono">
                              <span className="flex items-center gap-1 bg-[var(--os-bg)] px-2.5 py-1 rounded-lg border border-[var(--os-border)]">
                                <Clock className="h-3 w-3 text-[var(--os-accent)]" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                              </span>
                              {entry.class_name && <span className="px-2 py-0.5 rounded-lg border border-[var(--os-border)] bg-[var(--os-bg)]">{entry.class_name}</span>}
                              {entry.room && <span className="px-2 py-0.5 rounded-lg border border-[var(--os-border)] bg-[var(--os-bg)]">{entry.room}</span>}
                            </div>
                            {entry.note && (
                              <p className="mt-2.5 text-xs italic text-[var(--os-muted)] bg-[var(--os-bg)] p-3 rounded-lg border-l-2 border-[var(--os-accent)]">
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
              <div className="rounded-2xl border border-dashed border-[var(--os-border)] bg-[var(--os-card)] py-20 text-center max-w-xl mx-auto">
                <AlertCircle className="mx-auto mb-4 h-12 w-12 text-[var(--os-muted)]/30" strokeWidth={1.2} />
                <p className="font-bold text-base text-[var(--os-fg)] mb-1">Chưa liên kết giáo viên nào</p>
                <p className="text-xs text-[var(--os-muted)] max-w-sm mx-auto px-4 leading-relaxed">
                  Cung cấp tài khoản email học sinh của bạn cho giáo viên để thiết lập liên kết thời khóa biểu.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Teacher Selector Card */}
                <div className="rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-5 shadow-sm space-y-3">
                  <Label className="text-xs uppercase font-bold text-[var(--os-muted)] tracking-wider font-mono">Chọn giáo viên giảng dạy</Label>
                  <div className="max-w-xs">
                    <AnimatedSelect 
                      value={selectedTeacherId}
                      onValueChange={setSelectedTeacherId}
                      options={teachers.map(t => ({ value: t.id, label: t.full_name || "Ẩn danh" }))}
                      placeholder="Chọn giáo viên..."
                    />
                  </div>
                </div>

                {/* Teacher Schedule List */}
                {teacherLoading ? (
                  <div className="py-12 flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-[var(--os-accent)]" />
                  </div>
                ) : teacherEntries.length === 0 ? (
                  <div className="rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] py-12 text-center text-xs text-[var(--os-muted)] italic">
                    Giáo viên này chưa lên lịch giảng dạy công khai cho các lớp học.
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
                          "overflow-hidden rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] shadow-sm transition-all hover:border-[var(--os-accent)]/50",
                          isToday && "ring-1 ring-[var(--os-accent)]/30"
                        )}
                      >
                        <div className={cn("border-b border-[var(--os-border)] px-5 py-3.5 flex justify-between items-center", isToday ? "bg-[var(--os-accent)]/5" : "bg-[var(--os-bg)]/40") }>
                          <p className="text-sm font-bold tracking-tight text-[var(--os-fg)]">
                            {DAYS[dayIdx]}
                          </p>
                          {isToday && (
                            <span className="rounded-full bg-[var(--os-accent)]/15 border border-[var(--os-accent)]/30 px-2.5 py-0.5 text-[9px] font-bold text-[var(--os-accent)] uppercase tracking-wider animate-pulse font-mono">
                              Hôm nay
                            </span>
                          )}
                        </div>
                        <div className="divide-y divide-[var(--os-border)] bg-[var(--os-card)]">
                          {dayEntries.map((entry) => (
                            <div key={entry.id} className="flex items-start gap-4 px-5 py-4 transition-colors hover:bg-[var(--os-bg)]/40">
                              <div className="mt-1.5 h-10 w-1 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold tracking-tight text-[var(--os-fg)]">{entry.subject}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-2.5 text-[10px] font-bold text-[var(--os-muted)] font-mono">
                                  <span className="flex items-center gap-1 bg-[var(--os-bg)] px-2.5 py-1 rounded-lg border border-[var(--os-border)]">
                                    <Clock className="h-3.5 w-3.5 text-[var(--os-accent)]" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                                  </span>
                                  {entry.class_name && <span className="px-2 py-0.5 rounded-lg border border-[var(--os-border)] bg-[var(--os-bg)]">{entry.class_name}</span>}
                                  {entry.room && <span className="px-2 py-0.5 rounded-lg border border-[var(--os-border)] bg-[var(--os-bg)]">{entry.room}</span>}
                                </div>
                                {entry.note && (
                                  <p className="mt-2.5 text-xs italic text-[var(--os-muted)] bg-[var(--os-bg)] p-3 rounded-lg border-l-2 border-[var(--os-accent)]">
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
