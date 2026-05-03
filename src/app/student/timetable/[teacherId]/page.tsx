"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { Calendar, Clock, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

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

const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]

export default function StudentTimetablePage() {
  const router = useRouter()
  const params = useParams()
  const teacherId = params.teacherId as string
  const supabase = useMemo(() => createClient(), [])

  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [teacherName, setTeacherName] = useState("")
  const [loading, setLoading] = useState(true)
  const [studentProfile, setStudentProfile] = useState<{ full_name?: string; class?: string } | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("full_name, class").eq("id", user.id).single()
      if (profile) setStudentProfile(profile)

      const { data: tProfile } = await supabase.from("profiles").select("full_name").eq("id", teacherId).single()
      setTeacherName(tProfile?.full_name || "Giáo viên")

      const { data } = await supabase
        .from("timetable_entries")
        .select("*")
        .eq("teacher_id", teacherId)
        .order("day_of_week")
        .order("start_time")

      if (data) setEntries(data)
      setLoading(false)
    })()
  }, [supabase, router, teacherId])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

  const entriesByDay = useMemo(() => {
    const map: Record<number, TimetableEntry[]> = {}
    for (let i = 0; i < 7; i++) map[i] = []
    entries.forEach((entry) => map[entry.day_of_week]?.push(entry))
    return map
  }, [entries])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]/40" />
      </div>
    )
  }

  return (
    <StudentShell>
      <StudentHeader 
        name={studentProfile?.full_name} 
        studentClass={studentProfile?.class} 
        onLogout={handleLogout} 
      />
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] backdrop-blur-md">
              <Calendar className="h-4 w-4" /> Timetable
            </div>
            <h1 className="max-w-4xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">Thời khóa biểu</h1>
            <p className="mt-6 max-w-3xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">
              Lịch học theo giáo viên, được sắp xếp rõ ràng theo từng ngày trong tuần.
            </p>
          </div>

          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-sm">
            <p className="text-sm text-[hsl(var(--muted-foreground))] uppercase tracking-wider text-[10px] font-bold">Giáo viên</p>
            <div className="mt-2 text-2xl font-bold tracking-tight">{teacherName}</div>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{entries.length} buổi học trong tuần</p>
          </div>
        </section>

        <section className="mt-12 space-y-4">
          {entries.length === 0 ? (
            <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] py-20 text-center">
              <Calendar className="mx-auto mb-4 h-16 w-16 text-[hsl(var(--muted-foreground))]/20" />
              <p className="font-medium">Giáo viên chưa tạo thời khóa biểu</p>
            </div>
          ) : (
            [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
              const dayEntries = entriesByDay[dayIdx]
              if (dayEntries.length === 0) return null
              const isToday = dayIdx === new Date().getDay()

              return (
                <article
                  key={dayIdx}
                  className={cn(
                    "overflow-hidden rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm transition-all hover:border-[hsl(var(--border))]",
                    isToday && "ring-1 ring-[hsl(var(--foreground))]/20"
                  )}
                >
                  <div className={cn("border-b border-[hsl(var(--border))]/50 px-5 py-4", isToday ? "bg-[hsl(var(--muted))]/30" : "bg-[hsl(var(--muted))]/10") }>
                    <p className="text-sm font-bold tracking-tight">
                      {DAYS[dayIdx]} {isToday && <span className="ml-2 rounded-full bg-[hsl(var(--foreground))] px-2 py-0.5 text-[10px] font-bold text-[hsl(var(--background))] uppercase">Hôm nay</span>}
                    </p>
                  </div>
                  <div className="divide-y divide-[hsl(var(--border))]/40">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-5 px-5 py-5 transition-colors hover:bg-[hsl(var(--muted))]/10">
                        <div className="mt-1 h-12 w-1 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-bold tracking-tight">{entry.subject}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs font-medium text-[hsl(var(--muted-foreground))]">
                            <span className="flex items-center gap-1.5 bg-[hsl(var(--muted))]/30 px-2.5 py-1 rounded-full">
                              <Clock className="h-3.5 w-3.5" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                            </span>
                            {entry.class_name && <span className="px-2.5 py-1 rounded-full border border-[hsl(var(--border))]/40">{entry.class_name}</span>}
                            {entry.room && <span className="px-2.5 py-1 rounded-full border border-[hsl(var(--border))]/40">{entry.room}</span>}
                          </div>
                          {entry.note && <p className="mt-3 text-xs italic text-[hsl(var(--muted-foreground))] bg-[hsl(var(--foreground))]/5 p-3 rounded-xl border-l-2 border-[hsl(var(--border))]">{entry.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              )
            })
          )}
        </section>
      </main>
    </StudentShell>
  )
}
