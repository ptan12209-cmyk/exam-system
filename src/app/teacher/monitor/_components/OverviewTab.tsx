"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { AnimatedSelect } from "@/components/ui/animated-select"
import {
  Plus, Trash2, Calendar, Check, ChevronRight, FileText,
  RefreshCw, Loader2, AlertCircle,
} from "lucide-react"
import type { useMonitorData } from "../_hooks/useMonitorData"
import { PRIORITIES, STATUSES, formatSeconds, DAILY_TARGET_SECONDS } from "../_types"

type MonitorData = ReturnType<typeof useMonitorData>

interface OverviewTabProps {
  data: MonitorData
}

export function OverviewTab({ data }: OverviewTabProps) {
  const {
    selectedStudent, session, tasks, submissions, fetchingData,
    statusInfo, todayFocusSeconds, completedTasksCount, completionRate,
    // Task form
    taskTitle, setTaskTitle, taskSubject, setTaskSubject,
    taskPriority, setTaskPriority, taskDueDate, setTaskDueDate,
    taskDuration, setTaskDuration, taskLoading, taskError,
    handleAddTask, handleToggleTaskStatus, handleDeleteTask,
    // Actions
    fetchStudentData, setStudentTab,
  } = data

  const [tasksPage, setTasksPage] = useState(1)
  const [submissionsPage, setSubmissionsPage] = useState(1)
  const itemsPerPage = 5

  const totalTasksPages = Math.max(1, Math.ceil(tasks.length / itemsPerPage))
  const activeTasksPage = Math.min(tasksPage, totalTasksPages)
  const paginatedTasks = tasks.slice((activeTasksPage - 1) * itemsPerPage, activeTasksPage * itemsPerPage)

  const totalSubmissionsPages = Math.max(1, Math.ceil(submissions.length / itemsPerPage))
  const activeSubmissionsPage = Math.min(submissionsPage, totalSubmissionsPages)
  const paginatedSubmissions = submissions.slice((activeSubmissionsPage - 1) * itemsPerPage, activeSubmissionsPage * itemsPerPage)

  if (!selectedStudent) return null

  const dailyTargetPercent = Math.min(Math.round((todayFocusSeconds / DAILY_TARGET_SECONDS) * 100), 100)

  return (
    <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
      
      {/* Left Column: Realtime Monitor + Checklist */}
      <div className="space-y-6">
        
        {/* Card 1: Real-time Presence */}
        <div className={cn(
          "rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 p-4 sm:p-6 shadow-md transition-all relative overflow-hidden bg-[hsl(var(--card))]",
          session?.status === "focusing" && "ring-1 ring-emerald-500/25"
        )}>
          <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-4 mb-6">
            <div>
              <h3 className="font-bold text-lg">Giám Sát Trạng Thái Live</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Đang kết nối cổng realtime với thiết bị của học sinh</p>
            </div>
            <button 
              onClick={() => fetchStudentData(selectedStudent.id)}
              className="p-2 hover:bg-[hsl(var(--muted))]/30 rounded-full text-[hsl(var(--muted-foreground))] transition-all"
              title="Đồng bộ thủ công"
            >
              <RefreshCw className={cn("h-4 w-4", fetchingData && "animate-spin")} />
            </button>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-3 items-stretch">
            
            {/* Status Indicator Panel */}
            <div className="space-y-4 flex flex-col justify-between">
              <div>
                <p className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] mb-1">Trạng thái hiện tại</p>
                <div className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-md", statusInfo.bg)}>
                  <span className={cn("h-2.5 w-2.5 rounded-full shadow-md", statusInfo.color, statusInfo.glow)} />
                  {statusInfo.label}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] mb-1">Thời gian tự học hôm nay</p>
                <p className="text-4xl font-bold tracking-tight bg-gradient-to-r from-[hsl(var(--foreground))] to-[hsl(var(--muted-foreground))] bg-clip-text text-transparent">
                  {formatSeconds(todayFocusSeconds)}
                </p>
              </div>
            </div>

            {/* Web Daily Target */}
            <div className="rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/40 p-4 relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2">Mục tiêu tự học Web (Daily)</p>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-2xl font-bold">{dailyTargetPercent}%</span>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">Mục tiêu: 2 giờ</span>
                </div>
              </div>
              <div className="w-full bg-[hsl(var(--border))]/50 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${dailyTargetPercent}%` }} 
                />
              </div>
            </div>

            {/* Discord Presence & Class Target */}
            {(() => {
              const DISCORD_TARGET_SECONDS = 130 * 60
              const discordSecs = session?.discord_duration || 0
              const discordMins = Math.floor(discordSecs / 60)
              const discordPercent = Math.min(Math.round((discordSecs / DISCORD_TARGET_SECONDS) * 100), 100)
              
              return (
                <div className="rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/40 p-4 relative overflow-hidden flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">Ca học Discord (150p)</p>
                      {session?.discord_deafened && (
                        <span className="rounded-full bg-red-500/10 border border-red-500/25 px-2 py-0.5 text-[9px] font-bold text-red-500 animate-pulse">
                          AFK 🚫
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-end mb-1">
                      <div className="flex flex-col">
                        <span className="text-2xl font-bold">{discordPercent}%</span>
                        <span className="text-[9px] text-[hsl(var(--muted-foreground))]">Đã học: {discordMins} / 130 phút</span>
                      </div>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">Cần đạt: 130 phút</span>
                    </div>
                  </div>
                  <div className="w-full bg-[hsl(var(--border))]/50 h-2 rounded-full overflow-hidden mb-1">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-1000" 
                      style={{ width: `${discordPercent}%` }} 
                    />
                  </div>
                </div>
              )
            })()}
          </div>
        </div>

        {/* Card 2: Checklist Manager */}
        <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-lg">Checklist & Planner của học sinh</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Đã hoàn thành {completedTasksCount}/{tasks.length} đầu việc ({completionRate}%)</p>
            </div>
            <span className="rounded-full bg-[hsl(var(--foreground))]/5 px-3 py-1 text-xs font-bold">{tasks.length} tasks</span>
          </div>

          {/* Task Creator Form */}
          <form onSubmit={handleAddTask} className="mb-6 p-4 rounded-2xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))]/30 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-500">Giao thêm mục tiêu học tập mới</p>
            
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Tên công việc *</Label>
                <Input 
                  placeholder="VD: Ôn tập đề trắc nghiệm Lý ch.1" 
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="rounded-xl border-[hsl(var(--border))]/50 bg-transparent text-sm"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Môn học</Label>
                <Input 
                  placeholder="VD: Vật lý" 
                  value={taskSubject}
                  onChange={(e) => setTaskSubject(e.target.value)}
                  className="rounded-xl border-[hsl(var(--border))]/50 bg-transparent text-sm"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 flex flex-col justify-end">
                <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))] mb-1">Độ ưu tiên</Label>
                <AnimatedSelect 
                  value={taskPriority} 
                  onValueChange={(value) => setTaskPriority(value as "low" | "medium" | "high")}
                  options={[
                    { value: "low", label: "Thấp" },
                    { value: "medium", label: "Trung bình" },
                    { value: "high", label: "Cao" }
                  ]}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Thời lượng (phút)</Label>
                <Input 
                  type="number"
                  min="0"
                  placeholder="VD: 45"
                  value={taskDuration}
                  onChange={(e) => setTaskDuration(e.target.value)}
                  className="rounded-xl border-[hsl(var(--border))]/50 bg-transparent text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Hạn chót</Label>
                <Input 
                  type="date" 
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="rounded-xl border-[hsl(var(--border))]/50 bg-transparent text-sm"
                />
              </div>
            </div>

            <div className="pt-1">
              <Button type="submit" disabled={taskLoading || !taskTitle.trim()} className="w-full rounded-xl py-5 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 flex items-center justify-center gap-1.5 text-xs font-semibold shadow-md">
                {taskLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Thêm vào Checklist của học sinh</>}
              </Button>
            </div>
            {taskError && <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5 justify-center"><AlertCircle className="h-3.5 w-3.5" />{taskError}</p>}
          </form>

          {/* Tasks List */}
          <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
            {paginatedTasks.length === 0 ? (
              <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]/50">
                Chưa có mục tiêu học tập nào được thêm vào checklist.
              </div>
            ) : (
              paginatedTasks.map((task) => {
                const priorityBadge = PRIORITIES.find(p => p.value === task.priority)
                const statusBadge = STATUSES.find(s => s.value === task.status)
                
                return (
                  <div 
                    key={task.id} 
                    className={cn(
                      "group rounded-2xl border border-[hsl(var(--border))]/40 p-4 transition-all hover:border-[hsl(var(--border))]/70 flex items-start justify-between gap-3 bg-[hsl(var(--background))]/20",
                      task.is_completed && "opacity-60 bg-[hsl(var(--muted))]/5"
                    )}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <button 
                        onClick={() => handleToggleTaskStatus(task)}
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 mt-0.5 transition-all",
                          task.is_completed ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "border-[hsl(var(--border))]/60 hover:border-[hsl(var(--foreground))]"
                        )}
                        title={task.is_completed ? "Đánh dấu chưa xong" : "Duyệt hoàn thành"}
                      >
                        {task.is_completed && <Check className="h-3 w-3" />}
                      </button>
                      
                      <div className="min-w-0">
                        <p className={cn("text-sm font-semibold tracking-tight leading-snug break-words", task.is_completed && "line-through text-[hsl(var(--muted-foreground))]/70")}>
                          {task.title}
                        </p>
                        
                        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider">
                          {task.subject && (
                            <span className="rounded-full bg-violet-500/5 border border-violet-500/25 px-2 py-0.5 text-violet-500">
                              {task.subject}
                            </span>
                          )}
                          <span className={cn("rounded-full border px-2 py-0.5", priorityBadge?.color)}>
                            Ưu tiên: {priorityBadge?.label}
                          </span>
                          <span className={cn("rounded-full border px-2 py-0.5", statusBadge?.color)}>
                            {statusBadge?.label}
                          </span>
                          {task.estimated_time !== undefined && task.estimated_time > 0 && (
                            <span className="rounded-full bg-indigo-500/5 border border-indigo-500/25 px-2 py-0.5 text-indigo-500 flex items-center gap-0.5">
                              ⏱️ {task.estimated_time} phút
                            </span>
                          )}
                        </div>

                        {task.due_date && (
                          <p className="mt-2 flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                            <Calendar className="h-3.5 w-3.5" />
                            Hạn: {new Date(task.due_date).toLocaleDateString("vi-VN")}
                          </p>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleDeleteTask(task.id)}
                      className="rounded-full p-2 text-rose-500 bg-rose-500/0 hover:bg-rose-500/10 transition-colors opacity-60 sm:opacity-0 sm:group-hover:opacity-100 shrink-0"
                      title="Xóa đầu việc"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {totalTasksPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[hsl(var(--border))]/10">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Trang {activeTasksPage} / {totalTasksPages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTasksPage(prev => Math.max(1, prev - 1))}
                  disabled={activeTasksPage === 1}
                  className="h-8 rounded-lg px-3 text-xs"
                >
                  Trước
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTasksPage(prev => Math.min(totalTasksPages, prev + 1))}
                  disabled={activeTasksPage === totalTasksPages}
                  className="h-8 rounded-lg px-3 text-xs"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Submissions + Timetable Widget */}
      <div className="space-y-6">
        
        {/* Card 3: Submissions Tracker */}
        <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:p-6 shadow-md overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))]/20 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-lg">Bài Tập Trực Tuyến</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Xem kết quả bài kiểm tra học sinh đã làm</p>
            </div>
            <Link href="/teacher/exams/create" className="no-print">
              <Button size="sm" className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 py-4 px-4 text-xs font-semibold">
                <Plus className="mr-1 h-3.5 w-3.5" /> Giao bài mới
              </Button>
            </Link>
          </div>

          <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
            {paginatedSubmissions.length === 0 ? (
              <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]/50">
                Chưa nộp bài tập kiểm tra nào trên hệ thống.
              </div>
            ) : (
              paginatedSubmissions.map((sub) => {
                const scorePercentage = Math.round((sub.score / 10) * 100)
                
                return (
                  <div 
                    key={sub.id} 
                    className="rounded-2xl border border-[hsl(var(--border))]/40 p-4 transition-all hover:border-[hsl(var(--border))]/70 bg-[hsl(var(--background))]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/5 border border-violet-500/20 text-violet-500">
                        <FileText className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold tracking-tight truncate">{sub.exam?.title || "Đề thi đã bị xóa"}</h4>
                        <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
                          {sub.exam?.subject || "Khác"} • {new Date(sub.submitted_at).toLocaleDateString("vi-VN")} lúc {new Date(sub.submitted_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
                      <div className="text-right">
                        <p className="text-base font-bold text-violet-500">{sub.score} / 10</p>
                        <p className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">Tỷ lệ: {scorePercentage}%</p>
                      </div>
                      
                      <Link href={`/teacher/exams/${sub.exam_id}/submissions/${sub.id}`}>
                        <button className="rounded-full border border-[hsl(var(--border))]/60 p-2 hover:bg-[hsl(var(--muted))] transition-colors">
                          <ChevronRight className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                        </button>
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {totalSubmissionsPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[hsl(var(--border))]/10">
              <span className="text-xs text-[hsl(var(--muted-foreground))]">
                Trang {activeSubmissionsPage} / {totalSubmissionsPages}
              </span>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSubmissionsPage(prev => Math.max(1, prev - 1))}
                  disabled={activeSubmissionsPage === 1}
                  className="h-8 rounded-lg px-3 text-xs"
                >
                  Trước
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSubmissionsPage(prev => Math.min(totalSubmissionsPages, prev + 1))}
                  disabled={activeSubmissionsPage === totalSubmissionsPages}
                  className="h-8 rounded-lg px-3 text-xs"
                >
                  Sau
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Card 4: Timetable Widget Preview */}
        <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-4 mb-4">
            <div>
              <h3 className="font-bold text-lg">Khung Giờ Học Tập</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Lịch trình tự học của học sinh</p>
            </div>
            <button 
              onClick={() => setStudentTab("timetable")}
              className="rounded-full border border-[hsl(var(--border))]/70 bg-transparent text-xs font-semibold py-1.5 px-3 hover:bg-[hsl(var(--muted))]/30 transition-all"
            >
              Thiết lập lịch
            </button>
          </div>
          <div className="rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/20 p-4 text-center">
            <Calendar className="mx-auto mb-3 h-8 w-8 text-violet-500/80 animate-bounce" strokeWidth={1.2} />
            <p className="text-sm font-semibold tracking-tight mb-1">Mời thiết lập Thời khóa biểu</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] leading-normal max-w-sm mx-auto">
              ở Tab Thời khóa biểu riêng để giúp học sinh tự đồng bộ lịch học chuyên sâu hơn.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
