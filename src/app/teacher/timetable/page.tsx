"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { ArrowLeft, Plus, Trash2, Calendar, Clock, X, Save, GraduationCap } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { DotmSquare1 } from "@/components/ui/dotm-square-1"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

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
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4"]

export default function TeacherTimetablePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formDay, setFormDay] = useState(1)
  const [formStart, setFormStart] = useState("07:00")
  const [formEnd, setFormEnd] = useState("08:30")
  const [formSubject, setFormSubject] = useState("")
  const [formClass, setFormClass] = useState("")
  const [formRoom, setFormRoom] = useState("")
  const [formNote, setFormNote] = useState("")
  const [formColor, setFormColor] = useState(COLORS[0])
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push("/login"); return }
    const { data } = await supabase.from("timetable_entries").select("*").eq("teacher_id", user.id).order("day_of_week").order("start_time")
    if (data) setEntries(data)
    setLoading(false)
  }, [supabase, router])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const resetForm = () => { setFormDay(1); setFormStart("07:00"); setFormEnd("08:30"); setFormSubject(""); setFormClass(""); setFormRoom(""); setFormNote(""); setFormColor(COLORS[0]); setEditingId(null); setShowForm(false) }
  const handleEdit = (entry: TimetableEntry) => { setEditingId(entry.id); setFormDay(entry.day_of_week); setFormStart(entry.start_time.slice(0, 5)); setFormEnd(entry.end_time.slice(0, 5)); setFormSubject(entry.subject); setFormClass(entry.class_name || ""); setFormRoom(entry.room || ""); setFormNote(entry.note || ""); setFormColor(entry.color); setShowForm(true) }
  const handleSave = async () => { if (!formSubject.trim()) return; const { data: { user } } = await supabase.auth.getUser(); if (!user) return; const payload = { teacher_id: user.id, day_of_week: formDay, start_time: formStart, end_time: formEnd, subject: formSubject.trim(), class_name: formClass.trim() || null, room: formRoom.trim() || null, note: formNote.trim() || null, color: formColor }; if (editingId) await supabase.from("timetable_entries").update(payload).eq("id", editingId); else await supabase.from("timetable_entries").insert(payload); resetForm(); fetchEntries() }
  const executeDelete = async () => {
    if (!deleteTarget) return
    await supabase.from("timetable_entries").delete().eq("id", deleteTarget)
    fetchEntries()
  }
  const entriesByDay = useMemo(() => { const map: Record<number, TimetableEntry[]> = {}; for (let i = 0; i < 7; i++) map[i] = []; entries.forEach((e) => map[e.day_of_week]?.push(e)); return map }, [entries])

  if (loading) return <Loading fullPage label="Đang tải thời khóa biểu..." />

  return (
    <TeacherShell onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }}>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10 pt-20 lg:pt-10 pb-24">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div><p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]"><Calendar className="h-3.5 w-3.5" /> Timetable</p><h1 className="text-4xl font-semibold tracking-tight md:text-6xl">Thời khóa biểu</h1><p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">Tạo và quản lý lịch dạy trong tuần của bạn.</p></div>
          <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6"><p className="text-sm text-[hsl(var(--muted-foreground))]">Tổng tiết</p><div className="mt-2 text-3xl font-semibold">{entries.length}</div><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Đang hiển thị</p></div>
        </section>

        <div className="mb-6"><Button onClick={() => { resetForm(); setShowForm(true) }} className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Plus className="mr-2 h-4 w-4" />Thêm tiết</Button></div>

        {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{editingId ? "Sửa tiết học" : "Thêm tiết học"}</h2><button onClick={resetForm} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]/20"><X className="h-5 w-5" /></button></div><div className="space-y-3"><div><Label>Ngày</Label><select value={formDay} onChange={(e) => setFormDay(Number(e.target.value))} className="mt-1 w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 py-2 text-sm">{DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}</select></div><div className="grid grid-cols-2 gap-3"><div><Label>Bắt đầu</Label><Input type="time" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="mt-1 rounded-xl" /></div><div><Label>Kết thúc</Label><Input type="time" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="mt-1 rounded-xl" /></div></div><div><Label>Môn học *</Label><Input value={formSubject} onChange={(e) => setFormSubject(e.target.value)} placeholder="VD: Toán 12" className="mt-1 rounded-xl" /></div><div className="grid grid-cols-2 gap-3"><div><Label>Lớp</Label><Input value={formClass} onChange={(e) => setFormClass(e.target.value)} placeholder="VD: 12A1" className="mt-1 rounded-xl" /></div><div><Label>Phòng</Label><Input value={formRoom} onChange={(e) => setFormRoom(e.target.value)} placeholder="VD: P301" className="mt-1 rounded-xl" /></div></div><div><Label>Màu sắc</Label><div className="mt-2 flex gap-2">{COLORS.map((c) => <button key={c} type="button" onClick={() => setFormColor(c)} className={cn("h-7 w-7 rounded-full transition-all", formColor === c ? "ring-2 ring-offset-2 ring-[hsl(var(--foreground))] scale-110" : "")} style={{ backgroundColor: c }} />)}</div></div><div><Label>Ghi chú</Label><Input value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="Tùy chọn" className="mt-1 rounded-xl" /></div></div><div className="flex gap-2 pt-2"><Button onClick={handleSave} disabled={!formSubject.trim()} className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"><Save className="mr-2 h-4 w-4" />{editingId ? "Cập nhật" : "Thêm"}</Button><Button variant="outline" onClick={resetForm} className="rounded-full">Hủy</Button></div></div></div>}

        <section className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-7 border-b border-[hsl(var(--border))]/50">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => <div key={dayIdx} className={cn("border-r border-[hsl(var(--border))]/30 px-3 py-3 text-center last:border-r-0", dayIdx === new Date().getDay() ? "bg-[hsl(var(--muted))]/20" : "")}><p className="text-sm font-semibold">{DAYS[dayIdx]}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{entriesByDay[dayIdx].length} tiết</p></div>)}
              </div>
              <div className="grid min-h-[420px] grid-cols-7">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => <div key={dayIdx} className="space-y-2 border-r border-[hsl(var(--border))]/30 p-2 last:border-r-0">{entriesByDay[dayIdx].map((entry) => <div key={entry.id} className="group relative cursor-pointer rounded-xl p-2.5 text-white" style={{ backgroundColor: entry.color }} onClick={() => handleEdit(entry)}><p className="text-sm font-semibold leading-tight">{entry.subject}</p><p className="mt-1 flex items-center gap-1 opacity-90"><Clock className="h-3 w-3" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</p>{entry.class_name && <p className="mt-0.5 opacity-80">{entry.class_name}</p>}{entry.room && <p className="opacity-70">{entry.room}</p>}<button onClick={(e) => { e.stopPropagation(); setDeleteTarget(entry.id) }} className="absolute right-1 top-1 rounded-lg bg-black/20 p-1 opacity-0 transition-all group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button></div>)}{entriesByDay[dayIdx].length === 0 && <div className="flex h-full items-center justify-center text-[hsl(var(--muted-foreground))]/30"><Calendar className="h-6 w-6" /></div>}</div>)}
              </div>
            </div>
          </div>
        </section>
      </main>
      <TeacherBottomNav />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        title="Xóa tiết học?"
        description="Bạn có chắc muốn xóa tiết học này khỏi thời khóa biểu dạy của bạn?"
        confirmText="Xóa"
        cancelText="Hủy"
        variant="danger"
      />
    </TeacherShell>
  )
}
