"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, CheckCircle2, Eye, GraduationCap, Loader2, RefreshCw, Timer, TrendingUp, Users, Wifi, WifiOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { TeacherSidebar } from "@/components/TeacherSidebar"
import { TeacherShell } from "@/components/teacher/TeacherShell"
import { TeacherBottomNav } from "@/components/BottomNav"
import { Loading } from "@/components/shared/Loading"

import type { ExamParticipant } from "@/types"

interface ExamStats {
  total_participants: number
  active_count: number
  submitted_count: number
  disconnected_count: number
  avg_progress: number
}

export default function ExamMonitorPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params.id as string
  const supabase = createClient()

  const [exam, setExam] = useState<{ title: string; duration: number } | null>(null)
  const [participants, setParticipants] = useState<ExamParticipant[]>([])
  const [stats, setStats] = useState<ExamStats>({
    total_participants: 0,
    active_count: 0,
    submitted_count: 0,
    disconnected_count: 0,
    avg_progress: 0,
  })
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    const { data: examData } = await supabase.from("exams").select("title, duration").eq("id", examId).single()
    if (examData) setExam(examData)

    const { data: participantData } = await supabase
      .from("exam_participants")
      .select("*")
      .eq("exam_id", examId)
      .order("started_at", { ascending: false })

    if (participantData) {
      const now = new Date()
      const processed = participantData.map((p: ExamParticipant) => {
        const inactiveMs = now.getTime() - new Date(p.last_active).getTime()
        return { ...p, status: p.status === "active" && inactiveMs > 120000 ? "disconnected" : p.status }
      })

      setParticipants(processed)
      setStats({
        total_participants: processed.length,
        active_count: processed.filter((p: ExamParticipant) => p.status === "active").length,
        submitted_count: processed.filter((p: ExamParticipant) => p.status === "submitted").length,
        disconnected_count: processed.filter((p: ExamParticipant) => p.status === "disconnected").length,
        avg_progress: 0,
      })
    }

    setLastUpdate(new Date())
    setLoading(false)
  }, [examId, supabase])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      await Promise.resolve()
      if (!cancelled) {
        await fetchData()
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [fetchData])

  useEffect(() => {
    const channel = supabase
      .channel(`exam-monitor-${examId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_participants", filter: `exam_id=eq.${examId}` },
        () => {
          fetchData()
          setIsLive(true)
        }
      )
      .subscribe((status: string) => {
        setIsLive(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [examId, supabase, fetchData])

  useEffect(() => {
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleLogout = async () => { await supabase.auth.signOut(); router.push("/login") }

  if (loading) return <Loading fullPage label="Đang khởi tạo chế độ giám sát..." />

  return (
    <TeacherShell onLogout={handleLogout}>

      <header className="lg:hidden fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/85 px-4 backdrop-blur-xl safe-top">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold tracking-tight">ExamHub</span>
        </div>
        <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium", isLive ? "bg-emerald-500/10 text-emerald-500" : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]")}>{isLive ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}{isLive ? "Live" : "Offline"}</div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-24 lg:px-8 lg:pt-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[hsl(var(--muted-foreground))]">Live monitor</p>
              <h1 className="text-2xl font-semibold md:text-3xl">{exam?.title || "Đang tải..."}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn("flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium", isLive ? "bg-emerald-500/10 text-emerald-500" : "bg-[hsl(var(--muted))]/20 text-[hsl(var(--muted-foreground))]")}>{isLive ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}{isLive ? "Live" : "Offline"}</div>
            <Button variant="outline" onClick={fetchData} className="rounded-full border-[hsl(var(--border))]/70 bg-transparent">
              <RefreshCw className="mr-2 h-4 w-4" />Làm mới
            </Button>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { icon: Users, value: stats.total_participants, label: "Tổng số" },
            { icon: Eye, value: stats.active_count, label: "Đang làm" },
            { icon: CheckCircle2, value: stats.submitted_count, label: "Đã nộp" },
            { icon: AlertTriangle, value: stats.disconnected_count, label: "Mất kết nối" },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/20 p-3">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{value}</p>
                  <p className="text-sm text-[hsl(var(--muted-foreground))]">{label}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="h-5 w-5" />Tiến độ tổng quan
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[hsl(var(--muted-foreground))]">Đã nộp bài</span>
              <span className="font-medium">
                {stats.submitted_count}/{stats.total_participants} ({stats.total_participants > 0 ? Math.round((stats.submitted_count / stats.total_participants) * 100) : 0}%)
              </span>
            </div>
            <Progress value={stats.total_participants > 0 ? (stats.submitted_count / stats.total_participants) * 100 : 0} className="h-3" />
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Users className="h-5 w-5" />Danh sách học sinh ({participants.length})
            </h3>
            <span className="text-xs text-[hsl(var(--muted-foreground))]">Cập nhật: {lastUpdate.toLocaleTimeString("vi-VN")}</span>
          </div>
          <div className="p-5">
            {participants.length === 0 ? (
              <div className="py-12 text-center text-[hsl(var(--muted-foreground))]">Chưa có học sinh nào tham gia</div>
            ) : (
              <div className="space-y-3">
                {participants.map((p) => (
                  <div key={p.user_id} className="flex items-center justify-between gap-4 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/20 p-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--foreground))] font-semibold text-[hsl(var(--background))]">
                        {p.student_name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.student_name || "Học sinh"}</p>
                        <p className="flex items-center gap-1 text-xs text-[hsl(var(--muted-foreground))]">
                          <Timer className="h-3 w-3" />Bắt đầu: {new Date(p.started_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium", p.status === "active" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : p.status === "submitted" ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-500" : "border-red-500/20 bg-red-500/10 text-red-500")}>
                      {p.status === "active" ? "Đang làm" : p.status === "submitted" ? "Đã nộp" : "Mất kết nối"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <TeacherBottomNav />
    </TeacherShell>
  )
}
