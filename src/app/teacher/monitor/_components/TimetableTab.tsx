import { useState } from "react"
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
    handleSaveStudentTimetable,
    handleDeleteStudentTimetable, resetTtForm, handleEditStudentTimetable,

    // Copy Timetable Modal
    copyTtModalOpen, setCopyTtModalOpen, teacherTtEntries, copyTtLoading,
    openCopyTimetableModal, executeCopyTimetable,
  } = data

  const [copyStrategy, setCopyStrategy] = useState<"overwrite" | "merge">("overwrite")

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
              onClick={openCopyTimetableModal}
              disabled={copyTtLoading}
              className="rounded-full border-[hsl(var(--border))]/70 text-xs font-semibold py-3 px-4 flex items-center gap-1.5"
            >
              {copyTtLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Sao chép lịch dạy của tôi
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
                        className={cn(
                          "group relative rounded-xl p-2.5 text-white transition-all shadow-sm hover:shadow",
                          entry.is_class_entry ? "cursor-default opacity-85" : "cursor-pointer hover:scale-[1.02]"
                        )} 
                        style={{ backgroundColor: entry.color }} 
                        onClick={() => {
                          if (!entry.is_class_entry) {
                            handleEditStudentTimetable(entry)
                          }
                        }}
                      >
                        <p className="text-sm font-bold leading-tight flex items-center justify-between gap-1">
                          <span className="truncate">{entry.subject}</span>
                          {entry.is_class_entry && (
                            <span className="shrink-0 rounded bg-white/20 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider" title="Lịch học chung của lớp">Lớp</span>
                          )}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[11px] opacity-90"><Clock className="h-3 w-3" />{entry.start_time.slice(0, 5)} - {entry.end_time.slice(0, 5)}</p>
                        {entry.class_name && <p className="mt-0.5 text-[11px] opacity-80 font-semibold">{entry.class_name}</p>}
                        {entry.room && <p className="text-[11px] opacity-70">{entry.room}</p>}
                        {entry.note && <p className="text-[10px] italic mt-1 border-t border-white/20 pt-1 opacity-85 truncate" title={entry.note}>{entry.note}</p>}
                        {!entry.is_class_entry && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteStudentTimetable(entry.id) }} 
                            className="absolute right-1.5 top-1.5 rounded-lg bg-black/30 p-1 opacity-0 transition-all group-hover:opacity-100 hover:bg-black/50"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-white" />
                          </button>
                        )}
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

      {/* Custom Copy Timetable Modal (Premium Design) */}
      {copyTtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg overflow-hidden rounded-[2.5rem] border border-violet-500/20 bg-slate-950 shadow-2xl animate-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="relative flex items-center justify-between border-b border-white/5 p-6 bg-gradient-to-r from-violet-950/20 to-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Đồng Bộ Thời Khóa Biểu</h2>
                  <p className="text-xs text-slate-400">Đồng bộ lịch dạy của bạn sang học sinh {selectedStudent.full_name}</p>
                </div>
              </div>
              <button 
                onClick={() => setCopyTtModalOpen(false)}
                className="rounded-full p-2 hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Preview Section */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-450">
                  Xem trước tiết học sẽ sao chép ({teacherTtEntries.length})
                </Label>
                <div className="grid gap-2 rounded-2xl border border-white/5 bg-white/5 p-3 max-h-[160px] overflow-y-auto">
                  {teacherTtEntries.map((entry) => (
                    <div 
                      key={entry.id} 
                      className="flex items-center justify-between p-2.5 rounded-xl text-xs"
                      style={{ backgroundColor: `${entry.color}15`, border: `1px solid ${entry.color}25` }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="font-bold text-white">{entry.subject}</span>
                        {entry.class_name && (
                          <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-slate-300 border border-white/10">
                            {entry.class_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="h-3 w-3" />
                        <span>{DAYS[entry.day_of_week]}: {entry.start_time.slice(0,5)} - {entry.end_time.slice(0,5)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync Strategy Selector */}
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-450">
                  Phương thức đồng bộ
                </Label>
                <div className="grid gap-3">
                  {/* Overwrite strategy */}
                  <label 
                    onClick={() => setCopyStrategy("overwrite")}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl border cursor-pointer select-none transition-all",
                      copyStrategy === "overwrite" 
                        ? "border-violet-500 bg-violet-500/10 text-white" 
                        : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="copyStrategy" 
                      checked={copyStrategy === "overwrite"}
                      onChange={() => setCopyStrategy("overwrite")}
                      className="mt-1 accent-violet-500 h-4 w-4"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white flex items-center gap-1.5">
                        Ghi đè & Thay thế hoàn toàn <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-violet-500/20 text-violet-300 font-bold uppercase">Khuyên dùng</span>
                      </p>
                      <p className="text-xs leading-relaxed text-slate-405">
                        Xóa tất cả các tiết học cũ do **bạn** đã giao cho học sinh này từ trước, sau đó đồng bộ lịch dạy mới nhất. Tránh trùng lặp hoặc dư thừa lịch học cũ.
                      </p>
                    </div>
                  </label>

                  {/* Merge strategy */}
                  <label 
                    onClick={() => setCopyStrategy("merge")}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-2xl border cursor-pointer select-none transition-all",
                      copyStrategy === "merge" 
                        ? "border-violet-500 bg-violet-500/10 text-white" 
                        : "border-white/5 bg-white/5 text-slate-400 hover:bg-white/10"
                    )}
                  >
                    <input 
                      type="radio" 
                      name="copyStrategy" 
                      checked={copyStrategy === "merge"}
                      onChange={() => setCopyStrategy("merge")}
                      className="mt-1 accent-violet-500 h-4 w-4"
                    />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">
                        Giữ lại lịch cũ & Trộn thêm lịch mới
                      </p>
                      <p className="text-xs leading-relaxed text-slate-405">
                        Giữ nguyên các tiết học hiện tại của học sinh và chỉ chèn thêm các tiết học từ thời khóa biểu của bạn.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 border-t border-white/5 p-6 bg-gradient-to-r from-violet-950/10 to-indigo-950/10">
              <Button 
                variant="outline" 
                onClick={() => setCopyTtModalOpen(false)}
                className="flex-1 rounded-full border-white/10 bg-transparent text-slate-450 hover:text-white hover:bg-white/5"
              >
                Hủy
              </Button>
              <Button 
                onClick={() => executeCopyTimetable(copyStrategy)}
                disabled={ttSaving}
                className="flex-1 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/20"
              >
                {ttSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Đồng bộ ngay
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
