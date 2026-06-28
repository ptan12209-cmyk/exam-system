"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users, User, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

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
                (payload: { eventType: string; new: Participant; old: { id: string } }) => {
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
            case "left": return "bg-[hsl(var(--muted-foreground))]/60"
            default: return "bg-[hsl(var(--muted-foreground))]/60"
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
            <div className={cn("rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-sm", className)}>
                <div className="animate-pulse">
                    <div className="h-4 bg-[hsl(var(--muted))]/30 rounded w-1/2 mb-3"></div>
                    <div className="space-y-2">
                        <div className="h-8 bg-[hsl(var(--muted))]/20 rounded"></div>
                        <div className="h-8 bg-[hsl(var(--muted))]/20 rounded"></div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm overflow-hidden", className)}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/10">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        Học sinh tham gia
                    </h3>
                    <div className="flex items-center gap-3 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm animate-pulse"></span>
                            <span className="text-[hsl(var(--muted-foreground))]">{activeCount} đang thi</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500 shadow-sm"></span>
                            <span className="text-[hsl(var(--muted-foreground))]">{submittedCount} đã nộp</span>
                        </span>
                    </div>
                </div>
            </div>

            {/* Participants List */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {participants.length === 0 ? (
                    <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">
                        <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Chưa có học sinh tham gia</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[hsl(var(--border))]/30">
                        {participants.map((participant) => (
                            <div
                                key={participant.id}
                                className="px-5 py-3 flex items-center justify-between hover:bg-[hsl(var(--muted))]/20 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm", getStatusColor(participant.status))}>
                                            {participant.student_name ? participant.student_name.charAt(0) : "U"}
                                        </div>
                                        <div className={cn("absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[hsl(var(--card))] rounded-full bg-green-500", participant.status !== 'active' && "hidden")} />
                                    </div>
                                    <Link 
                                        href={`/profile/${participant.user_id}`}
                                        className="text-sm font-medium text-[hsl(var(--foreground))] hover:underline hover:text-indigo-600 transition-colors"
                                    >
                                        {participant.student_name || "Học sinh"}
                                    </Link>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className={cn(
                                        "px-2 py-0.5 rounded-full font-medium",
                                        participant.status === "active" && "bg-green-500/10 text-green-600 border border-green-500/20",
                                        participant.status === "submitted" && "bg-blue-500/10 text-blue-600 border border-blue-500/20",
                                        participant.status === "left" && "bg-[hsl(var(--muted))]/50 text-[hsl(var(--muted-foreground))]"
                                    )}>
                                        {getStatusText(participant.status)}
                                    </span>
                                    <span className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
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
