"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { 
  Plus, Check, Trash2, ListTodo, Calendar, Flame, Target, 
  TrendingUp, Sparkles, LayoutGrid, TableProperties, CalendarDays, 
  ChevronLeft, ChevronRight, FileText, Type, Heading, List, Quote, 
  AlertCircle, Save, Loader2, ArrowRightLeft, ArrowRight
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"

interface NoteBlock {
  id: string
  type: "header" | "text" | "bullet" | "quote" | "highlight"
  content: string
}

interface StudyTask { 
  id: string 
  title: string 
  description: string | null 
  subject: string | null 
  due_date: string | null 
  is_completed: boolean 
  completed_at: string | null 
  priority: "low" | "medium" | "high" 
  status?: "todo" | "in_progress" | "review" | "done"
  created_at: string 
}

export default function StudyChecklistPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [tasks, setTasks] = useState<StudyTask[]>([])
  const [loading, setLoading] = useState(true)
  
  // View states
  const [activeView, setActiveView] = useState<"board" | "table" | "calendar">("board")
  
  // Add task states
  const [newTitle, setNewTitle] = useState("")
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium")
  const [newSubject, setNewSubject] = useState("")
  const [newDueDate, setNewDueDate] = useState("")
  const [newStatus, setNewStatus] = useState<"todo" | "in_progress" | "review" | "done">("todo")
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Notion Editor active task state
  const [selectedTask, setSelectedTask] = useState<StudyTask | null>(null)
  const [editorBlocks, setEditorBlocks] = useState<NoteBlock[]>([])
  const [savingNotes, setSavingNotes] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [editorError, setEditorError] = useState<string | null>(null)
  
  // Calendar states
  const [currentMonth, setCurrentMonth] = useState(new Date())

  // Fetch tasks
  useEffect(() => {
    let mounted = true

    const fetchTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data } = await supabase.from("study_tasks").select("*").order("created_at", { ascending: false })
      if (mounted && data) {
        // Map any old legacy tasks status based on is_completed
        const mapped = data.map((t: any) => ({
          ...t,
          status: t.status || (t.is_completed ? "done" : "todo")
        }))
        setTasks(mapped)
      }
      if (mounted) setLoading(false)
    }

    fetchTasks()
    return () => {
      mounted = false
    }
  }, [router, supabase])

  const refreshTasks = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from("study_tasks").select("*").order("created_at", { ascending: false })
    if (data) {
      const mapped = data.map((t: any) => ({
        ...t,
        status: t.status || (t.is_completed ? "done" : "todo")
      }))
      setTasks(mapped)
      
      // Update selected task reference if open
      if (selectedTask) {
        const updated = mapped.find((t: any) => t.id === selectedTask.id)
        if (updated) setSelectedTask(updated)
      }
    }
  }

  // Create Task
  const handleAddTask = async () => {
    if (!newTitle.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      student_id: user.id,
      title: newTitle.trim(),
      subject: newSubject.trim() || null,
      due_date: newDueDate || null,
      priority: newPriority,
      is_completed: newStatus === "done",
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
      status: newStatus
    }

    await supabase.from("study_tasks").insert(payload)
    setNewTitle("")
    setNewSubject("")
    setNewDueDate("")
    setNewStatus("todo")
    setShowAddForm(false)
    await refreshTasks()
  }

  // Delete Task
  const handleDelete = async (id: string) => {
    if (selectedTask?.id === id) setSelectedTask(null)
    await supabase.from("study_tasks").delete().eq("id", id)
    await refreshTasks()
  }

  // Update Status / Position
  const handleMoveStatus = async (task: StudyTask, nextStatus: "todo" | "in_progress" | "review" | "done") => {
    const isCompleted = nextStatus === "done"
    const completedAt = isCompleted ? new Date().toISOString() : null

    await supabase.from("study_tasks").update({ 
      status: nextStatus,
      is_completed: isCompleted,
      completed_at: completedAt
    }).eq("id", task.id)
    await refreshTasks()
  }

  // Notion Editor block management
  const openEditor = (task: StudyTask) => {
    setSelectedTask(task)
    setEditorError(null)
    
    // Parse description if it's JSON block content, else create a single text block with old description
    if (task.description) {
      if (task.description.startsWith("[") && task.description.endsWith("]")) {
        try {
          const parsed = JSON.parse(task.description) as NoteBlock[]
          setEditorBlocks(parsed)
          return
        } catch (e) {
          // Fallback to text
        }
      }
      setEditorBlocks([{ id: "1", type: "text", content: task.description }])
    } else {
      // Default initial Notion-like workspace blocks
      setEditorBlocks([
        { id: "1", type: "header", content: `Ghi chú ôn tập: ${task.title}` },
        { id: "2", type: "text", content: "Viết ghi chú lý thuyết hoặc kế hoạch chi tiết của bạn tại đây..." }
      ])
    }
  }

  const addEditorBlock = (type: NoteBlock["type"]) => {
    const newBlock: NoteBlock = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      content: ""
    }
    setEditorBlocks([...editorBlocks, newBlock])
  }

  const updateBlockContent = (id: string, value: string) => {
    setEditorBlocks(
      editorBlocks.map(b => b.id === id ? { ...b, content: value } : b)
    )
  }

  const updateBlockType = (id: string, type: NoteBlock["type"]) => {
    setEditorBlocks(
      editorBlocks.map(b => b.id === id ? { ...b, type } : b)
    )
  }

  const deleteBlock = (id: string) => {
    if (editorBlocks.length <= 1) {
      setEditorBlocks([{ id: "1", type: "text", content: "" }])
      return
    }
    setEditorBlocks(editorBlocks.filter(b => b.id !== id))
  }

  const handleSaveNotes = async () => {
    if (!selectedTask) return
    setSavingNotes(true)
    setEditorError(null)
    try {
      const jsonContent = JSON.stringify(editorBlocks)
      const { error: saveError } = await supabase
        .from("study_tasks")
        .update({ description: jsonContent })
        .eq("id", selectedTask.id)

      if (saveError) throw saveError
      await refreshTasks()
    } catch (e: any) {
      setEditorError("Lỗi khi lưu ghi chú: " + e.message)
    } finally {
      setSavingNotes(false)
    }
  }

  // AI Smart Outline generator
  const handleAiSmartOutline = async () => {
    if (!selectedTask) return
    setAiGenerating(true)
    setEditorError(null)
    try {
      const res = await fetch("/api/ai/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: selectedTask.title,
          subject: selectedTask.subject || "Lớp học"
        })
      })

      if (!res.ok) {
        throw new Error((await res.json().catch(() => ({}))).error || "AI outline generation failed")
      }

      const data = await res.json()
      if (data.blocks && Array.isArray(data.blocks)) {
        setEditorBlocks(data.blocks)
      } else {
        throw new Error("Dữ liệu AI trả về không đúng định dạng")
      }
    } catch (e: any) {
      setEditorError("Không thể tạo đề cương lý thuyết: " + e.message)
    } finally {
      setAiGenerating(false)
    }
  }

  // Task analytical computed statistics
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.is_completed).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  
  const streak = useMemo(() => {
    const completedDates = tasks
      .filter((task) => task.completed_at)
      .map((task) => new Date(task.completed_at!).toDateString())
    const uniqueDates = [...new Set(completedDates)].sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    )
    let count = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      dateSetDay(checkDate, today.getDate() - i)
      if (uniqueDates.includes(checkDate.toDateString())) {
        count++
      } else if (i > 0) {
        break
      }
    }
    return count
  }, [tasks])

  function dateSetDay(d: Date, day: number) {
    d.setDate(day)
  }

  // Dynamic Groupings for Kanban Board
  const todoTasks = tasks.filter(t => t.status === "todo")
  const inProgressTasks = tasks.filter(t => t.status === "in_progress")
  const reviewTasks = tasks.filter(t => t.status === "review")
  const doneTasks = tasks.filter(t => t.status === "done")

  // Calendar math
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDayIndex = new Date(year, month, 1).getDay()
    // Align with Monday (Vietnam standard calendar starting day of week)
    const offset = firstDayIndex === 0 ? 6 : firstDayIndex - 1
    
    const days: Date[] = []
    
    // Previous month padding
    const prevMonthDaysCount = new Date(year, month, 0).getDate()
    for (let i = offset - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthDaysCount - i))
    }
    
    // Current month days
    const currentMonthDaysCount = new Date(year, month + 1, 0).getDate()
    for (let i = 1; i <= currentMonthDaysCount; i++) {
      days.push(new Date(year, month, i))
    }
    
    // Next month padding
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }, [currentMonth])

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  if (loading) return <Loading fullPage label="Đang đồng bộ Planner..." />

  return (
    <StudentShell>
      <StudentHeader name="Checklist" onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }} />
      <main className="mx-auto max-w-7xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        
        {/* Banner Section */}
        <section className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] backdrop-blur-md">
              <Sparkles className="h-4 w-4 text-violet-500 animate-pulse" /> Notion Study Workspace
            </div>
            <h1 className="max-w-3xl text-5xl font-bold tracking-[-2px] md:text-7xl lg:text-8xl">Planner Học Tập</h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[hsl(var(--muted-foreground))]">
              Không gian quản lý mục tiêu học tập đa góc nhìn (Kanban, Bảng biểu, Lịch biểu) kết hợp ghi chú thông minh và trợ lý soạn thảo AI lý thuyết.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setShowAddForm(!showAddForm)} className="rounded-full shadow-lg">
              <Plus className="mr-2 h-4 w-4" /> Thêm mục tiêu
            </Button>
          </div>
        </section>

        {/* Analytic Cards */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Target, value: `${completionRate}%`, label: "Tỉ lệ hoàn thành", sub: "Tiến độ học tập" },
            { icon: ListTodo, value: `${completedTasks}/${totalTasks}`, label: "Nhiệm vụ xong", sub: "Tổng chỉ số" },
            { icon: Flame, value: `${streak} ngày`, label: "Chuỗi liên tục (Streak)", sub: "Đều đặn hàng ngày" }
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-4 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-sm">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[hsl(var(--foreground))]/5">
                <item.icon className="h-6 w-6 text-[hsl(var(--foreground))]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))]">{item.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Task Form Modal-like UI */}
        {showAddForm && (
          <section className="mb-8 space-y-4 rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-md animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-[hsl(var(--border))]/40 pb-3">
              <h3 className="font-semibold text-lg">Mục tiêu học tập mới</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="rounded-full">Đóng</Button>
            </div>
            <Input 
              placeholder="Tên mục tiêu học tập (ví dụ: Ôn tập chương Điện xoay chiều)..." 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)} 
              className="rounded-xl border-[hsl(var(--border))]/60 text-base py-6 bg-transparent" 
              autoFocus 
            />
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))]">Môn học</Label>
                <Input placeholder="Môn học (VD: Vật lý)" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))]">Hạn chót</Label>
                <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="rounded-xl border-[hsl(var(--border))]/60 bg-transparent text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))]">Độ ưu tiên</Label>
                <select value={newPriority} onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")} className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] px-3 py-2 text-sm">
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs uppercase font-bold text-[hsl(var(--muted-foreground))]">Trạng thái</Label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value as any)} className="w-full rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] px-3 py-2 text-sm">
                  <option value="todo">Cần làm</option>
                  <option value="in_progress">Đang làm</option>
                  <option value="review">Kiểm tra</option>
                  <option value="done">Hoàn thành</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleAddTask} disabled={!newTitle.trim()} className="flex-1 rounded-full py-5">
                Xác nhận tạo
              </Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent py-5">
                Hủy bỏ
              </Button>
            </div>
          </section>
        )}

        {/* View Selection Controls */}
        <section className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2 rounded-full border border-[hsl(var(--border))]/50 bg-[hsl(var(--card))]/80 p-1 shadow-sm backdrop-blur-md">
            {[
              { key: "board" as const, label: "Bảng Kanban", icon: LayoutGrid },
              { key: "table" as const, label: "Cơ sở dữ liệu", icon: TableProperties },
              { key: "calendar" as const, label: "Lịch học tập", icon: CalendarDays }
            ].map((view) => (
              <button
                key={view.key}
                onClick={() => setActiveView(view.key)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200",
                  activeView === view.key
                    ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                    : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                )}
              >
                <view.icon className="h-4 w-4" /> {view.label}
              </button>
            ))}
          </div>
          <div className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">
            Tổng số: <span className="text-[hsl(var(--foreground))]">{totalTasks} mục tiêu</span>
          </div>
        </section>

        {/* Workspace Display Grid */}
        <section className="grid gap-6 lg:grid-cols-[1fr_auto]">
          
          {/* Main workspace */}
          <div className="min-w-0">
            
            {/* 1. KANBAN BOARD VIEW */}
            {activeView === "board" && (
              <div className="grid gap-6 md:grid-cols-4">
                {[
                  { key: "todo" as const, label: "Chuẩn bị", bg: "bg-slate-500/5", border: "border-slate-500/30", color: "text-slate-500", list: todoTasks },
                  { key: "in_progress" as const, label: "Đang làm", bg: "bg-indigo-500/5", border: "border-indigo-500/30", color: "text-indigo-500", list: inProgressTasks },
                  { key: "review" as const, label: "Chờ duyệt", bg: "bg-amber-500/5", border: "border-amber-500/30", color: "text-amber-500", list: reviewTasks },
                  { key: "done" as const, label: "Đã xong", bg: "bg-emerald-500/5", border: "border-emerald-500/30", color: "text-emerald-500", list: doneTasks }
                ].map((column) => (
                  <div key={column.key} className={cn("rounded-[2.5rem] border p-4 flex flex-col min-h-[50vh]", column.bg, column.border)}>
                    <div className="mb-4 flex items-center justify-between border-b border-[hsl(var(--border))]/25 pb-2">
                      <span className={cn("text-xs font-bold uppercase tracking-wider", column.color)}>{column.label}</span>
                      <span className="rounded-full bg-[hsl(var(--foreground))]/5 px-2 py-0.5 text-[10px] font-bold">{column.list.length}</span>
                    </div>
                    
                    <div className="flex-1 space-y-3 overflow-y-auto max-h-[60vh] pr-1">
                      {column.list.length === 0 ? (
                        <div className="py-12 text-center text-xs text-[hsl(var(--muted-foreground))]/40">Kéo thả hoặc dời thẻ tại đây</div>
                      ) : (
                        column.list.map((task) => (
                          <div 
                            key={task.id} 
                            onClick={() => openEditor(task)}
                            className={cn(
                              "group relative rounded-[1.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer",
                              task.id === selectedTask?.id && "ring-2 ring-[hsl(var(--foreground))]"
                            )}
                          >
                            <p className="text-sm font-semibold leading-tight line-clamp-2">{task.title}</p>
                            
                            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
                              {task.subject && (
                                <span className="rounded-full bg-violet-500/5 border border-violet-500/20 px-2 py-0.5 text-violet-500 font-semibold">
                                  {task.subject}
                                </span>
                              )}
                              <span className={cn(
                                "rounded-full px-2 py-0.5 font-bold uppercase tracking-wider text-[9px]",
                                task.priority === "high" ? "bg-red-500/5 text-red-500 border border-red-500/20" :
                                task.priority === "medium" ? "bg-amber-500/5 text-amber-500 border border-amber-500/20" :
                                "bg-slate-500/5 text-slate-500 border border-slate-500/20"
                              )}>
                                {task.priority === "high" ? "Cao" : task.priority === "medium" ? "T.Bình" : "Thấp"}
                              </span>
                            </div>

                            {task.due_date && (
                              <div className="mt-3 flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(task.due_date).toLocaleDateString("vi-VN")}
                              </div>
                            )}

                            {/* Card action controls */}
                            <div className="mt-3 flex items-center justify-between border-t border-[hsl(var(--border))]/20 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(task.id) }} 
                                className="rounded-full p-1.5 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                              
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                {column.key !== "todo" && (
                                  <button 
                                    onClick={() => handleMoveStatus(task, column.key === "in_progress" ? "todo" : column.key === "review" ? "in_progress" : "review")}
                                    className="rounded-full border border-[hsl(var(--border))]/60 p-1 hover:bg-[hsl(var(--muted))]"
                                  >
                                    <ChevronLeft className="h-3 w-3" />
                                  </button>
                                )}
                                {column.key !== "done" && (
                                  <button 
                                    onClick={() => handleMoveStatus(task, column.key === "todo" ? "in_progress" : column.key === "in_progress" ? "review" : "done")}
                                    className="rounded-full border border-[hsl(var(--border))]/60 p-1 hover:bg-[hsl(var(--muted))]"
                                  >
                                    <ChevronRight className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. DATABASE TABLE VIEW */}
            {activeView === "table" && (
              <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                        <th className="p-4">Nhiệm vụ học tập</th>
                        <th className="p-4 w-28">Trạng thái</th>
                        <th className="p-4 w-28">Ưu tiên</th>
                        <th className="p-4 w-32">Môn học</th>
                        <th className="p-4 w-36">Hạn chót</th>
                        <th className="p-4 w-16 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-16 text-center text-[hsl(var(--muted-foreground))]">
                            Chưa có mục tiêu học tập nào được thiết lập.
                          </td>
                        </tr>
                      ) : (
                        tasks.map((task) => (
                          <tr 
                            key={task.id} 
                            onClick={() => openEditor(task)}
                            className={cn(
                              "border-b border-[hsl(var(--border))]/40 hover:bg-[hsl(var(--muted))]/10 cursor-pointer transition-colors",
                              task.id === selectedTask?.id && "bg-[hsl(var(--foreground))]/5 font-medium"
                            )}
                          >
                            <td className="p-4 flex items-center gap-3">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleMoveStatus(task, task.is_completed ? "todo" : "done") }}
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-all",
                                  task.is_completed ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "border-[hsl(var(--border))]/60"
                                )}
                              >
                                {task.is_completed && <Check className="h-3 w-3" />}
                              </button>
                              <span className={cn(task.is_completed && "line-through text-[hsl(var(--muted-foreground))]/70")}>{task.title}</span>
                              {task.description && <FileText className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]/50" />}
                            </td>
                            <td className="p-4" onClick={(e) => e.stopPropagation()}>
                              <select 
                                value={task.status} 
                                onChange={(e) => handleMoveStatus(task, e.target.value as any)}
                                className="rounded-lg border border-[hsl(var(--border))]/60 bg-transparent px-2 py-1 text-xs"
                              >
                                <option value="todo">Chuẩn bị</option>
                                <option value="in_progress">Đang làm</option>
                                <option value="review">Kiểm tra</option>
                                <option value="done">Hoàn thành</option>
                              </select>
                            </td>
                            <td className="p-4">
                              <span className={cn(
                                "rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase",
                                task.priority === "high" ? "bg-red-500/5 text-red-500 border border-red-500/20" :
                                task.priority === "medium" ? "bg-amber-500/5 text-amber-500 border border-amber-500/20" :
                                "bg-slate-500/5 text-slate-500 border border-slate-500/20"
                              )}>
                                {task.priority === "high" ? "Cao" : task.priority === "medium" ? "Trung bình" : "Thấp"}
                              </span>
                            </td>
                            <td className="p-4">
                              {task.subject ? (
                                <span className="rounded-full bg-violet-500/5 border border-violet-500/20 px-2 py-0.5 text-xs text-violet-500 font-semibold">{task.subject}</span>
                              ) : (
                                <span className="text-xs text-[hsl(var(--muted-foreground))]/40">—</span>
                              )}
                            </td>
                            <td className="p-4 text-[13px] text-[hsl(var(--muted-foreground))]">
                              {task.due_date ? new Date(task.due_date).toLocaleDateString("vi-VN") : "—"}
                            </td>
                            <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={() => handleDelete(task.id)}
                                className="rounded-full p-1.5 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. INTERACTIVE CALENDAR VIEW */}
            {activeView === "calendar" && (
              <div className="rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-sm">
                
                {/* Calendar monthly controls */}
                <div className="mb-6 flex items-center justify-between border-b border-[hsl(var(--border))]/40 pb-4">
                  <h3 className="text-xl font-bold uppercase tracking-wide">
                    Tháng {currentMonth.getMonth() + 1}, {currentMonth.getFullYear()}
                  </h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-[hsl(var(--muted-foreground))] mb-2 uppercase tracking-widest">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, index) => (
                    <div key={index} className="py-2">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {calendarDays.map((date, idx) => {
                    const isToday = date.toDateString() === new Date().toDateString()
                    const isCurrentMonth = date.getMonth() === currentMonth.getMonth()
                    
                    // Filter tasks due on this date
                    const dateStr = date.toISOString().split("T")[0]
                    const dueOnThisDay = tasks.filter(t => t.due_date === dateStr)

                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "min-h-[100px] border border-[hsl(var(--border))]/30 rounded-2xl p-2 flex flex-col justify-between transition-colors",
                          isCurrentMonth ? "bg-transparent" : "opacity-35 bg-[hsl(var(--muted))]/5",
                          isToday && "ring-2 ring-[hsl(var(--foreground))]"
                        )}
                      >
                        <span className={cn(
                          "text-xs font-bold self-end h-6 w-6 flex items-center justify-center rounded-full",
                          isToday && "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]"
                        )}>
                          {date.getDate()}
                        </span>
                        
                        <div className="mt-1 flex-1 flex flex-col gap-1 justify-end">
                          {dueOnThisDay.map((task) => (
                            <div 
                              key={task.id}
                              onClick={(e) => { e.stopPropagation(); openEditor(task) }}
                              className={cn(
                                "px-2 py-0.5 rounded-lg text-[9px] font-semibold truncate cursor-pointer transition-transform hover:scale-95",
                                task.is_completed ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 line-through" : "bg-[hsl(var(--foreground))]/5 text-[hsl(var(--foreground))] border border-[hsl(var(--foreground))]/10"
                              )}
                              title={task.title}
                            >
                              {task.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar - Notion document block workspace */}
          {selectedTask && (
            <aside className="w-full lg:w-[380px] shrink-0 rounded-[2.5rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/90 p-6 shadow-md shadow-[hsl(var(--foreground))]/5 animate-in slide-in-from-right-8 duration-200">
              
              {/* Header and Close controls */}
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/40 pb-4 mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Ghi chú bài học</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedTask(null)}
                  className="rounded-full"
                >
                  Đóng lại
                </Button>
              </div>

              {/* Task Title */}
              <div className="mb-4">
                <Input 
                  value={selectedTask.title} 
                  onChange={async (e) => {
                    const newTitleVal = e.target.value
                    setSelectedTask({ ...selectedTask, title: newTitleVal })
                    setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, title: newTitleVal } : t))
                    await supabase.from("study_tasks").update({ title: newTitleVal }).eq("id", selectedTask.id)
                  }}
                  className="text-lg font-bold px-0 border-0 bg-transparent focus:ring-0 select-none py-1 focus-visible:ring-0" 
                  placeholder="Tiêu đề nhiệm vụ..."
                />
              </div>

              {/* Task Metadata panel */}
              <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/80 p-4 mb-4 grid gap-2.5 text-xs text-[hsl(var(--muted-foreground))]">
                <div className="flex items-center justify-between">
                  <span>Trạng thái</span>
                  <select 
                    value={selectedTask.status} 
                    onChange={async (e) => {
                      const next = e.target.value as any
                      await handleMoveStatus(selectedTask, next)
                    }}
                    className="rounded-lg border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] px-2 py-0.5 text-xs text-[hsl(var(--foreground))] font-semibold"
                  >
                    <option value="todo">Cần làm</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="review">Kiểm tra</option>
                    <option value="done">Hoàn thành</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span>Độ ưu tiên</span>
                  <select 
                    value={selectedTask.priority} 
                    onChange={async (e) => {
                      const next = e.target.value as any
                      setSelectedTask({ ...selectedTask, priority: next })
                      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, priority: next } : t))
                      await supabase.from("study_tasks").update({ priority: next }).eq("id", selectedTask.id)
                    }}
                    className="rounded-lg border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] px-2 py-0.5 text-xs text-[hsl(var(--foreground))] font-semibold"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Cao</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hạn chót</span>
                  <input 
                    type="date" 
                    value={selectedTask.due_date || ""} 
                    onChange={async (e) => {
                      const next = e.target.value || null
                      setSelectedTask({ ...selectedTask, due_date: next })
                      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, due_date: next } : t))
                      await supabase.from("study_tasks").update({ due_date: next }).eq("id", selectedTask.id)
                    }}
                    className="rounded-lg border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] px-2 py-0.5 text-xs text-[hsl(var(--foreground))] font-semibold"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span>Môn học</span>
                  <input 
                    placeholder="Không có" 
                    value={selectedTask.subject || ""} 
                    onChange={async (e) => {
                      const next = e.target.value || null
                      setSelectedTask({ ...selectedTask, subject: next })
                      setTasks(tasks.map(t => t.id === selectedTask.id ? { ...t, subject: next } : t))
                      await supabase.from("study_tasks").update({ subject: next }).eq("id", selectedTask.id)
                    }}
                    className="w-24 text-right rounded-lg border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] px-2 py-0.5 text-xs text-[hsl(var(--foreground))] font-semibold"
                  />
                </div>
              </div>

              {/* Notion-like Editor Workspace */}
              <div className="border-t border-[hsl(var(--border))]/30 pt-4 space-y-4">
                
                {/* AI Outline and save actions */}
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleAiSmartOutline} 
                    disabled={aiGenerating} 
                    className="flex-1 rounded-full bg-violet-600 hover:bg-violet-700 text-white font-bold"
                  >
                    {aiGenerating ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="mr-1 h-3.5 w-3.5 text-yellow-300" />
                    )}
                    AI Outline lý thuyết
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handleSaveNotes} 
                    disabled={savingNotes}
                    className="rounded-full border-[hsl(var(--border))]/70 bg-transparent font-bold flex gap-1"
                  >
                    {savingNotes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Lưu
                  </Button>
                </div>

                {editorError && (
                  <p className="text-[11px] text-red-500 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {editorError}
                  </p>
                )}

                {/* Editor Content Area */}
                <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
                  {editorBlocks.map((block) => (
                    <div key={block.id} className="group/block relative flex gap-2 items-start">
                      
                      {/* Block Type Control Handle */}
                      <select 
                        value={block.type}
                        onChange={(e) => updateBlockType(block.id, e.target.value as any)}
                        className="opacity-20 group-hover/block:opacity-100 transition-opacity bg-transparent text-[10px] w-6 py-1 select-none outline-none font-bold text-[hsl(var(--muted-foreground))]"
                        title="Chọn loại khối văn bản"
                      >
                        <option value="text">¶</option>
                        <option value="header">H</option>
                        <option value="bullet">•</option>
                        <option value="quote">“</option>
                        <option value="highlight">!</option>
                      </select>

                      {/* Dynamic Block Input Rendering */}
                      <div className="flex-1 min-w-0">
                        {block.type === "header" && (
                          <textarea 
                            value={block.content} 
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            placeholder="Tiêu đề đề mục..."
                            rows={1}
                            className="w-full font-bold text-base bg-transparent border-0 border-b border-transparent focus:border-[hsl(var(--border))]/20 outline-none resize-none focus:ring-0 focus-visible:ring-0"
                          />
                        )}
                        {block.type === "text" && (
                          <textarea 
                            value={block.content} 
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            placeholder="Viết nội dung ghi nhớ..."
                            rows={2}
                            className="w-full text-xs text-[hsl(var(--muted-foreground))] bg-transparent border-0 border-b border-transparent focus:border-[hsl(var(--border))]/20 outline-none resize-none focus:ring-0 focus-visible:ring-0"
                          />
                        )}
                        {block.type === "bullet" && (
                          <div className="flex gap-1.5 items-start">
                            <span className="text-xs font-bold text-[hsl(var(--foreground))]/60 py-0.5">•</span>
                            <textarea 
                              value={block.content} 
                              onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              placeholder="Thông tin lý thuyết cốt lõi..."
                              rows={1}
                              className="w-full text-xs text-[hsl(var(--muted-foreground))] bg-transparent border-0 border-b border-transparent focus:border-[hsl(var(--border))]/20 outline-none resize-none focus:ring-0 focus-visible:ring-0"
                            />
                          </div>
                        )}
                        {block.type === "quote" && (
                          <div className="border-l-2 border-violet-500 pl-2 bg-violet-500/5 py-1 rounded-r-lg">
                            <textarea 
                              value={block.content} 
                              onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              placeholder="Trích dẫn công thức: e.g. $E=mc^2$..."
                              rows={1}
                              className="w-full text-xs text-violet-700 italic bg-transparent border-0 border-b border-transparent focus:border-[hsl(var(--border))]/20 outline-none resize-none focus:ring-0 focus-visible:ring-0"
                            />
                          </div>
                        )}
                        {block.type === "highlight" && (
                          <div className="bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl">
                            <textarea 
                              value={block.content} 
                              onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              placeholder="Ghi chú quan trọng, mẹo giải bài..."
                              rows={1}
                              className="w-full text-xs text-amber-700 font-semibold bg-transparent border-0 border-b border-transparent focus:border-[hsl(var(--border))]/20 outline-none resize-none focus:ring-0 focus-visible:ring-0"
                            />
                          </div>
                        )}
                      </div>

                      {/* Delete Block control */}
                      <button 
                        onClick={() => deleteBlock(block.id)}
                        className="opacity-0 group-hover/block:opacity-100 transition-opacity rounded-full p-1 text-red-400 hover:bg-red-50"
                        title="Xóa khối nội dung"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new blocks controller */}
                <div className="flex justify-between items-center border-t border-[hsl(var(--border))]/30 pt-3">
                  <span className="text-[10px] font-bold text-[hsl(var(--muted-foreground))]">Thêm Notion Block:</span>
                  <div className="flex gap-1.5">
                    {[
                      { key: "header" as const, label: "H", icon: Heading },
                      { key: "text" as const, label: "¶", icon: Type },
                      { key: "bullet" as const, label: "•", icon: List },
                      { key: "quote" as const, label: "“", icon: Quote },
                      { key: "highlight" as const, label: "!", icon: AlertCircle }
                    ].map((btn) => (
                      <button 
                        key={btn.key}
                        type="button"
                        onClick={() => addEditorBlock(btn.key)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 text-[10px] hover:bg-[hsl(var(--muted))]"
                        title={btn.label}
                      >
                        <btn.icon className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Manual trigger for save */}
                <div className="pt-2">
                  <Button 
                    onClick={handleSaveNotes} 
                    disabled={savingNotes}
                    className="w-full rounded-full py-4 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"
                  >
                    {savingNotes ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                    Cập nhật ghi chú Notion
                  </Button>
                </div>
              </div>
            </aside>
          )}
        </section>
      </main>
    </StudentShell>
  )
}
