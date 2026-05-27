"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { NotificationBell } from "@/components/NotificationBell"
import { UserMenu } from "@/components/UserMenu"
import { 
  Eye, Activity, Clock, Plus, Trash2, Calendar, Check, 
  CheckCircle, TrendingUp, User, Mail, UserPlus, Zap,
  AlertCircle, Loader2, ChevronRight, FileText, CheckCircle2, RefreshCw
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"

interface StudentProfile {
  id: string
  full_name: string | null
  email: string | null
  class: string | null
}

interface StudySession {
  student_id: string
  status: "focusing" | "resting" | "offline"
  last_status_change: string
  total_focus_seconds_today: number
}

interface StudyTask {
  id: string
  title: string
  subject: string | null
  priority: "low" | "medium" | "high"
  due_date: string | null
  status: "todo" | "in_progress" | "review" | "done"
  is_completed: boolean
  estimated_time?: number
}

interface Submission {
  id: string
  exam_id: string
  score: number
  total_marks: number
  submitted_at: string
  exam?: {
    title: string
    subject: string | null
  }
}

const PRIORITIES = [
  { value: "low", label: "Thấp", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  { value: "medium", label: "Trung bình", color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  { value: "high", label: "Cao", color: "bg-red-500/10 text-red-500 border-red-500/20" }
]

const STATUSES = [
  { value: "todo", label: "Chuẩn bị", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  { value: "in_progress", label: "Đang làm", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
  { value: "review", label: "Chờ duyệt", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { value: "done", label: "Đã xong", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
]

export default function TeacherMonitorPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  // State
  const [teacherProfile, setTeacherProfile] = useState<any>(null)
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentProfile | null>(null)
  const [session, setSession] = useState<StudySession | null>(null)
  const [tasks, setTasks] = useState<StudyTask[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchingData, setFetchingData] = useState(false)

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

  // AI Face Proctoring & Active Alert States
  const [latestFaceLog, setLatestFaceLog] = useState<any>(null)
  const [alertMsgInput, setAlertMsgInput] = useState("")
  const [sendingAlert, setSendingAlert] = useState(false)
  const [isStudentFaceRegistered, setIsStudentFaceRegistered] = useState(false)
  const [registeringFace, setRegisteringFace] = useState(false)

  // Fetch initial profile and linked students list
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
  }, [router, supabase])

  // Fetch linked students
  const fetchLinkedStudents = async (userId: string) => {
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

    const studentsList = (links || []).map((l: any) => l.profiles).filter(Boolean) as StudentProfile[]
    setStudents(studentsList)
    
    // Auto-select first student if available and none selected yet
    if (studentsList.length > 0 && !selectedStudent) {
      setSelectedStudent(studentsList[0])
    }
  }

  // Load student detailed data
  const fetchStudentData = useCallback(async (studentId: string) => {
    setFetchingData(true)
    try {
      // 1. Fetch real-time study session
      const { data: sessData } = await supabase
        .from("study_sessions")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle()
      
      setSession(sessData as StudySession | null)

      // 2. Fetch checklist tasks
      const { data: tasksData } = await supabase
        .from("study_tasks")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })

      if (tasksData) {
        setTasks(
          tasksData.map((t: any) => ({
            ...t,
            status: t.status || (t.is_completed ? "done" : "todo")
          })) as StudyTask[]
        )
      } else {
        setTasks([])
      }

      // 3. Fetch submissions
      const { data: subsData } = await supabase
        .from("submissions")
        .select("id, exam_id, score, total_marks, submitted_at, exam:exams(title, subject)")
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })

      setSubmissions((subsData || []) as any[])

      // 4. Fetch latest face monitor log
      const { data: faceLogData } = await supabase
        .from("face_monitor_logs")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      
      setLatestFaceLog(faceLogData)

      // 5. Check if student has face registration
      const { data: regFace } = await supabase
        .from("student_face_registrations")
        .select("id")
        .eq("student_id", studentId)
        .maybeSingle()
      
      setIsStudentFaceRegistered(!!regFace)

    } catch (err) {
      console.error("Error fetching student details:", err)
    } finally {
      setFetchingData(false)
    }
  }, [supabase])

  // Trigger fetch when selected student changes
  useEffect(() => {
    if (selectedStudent) {
      fetchStudentData(selectedStudent.id)

      // Realtime listener for focus session and face log changes
      const channel = supabase
        .channel(`teacher_monitor_${selectedStudent.id}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "study_sessions", filter: `student_id=eq.${selectedStudent.id}` },
          (payload: any) => {
            if (payload.eventType === "DELETE") {
              setSession(null)
            } else {
              setSession(payload.new as StudySession)
            }
          }
        )
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "face_monitor_logs", filter: `student_id=eq.${selectedStudent.id}` },
          (payload: any) => {
            setLatestFaceLog(payload.new)
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
      setLatestFaceLog(null)
    }
  }, [selectedStudent, fetchStudentData, supabase])

  // Send active alert to student via Broadcast
  const handleSendActiveAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return
    setSendingAlert(true)

    try {
      const alertMsg = alertMsgInput.trim() || "Tập trung học đi em trai ơi! Người anh đang quan sát đó!"
      const channel = supabase.channel(`observatory:${selectedStudent.id}`)
      
      await channel.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await channel.send({
            type: "broadcast",
            event: "active_alert",
            payload: { 
              message: alertMsg,
              timestamp: new Date().toISOString()
            }
          })
          setAlertMsgInput("")
          alert("Đã phát cảnh báo cưỡng chế tức thời tới em trai!")
        }
      })
    } catch (err: any) {
      console.error("Lỗi gửi cảnh báo:", err)
      alert("Lỗi khi gửi cảnh báo: " + err.message)
    } finally {
      setSendingAlert(false)
    }
  }

  // Upload student face registration from teacher dashboard (Lựa chọn B)
  const handleUploadFaceRegistration = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !selectedStudent) return
    
    setRegisteringFace(true)
    try {
      // Wrap FileReader in a Promise to properly await async operation
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error("Không thể đọc file ảnh."))
        reader.readAsDataURL(file)
      })

      const res = await fetch("/api/monitor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image_base64: base64, 
          type: "register",
          student_id: selectedStudent.id
        })
      })
      const data = await res.json()
      if (res.ok) {
        setIsStudentFaceRegistered(true)
        alert("Đăng ký khuôn mặt gốc cho em trai thành công! AI sẵn sàng đối khớp.")
      } else {
        alert("Lỗi đăng ký: " + (data.error || "Không rõ lỗi. Hãy chắc chắn FastAPI server (cổng 8000) đang chạy."))
      }
    } catch (err: any) {
      console.error("Lỗi upload khuôn mặt gốc:", err)
      alert("Lỗi: " + err.message)
    } finally {
      setRegisteringFace(false)
      // Reset input so user can re-select the same file if needed
      e.target.value = ""
    }
  }

  // Link a student by email
  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkingEmail.trim() || !teacherProfile) return

    setLinkingLoading(true)
    setLinkingError(null)
    setLinkingSuccess(null)

    try {
      const emailVal = linkingEmail.trim().toLowerCase()

      // Fetch student profile first
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

      // Insert link
      const { error: linkError } = await supabase
        .from("parent_student_links")
        .insert({
          parent_id: teacherProfile.id,
          student_id: student.id
        })

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
      
      // Refresh students list
      await fetchLinkedStudents(teacherProfile.id)
      
      // Auto-select the newly linked student
      setSelectedStudent(student)
    } catch (err: any) {
      console.error("Link error:", err)
      setLinkingError("Có lỗi xảy ra: " + err.message)
    } finally {
      setLinkingLoading(false)
    }
  }

  // Assign a study task to the student
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

      const { error } = await supabase
        .from("study_tasks")
        .insert(payload)

      if (error) {
        throw error
      }

      setTaskTitle("")
      setTaskSubject("")
      setTaskPriority("medium")
      setTaskDueDate("")
      setTaskDuration("")
      
      // Refresh checklist tasks list
      if (selectedStudent) {
        await fetchStudentData(selectedStudent.id)
      }
    } catch (err: any) {
      console.error("Add task error:", err)
      setTaskError("Lỗi khi giao mục tiêu: " + err.message + ". Vui lòng chắc chắn bạn đã chạy SQL vá lỗi RLS.")
    } finally {
      setTaskLoading(false)
    }
  }

  // Approve / Toggle Task Completion
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

  // Delete a Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Bạn có chắc muốn xóa đầu việc này khỏi checklist của học sinh?")) return

    try {
      const { error } = await supabase
        .from("study_tasks")
        .delete()
        .eq("id", taskId)

      if (error) throw error

      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (err) {
      console.error("Delete task error:", err)
    }
  }

  // Time format helper (hh:mm:ss)
  const formatSeconds = (secs: number) => {
    const h = Math.floor(secs / 3600)
    const m = Math.floor((secs % 3600) / 60)
    const s = secs % 60
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
  }

  // Progress stats computing
  const completedTasksCount = tasks.filter(t => t.is_completed).length
  const completionRate = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0
  
  // Study session status formatting
  const statusInfo = useMemo(() => {
    if (!session || session.status === "offline") {
      return { label: "Ngoại tuyến", color: "bg-slate-500", glow: "shadow-slate-500/30", bg: "bg-slate-500/5 border-slate-500/20 text-slate-400" }
    }
    if (session.status === "focusing") {
      return { label: "Đang tập trung học 🎯", color: "bg-emerald-500 animate-pulse", glow: "shadow-emerald-500/50 shadow-lg", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" }
    }
    return { label: "Đang nghỉ ngơi giải lao ☕", color: "bg-amber-500", glow: "shadow-amber-500/30", bg: "bg-amber-500/10 border-amber-500/30 text-amber-400" }
  }, [session])

  // Daily target (2 hours) percentage computing
  const DAILY_TARGET_SECONDS = 2 * 3600 // 2 hours
  const todayFocusSeconds = session?.total_focus_seconds_today || 0
  const dailyTargetPercent = Math.min(Math.round((todayFocusSeconds / DAILY_TARGET_SECONDS) * 100), 100)

  if (loading) return <Loading fullPage label="Đang kết nối Đài giám sát..." />

  return (
    <TeacherShell onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }}>
      {/* Header cho Mobile */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/75 px-4 backdrop-blur-md lg:hidden safe-top">
        <div className="flex h-16 items-center justify-between">
          <Link href="/teacher/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
              <Eye className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold tracking-tight">Observatory</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserMenu userName={teacherProfile?.full_name || ""} userClass="Giáo viên" onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }} role="teacher" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 lg:px-8 lg:py-10">
        
        {/* Banner Section */}
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-3 py-1 text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]">
              <Activity className="h-3.5 w-3.5 text-violet-500 animate-pulse" /> Parent/Elder Brother observatory desk
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-6xl">Đài Giám Sát Học Tập</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))] md:text-lg">
              Quan sát trạng thái học realtime của em trai, giao việc trực tiếp vào Checklist và theo dõi kết quả làm bài tập trực tuyến.
            </p>
          </div>
          
          {/* Linked student switcher or add links container */}
          <div className="rounded-[1.5rem] sm:rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:p-6 shadow-sm">
            <p className="text-xs uppercase font-bold tracking-wider text-[hsl(var(--muted-foreground))] mb-3">Em trai đang quan sát</p>
            {students.length === 0 ? (
              <p className="text-sm italic text-[hsl(var(--muted-foreground))]">Chưa liên kết tài khoản nào</p>
            ) : (
              <div className="relative">
                <select 
                  value={selectedStudent?.id || ""} 
                  onChange={(e) => {
                    const st = students.find(s => s.id === e.target.value)
                    if (st) setSelectedStudent(st)
                  }}
                  className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] text-sm font-semibold p-3 outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[right_12px_center] bg-[length:14px] pr-8 bg-no-repeat"
                >
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      👤 {student.full_name} ({student.class || "Chưa chọn lớp"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Link Account Form if no children linked or for linking extra siblings */}
        {students.length === 0 && (
          <section className="mb-8 rounded-[2.5rem] border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 p-8 text-center max-w-xl mx-auto shadow-sm">
            <UserPlus className="mx-auto mb-4 h-12 w-12 text-violet-500/80" strokeWidth={1.2} />
            <h2 className="text-xl font-bold mb-2">Chưa có tài khoản em trai liên kết</h2>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6 max-w-md mx-auto">
              Nhập chính xác email tài khoản của em trai bạn (tài khoản Học sinh) để thiết lập luồng liên kết quan sát từ xa.
            </p>
            <form onSubmit={handleLinkStudent} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-[hsl(var(--muted-foreground))]" />
                  <Input 
                    type="email" 
                    placeholder="email.cua.em@example.com" 
                    value={linkingEmail}
                    onChange={(e) => setLinkingEmail(e.target.value)}
                    className="pl-11 rounded-xl bg-transparent py-6"
                    required
                  />
                </div>
                <Button type="submit" disabled={linkingLoading} className="rounded-xl px-6 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                  {linkingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kết nối"}
                </Button>
              </div>
              {linkingError && <p className="text-xs font-semibold text-red-500 flex items-center justify-center gap-1.5 mt-2"><AlertCircle className="h-3.5 w-3.5" />{linkingError}</p>}
              {linkingSuccess && <p className="text-xs font-semibold text-emerald-500 flex items-center justify-center gap-1.5 mt-2"><CheckCircle className="h-3.5 w-3.5" />{linkingSuccess}</p>}
            </form>
          </section>
        )}

        {selectedStudent && (
          <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
            
            {/* Cột trái: Realtime Monitor + Checklist */}
            <div className="space-y-6">
              
              {/* Card 1: Real-time Presence */}
              <div className={cn(
                "rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 p-4 sm:p-6 shadow-md transition-all relative overflow-hidden bg-[hsl(var(--card))]",
                session?.status === "focusing" && "ring-1 ring-emerald-500/25"
              )}>
                {/* Visual Glassmorphism highlight */}
                <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

                <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-4 mb-6">
                  <div>
                    <h3 className="font-bold text-lg">Giám Sát Trạng Thái Live</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Đang kết nối cổng realtime với thiết bị của em</p>
                  </div>
                  <button 
                    onClick={() => fetchStudentData(selectedStudent.id)}
                    className="p-2 hover:bg-[hsl(var(--muted))]/30 rounded-full text-[hsl(var(--muted-foreground))] transition-all"
                    title="Đồng bộ thủ công"
                  >
                    <RefreshCw className={cn("h-4 w-4", fetchingData && "animate-spin")} />
                  </button>
                </div>

                <div className="grid gap-4 sm:gap-6 md:grid-cols-2 items-center">
                  
                  {/* Status Indicator Panel */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] mb-1">Trạng thái hiện tại</p>
                      <div className={cn("inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold backdrop-blur-md", statusInfo.bg)}>
                        <span className={cn("h-2.5 w-2.5 rounded-full shadow-md", statusInfo.color, statusInfo.glow)} />
                        {statusInfo.label}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))] mb-1">Thời gian đã học hôm nay</p>
                      <p className="text-4xl font-bold tracking-tight bg-gradient-to-r from-[hsl(var(--foreground))] to-[hsl(var(--muted-foreground))] bg-clip-text text-transparent">
                        {formatSeconds(todayFocusSeconds)}
                      </p>
                    </div>
                  </div>

                  {/* Circular/Linear Progress target tracking */}
                  <div className="rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/40 p-4 relative overflow-hidden">
                    <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] mb-2">Mục tiêu học tập hàng ngày</p>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-2xl font-bold">{dailyTargetPercent}%</span>
                      <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-semibold">Mục tiêu: 2 giờ</span>
                    </div>
                    <div className="w-full bg-[hsl(var(--border))]/50 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-1000" 
                        style={{ width: `${dailyTargetPercent}%` }} 
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Card 1.5: AI Proctoring & Cảnh Báo Cưỡng Chế */}
              <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:p-6 shadow-md relative overflow-hidden">
                <div className="absolute -left-16 -bottom-16 h-36 w-36 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
                
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-lg">AI Giám Sát Camera & Cảnh Báo</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Phát hiện khuôn mặt, cảm xúc học tập và can thiệp từ xa</p>
                  </div>
                  <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-500">DeepFace AI</span>
                </div>

                <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
                  {/* Cột trái: AI Proctoring View */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Trạng thái từ Camera của em</p>
                    
                    {latestFaceLog ? (
                      <div className="space-y-3 rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/30 p-4">
                        <div className="space-y-2 text-xs font-semibold">
                          <div className="flex justify-between items-center">
                            <span className="text-[hsl(var(--muted-foreground))]">Hiện diện:</span>
                            <span className={latestFaceLog.is_present ? "text-emerald-500 flex items-center gap-1" : "text-rose-500 flex items-center gap-1 animate-pulse"}>
                              <span className={cn("h-2 w-2 rounded-full", latestFaceLog.is_present ? "bg-emerald-500" : "bg-red-500 animate-ping")} />
                              {latestFaceLog.is_present ? "Đang ngồi học" : "Đã rời bàn học"}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-center">
                            <span className="text-[hsl(var(--muted-foreground))]">Xác thực danh tính:</span>
                            <span className={latestFaceLog.is_verified ? "text-emerald-500 flex items-center gap-1" : "text-rose-500 flex items-center gap-1 animate-pulse"}>
                              <span className={cn("h-2 w-2 rounded-full", latestFaceLog.is_verified ? "bg-emerald-500" : "bg-red-500 animate-ping")} />
                              {latestFaceLog.is_verified ? "Chính chủ em trai" : "Sai người/Không khớp"}
                            </span>
                          </div>

                          {latestFaceLog.dominant_emotion && (
                            <div className="flex justify-between items-center">
                              <span className="text-[hsl(var(--muted-foreground))]">Cảm xúc học tập:</span>
                              <span className="rounded-full bg-violet-500/10 px-2.5 py-0.5 text-violet-500 capitalize text-[10px] font-bold border border-violet-500/20">
                                {latestFaceLog.dominant_emotion}
                              </span>
                            </div>
                          )}

                          <div className="text-[9px] text-[hsl(var(--muted-foreground))] border-t border-[hsl(var(--border))]/20 pt-2 flex justify-between">
                            <span>Cập nhật mới nhất:</span>
                            <span>{new Date(latestFaceLog.created_at).toLocaleTimeString("vi-VN")}</span>
                          </div>
                        </div>

                        {/* Snapshot bằng chứng vi phạm nếu có */}
                        {latestFaceLog.snapshot_path && (
                          <div className="mt-3 space-y-1">
                            <p className="text-[9px] uppercase font-bold text-rose-500">Ảnh bằng chứng vi phạm:</p>
                            <div className="relative rounded-xl overflow-hidden aspect-video border border-rose-500/30 group cursor-pointer shadow-md">
                              <img 
                                src={latestFaceLog.snapshot_path} 
                                alt="Bằng chứng học tập" 
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-semibold">
                                Bấm để xem to
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-8 rounded-2xl border border-dashed border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/10 text-center text-xs text-[hsl(var(--muted-foreground))] flex flex-col justify-center items-center p-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[hsl(var(--muted-foreground))]/50 mb-2 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        Chưa nhận được tín hiệu camera.<br />Đang đợi em trai bật camera tự học.
                      </div>
                    )}
                    {/* Widget Cấu hình khuôn mặt gốc (Lựa chọn B) */}
                    <div className="rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/20 p-4 space-y-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Khuôn mặt mẫu đối khớp</span>
                        <span className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                          isStudentFaceRegistered ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse"
                        )}>
                          {isStudentFaceRegistered ? "Đã Thiết Lập" : "Chưa Thiết Lập"}
                        </span>
                      </div>

                      <div className="text-xs text-[hsl(var(--muted-foreground))] leading-relaxed">
                        {isStudentFaceRegistered ? (
                          "Khuôn mặt của em trai đã được cấu hình và đồng bộ an toàn. Hệ thống AI sẵn sàng đối sánh mỗi khi em tự học."
                        ) : (
                          "Để bắt đầu tự động giám sát, bạn cần tải lên một bức ảnh chân dung rõ nét, chính diện của em trai."
                        )}
                      </div>

                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*" 
                          id="face-upload-input"
                          onChange={handleUploadFaceRegistration}
                          disabled={registeringFace}
                          className="hidden" 
                        />
                        <label 
                          htmlFor="face-upload-input"
                          className={cn(
                            "w-full rounded-xl py-3 border border-dashed text-center text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer hover:bg-[hsl(var(--muted))]/20 transition-all",
                            registeringFace ? "opacity-50 pointer-events-none" : "border-indigo-500/40 text-indigo-500"
                          )}
                        >
                          {registeringFace ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Đang xử lý trích xuất AI...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                              {isStudentFaceRegistered ? "Cập nhật ảnh chân dung khác" : "Tải lên ảnh chân dung em 📸"}
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Cột phải: Active Alerting Form */}
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Đài phát cảnh báo cưỡng chế</p>
                    
                    <form onSubmit={handleSendActiveAlert} className="space-y-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] uppercase font-bold text-rose-600">Lời nhắn nhắc nhở cưỡng chế</Label>
                        <Input 
                          placeholder="VD: Tập trung học đi em trai ơi!"
                          value={alertMsgInput}
                          onChange={(e) => setAlertMsgInput(e.target.value)}
                          className="rounded-xl border-rose-500/30 bg-transparent text-xs"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={sendingAlert}
                        className="w-full rounded-xl py-4.5 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold tracking-wide shadow-md flex items-center justify-center gap-1.5"
                      >
                        {sendingAlert ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Phát cảnh báo đỏ ngay
                          </>
                        )}
                      </Button>
                      <p className="text-[10px] text-rose-500/80 leading-normal text-center">
                        * Màn hình của em trai sẽ lập tức bị khóa overlay đỏ mờ, đồng thời phát âm thanh lớn cảnh báo và tự động đọc to lời nhắn của bạn!
                      </p>
                    </form>
                  </div>
                </div>
              </div>

              {/* Card 2: Checklist Manager */}
              <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Checklist & Planner của em</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Đã hoàn thành {completedTasksCount}/{tasks.length} đầu việc ({completionRate}%)</p>
                  </div>
                  <span className="rounded-full bg-[hsl(var(--foreground))]/5 px-3 py-1 text-xs font-bold">{tasks.length} tasks</span>
                </div>

                {/* Direct Task Creator form */}
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
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[hsl(var(--muted-foreground))]">Độ ưu tiên</Label>
                      <select 
                        value={taskPriority} 
                        onChange={(e) => setTaskPriority(e.target.value as any)}
                        className="w-full rounded-xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))] text-sm px-3 py-2 cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-[right_10px_center] bg-[length:12px] pr-8 bg-no-repeat"
                      >
                        <option value="low">Thấp</option>
                        <option value="medium">Trung bình</option>
                        <option value="high">Cao</option>
                      </select>
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
                      {taskLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Thêm vào Checklist của em</>}
                    </Button>
                  </div>
                  {taskError && <p className="text-xs font-semibold text-red-500 flex items-center gap-1.5 justify-center"><AlertCircle className="h-3.5 w-3.5" />{taskError}</p>}
                </form>

                {/* Tasks List */}
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {tasks.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]/50">
                      Chưa có mục tiêu học tập nào được thêm vào checklist.
                    </div>
                  ) : (
                    tasks.map((task) => {
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
                            {/* Checkbox for quick approve */}
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
              </div>

            </div>

            {/* Cột phải: Homework/Exams assigned + Submissions tracking + Timetable */}
            <div className="space-y-6">
              
              {/* Card 3: Homework Assigned & Scores Tracker */}
              <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:p-6 shadow-md overflow-hidden">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[hsl(var(--border))]/20 pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Bài Tập Trực Tuyến</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Xem kết quả bài kiểm tra em trai đã làm</p>
                  </div>
                  <Link href="/teacher/exams/create" className="no-print">
                    <Button size="sm" className="rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 py-4 px-4 text-xs font-semibold">
                      <Plus className="mr-1 h-3.5 w-3.5" /> Giao bài mới
                    </Button>
                  </Link>
                </div>

                {/* Submissions Tracker Table */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {submissions.length === 0 ? (
                    <div className="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]/50">
                      Chưa nộp bài tập kiểm tra nào trên hệ thống.
                    </div>
                  ) : (
                    submissions.map((sub) => {
                      const scorePercentage = Math.round((sub.score / sub.total_marks) * 100)
                      
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
                              <p className="text-base font-bold text-violet-500">{sub.score} / {sub.total_marks}</p>
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
              </div>

              {/* Card 4: Timetable Widget Preview */}
              <div className="rounded-[1.5rem] sm:rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 sm:p-6 shadow-md">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-4 mb-4">
                  <div>
                    <h3 className="font-bold text-lg">Khung Giờ Học Tập</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Lịch trình tự học được người anh lập ra</p>
                  </div>
                  <Link href="/teacher/timetable">
                    <Button variant="outline" size="sm" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent text-xs font-semibold py-4 px-4">
                      Thiết lập lịch
                    </Button>
                  </Link>
                </div>
                <div className="rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--background))]/20 p-4 text-center">
                  <Calendar className="mx-auto mb-3 h-8 w-8 text-violet-500/80 animate-bounce" strokeWidth={1.2} />
                  <p className="text-sm font-semibold tracking-tight mb-1">Mọi thay đổi trên lịch dạy học của bạn</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] leading-normal max-w-sm mx-auto">
                    sẽ tự động đồng bộ sang mục Lịch học trên thanh PWA Pinned app của em trai.
                  </p>
                </div>
              </div>

            </div>

          </section>
        )}

      </main>
    </TeacherShell>
  )
}
