"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/toast"
import type {
  StudentProfile,
  StudySession,
  StudyTask,
  Submission,
  TeacherProfile,
  DiscordLog,
  StudentTimetableEntry,
  ConfirmState,
} from "../_types"
import { COLORS } from "../_types"

export function useMonitorData() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const { success, error: toastError, warning } = useToast()

  // Core state
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfile | null>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [session, setSession] = useState<StudySession | null>(null)
  const [tasks, setTasks] = useState<StudyTask[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchingData, setFetchingData] = useState(false)
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)

  // Link form state
  const [linkingEmail, setLinkingEmail] = useState("")
  const [linkingLoading, setLinkingLoading] = useState(false)
  const [linkingError, setLinkingError] = useState<string | null>(null)
  const [linkingSuccess, setLinkingSuccess] = useState<string | null>(null)

  // Add Task form state
  const [taskTitle, setTaskTitle] = useState("")
  const [taskSubject, setTaskSubject] = useState("")
  const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium")
  const [taskDueDate, setTaskDueDate] = useState("")
  const [taskDuration, setTaskDuration] = useState("")
  const [taskLoading, setTaskLoading] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)

  // Discord monitoring
  const [studentTab, setStudentTab] = useState<"overview" | "discord" | "timetable">("overview")
  const [discordLogs, setDiscordLogs] = useState<DiscordLog[]>([])

  // Student Timetable states
  const [studentTimetable, setStudentTimetable] = useState<StudentTimetableEntry[]>([])
  const [showTtForm, setShowTtForm] = useState(false)
  const [editingTtId, setEditingTtId] = useState<string | null>(null)
  const [ttFormDay, setTtFormDay] = useState(1)
  const [ttFormStart, setTtFormStart] = useState("07:00")
  const [ttFormEnd, setTtFormEnd] = useState("08:30")
  const [ttFormSubject, setTtFormSubject] = useState("")
  const [ttFormClass, setTtFormClass] = useState("")
  const [ttFormRoom, setTtFormRoom] = useState("")
  const [ttFormNote, setTtFormNote] = useState("")
  const [ttFormColor, setTtFormColor] = useState(COLORS[0])
  const [ttSaving, setTtSaving] = useState(false)

  // Copy timetable states
  const [copyTtModalOpen, setCopyTtModalOpen] = useState(false)
  const [teacherTtEntries, setTeacherTtEntries] = useState<any[]>([])
  const [copyTtLoading, setCopyTtLoading] = useState(false)

  // ──────────────────── Data Fetching ────────────────────

  const fetchLinkedStudents = useCallback(async (userId: string) => {
    const { data: links, error } = await supabase
      .from("parent_student_links")
      .select(`
        student_id,
        profiles:student_id ( id, full_name, email, class )
      `)
      .eq("parent_id", userId)

    if (error) {
      console.error("Error fetching linked students:", error)
      return
    }

    const studentsList = (links || []).map((l: unknown) => (l as { profiles: StudentProfile | null }).profiles).filter(Boolean) as StudentProfile[]
    setStudents(studentsList)
    
    if (studentsList.length > 0 && !selectedStudent) {
      setSelectedStudent(studentsList[0])
    }
  }, [supabase, selectedStudent])

  // Init: fetch teacher profile + linked students
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (!prof) { router.push("/login"); return }
      if (prof.role !== "teacher" && prof.role !== "parent") { router.push("/student/dashboard"); return }
      setTeacherProfile(prof)

      await fetchLinkedStudents(user.id)
      setLoading(false)
    }

    init()
  }, [router, supabase, fetchLinkedStudents])

  // Fetch all data for a selected student
  const fetchStudentData = useCallback(async (studentId: string) => {
    setFetchingData(true)
    try {
      const { data: sessData } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle()
      
      setSession(sessData as StudySession | null)

      const { data: tasksData } = await supabase
        .from("study_tasks")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })

      if (tasksData) {
        setTasks(
          tasksData.map((t: Omit<StudyTask, "status"> & { status: string | null }) => ({
            ...t,
            status: (t.status || (t.is_completed ? "done" : "todo")) as StudyTask["status"]
          })) as StudyTask[]
        )
      } else {
        setTasks([])
      }

      const { data: subsData } = await supabase
        .from("submissions")
        .select("id, exam_id, score, correct_count, submitted_at, exam:exams(title, subject, total_questions)")
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })

      setSubmissions((subsData || []) as Submission[])

      const { data: discLogs } = await supabase
        .from("discord_attendance_logs")
        .select("*")
        .eq("student_id", studentId)
        .order("joined_at", { ascending: false })

      setDiscordLogs(discLogs || [])

      const { data: ttData } = await supabase
        .from("student_timetable_entries")
        .select("*")
        .eq("student_id", studentId)
        .order("day_of_week")
        .order("start_time")

      const { data: profile } = await supabase
        .from("profiles")
        .select("class")
        .eq("id", studentId)
        .single()

      let classEntries: any[] = []
      if (profile && profile.class) {
        const { data: cData } = await supabase
          .from("timetable_entries")
          .select("*")
          .eq("class_name", profile.class)
          .order("day_of_week")
          .order("start_time")
        if (cData) classEntries = cData
      }

      const merged = [...(ttData || [])]
      for (const entry of classEntries) {
        const exists = merged.some(e => 
          e.day_of_week === entry.day_of_week &&
          e.start_time.slice(0, 5) === entry.start_time.slice(0, 5) &&
          e.subject.toLowerCase() === entry.subject.toLowerCase()
        )
        if (!exists) {
          merged.push({
            id: entry.id,
            day_of_week: entry.day_of_week,
            start_time: entry.start_time,
            end_time: entry.end_time,
            subject: entry.subject,
            class_name: entry.class_name,
            room: entry.room,
            note: entry.note || "Lịch học chung của lớp",
            color: entry.color || '#6366f1',
            student_id: studentId,
            assigned_by: '',
            is_class_entry: true
          })
        }
      }

      merged.sort((a, b) => {
        if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
        return a.start_time.localeCompare(b.start_time)
      })

      setStudentTimetable(merged)
    } catch (err) {
      console.error("Error fetching student details:", err)
    } finally {
      setFetchingData(false)
    }
  }, [supabase])

  // Realtime subscription when student changes
  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData(selectedStudent.id)

      const channel = supabase
        .channel(`teacher_monitor_${selectedStudent.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "study_sessions", filter: `student_id=eq.${selectedStudent.id}` },
          (payload: { eventType: string; new: StudySession }) => {
            if (payload.eventType === "DELETE") {
              setSession(null)
            } else {
              setSession(payload.new)
            }
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    } else {
      setSession(null)
      setTasks([])
      setSubmissions([])
      setDiscordLogs([])
      setStudentTimetable([])
    }
  }, [selectedStudent, fetchStudentData, supabase])

  // ──────────────────── Actions ────────────────────

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkingEmail.trim() || !teacherProfile) return

    setLinkingLoading(true)
    setLinkingError(null)
    setLinkingSuccess(null)

    try {
      const emailVal = linkingEmail.trim().toLowerCase()
      const { data: student, error: studentError } = await supabase
        .from("profiles")
        .select("id, full_name, email, class")
        .ilike("email", emailVal)
        .eq("role", "student")
        .single()

      if (studentError || !student) {
        setLinkingError("Không tìm thấy tài khoản học sinh với email này.")
        setLinkingLoading(false)
        return
      }

      const { error: linkError } = await supabase
        .from("parent_student_links")
        .insert({ parent_id: teacherProfile.id, student_id: student.id })

      if (linkError) {
        if (linkError.code === "23505") {
          setLinkingError("Bạn đã liên kết với học sinh này từ trước.")
        } else {
          throw linkError
        }
        setLinkingLoading(false)
        return
      }

      setLinkingSuccess(`Liên kết thành công với ${student.full_name}!`)
      setLinkingEmail("")
      await fetchLinkedStudents(teacherProfile.id)
      setSelectedStudent(student)
    } catch (err) {
      console.error("Link error:", err)
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra"
      setLinkingError("Có lỗi xảy ra: " + msg)
    } finally {
      setLinkingLoading(false)
    }
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim() || !selectedStudent) return

    setTaskLoading(true)
    setTaskError(null)

    try {
      const payload = {
        student_id: selectedStudent.id,
        title: taskTitle.trim(),
        subject: taskSubject.trim() || null,
        due_date: taskDueDate ? new Date(taskDueDate).toISOString() : null,
        priority: taskPriority,
        estimated_time: Number(taskDuration) || 0,
        status: "todo",
        is_completed: false
      }

      const { error } = await supabase.from("study_tasks").insert(payload)
      if (error) throw error

      setTaskTitle("")
      setTaskSubject("")
      setTaskPriority("medium")
      setTaskDueDate("")
      setTaskDuration("")
      
      if (selectedStudent) {
        await fetchStudentData(selectedStudent.id)
      }
    } catch (err) {
      console.error("Add task error:", err)
      const msg = err instanceof Error ? err.message : "Có lỗi xảy ra"
      setTaskError("Lỗi khi giao mục tiêu: " + msg + ". Vui lòng chắc chắn bạn đã chạy SQL vá lỗi RLS.")
    } finally {
      setTaskLoading(false)
    }
  }

  const handleToggleTaskStatus = async (task: StudyTask) => {
    if (!selectedStudent) return
    const nextStatus = task.status === "done" ? "todo" : "done"
    const nextCompleted = nextStatus === "done"

    try {
      const { error } = await supabase
        .from("study_tasks")
        .update({
          status: nextStatus,
          is_completed: nextCompleted,
          completed_at: nextCompleted ? new Date().toISOString() : null
        })
        .eq("id", task.id)

      if (error) throw error
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus, is_completed: nextCompleted } : t))
    } catch (err) {
      console.error("Toggle task status error:", err)
    }
  }

  const handleDeleteTask = (taskId: string) => {
    setConfirmState({
      isOpen: true,
      title: "Xóa đầu việc?",
      description: "Bạn có chắc muốn xóa đầu việc này khỏi checklist của học sinh?",
      confirmText: "Xóa",
      variant: "danger",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("study_tasks").delete().eq("id", taskId)
          if (error) throw error
          setTasks(prev => prev.filter(t => t.id !== taskId))
        } catch (err) {
          console.error("Delete task error:", err)
        }
      }
    })
  }

  // ──────────────────── Timetable Actions ────────────────────

  const openCopyTimetableModal = async () => {
    if (!selectedStudent || !teacherProfile) return
    setCopyTtLoading(true)
    try {
      const { data, error } = await supabase
        .from("timetable_entries")
        .select("*")
        .eq("teacher_id", teacherProfile.id)
        .order("day_of_week")
        .order("start_time")
      if (error) throw error
      if (!data || data.length === 0) {
        warning("Thời khóa biểu của bạn đang trống. Vui lòng thiết lập thời khóa biểu của bạn trước.")
        return
      }
      setTeacherTtEntries(data)
      setCopyTtModalOpen(true)
    } catch (err) {
      console.error(err)
      toastError("Lỗi khi tải lịch dạy của bạn.")
    } finally {
      setCopyTtLoading(false)
    }
  }

  const executeCopyTimetable = async (strategy: "overwrite" | "merge") => {
    if (!selectedStudent || !teacherProfile || teacherTtEntries.length === 0) return
    setTtSaving(true)
    try {
      const payload = teacherTtEntries.map((entry: any) => ({
        student_id: selectedStudent.id,
        assigned_by: teacherProfile.id,
        day_of_week: entry.day_of_week,
        start_time: entry.start_time,
        end_time: entry.end_time,
        subject: entry.subject,
        class_name: entry.class_name,
        room: entry.room,
        note: entry.note,
        color: entry.color || '#6366f1'
      }))

      if (strategy === "overwrite") {
        const { error: deleteErr } = await supabase
          .from("student_timetable_entries")
          .delete()
          .eq("student_id", selectedStudent.id)
          .eq("assigned_by", teacherProfile.id)
        if (deleteErr) throw deleteErr
      }

      const { error: insertErr } = await supabase
        .from("student_timetable_entries")
        .insert(payload)
      if (insertErr) throw insertErr

      success(strategy === "overwrite" ? `Đã đồng bộ (ghi đè) thành công ${teacherTtEntries.length} tiết học!` : `Đã trộn thành công ${teacherTtEntries.length} tiết học!`)
      setCopyTtModalOpen(false)
      fetchStudentData(selectedStudent.id)
    } catch (err) {
      console.error("Error copying timetable:", err)
      toastError("Lỗi khi sao chép thời khóa biểu: " + (err instanceof Error ? err.message : "Không rõ lỗi"))
    } finally {
      setTtSaving(false)
    }
  }

  const handleSaveStudentTimetable = async () => {
    if (!ttFormSubject.trim() || !selectedStudent || !teacherProfile) return
    setTtSaving(true)
    try {
      const payload = {
        student_id: selectedStudent.id,
        assigned_by: teacherProfile.id,
        day_of_week: ttFormDay,
        start_time: ttFormStart,
        end_time: ttFormEnd,
        subject: ttFormSubject.trim(),
        class_name: ttFormClass.trim() || null,
        room: ttFormRoom.trim() || null,
        note: ttFormNote.trim() || null,
        color: ttFormColor
      }
      
      if (editingTtId) {
        const { error } = await supabase.from("student_timetable_entries").update(payload).eq("id", editingTtId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("student_timetable_entries").insert(payload)
        if (error) throw error
      }
      
      success("Đã lưu thời khóa biểu học sinh thành công!")
      setShowTtForm(false)
      setEditingTtId(null)
      setTtFormSubject("")
      setTtFormClass("")
      setTtFormRoom("")
      setTtFormNote("")
      
      fetchStudentData(selectedStudent.id)
    } catch (err) {
      console.error("Error saving student timetable:", err)
      toastError("Lỗi khi lưu thời khóa biểu: " + (err instanceof Error ? err.message : "Không rõ lỗi"))
    } finally {
      setTtSaving(false)
    }
  }

  const handleDeleteStudentTimetable = (id: string) => {
    setConfirmState({
      isOpen: true,
      title: "Xóa tiết học?",
      description: "Bạn có chắc muốn xóa tiết học này của học sinh?",
      confirmText: "Xóa",
      variant: "danger",
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("student_timetable_entries").delete().eq("id", id)
          if (error) throw error
          
          success("Đã xóa tiết học thành công!")
          if (selectedStudent) {
            fetchStudentData(selectedStudent.id)
          }
        } catch (err) {
          console.error("Error deleting student timetable entry:", err)
          toastError("Lỗi khi xóa: " + (err instanceof Error ? err.message : "Không rõ lỗi"))
        }
      }
    })
  }

  const resetTtForm = () => {
    setTtFormDay(1)
    setTtFormStart("07:00")
    setTtFormEnd("08:30")
    setTtFormSubject("")
    setTtFormClass("")
    setTtFormRoom("")
    setTtFormNote("")
    setTtFormColor(COLORS[0])
    setEditingTtId(null)
    setShowTtForm(false)
  }

  const handleEditStudentTimetable = (entry: StudentTimetableEntry) => {
    setEditingTtId(entry.id)
    setTtFormDay(entry.day_of_week)
    setTtFormStart(entry.start_time.slice(0, 5))
    setTtFormEnd(entry.end_time.slice(0, 5))
    setTtFormSubject(entry.subject)
    setTtFormClass(entry.class_name || "")
    setTtFormRoom(entry.room || "")
    setTtFormNote(entry.note || "")
    setTtFormColor(entry.color)
    setShowTtForm(true)
  }

  // ──────────────────── Computed Values ────────────────────

  const completedTasksCount = tasks.filter(t => t.is_completed).length
  const completionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0

  const processedDiscordLogs = useMemo(() => {
    const dataMap: Record<string, { dateLabel: string; activeMinutes: number; afkMinutes: number }> = {}
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const dateLabel = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })
      dataMap[dateStr] = { dateLabel, activeMinutes: 0, afkMinutes: 0 }
    }

    discordLogs.forEach(log => {
      const dateStr = log.session_date
      if (dataMap[dateStr]) {
        dataMap[dateStr].activeMinutes += Math.round(log.total_active_seconds / 60)
        dataMap[dateStr].afkMinutes += Math.round(log.total_afk_seconds / 60)
      }
    })

    return Object.keys(dataMap).map(key => ({
      date: dataMap[key].dateLabel,
      "Học tập (phút)": dataMap[key].activeMinutes,
      "AFK / Treo máy (phút)": dataMap[key].afkMinutes
    }))
  }, [discordLogs])

  const afkWarning = useMemo(() => {
    let totalActive = 0
    let totalAfk = 0
    discordLogs.forEach(log => {
      totalActive += log.total_active_seconds
      totalAfk += log.total_afk_seconds
    })
    const totalTime = totalActive + totalAfk
    return totalTime > 0 && (totalAfk / totalTime) > 0.5
  }, [discordLogs])

  const statusInfo = useMemo(() => {
    if (!session || session.status === "offline") {
      return { label: "Ngoại tuyến", color: "bg-slate-500", glow: "shadow-slate-500/30", bg: "bg-slate-500/5 border-slate-500/20 text-slate-400" }
    }
    if (session.status === "focusing") {
      return { label: "Đang tập trung học 🎯", color: "bg-emerald-500 animate-pulse", glow: "shadow-emerald-500/50 shadow-lg", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" }
    }
    if (session.status === "discord_class") {
      return { label: "Đang học qua Discord 🎧", color: "bg-green-500 animate-pulse", glow: "shadow-green-500/50 shadow-lg", bg: "bg-green-500/10 border-green-500/30 text-green-400" }
    }
    if (session.status === "discord_afk") {
      return { label: "Treo máy/Tắt tiếng Discord 🚫", color: "bg-amber-500 animate-pulse", glow: "shadow-amber-500/30", bg: "bg-amber-500/10 border-amber-500/20 text-amber-500" }
    }
    return { label: "Đang nghỉ ngơi giải lao ☕", color: "bg-amber-500", glow: "shadow-amber-500/30", bg: "bg-amber-500/10 border-amber-500/30 text-amber-400" }
  }, [session])

  const todayFocusSeconds = session?.total_focus_seconds_today || 0

  return {
    // Core data
    teacherProfile, students, selectedStudent, setSelectedStudent,
    session, tasks, submissions, loading, fetchingData,
    confirmState, setConfirmState,
    studentTab, setStudentTab,
    
    // Link form
    linkingEmail, setLinkingEmail, linkingLoading, linkingError, linkingSuccess,
    setLinkingError, setLinkingSuccess,
    handleLinkStudent,
    
    // Task form
    taskTitle, setTaskTitle, taskSubject, setTaskSubject,
    taskPriority, setTaskPriority, taskDueDate, setTaskDueDate,
    taskDuration, setTaskDuration, taskLoading, taskError,
    handleAddTask, handleToggleTaskStatus, handleDeleteTask,
    
    // Discord
    discordLogs, processedDiscordLogs, afkWarning,
    
    // Timetable
    studentTimetable, showTtForm, setShowTtForm,
    editingTtId, ttFormDay, setTtFormDay,
    ttFormStart, setTtFormStart, ttFormEnd, setTtFormEnd,
    ttFormSubject, setTtFormSubject, ttFormClass, setTtFormClass,
    ttFormRoom, setTtFormRoom, ttFormNote, setTtFormNote,
    ttFormColor, setTtFormColor, ttSaving,
    handleSaveStudentTimetable,
    handleDeleteStudentTimetable, resetTtForm, handleEditStudentTimetable,
    
    // Copy Timetable Modal
    copyTtModalOpen, setCopyTtModalOpen, teacherTtEntries, copyTtLoading,
    openCopyTimetableModal, executeCopyTimetable,
    
    // Computed
    completedTasksCount, completionRate, statusInfo,
    todayFocusSeconds,
    
    // Helpers
    fetchStudentData, supabase,
  }
}
