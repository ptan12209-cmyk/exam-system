"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, User, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Participant {
    id: string
    user_id: string
    student_name: string
    started_at: string
    last_active: string
    status: "active" | "submitted" | "left"
}

interface LiveParticipantsProps {
    examId: string
    className?: string
}

export function LiveParticipants({ examId, className }: LiveParticipantsProps) {
    const [participants, setParticipants] = useState<Participant[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        // Fetch initial participants
        const fetchParticipants = async () => {
            const { data, error } = await supabase
                .from("exam_participants")
                .select("*")
                .eq("exam_id", examId)
                .order("started_at", { ascending: false })

            if (!error && data) {
                setParticipants(data)
            }
            setLoading(false)
        }

        fetchParticipants()

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`exam-participants-${examId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "exam_participants",
                    filter: `exam_id=eq.${examId}`
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (payload: any) => {
                    if (payload.eventType === "INSERT") {
                        setParticipants(prev => [payload.new as Participant, ...prev])
                    } else if (payload.eventType === "UPDATE") {
                        setParticipants(prev =>
                            prev.map(p => p.id === (payload.new as Participant).id ? payload.new as Participant : p)
                        )
                    } else if (payload.eventType === "DELETE") {
                        setParticipants(prev =>
                            prev.filter(p => p.id !== (payload.old as Participant).id)
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [examId, supabase])

    const activeCount = participants.filter(p => p.status === "active").length
    const submittedCount = participants.filter(p => p.status === "submitted").length

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-green-500"
            case "submitted": return "bg-blue-500"
            case "left": return "bg-slate-500"
            default: return "bg-slate-500"
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case "active": return "Đang làm"
            case "submitted": return "Đã nộp"
            case "left": return "Đã rời"
            default: return status
        }
    }

    if (loading) {
        return (
            <div className={cn("bg-slate-800/50 rounded-xl p-4 border border-slate-700", className)}>
                <div className="animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-1/2 mb-3"></div>
                    <div className="space-y-2">
                        <div className="h-8 bg-slate-700 rounded"></div>
                        <div className="h-8 bg-slate-700 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden", className)}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Học sinh tham gia
                    </h3>
                    <div className="flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-slate-400">{activeCount} đang thi</span>
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-slate-400">{submittedCount} đã nộp</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Participants List */}
            <div className="max-h-64 overflow-y-auto">
                {participants.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                        <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Chưa có học sinh tham gia</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {participants.map((participant) => (
                            <div
                                key={participant.id}
                                className="px-4 py-2 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        getStatusColor(participant.status)
                                    )}></span>
                                    <span className="text-sm text-white">
                                        {participant.student_name || "Học sinh"}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full",
                                        participant.status === "active" && "bg-green-500/20 text-green-400",
                                        participant.status === "submitted" && "bg-blue-500/20 text-blue-400",
                                        participant.status === "left" && "bg-slate-500/20 text-slate-400"
                                    )}>
                                        {getStatusText(participant.status)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(participant.started_at)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
