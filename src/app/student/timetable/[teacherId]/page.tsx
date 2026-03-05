"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2, Calendar, Clock, BookOpen, User } from "lucide-react"
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

    const fetchData = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/login"); return }

        // Fetch teacher name
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", teacherId).single()
        if (profile) setTeacherName(profile.full_name || "Giáo viên")

        // Fetch timetable
        const { data } = await supabase
            .from("timetable_entries")
            .select("*")
            .eq("teacher_id", teacherId)
            .order("day_of_week")
            .order("start_time")
        if (data) setEntries(data)
        setLoading(false)
    }, [supabase, router, teacherId])

    useEffect(() => { fetchData() }, [fetchData])

    // Group by day
    const entriesByDay = useMemo(() => {
        const map: Record<number, TimetableEntry[]> = {}
        for (let i = 0; i < 7; i++) map[i] = []
        entries.forEach(e => map[e.day_of_week]?.push(e))
        return map
    }, [entries])

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>

    return (
        <div className="min-h-screen bg-background">
            <header className="glass-nav sticky top-0 z-30 border-b border-border/50 px-4 py-3">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <Link href="/student/dashboard"><Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Button></Link>
                    <div>
                        <h1 className="font-bold text-foreground text-lg flex items-center gap-2"><Calendar className="w-5 h-5 text-indigo-500" />Thời khóa biểu</h1>
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />{teacherName}</p>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4">
                {entries.length === 0 ? (
                    <div className="text-center py-20 text-muted-foreground">
                        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="font-medium text-foreground/60">Giáo viên chưa tạo thời khóa biểu</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => {
                            const dayEntries = entriesByDay[dayIdx]
                            if (dayEntries.length === 0) return null
                            const isToday = dayIdx === new Date().getDay()
                            return (
                                <div key={dayIdx} className={cn("glass-card rounded-2xl overflow-hidden", isToday && "ring-2 ring-indigo-500")}>
                                    <div className={cn("px-4 py-2.5 border-b border-border/50", isToday ? "bg-indigo-50 dark:bg-indigo-900/20" : "bg-muted/20")}>
                                        <p className={cn("font-bold text-sm", isToday ? "text-indigo-600 dark:text-indigo-400" : "text-foreground")}>
                                            {DAYS[dayIdx]} {isToday && <span className="text-xs font-normal ml-1">(Hôm nay)</span>}
                                        </p>
                                    </div>
                                    <div className="divide-y divide-border/30">
                                        {dayEntries.map(entry => (
                                            <div key={entry.id} className="px-4 py-3 flex items-center gap-3">
                                                <div className="w-1.5 h-12 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-sm text-foreground">{entry.subject}</p>
                                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</span>
                                                        {entry.class_name && <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{entry.class_name}</span>}
                                                        {entry.room && <span>{entry.room}</span>}
                                                    </div>
                                                    {entry.note && <p className="text-xs text-muted-foreground/70 mt-0.5 italic">{entry.note}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
