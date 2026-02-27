"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Users, Clock, AlertTriangle, CheckCircle2, ArrowLeft, RefreshCw, Eye, Wifi, WifiOff, TrendingUp, Timer } from "lucide-react"
import { cn } from "@/lib/utils"

interface Participant { user_id: string; student_name: string; status: "active" | "submitted" | "disconnected"; started_at: string; last_active: string; progress?: number }
interface ExamStats { total_participants: number; active_count: number; submitted_count: number; disconnected_count: number; avg_progress: number }

export default function ExamMonitorPage() {
    const params = useParams(); const router = useRouter(); const examId = params.id as string; const supabase = createClient()
    const [exam, setExam] = useState<{ title: string; duration: number } | null>(null)
    const [participants, setParticipants] = useState<Participant[]>([])
    const [stats, setStats] = useState<ExamStats>({ total_participants: 0, active_count: 0, submitted_count: 0, disconnected_count: 0, avg_progress: 0 })
    const [loading, setLoading] = useState(true)
    const [isLive, setIsLive] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

    const fetchData = useCallback(async () => {
        const { data: examData } = await supabase.from("exams").select("title, duration").eq("id", examId).single()
        if (examData) setExam(examData)
        const { data: participantData } = await supabase.from("exam_participants").select("*").eq("exam_id", examId).order("started_at", { ascending: false })
        if (participantData) {
            const now = new Date()
            interface ParticipantData { user_id: string; student_name: string; status: string; started_at: string; last_active: string }
            const processed = participantData.map((p: ParticipantData) => {
                const lastActive = new Date(p.last_active); const inactiveMs = now.getTime() - lastActive.getTime()
                return { ...p, status: (p.status === "active" && inactiveMs > 120000) ? "disconnected" : p.status }
            })
            setParticipants(processed)
            const active = processed.filter((p: { status: string }) => p.status === "active").length
            const submitted = processed.filter((p: { status: string }) => p.status === "submitted").length
            const disconnected = processed.filter((p: { status: string }) => p.status === "disconnected").length
            setStats({ total_participants: processed.length, active_count: active, submitted_count: submitted, disconnected_count: disconnected, avg_progress: 0 })
        }
        setLastUpdate(new Date()); setLoading(false)
    }, [examId, supabase])

    useEffect(() => { fetchData() }, [fetchData])
    useEffect(() => {
        const channel = supabase.channel(`exam-monitor-${examId}`).on("postgres_changes", { event: "*", schema: "public", table: "exam_participants", filter: `exam_id=eq.${examId}` }, () => { fetchData(); setIsLive(true) }).subscribe((status: string) => { setIsLive(status === "SUBSCRIBED") })
        return () => { supabase.removeChannel(channel) }
    }, [examId, supabase, fetchData])
    useEffect(() => { const interval = setInterval(fetchData, 30000); return () => clearInterval(interval) }, [fetchData])

    const getStatusColor = (status: string) => {
        switch (status) { case "active": return "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"; case "submitted": return "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"; case "disconnected": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"; default: return "bg-muted/30 text-muted-foreground border-border" }
    }
    const getStatusIcon = (status: string) => { switch (status) { case "active": return <Eye className="w-4 h-4" />; case "submitted": return <CheckCircle2 className="w-4 h-4" />; case "disconnected": return <WifiOff className="w-4 h-4" />; default: return null } }
    const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    const getTimeSinceStart = (startedAt: string) => { const diffMs = new Date().getTime() - new Date(startedAt).getTime(); return `${Math.floor(diffMs / 60000)} phút` }

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>

    return (
        <div className="min-h-screen bg-background">
            <header className="glass-nav sticky top-0 z-50 border-b border-border/50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Button>
                        <div><h1 className="text-lg font-bold text-foreground">{exam?.title || "Đang tải..."}</h1><p className="text-sm text-muted-foreground">Giám sát thời gian thực</p></div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium", isLive ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "bg-muted/30 text-muted-foreground")}>{isLive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}{isLive ? "Live" : "Offline"}</div>
                        <Button variant="outline" size="sm" onClick={fetchData} className="border-border"><RefreshCw className="w-4 h-4 mr-2" />Làm mới</Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[{ icon: Users, color: "indigo", value: stats.total_participants, label: "Tổng số" }, { icon: Eye, color: "emerald", value: stats.active_count, label: "Đang làm" }, { icon: CheckCircle2, color: "indigo", value: stats.submitted_count, label: "Đã nộp" }, { icon: AlertTriangle, color: "red", value: stats.disconnected_count, label: "Mất kết nối" }].map(({ icon: Icon, color, value, label }) => (
                        <div key={label} className="glass-card rounded-2xl p-4">
                            <div className="flex items-center gap-3"><div className={`p-2 bg-${color}-100 dark:bg-${color}-900/30 rounded-xl`}><Icon className={`w-5 h-5 text-${color}-600 dark:text-${color}-400`} /></div><div><p className={`text-2xl font-bold ${color === "emerald" ? "text-emerald-600 dark:text-emerald-400" : color === "red" ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{value}</p><p className="text-sm text-muted-foreground">{label}</p></div></div>
                        </div>
                    ))}
                </div>

                <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-3"><TrendingUp className="w-5 h-5 text-indigo-500" />Tiến độ tổng quan</h3>
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Đã nộp bài</span><span className="font-medium text-foreground">{stats.submitted_count}/{stats.total_participants} ({stats.total_participants > 0 ? Math.round((stats.submitted_count / stats.total_participants) * 100) : 0}%)</span></div>
                        <Progress value={stats.total_participants > 0 ? (stats.submitted_count / stats.total_participants) * 100 : 0} className="h-3" />
                    </div>
                </div>

                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="p-4 border-b border-border/50 flex items-center justify-between">
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" />Danh sách học sinh ({participants.length})</h3>
                        <span className="text-xs text-muted-foreground">Cập nhật: {lastUpdate.toLocaleTimeString("vi-VN")}</span>
                    </div>
                    <div className="p-4">
                        {participants.length === 0 ? <div className="text-center py-8 text-muted-foreground">Chưa có học sinh nào tham gia</div> : (
                            <div className="space-y-2">
                                {participants.map((p) => (
                                    <div key={p.user_id} className="flex items-center justify-between p-3 bg-muted/20 rounded-xl hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center"><span className="text-indigo-600 dark:text-indigo-400 font-medium">{p.student_name?.charAt(0) || "?"}</span></div>
                                            <div><p className="font-medium text-foreground">{p.student_name || "Học sinh"}</p><div className="flex items-center gap-2 text-xs text-muted-foreground"><Timer className="w-3 h-3" /><span>Bắt đầu: {formatTime(p.started_at)}</span><span>•</span><span>{getTimeSinceStart(p.started_at)}</span></div></div>
                                        </div>
                                        <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border", getStatusColor(p.status))}>{getStatusIcon(p.status)}{p.status === "active" && "Đang làm"}{p.status === "submitted" && "Đã nộp"}{p.status === "disconnected" && "Mất kết nối"}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
