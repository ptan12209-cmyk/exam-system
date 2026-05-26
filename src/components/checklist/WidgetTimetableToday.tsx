"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Calendar, Clock, MapPin, User, PartyPopper } from "lucide-react"
import { cn } from "@/lib/utils"

interface TimetableEntry {
  id: string
  subject: string
  start_time: string
  end_time: string
  room: string | null
  class_name: string | null
  color: string | null
  note: string | null
  teacher_id: string
  profiles?: { full_name: string | null }
}

const DAY_NAMES_VI = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]

// Generate a stable pastel hue from a subject name
function subjectHue(subject: string): string {
  let hash = 0
  for (let i = 0; i < subject.length; i++) {
    hash = subject.charCodeAt(i) + ((hash << 5) - hash)
  }
  const h = Math.abs(hash) % 360
  return `hsl(${h}, 65%, 88%)`
}

export function WidgetTimetableToday() {
  const supabase = useMemo(() => createClient(), [])
  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)

  const todayIndex = new Date().getDay() // 0 = Sunday
  const todayName = DAY_NAMES_VI[todayIndex]

  useEffect(() => {
    const fetchToday = async () => {
      // Fetch all timetable entries for today's day_of_week
      // day_of_week in DB: 0=Sunday, 1=Monday... matches JS getDay()
      const { data } = await supabase
        .from("timetable_entries")
        .select("*, profiles:teacher_id(full_name)")
        .eq("day_of_week", todayIndex)
        .order("start_time", { ascending: true })

      if (data) setEntries(data as any)
      setLoading(false)
    }

    fetchToday()
  }, [supabase, todayIndex])

  // Format time string from "HH:MM:SS" to "HH:MM"
  const fmtTime = (t: string) => t?.substring(0, 5) || ""

  return (
    <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Calendar className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <h3 className="text-sm font-bold">Hôm nay — {todayName}</h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--foreground))]/20 border-t-[hsl(var(--foreground))]" />
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <PartyPopper className="mb-2 h-8 w-8 text-[hsl(var(--muted-foreground))]/25" />
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Không có tiết học hôm nay 🎉</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map((entry, idx) => (
            <div
              key={entry.id}
              className="group relative flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-[hsl(var(--muted))]/10"
            >
              {/* Period indicator */}
              <div 
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold"
                style={{ backgroundColor: subjectHue(entry.subject), color: "hsl(var(--foreground))" }}
              >
                {idx + 1}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold leading-tight truncate">{entry.subject}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {fmtTime(entry.start_time)} – {fmtTime(entry.end_time)}
                  </span>
                  {entry.room && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {entry.room}
                    </span>
                  )}
                  {entry.profiles?.full_name && (
                    <span className="flex items-center gap-0.5">
                      <User className="h-3 w-3" />
                      {entry.profiles.full_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
