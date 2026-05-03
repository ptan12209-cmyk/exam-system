"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StudentShell } from "@/components/student/StudentShell"
import { StudentHeader } from "@/components/student/StudentHeader"
import { Plus, Check, Trash2, ListTodo, Calendar, Flame, Target, TrendingUp } from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"

interface StudyTask { id: string; title: string; description: string | null; subject: string | null; due_date: string | null; is_completed: boolean; completed_at: string | null; priority: "low" | "medium" | "high"; created_at: string }

export default function StudyChecklistPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [tasks, setTasks] = useState<StudyTask[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState("")
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">("medium")
  const [newSubject, setNewSubject] = useState("")
  const [newDueDate, setNewDueDate] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "done">("all")
  const [showAddForm, setShowAddForm] = useState(false)

  useEffect(() => {
    let mounted = true

    const fetchTasks = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data } = await supabase.from("study_tasks").select("*").eq("student_id", user.id).order("is_completed", { ascending: true }).order("priority", { ascending: true }).order("created_at", { ascending: false })
      if (mounted && data) setTasks(data)
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
    const { data } = await supabase.from("study_tasks").select("*").eq("student_id", user.id).order("is_completed", { ascending: true }).order("priority", { ascending: true }).order("created_at", { ascending: false })
    if (data) setTasks(data)
  }

  const handleAddTask = async () => { if (!newTitle.trim()) return; const { data: { user } } = await supabase.auth.getUser(); if (!user) return; await supabase.from("study_tasks").insert({ student_id: user.id, title: newTitle.trim(), subject: newSubject.trim() || null, due_date: newDueDate || null, priority: newPriority }); setNewTitle(""); setNewSubject(""); setNewDueDate(""); setShowAddForm(false); await refreshTasks() }
  const handleToggle = async (task: StudyTask) => { await supabase.from("study_tasks").update({ is_completed: !task.is_completed, completed_at: !task.is_completed ? new Date().toISOString() : null }).eq("id", task.id); await refreshTasks() }
  const handleDelete = async (id: string) => { await supabase.from("study_tasks").delete().eq("id", id); await refreshTasks() }

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((task) => task.is_completed).length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
  const streak = useMemo(() => { const completedDates = tasks.filter((task) => task.completed_at).map((task) => new Date(task.completed_at!).toDateString()); const uniqueDates = [...new Set(completedDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); let count = 0; const today = new Date(); for (let i = 0; i < 30; i++) { const checkDate = new Date(today); checkDate.setDate(checkDate.getDate() - i); if (uniqueDates.includes(checkDate.toDateString())) count++; else if (i > 0) break } return count }, [tasks])
  const weeklyData = useMemo(() => { const data = []; for (let i = 6; i >= 0; i--) { const date = new Date(); date.setDate(date.getDate() - i); const dateStr = date.toDateString(); const completed = tasks.filter((task) => task.completed_at && new Date(task.completed_at).toDateString() === dateStr).length; data.push({ day: date.toLocaleDateString("vi-VN", { weekday: "short" }), count: completed }) } return data }, [tasks])
  const maxWeekly = Math.max(...weeklyData.map((item) => item.count), 1)
  const filteredTasks = tasks.filter((task) => filterStatus === "pending" ? !task.is_completed : filterStatus === "done" ? task.is_completed : true)

  if (loading) return <Loading fullPage label="Đang kiểm tra danh sách..." />

  return (
    <StudentShell>
      <StudentHeader name="Checklist" onLogout={async () => { await supabase.auth.signOut(); router.push("/login") }} />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-10">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/70 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] backdrop-blur-md"><ListTodo className="h-4 w-4" /> Checklist</div>
            <h1 className="max-w-3xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">Checklist học tập</h1>
            <p className="mt-6 max-w-2xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">Quản lý mục tiêu học tập, theo dõi tiến độ và giữ nhịp học đều mỗi ngày.</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)} className="rounded-full"><Plus className="h-4 w-4" /> Thêm nhiệm vụ</Button>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          {[{ icon: Target, value: completionRate, label: "Hoàn thành", suffix: "%" }, { icon: Check, value: `${completedTasks}/${totalTasks}`, label: "Nhiệm vụ" }, { icon: Flame, value: streak, label: "Ngày liên tiếp" }].map((item) => (
            <div key={item.label} className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 text-center">
              <item.icon className="mx-auto mb-2 h-5 w-5" />
              <p className="text-2xl font-semibold">{item.value}{"suffix" in item && item.suffix}</p>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">{item.label}</p>
            </div>
          ))}
        </section>

        <section className="mb-6 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5">
          <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4" /> Tiến độ 7 ngày</h3></div>
          <div className="flex h-32 items-end gap-2">{weeklyData.map((item, index) => <div key={index} className="flex flex-1 flex-col items-center gap-1"><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.count}</span><div className="relative h-full w-full rounded-t-lg bg-[hsl(var(--muted))]/20"><div className={cn("absolute bottom-0 w-full rounded-t-lg", item.count > 0 ? "bg-[hsl(var(--foreground))]" : "bg-[hsl(var(--muted))]/30")} style={{ height: `${(item.count / maxWeekly) * 100}%`, minHeight: item.count > 0 ? "8px" : "2px" }} /></div><span className="text-[10px] text-[hsl(var(--muted-foreground))]">{item.day}</span></div>)}</div>
        </section>

        {showAddForm && <section className="mb-6 space-y-3 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5"><Input placeholder="Tên nhiệm vụ..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="rounded-xl" autoFocus /><div className="grid gap-3 md:grid-cols-3"><Input placeholder="Môn học" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="rounded-xl text-sm" /><Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} className="rounded-xl text-sm" /><select value={newPriority} onChange={(e) => setNewPriority(e.target.value as "low" | "medium" | "high")} className="rounded-xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-3 text-sm"><option value="high">Cao</option><option value="medium">Trung bình</option><option value="low">Thấp</option></select></div><div className="flex gap-2"><Button onClick={handleAddTask} disabled={!newTitle.trim()} className="flex-1 rounded-full">Thêm</Button><Button variant="outline" onClick={() => setShowAddForm(false)} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">Hủy</Button></div></section>}

        <section className="mb-6 flex gap-2 overflow-x-auto">{[{ key: "all" as const, label: "Tất cả", count: totalTasks }, { key: "pending" as const, label: "Chưa xong", count: totalTasks - completedTasks }, { key: "done" as const, label: "Hoàn thành", count: completedTasks }].map((item) => <button key={item.key} onClick={() => setFilterStatus(item.key)} className={cn("rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-[background-color,color,border-color] duration-200", filterStatus === item.key ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]")}>{item.label} ({item.count})</button>)}</section>

        <section className="space-y-2">{filteredTasks.length === 0 ? <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] py-16 text-center"><ListTodo className="mx-auto mb-3 h-12 w-12 text-[hsl(var(--muted-foreground))]/30" /><p className="font-medium">Chưa có nhiệm vụ</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Thêm mục tiêu đầu tiên của bạn.</p></div> : filteredTasks.map((task) => <div key={task.id} className={cn("flex items-center gap-3 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-4", task.is_completed && "opacity-60")}><button onClick={() => handleToggle(task)} className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,color,border-color] duration-200", task.is_completed ? "border-[hsl(var(--foreground))] bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "border-[hsl(var(--border))]/60")}>{task.is_completed && <Check className="h-3.5 w-3.5" />}</button><div className="min-w-0 flex-1"><p className={cn("text-sm font-medium", task.is_completed && "line-through")}>{task.title}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">{task.subject && <span className="rounded-full border border-[hsl(var(--border))]/60 px-2 py-0.5">{task.subject}</span>}{task.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(task.due_date).toLocaleDateString("vi-VN")}</span>}</div></div><button onClick={() => handleDelete(task.id)} className="rounded-full p-2 text-red-500 transition-colors hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div>)}</section>
      </main>
    </StudentShell>
  )
}
