"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"

interface ParticipantCountProps {
    examId: string
    className?: string
    showLabel?: boolean
}

export function ParticipantCount({ examId, className, showLabel = true }: ParticipantCountProps) {
    const [count, setCount] = useState(0)
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        // Fetch initial count
        const fetchCount = async () => {
            const { count: totalCount, error } = await supabase
                .from("exam_participants")
                .select("*", { count: "exact", head: true })
                .eq("exam_id", examId)
                .eq("status", "active")

            if (!error && totalCount !== null) {
                setCount(totalCount)
            }
            setLoading(false)
        }

        fetchCount()

        // Subscribe to realtime changes
        const channel = supabase
            .channel(`participant-count-${examId}`)
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
                        if ((payload.new as { status: string }).status === "active") {
                            setCount(prev => prev + 1)
                        }
                    } else if (payload.eventType === "UPDATE") {
                        const oldStatus = (payload.old as { status: string }).status
                        const newStatus = (payload.new as { status: string }).status
                        if (oldStatus === "active" && newStatus !== "active") {
                            setCount(prev => Math.max(0, prev - 1))
                        } else if (oldStatus !== "active" && newStatus === "active") {
                            setCount(prev => prev + 1)
                        }
                    } else if (payload.eventType === "DELETE") {
                        if ((payload.old as { status: string }).status === "active") {
                            setCount(prev => Math.max(0, prev - 1))
                        }
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [examId, supabase])

    if (loading) {
        return (
            <div className={cn("flex items-center gap-2", className)}>
                <div className="w-5 h-5 bg-slate-700 rounded animate-pulse"></div>
            </div>
        )
    }

    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full",
            className
        )}>
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <Users className="w-4 h-4 text-green-400" />
            <span className="text-sm font-medium text-green-400">
                {count}
                {showLabel && <span className="ml-1 text-green-400/70">đang thi</span>}
            </span>
        </div>
    )
}
