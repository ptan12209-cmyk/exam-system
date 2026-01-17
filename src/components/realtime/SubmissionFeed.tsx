"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle2, Trophy, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface Submission {
    id: string
    student_id: string
    student_name?: string
    score: number
    total_questions: number
    submitted_at: string
}

interface SubmissionFeedProps {
    examId: string
    className?: string
    maxItems?: number
}

export function SubmissionFeed({ examId, className, maxItems = 5 }: SubmissionFeedProps) {
    const [submissions, setSubmissions] = useState<Submission[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        // Fetch recent submissions
        const fetchSubmissions = async () => {
            const { data, error } = await supabase
                .from("submissions")
                .select(`
                    id,
                    student_id,
                    score,
                    submitted_at,
                    exams!inner(total_questions)
                `)
                .eq("exam_id", examId)
                .order("submitted_at", { ascending: false })
                .limit(maxItems)

            if (!error && data) {
                // Get student names
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const studentIds = data.map((s: any) => s.student_id)
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, full_name")
                    .in("id", studentIds)

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const profileMap = new Map(profiles?.map((p: any) => [p.id, p.full_name]) || [])

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const enrichedSubmissions = data.map((s: any) => ({
                    id: s.id,
                    student_id: s.student_id,
                    student_name: profileMap.get(s.student_id) || "Học sinh",
                    score: s.score,
                    total_questions: (s.exams as { total_questions: number }).total_questions,
                    submitted_at: s.submitted_at
                }))

                setSubmissions(enrichedSubmissions)
            }
            setLoading(false)
        }

        fetchSubmissions()

        // Subscribe to new submissions
        const channel = supabase
            .channel(`submission-feed-${examId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "submissions",
                    filter: `exam_id=eq.${examId}`
                },
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                async (payload: any) => {
                    const newSub = payload.new as { id: string; student_id: string; score: number; submitted_at: string }

                    // Get student name
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("full_name")
                        .eq("id", newSub.student_id)
                        .single()

                    // Get total questions
                    const { data: exam } = await supabase
                        .from("exams")
                        .select("total_questions")
                        .eq("id", examId)
                        .single()

                    const enrichedSubmission: Submission = {
                        id: newSub.id,
                        student_id: newSub.student_id,
                        student_name: profile?.full_name || "Học sinh",
                        score: newSub.score,
                        total_questions: exam?.total_questions || 10,
                        submitted_at: newSub.submitted_at
                    }

                    setSubmissions(prev => [enrichedSubmission, ...prev.slice(0, maxItems - 1)])
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [examId, maxItems, supabase])

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr)
        return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    }

    const getScoreColor = (score: number, total: number) => {
        const percentage = (score / total) * 100
        if (percentage >= 80) return "text-green-400"
        if (percentage >= 50) return "text-yellow-400"
        return "text-red-400"
    }

    if (loading) {
        return (
            <div className={cn("bg-slate-800/50 rounded-xl p-4 border border-slate-700", className)}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-slate-700 rounded w-1/2"></div>
                    <div className="h-12 bg-slate-700 rounded"></div>
                    <div className="h-12 bg-slate-700 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden", className)}>
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    Bài nộp gần đây
                </h3>
            </div>

            {/* Feed */}
            <div className="max-h-64 overflow-y-auto">
                {submissions.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Chưa có bài nộp</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-700/50">
                        {submissions.map((submission, index) => (
                            <div
                                key={submission.id}
                                className={cn(
                                    "px-4 py-3 flex items-center justify-between",
                                    index === 0 && "bg-green-500/5 animate-pulse-once"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                                        {submission.student_name?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <p className="text-sm text-white font-medium">
                                            {submission.student_name}
                                        </p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(submission.submitted_at)}
                                        </p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "text-lg font-bold",
                                    getScoreColor(submission.score, submission.total_questions)
                                )}>
                                    {submission.score}/{submission.total_questions}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
