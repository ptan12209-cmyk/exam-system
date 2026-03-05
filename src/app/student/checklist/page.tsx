"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    ArrowLeft, Plus, Check, Trash2, Loader2, ListTodo, Calendar,
    Flame, Star, Filter, ChevronDown, Clock, Target, TrendingUp
} from "lucide-react"
import { cn } from "@/lib/utils"

interface StudyTask {
    id: string
    title: string
    description: string | null
    subject: string | null
    due_date: string | null
    is_completed: boolean
    completed_at: string | null
    priority: "low" | "medium" | "high"
    created_at: string
}

const PRIORITY_CONFIG = {
    high: { label: "Cao", color: "red", icon: "🔴" },
    medium: { label: "TB", color: "amber", icon: "🟡" },
    low: { label: "Thấp", color: "emerald", icon: "🟢" },
}

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

    const fetchTasks = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push("/login"); return }
        const { data } = await supabase
            .from("study_tasks")
            .select("*")
            .eq("student_id", user.id)
            .order("is_completed", { ascending: true })
            .order("priority", { ascending: true })
            .order("created_at", { ascending: false })
        if (data) setTasks(data)
        setLoading(false)
    }, [supabase, router])

    useEffect(() => { fetchTasks() }, [fetchTasks])

    const handleAddTask = async () => {
        if (!newTitle.trim()) return
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        await supabase.from("study_tasks").insert({
            student_id: user.id,
            title: newTitle.trim(),
            subject: newSubject.trim() || null,
            due_date: newDueDate || null,
            priority: newPriority,
        })
        setNewTitle(""); setNewSubject(""); setNewDueDate(""); setShowAddForm(false)
        fetchTasks()
    }

    const handleToggle = async (task: StudyTask) => {
        await supabase.from("study_tasks").update({
            is_completed: !task.is_completed,
            completed_at: !task.is_completed ? new Date().toISOString() : null
        }).eq("id", task.id)
        fetchTasks()
    }

    const handleDelete = async (id: string) => {
        await supabase.from("study_tasks").delete().eq("id", id)
        fetchTasks()
    }

    // Stats
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.is_completed).length
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Streak calculation
    const streak = useMemo(() => {
        const completedDates = tasks
            .filter(t => t.completed_at)
            .map(t => new Date(t.completed_at!).toDateString())
        const uniqueDates = [...new Set(completedDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
        let count = 0
        const today = new Date()
        for (let i = 0; i < 30; i++) {
            const checkDate = new Date(today)
            checkDate.setDate(checkDate.getDate() - i)
            if (uniqueDates.includes(checkDate.toDateString())) count++
            else if (i > 0) break
        }
        return count
    }, [tasks])

    // Last 7 days chart data
    const weeklyData = useMemo(() => {
        const data = []
        for (let i = 6; i >= 0; i--) {
            const date = new Date()
            date.setDate(date.getDate() - i)
            const dateStr = date.toDateString()
            const completed = tasks.filter(t =>
                t.completed_at && new Date(t.completed_at).toDateString() === dateStr
            ).length
            data.push({
                day: date.toLocaleDateString("vi-VN", { weekday: "short" }),
                count: completed,
                date: date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
            })
        }
        return data
    }, [tasks])

    const maxWeekly = Math.max(...weeklyData.map(d => d.count), 1)

    const filteredTasks = tasks.filter(t => {
        if (filterStatus === "pending") return !t.is_completed
        if (filterStatus === "done") return t.is_completed
        return true
    })

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>

    return (
        <div className="min-h-screen bg-background">
            <header className="glass-nav sticky top-0 z-30 border-b border-border/50 px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/student/dashboard"><Button variant="ghost" size="icon" className="text-muted-foreground"><ArrowLeft className="w-5 h-5" /></Button></Link>
                        <div><h1 className="font-bold text-foreground text-lg">Checklist học tập</h1><p className="text-xs text-muted-foreground">Quản lý nhiệm vụ cá nhân</p></div>
                    </div>
                    <Button onClick={() => setShowAddForm(!showAddForm)} className="gradient-primary text-white border-0 shadow-md"><Plus className="w-4 h-4 mr-1" />Thêm</Button>
                </div>
            </header>

            <main className="max-w-3xl mx-auto p-4 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-card rounded-2xl p-4 text-center">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
                        <p className="text-xs text-muted-foreground">Hoàn thành</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 text-center">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{completedTasks}/{totalTasks}</p>
                        <p className="text-xs text-muted-foreground">Nhiệm vụ</p>
                    </div>
                    <div className="glass-card rounded-2xl p-4 text-center">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Flame className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{streak}</p>
                        <p className="text-xs text-muted-foreground">Ngày liên tiếp</p>
                    </div>
                </div>

                {/* Weekly Progress Chart */}
                <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" />Tiến độ 7 ngày</h3>
                    </div>
                    <div className="flex items-end gap-2 h-32">
                        {weeklyData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] text-muted-foreground font-medium">{d.count}</span>
                                <div className="w-full bg-muted/20 rounded-t-lg relative" style={{ height: "100%" }}>
                                    <div
                                        className={cn("absolute bottom-0 w-full rounded-t-lg transition-all duration-500",
                                            d.count > 0 ? "bg-indigo-500" : "bg-muted/30"
                                        )}
                                        style={{ height: `${(d.count / maxWeekly) * 100}%`, minHeight: d.count > 0 ? "8px" : "2px" }}
                                    />
                                </div>
                                <span className="text-[10px] text-muted-foreground">{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Add Task Form */}
                {showAddForm && (
                    <div className="glass-card rounded-2xl p-5 space-y-3 border-2 border-indigo-200 dark:border-indigo-900">
                        <Input placeholder="Tên nhiệm vụ..." value={newTitle} onChange={e => setNewTitle(e.target.value)} className="bg-card border-border rounded-xl" autoFocus />
                        <div className="grid grid-cols-3 gap-3">
                            <Input placeholder="Môn học" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="bg-card border-border rounded-xl text-sm" />
                            <Input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} className="bg-card border-border rounded-xl text-sm" />
                            <select value={newPriority} onChange={e => setNewPriority(e.target.value as "low" | "medium" | "high")} className="bg-card border border-border rounded-xl text-sm px-3 text-foreground">
                                <option value="high">🔴 Cao</option>
                                <option value="medium">🟡 TB</option>
                                <option value="low">🟢 Thấp</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleAddTask} disabled={!newTitle.trim()} className="flex-1 gradient-primary text-white border-0">Thêm nhiệm vụ</Button>
                            <Button variant="outline" onClick={() => setShowAddForm(false)} className="border-border text-muted-foreground">Hủy</Button>
                        </div>
                    </div>
                )}

                {/* Filter */}
                <div className="flex gap-2">
                    {[
                        { key: "all" as const, label: "Tất cả", count: totalTasks },
                        { key: "pending" as const, label: "Chưa xong", count: totalTasks - completedTasks },
                        { key: "done" as const, label: "Hoàn thành", count: completedTasks },
                    ].map(f => (
                        <button key={f.key} onClick={() => setFilterStatus(f.key)} className={cn(
                            "px-4 py-2 rounded-xl text-sm font-medium transition-colors border",
                            filterStatus === f.key ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900" : "bg-card text-muted-foreground border-transparent hover:bg-muted/30"
                        )}>
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>

                {/* Task List */}
                <div className="space-y-2">
                    {filteredTasks.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="font-medium">Chưa có nhiệm vụ nào</p>
                            <p className="text-sm">Bấm &quot;Thêm&quot; để tạo nhiệm vụ đầu tiên</p>
                        </div>
                    )}
                    {filteredTasks.map(task => (
                        <div key={task.id} className={cn(
                            "glass-card rounded-xl p-4 flex items-center gap-3 transition-all group",
                            task.is_completed && "opacity-60"
                        )}>
                            <button onClick={() => handleToggle(task)} className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                task.is_completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 dark:border-slate-600 hover:border-indigo-500"
                            )}>
                                {task.is_completed && <Check className="w-3.5 h-3.5" />}
                            </button>
                            <div className="flex-1 min-w-0">
                                <p className={cn("font-medium text-sm text-foreground", task.is_completed && "line-through")}>{task.title}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    {task.subject && <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">{task.subject}</span>}
                                    {task.due_date && (
                                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                            <Calendar className="w-3 h-3" />{new Date(task.due_date).toLocaleDateString("vi-VN")}
                                        </span>
                                    )}
                                    <span className="text-[10px]">{PRIORITY_CONFIG[task.priority].icon}</span>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(task.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-red-500">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}
