"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { AnimatedSelect } from "@/components/ui/animated-select"
import {
  Plus, Trash2, Clock, RefreshCw, Loader2, CalendarDays, Save, X,
} from "lucide-react"
import type { useMonitorData } from "../_hooks/useMonitorData"
import { DAYS, COLORS } from "../_types"

type MonitorData = ReturnType<typeof useMonitorData>

interface TimetableTabProps {
  data: MonitorData
}

export function TimetableTab({ data }: TimetableTabProps) {
  const {
    selectedStudent, studentTimetable,
    showTtForm, setShowTtForm, editingTtId,
    ttFormDay, setTtFormDay, ttFormStart, setTtFormStart,
    ttFormEnd, setTtFormEnd, ttFormSubject, setTtFormSubject,
    ttFormClass, setTtFormClass, ttFormRoom, setTtFormRoom,
    ttFormNote, setTtFormNote, ttFormColor, setTtFormColor, ttSaving,
    handleCopyTeacherTimetable, handleSaveStudentTimetable,
    handleDeleteStudentTimetable, resetTtForm, handleEditStudentTimetable,
  } = data

  if (!selectedStudent) return null

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Timetable Header Card */}
      <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-md">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-bold text-lg">Thời Khóa Biểu Học Sinh</h3>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Lịch học cố định được thiết lập riêng cho học sinh này</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline"
              onClick={handleCopyTeacherTimetable}
              className="rounded-full border-[hsl(var(--border))]/70 text-xs font-semibold py-3 px-4 flex items-center gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Sao chép lịch dạy của tôi
            </Button>
            <Button 
              onClick={() => { resetTtForm(); setShowTtForm(true) }}
              className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 text-xs font-semibold py-3 px-4 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Thêm tiết mới
            </Button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showTtForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{editingTtId ? "Sửa tiết học học sinh" : "Thêm tiết học học sinh"}</h2>
              <button onClick={resetTtForm} className="rounded-full p-2 hover:bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Ngày trong tuần</Label>
                <AnimatedSelect 
                  value={String(ttFormDay)} 
                  onValueChange={(val) => setTtFormDay(Number(val))} 
                  options={DAYS.map((d, i) => ({ value: String(i), label: d }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Bắt đầu</Label>
                  <Input type="time" value={ttFormStart} onChange={(e) => setTtFormStart(e.target.value)} className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Kết thúc</Label>
                  <Input type="time" value={ttFormEnd} onChange={(e) => setTtFormEnd(e.target.value)} className="mt-1 rounded-xl" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Môn học *</Label>
                <Input value={ttFormSubject} onChange={(e) => setTtFormSubject(e.target.value)} placeholder="VD: Toán học 12" className="mt-1 rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Lớp học</Label>
                  <Input value={ttFormClass} onChange={(e) => setTtFormClass(e.target.value)} placeholder="VD: 12A2" className="mt-1 rounded-xl" />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Phòng học</Label>
                  <Input value={ttFormRoom} onChange={(e) => setTtFormRoom(e.target.value)} placeholder="VD: P.402" className="mt-1 rounded-xl" />
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Màu hiển thị</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button 
                      key={c} 
                      type="button" 
                      onClick={() => setTtFormColor(c)} 
                      className={cn(
                        "h-7 w-7 rounded-full transition-all border border-black/20", 
                        ttFormColor === c ? "ring-2 ring-offset-2 ring-violet-500 scale-110" : ""
                      )} 
                      style={{ backgroundColor: c }} 
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Ghi chú</Label>
                <Input value={ttFormNote} onChange={(e) => setTtFormNote(e.target.value)} placeholder="Nhắc nhở tự học..." className="mt-1 rounded-xl" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={handleSaveStudentTimetable} 
                disabled={ttSaving || !ttFormSubject.trim()} 
                className="flex-1 rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"
              >
                {ttSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> {editingTtId ? "Cập nhật" : "Thêm"}</>}
              </Button>
              <Button variant="outline" onClick={resetTtForm} className="rounded-full flex-1">
                Hủy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Timetable Grid View */}
      <section className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden shadow-md">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-7 border-b border-[hsl(var(--border))]/20">
              {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                const dayEntries = studentTimetable.filter(e => e.day_of_week === dayIdx)
                return (
                  <div key={dayIdx} className={cn("border-r border-[hsl(var(--border))]/20 px-3 py-4 text-center last:border-r-0", dayIdx === new Date().getDay() ? "bg-[hsl(var(--muted))]/10" : "")}>
                    <p className="text-sm font-bold">{DAYS[dayIdx]}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{dayEntries.length} tiết</p>
                  </div>
                )
              })}
            </div>
            <div className="grid min-h-[420px] grid-cols-7">
              {[1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
                const dayEntries = studentTimetable.filter(e => e.day_of_week === dayIdx)
                return (
                  <div key={dayIdx} className="space-y-2 border-r border-[hsl(var(--border))]/20 p-2 last:border-r-0 bg-[hsl(var(--background))]/10">
                    {dayEntries.map((entry) => (
                      <div 
                        key={entry.id} 
                        className="group relative cursor-pointer rounded-xl p-2.5 text-white transition-all hover:scale-[1.02] shadow-sm hover:shadow" 
                        style={{ backgroundColor: entry.color }} 
                        onClick={() => handleEditStudentTimetable(entry)}
                      >
                        <p className="text-sm font-bold leading-tight">{entry.subject}</p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] opacity-90"><Clock className="h-3 w-3" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</p>
                        {entry.class_name && <p className="mt-0.5 text-[11px] opacity-80 font-semibold">{entry.class_name}</p>}
                        {entry.room && <p className="text-[11px] opacity-70">{entry.room}</p>}
                        {entry.note && <p className="text-[10px] italic mt-1 border-t border-white/20 pt-1 opacity-85 truncate" title={entry.note}>{entry.note}</p>}
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteStudentTimetable(entry.id) }} 
                          className="absolute right-1.5 top-1.5 rounded-lg bg-black/30 p-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-black/50"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-white" />
                        </button>
                      </div>
                    ))}
                    {dayEntries.length === 0 && (
                      <div className="flex h-full min-h-[120px] items-center justify-center text-[hsl(var(--muted-foreground))]/20">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
