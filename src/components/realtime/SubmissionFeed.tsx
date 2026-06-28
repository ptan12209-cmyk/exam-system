"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { CheckCircle2, Trophy, Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

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
                const studentIds = data.map((s: { student_id: string }) => s.student_id)
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, full_name")
                    .in("id", studentIds)

                const profileMap = new Map(profiles?.map((p: { id: string; full_name: string }) => [p.id, p.full_name]) || [])

                const enrichedSubmissions = data.map((s: { id: string; student_id: string; score: number; exams: { total_questions: number } | { total_questions: number }[]; submitted_at: string }) => ({
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
                async (payload: { new: { id: string; student_id: string; score: number; submitted_at: string } }) => {
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
        if (percentage >= 80) return "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
        if (percentage >= 50) return "text-amber-600 bg-amber-500/10 border-amber-500/20"
        return "text-red-600 bg-red-500/10 border-red-500/20"
    }

    if (loading) {
        return (
            <div className={cn("rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-5 shadow-sm", className)}>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-[hsl(var(--muted))]/30 rounded w-1/2"></div>
                    <div className="h-12 bg-[hsl(var(--muted))]/20 rounded"></div>
                    <div className="h-12 bg-[hsl(var(--muted))]/20 rounded"></div>
                </div>
            </div>
        )
    }

    return (
        <div className={cn("rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] shadow-sm overflow-hidden", className)}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/10">
                <h3 className="font-semibold text-[hsl(var(--foreground))] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    Bài nộp gần đây
                </h3>
            </div>

            {/* Feed */}
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
                {submissions.length === 0 ? (
                    <div className="p-8 text-center text-[hsl(var(--muted-foreground))]">
                        <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Chưa có bài nộp</p>
                    </div>
                ) : (
                    <div className="divide-y divide-[hsl(var(--border))]/30">
                        {submissions.map((submission, index) => (
                            <div
                                key={submission.id}
                                className={cn(
                                    "px-5 py-3 flex items-center justify-between hover:bg-[hsl(var(--muted))]/20 transition-colors",
                                    index === 0 && "bg-blue-500/5"
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                        {submission.student_name?.charAt(0) || "?"}
                                    </div>
                                    <div>
                                        <p className="text-sm text-[hsl(var(--foreground))] font-medium">
                                            <Link 
                                                href={`/profile/${submission.student_id}`}
                                                className="hover:underline hover:text-indigo-600 transition-colors"
                                            >
                                                {submission.student_name}
                                            </Link>
                                        </p>
                                        <p className="text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatTime(submission.submitted_at)}
                                        </p>
                                    </div>
                                    {index === 0 && (
                                        <span className="text-[10px] bg-blue-500/10 text-blue-600 border border-blue-500/20 px-1.5 py-0.5 rounded font-medium">Mới</span>
                                    )}
                                </div>
                                <div className={cn(
                                    "px-2.5 py-1 rounded-lg text-sm font-bold border",
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
