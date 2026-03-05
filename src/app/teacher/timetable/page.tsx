"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    ArrowLeft, Plus, Trash2, Loader2, Calendar, Clock, Edit2, X, Save, BookOpen
} from "lucide-react"
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
const HOURS = Array.from({ length: 13 }, (_, i) => i + 6) // 6:00 - 18:00
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4"]

export default function TeacherTimetablePage() {
    const router = useRouter()
    const supabase = useMemo(() => createClient(), [])

    const [entries, setEntries] = useState<TimetableEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)

    // Form fields
    const [formDay, setFormDay] = useState(1)
    const [formStart, setFormStart] = useState("07:00")
    const [formEnd, setFormEnd] = useState("08:30")
    const [formSubject, setFormSubject] = useState("")
    const [formClass, setFormClass] = useState("")
    const [formRoom, setFormRoom] = useState("")
    const [formNote, setFormNote] = useState("")
    const [formColor, setFormColor] = useState(COLORS[0])

    const fetchEntries = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/login"); return }
        const { data } = await supabase
            .from("timetable_entries")
            .select("*")
            .eq("teacher_id", user.id)
            .order("day_of_week")
            .order("start_time")
        if (data) setEntries(data)
        setLoading(false)
    }, [supabase, router])

    useEffect(() => { fetchEntries() }, [fetchEntries])

    const resetForm = () => {
        setFormDay(1); setFormStart("07:00"); setFormEnd("08:30")
        setFormSubject(""); setFormClass(""); setFormRoom(""); setFormNote("")
        setFormColor(COLORS[0]); setEditingId(null); setShowForm(false)
    }

    const handleEdit = (entry: TimetableEntry) => {
        setEditingId(entry.id); setFormDay(entry.day_of_week); setFormStart(entry.start_time.slice(0, 5))
        setFormEnd(entry.end_time.slice(0, 5)); setFormSubject(entry.subject)
        setFormClass(entry.class_name || ""); setFormRoom(entry.room || "")
        setFormNote(entry.note || ""); setFormColor(entry.color); setShowForm(true)
    }

    const handleSave = async () => {
        if (!formSubject.trim()) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const payload = {
            teacher_id: user.id,
            day_of_week: formDay,
            start_time: formStart,
            end_time: formEnd,
            subject: formSubject.trim(),
            class_name: formClass.trim() || null,
            room: formRoom.trim() || null,
            note: formNote.trim() || null,
            color: formColor,
        }
        if (editingId) {
            await supabase.from("timetable_entries").update(payload).eq("id", editingId)
        } else {
            await supabase.from("timetable_entries").insert(payload)
        }
        resetForm(); fetchEntries()
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa tiết học này?")) return
        await supabase.from("timetable_entries").delete().eq("id", id)
        fetchEntries()
    }

    // Group entries by day
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
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/teacher/dashboard"><Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Button></Link>
                        <div><h1 className="font-bold text-foreground text-lg">Thời khóa biểu</h1><p className="text-xs text-muted-foreground">Tạo và quản lý lịch dạy</p></div>
                    </div>
                    <Button onClick={() => { resetForm(); setShowForm(true) }} className="gradient-primary text-white border-0 shadow-md"><Plus className="w-4 h-4 mr-1" />Thêm tiết</Button>
                </div>
            </header>

            <main className="max-w-6xl mx-auto p-4 space-y-6">
                {/* Add/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="font-bold text-lg text-foreground">{editingId ? "Sửa tiết học" : "Thêm tiết học"}</h2>
                                <button onClick={resetForm} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-sm text-foreground font-medium">Ngày</Label>
                                    <select value={formDay} onChange={e => setFormDay(Number(e.target.value))} className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground mt-1">
                                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label className="text-sm text-foreground font-medium">Bắt đầu</Label><Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="bg-card border-border rounded-xl mt-1" /></div>
                                    <div><Label className="text-sm text-foreground font-medium">Kết thúc</Label><Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="bg-card border-border rounded-xl mt-1" /></div>
                                </div>
                                <div><Label className="text-sm text-foreground font-medium">Môn học *</Label><Input value={formSubject} onChange={e => setFormSubject(e.target.value)} placeholder="VD: Toán 12" className="bg-card border-border rounded-xl mt-1" /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label className="text-sm text-foreground font-medium">Lớp</Label><Input value={formClass} onChange={e => setFormClass(e.target.value)} placeholder="VD: 12A1" className="bg-card border-border rounded-xl mt-1" /></div>
                                    <div><Label className="text-sm text-foreground font-medium">Phòng</Label><Input value={formRoom} onChange={e => setFormRoom(e.target.value)} placeholder="VD: P301" className="bg-card border-border rounded-xl mt-1" /></div>
                                </div>
                                <div>
                                    <Label className="text-sm text-foreground font-medium">Màu sắc</Label>
                                    <div className="flex gap-2 mt-1">
                                        {COLORS.map(c => (
                                            <button key={c} onClick={() => setFormColor(c)} className={cn("w-7 h-7 rounded-full transition-all", formColor === c ? "ring-2 ring-offset-2 ring-indigo-500 scale-110" : "")} style={{ backgroundColor: c }} />
                                        ))}
                                    </div>
                                </div>
                                <div><Label className="text-sm text-foreground font-medium">Ghi chú</Label><Input value={formNote} onChange={e => setFormNote(e.target.value)} placeholder="Tùy chọn" className="bg-card border-border rounded-xl mt-1" /></div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button onClick={handleSave} disabled={!formSubject.trim()} className="flex-1 gradient-primary text-white border-0"><Save className="w-4 h-4 mr-1" />{editingId ? "Cập nhật" : "Thêm"}</Button>
                                <Button variant="outline" onClick={resetForm} className="border-border text-muted-foreground">Hủy</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Weekly Grid */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-[800px]">
                            {/* Day headers */}
                            <div className="grid grid-cols-7 border-b border-border/50">
                                {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => (
                                    <div key={dayIdx} className={cn("px-3 py-3 text-center border-r border-border/30 last:border-r-0",
                                        dayIdx === new Date().getDay() ? "bg-indigo-50 dark:bg-indigo-900/20" : ""
                                    )}>
                                        <p className={cn("text-sm font-bold", dayIdx === new Date().getDay() ? "text-indigo-600 dark:text-indigo-400" : "text-foreground")}>{DAYS[dayIdx]}</p>
                                        <p className="text-xs text-muted-foreground">{entriesByDay[dayIdx].length} tiết</p>
                                    </div>
                                ))}
                            </div>

                            {/* Entries grid */}
                            <div className="grid grid-cols-7 min-h-[400px]">
                                {[1, 2, 3, 4, 5, 6, 0].map(dayIdx => (
                                    <div key={dayIdx} className="border-r border-border/30 last:border-r-0 p-2 space-y-2">
                                        {entriesByDay[dayIdx].map(entry => (
                                            <div
                                                key={entry.id}
                                                className="rounded-xl p-2.5 text-white text-xs cursor-pointer group relative"
                                                style={{ backgroundColor: entry.color }}
                                                onClick={() => handleEdit(entry)}
                                            >
                                                <p className="font-bold text-sm leading-tight">{entry.subject}</p>
                                                <p className="opacity-90 flex items-center gap-1 mt-1"><Clock className="w-3 h-3" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</p>
                                                {entry.class_name && <p className="opacity-80 mt-0.5">{entry.class_name}</p>}
                                                {entry.room && <p className="opacity-70">{entry.room}</p>}
                                                <button onClick={e => { e.stopPropagation(); handleDelete(entry.id) }} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-black/20 rounded-lg hover:bg-black/40 transition-all">
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {entriesByDay[dayIdx].length === 0 && (
                                            <div className="h-full flex items-center justify-center text-muted-foreground/30">
                                                <Calendar className="w-6 h-6" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
