"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { Plus, Trash2, Calendar, Clock, X, Save, BarChart3 } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { cn } from "@/lib/utils"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { useAuth } from "@/hooks/useAuth"

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
const COLORS = ["#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#3B82F6", "#EF4444", "#06B6D4", "#6366F1"]

const instrumentSerif = { className: "font-instrument-serif" }
const inter = { className: "font-inter" }

export default function TeacherTimetablePage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { user, profile, loading: authLoading, signOut } = useAuth({ requiredRole: "teacher" })

  const [entries, setEntries] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form states
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
    if (!user) return
    const { data } = await supabase
      .from("timetable_entries")
      .select("*")
      .eq("teacher_id", user.id)
      .order("day_of_week")
      .order("start_time")
    
    if (data) {
      setEntries(data)
    }
    setLoading(false)
  }, [supabase, user])

  useEffect(() => {
    if (user) {
      fetchEntries()
    }
  }, [user, fetchEntries])

  const resetForm = () => {
    setFormDay(1)
    setFormStart("07:00")
    setFormEnd("08:30")
    setFormSubject("")
    setFormClass("")
    setFormRoom("")
    setFormNote("")
    setFormColor(COLORS[0])
    setEditingId(null)
    setShowForm(false)
  }

  const handleEdit = (entry: TimetableEntry) => {
    setEditingId(entry.id)
    setFormDay(entry.day_of_week)
    setFormStart(entry.start_time.slice(0, 5))
    setFormEnd(entry.end_time.slice(0, 5))
    setFormSubject(entry.subject)
    setFormClass(entry.class_name || "")
    setFormRoom(entry.room || "")
    setFormNote(entry.note || "")
    setFormColor(entry.color)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!formSubject.trim() || !user) return
    
    const payload = {
      teacher_id: user.id,
      day_of_week: formDay,
      start_time: formStart,
      end_time: formEnd,
      subject: formSubject.trim(),
      class_name: formClass.trim() || null,
      room: formRoom.trim() || null,
      note: formNote.trim() || null,
      color: formColor
    }

    if (editingId) {
      await supabase.from("timetable_entries").update(payload).eq("id", editingId)
    } else {
      await supabase.from("timetable_entries").insert(payload)
    }
    
    resetForm()
    fetchEntries()
  }

  const executeDelete = async () => {
    if (!deleteTarget) return
    await supabase.from("timetable_entries").delete().eq("id", deleteTarget)
    setDeleteTarget(null)
    fetchEntries()
  }

  const entriesByDay = useMemo(() => {
    const map: Record<number, TimetableEntry[]> = {}
    for (let i = 0; i < 7; i++) {
      map[i] = []
    }
    entries.forEach((e) => {
      map[e.day_of_week]?.push(e)
    })
    return map
  }, [entries])

  const handleLogout = async () => {
    await signOut()
  }

  const pageLoading = authLoading || loading

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tải thời khóa biểu..." />
      </div>
    )
  }

  const currentDayOfWeek = new Date().getDay()

  return (
    <TeacherShell onLogout={handleLogout} className={cn("bg-[#0B0A13] text-[#F1EDF9]", inter.className)}>
      {/* Mobile Top Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#8C87A2]/20 bg-[#0B0A13]/90 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#8C87A2]/20">
              <BarChart3 className="h-4 w-4 text-[#C18CFF]" />
            </div>
            <span className="text-lg font-bold tracking-tighter">ExamHub</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu userName={profile?.full_name || ""} userClass="Giáo viên" onLogout={handleLogout} role="teacher" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">
        
        {/* Banner Section */}
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8C87A2]">
              <Calendar className="h-3.5 w-3.5 text-[#C18CFF]" /> Timetable Manager
            </p>
            <h1 className={cn("text-4xl md:text-5xl lg:text-6xl text-[#F1EDF9] font-normal leading-tight", instrumentSerif.className)}>
              Thời khóa biểu giảng dạy
            </h1>
            <p className="mt-3 text-sm text-[#8C87A2] max-w-xl">
              Tạo, sắp xếp và theo dõi lịch giảng dạy và các ca thi đấu trực tuyến của bạn trong tuần.
            </p>
          </div>

          <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <p className="text-xs font-mono uppercase text-[#8C87A2]">Tổng số ca dạy/học</p>
              <div className="mt-1 text-3xl font-bold text-[#F1EDF9]">{entries.length} ca</div>
            </div>
          </div>
        </section>

        {/* Action Button */}
        <div className="mb-6">
          <Button 
            onClick={() => { resetForm(); setShowForm(true) }} 
            className="rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] px-5 py-5 text-xs font-bold shadow-md gap-2"
          >
            <Plus className="w-4 h-4 shrink-0" strokeWidth={2.5} /> Thêm ca giảng dạy mới
          </Button>
        </div>

        {/* Timetable Grid View */}
        <section className="rounded-xl border border-[#8C87A2]/20 bg-[#15131F] overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              
              {/* Grid Header Days */}
              <div className="grid grid-cols-7 border-b border-[#8C87A2]/20 bg-[#0B0A13]/30">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
                  <div 
                    key={dayIdx} 
                    className={cn(
                      "border-r border-[#8C87A2]/10 px-3 py-4 text-center last:border-r-0",
                      dayIdx === currentDayOfWeek ? "bg-[#C18CFF]/10 text-[#C18CFF]" : "text-[#F1EDF9]"
                    )}
                  >
                    <p className="text-xs font-bold tracking-wider">{DAYS[dayIdx]}</p>
                    <p className="text-[10px] text-[#8C87A2] font-mono mt-0.5">{entriesByDay[dayIdx].length} ca</p>
                  </div>
                ))}
              </div>

              {/* Grid Content */}
              <div className="grid min-h-[460px] grid-cols-7">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => (
                  <div 
                    key={dayIdx} 
                    className={cn(
                      "space-y-3 border-r border-[#8C87A2]/10 p-3 last:border-r-0 bg-[#0B0A13]/5",
                      dayIdx === currentDayOfWeek ? "bg-[#C18CFF]/5" : ""
                    )}
                  >
                    {entriesByDay[dayIdx].map((entry) => (
                      <div 
                        key={entry.id} 
                        className="group relative cursor-pointer rounded-xl p-3 text-white transition-all hover:scale-[1.02] shadow-sm" 
                        style={{ backgroundColor: entry.color }} 
                        onClick={() => handleEdit(entry)}
                      >
                        <p className="text-xs font-bold leading-tight">{entry.subject}</p>
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] opacity-90 font-mono">
                          <Clock className="h-3 w-3" />
                          {entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}
                        </p>
                        
                        {entry.class_name && (
                          <p className="mt-1 text-[9px] font-medium bg-black/15 px-1.5 py-0.5 rounded w-max">
                            Lớp {entry.class_name}
                          </p>
                        )}
                        
                        {entry.room && (
                          <p className="text-[9px] opacity-85 mt-0.5 font-mono">
                            Phòng: {entry.room}
                          </p>
                        )}
                        
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation()
                            setDeleteTarget(entry.id) 
                          }} 
                          className="absolute right-2 top-2 rounded-lg bg-black/20 p-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-black/40"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {entriesByDay[dayIdx].length === 0 && (
                      <div className="flex h-full min-h-[120px] items-center justify-center text-[#8C87A2]/15">
                        <Calendar className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Timetable Edit/Add Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-6 space-y-4 text-[#F1EDF9] shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#8C87A2]/10 pb-3">
                <h2 className="text-base font-bold text-[#F1EDF9]">{editingId ? "Cập nhật ca giảng dạy" : "Thêm ca dạy học mới"}</h2>
                <button onClick={resetForm} className="rounded-full p-1.5 hover:bg-[#8C87A2]/20 text-[#8C87A2]">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Day Selection */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Ngày trong tuần</Label>
                  <select 
                    value={formDay} 
                    onChange={(e) => setFormDay(Number(e.target.value))} 
                    className="w-full rounded-xl border border-[#8C87A2]/30 bg-[#0B0A13] px-3 py-2.5 text-sm text-[#F1EDF9] outline-none focus:border-[#C18CFF]"
                  >
                    {DAYS.map((d, i) => (
                      <option key={i} value={i} className="bg-[#15131F]">
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Thời gian bắt đầu</Label>
                    <Input 
                      type="time" 
                      value={formStart} 
                      onChange={(e) => setFormStart(e.target.value)} 
                      className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF]" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Thời gian kết thúc</Label>
                    <Input 
                      type="time" 
                      value={formEnd} 
                      onChange={(e) => setFormEnd(e.target.value)} 
                      className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF]" 
                    />
                  </div>
                </div>

                {/* Subject name */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Môn học/Tiết học *</Label>
                  <Input 
                    value={formSubject} 
                    onChange={(e) => setFormSubject(e.target.value)} 
                    placeholder="VD: Toán học 12A1" 
                    className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF]" 
                  />
                </div>

                {/* Class & Room */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Lớp học</Label>
                    <Input 
                      value={formClass} 
                      onChange={(e) => setFormClass(e.target.value)} 
                      placeholder="VD: 12A1" 
                      className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF]" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Phòng học</Label>
                    <Input 
                      value={formRoom} 
                      onChange={(e) => setFormRoom(e.target.value)} 
                      placeholder="VD: P302" 
                      className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF]" 
                    />
                  </div>
                </div>

                {/* Color Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Màu hiển thị</Label>
                  <div className="mt-1 flex flex-wrap gap-2.5">
                    {COLORS.map((c) => (
                      <button 
                        key={c} 
                        type="button" 
                        onClick={() => setFormColor(c)} 
                        className={cn(
                          "h-6 w-6 rounded-full transition-all border border-black/20",
                          formColor === c ? "ring-2 ring-offset-2 ring-offset-[#15131F] ring-[#C18CFF] scale-110" : "hover:scale-105"
                        )} 
                        style={{ backgroundColor: c }} 
                      />
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#8C87A2] uppercase tracking-wider font-mono">Ghi chú thêm</Label>
                  <Input 
                    value={formNote} 
                    onChange={(e) => setFormNote(e.target.value)} 
                    placeholder="VD: Lớp ôn chuyên đề nâng cao" 
                    className="rounded-xl border-[#8C87A2]/30 bg-[#0B0A13] text-[#F1EDF9] focus:border-[#C18CFF]" 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-[#8C87A2]/10">
                <Button 
                  onClick={handleSave} 
                  disabled={!formSubject.trim()} 
                  className="flex-1 rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-bold text-xs py-5"
                >
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  {editingId ? "Cập nhật" : "Lưu lịch dạy"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={resetForm} 
                  className="rounded-xl border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent text-xs py-5 px-5"
                >
                  Hủy
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <TeacherBottomNav />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={executeDelete}
        title="Xóa tiết học?"
        description="Bạn có chắc chắn muốn xóa ca giảng dạy này khỏi thời khóa biểu dạy của mình? Lịch học của học sinh liên kết cũng sẽ bị đồng bộ xóa."
        confirmText="Xóa vĩnh viễn"
        cancelText="Hủy"
        variant="danger"
      />
    </TeacherShell>
  )
}
