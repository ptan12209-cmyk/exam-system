/**
 * Types and constants for the Teacher Monitor (Observatory) page
 */

import type {
  StudentProfile,
  StudySession,
  StudyTask,
  Submission,
  TeacherProfile,
  DiscordLog,
  StudentTimetableEntry
} from "@/types"

export type {
  StudentProfile,
  StudySession,
  StudyTask,
  Submission,
  TeacherProfile,
  DiscordLog,
  StudentTimetableEntry
}

export interface ConfirmState {
  isOpen: boolean
  title: string
  description: string
  onConfirm: () => void | Promise<void>
  variant?: "danger" | "warning" | "info" | "success"
  confirmText?: string
}

export const PRIORITIES = [
  { value: "low", label: "Thấp", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  { value: "medium", label: "Trung bình", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { value: "high", label: "Cao", color: "bg-red-500/10 text-red-500 border-red-500/20" }
]

export const STATUSES = [
  { value: "todo", label: "Chuẩn bị", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  { value: "in_progress", label: "Đang làm", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  { value: "review", label: "Chờ duyệt", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "done", label: "Đã xong", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
]

export const DAYS = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"]
export const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#06b6d4"]

/** Format seconds to hh:mm:ss */
export const formatSeconds = (secs: number) => {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export const DAILY_TARGET_SECONDS = 2 * 3600 // 2 hours
