"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
    Users, Clock, AlertTriangle, CheckCircle2,
    ArrowLeft, RefreshCw, Eye, Wifi, WifiOff,
    TrendingUp, Timer
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Participant {
    user_id: string
    student_name: string
    status: "active" | "submitted" | "disconnected"
    started_at: string
    last_active: string
    progress?: number
}

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
    const [participants, setParticipants] = useState<Participant[]>([])
    const [stats, setStats] = useState<ExamStats>({
        total_participants: 0,
        active_count: 0,
        submitted_count: 0,
        disconnected_count: 0,
        avg_progress: 0
    })
    const [loading, setLoading] = useState(true)
    const [isLive, setIsLive] = useState(false)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

    const fetchData = useCallback(async () => {
        // Fetch exam info
        const { data: examData } = await supabase
            .from("exams")
            .select("title, duration")
            .eq("id", examId)
            .single()

        if (examData) setExam(examData)

        // Fetch participants
        const { data: participantData } = await supabase
            .from("exam_participants")
            .select("*")
            .eq("exam_id", examId)
            .order("started_at", { ascending: false })

        if (participantData) {
            // Calculate disconnected status (inactive for more than 2 minutes)
            const now = new Date()
            interface ParticipantData {
                user_id: string
                student_name: string
                status: string
                started_at: string
                last_active: string
            }

            const processed = participantData.map((p: ParticipantData) => {
                const lastActive = new Date(p.last_active)
                const inactiveMs = now.getTime() - lastActive.getTime()
                const isDisconnected = p.status === "active" && inactiveMs > 120000 // 2 minutes

                return {
                    ...p,
                    status: isDisconnected ? "disconnected" : p.status
                }
            })

            setParticipants(processed)

            // Calculate stats
            const active = processed.filter((p: { status: string }) => p.status === "active").length
            const submitted = processed.filter((p: { status: string }) => p.status === "submitted").length
            const disconnected = processed.filter((p: { status: string }) => p.status === "disconnected").length

            setStats({
                total_participants: processed.length,
                active_count: active,
                submitted_count: submitted,
                disconnected_count: disconnected,
                avg_progress: 0 // Would need submission progress data
            })
        }

        setLastUpdate(new Date())
        setLoading(false)
    }, [examId, supabase])

    // Initial fetch
    useEffect(() => {
        fetchData()
    }, [fetchData])

    // Real-time subscription
    useEffect(() => {
        const channel = supabase
            .channel(`exam-monitor-${examId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "exam_participants",
                    filter: `exam_id=eq.${examId}`
                },
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

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchData, 30000)
        return () => clearInterval(interval)
    }, [fetchData])

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-green-100 text-green-700 border-green-200"
            case "submitted": return "bg-blue-100 text-blue-700 border-blue-200"
            case "disconnected": return "bg-red-100 text-red-700 border-red-200"
            default: return "bg-gray-100 text-gray-700 border-gray-200"
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "active": return <Eye className="w-4 h-4" />
            case "submitted": return <CheckCircle2 className="w-4 h-4" />
            case "disconnected": return <WifiOff className="w-4 h-4" />
            default: return null
        }
    }

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    }

    const getTimeSinceStart = (startedAt: string) => {
        const start = new Date(startedAt)
        const now = new Date()
        const diffMs = now.getTime() - start.getTime()
        const minutes = Math.floor(diffMs / 60000)
        return `${minutes} phút`
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
            {/* Header */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                                {exam?.title || "Đang tải..."}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Giám sát thời gian thực
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
                            isLive
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400"
                        )}>
                            {isLive ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                            {isLive ? "Live" : "Offline"}
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchData}>
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Làm mới
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white dark:bg-slate-900">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                        {stats.total_participants}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Tổng số</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {stats.active_count}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Đang làm</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {stats.submitted_count}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Đã nộp</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-slate-900">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                        {stats.disconnected_count}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Mất kết nối</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Progress Overview */}
                <Card className="bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-500" />
                            Tiến độ tổng quan
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600 dark:text-gray-400">Đã nộp bài</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {stats.submitted_count}/{stats.total_participants}
                                    ({stats.total_participants > 0
                                        ? Math.round((stats.submitted_count / stats.total_participants) * 100)
                                        : 0}%)
                                </span>
                            </div>
                            <Progress
                                value={stats.total_participants > 0
                                    ? (stats.submitted_count / stats.total_participants) * 100
                                    : 0
                                }
                                className="h-3"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Participants List */}
                <Card className="bg-white dark:bg-slate-900">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-500" />
                                Danh sách học sinh ({participants.length})
                            </CardTitle>
                            <span className="text-xs text-gray-400">
                                Cập nhật: {lastUpdate.toLocaleTimeString("vi-VN")}
                            </span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {participants.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                Chưa có học sinh nào tham gia
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {participants.map((p) => (
                                    <div
                                        key={p.user_id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                                    {p.student_name?.charAt(0) || "?"}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {p.student_name || "Học sinh"}
                                                </p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <Timer className="w-3 h-3" />
                                                    <span>Bắt đầu: {formatTime(p.started_at)}</span>
                                                    <span>•</span>
                                                    <span>{getTimeSinceStart(p.started_at)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
                                            getStatusColor(p.status)
                                        )}>
                                            {getStatusIcon(p.status)}
                                            {p.status === "active" && "Đang làm"}
                                            {p.status === "submitted" && "Đã nộp"}
                                            {p.status === "disconnected" && "Mất kết nối"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}
