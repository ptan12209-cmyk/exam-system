"use client"

import React, { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, Award, Loader2, Sparkles, RefreshCw, AlertTriangle, Calendar, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BandScoreDisplay } from './_components/BandScoreDisplay'
import { ReadingResult } from './_components/ReadingResult'
import { WritingResult } from './_components/WritingResult'

export default function StudentIeltsResultPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ submissionId?: string }>
}) {
  const params = use(props.params)
  const searchParams = use(props.searchParams)
  
  const testId = params.id
  const submissionId = searchParams.submissionId

  const [submission, setSubmission] = useState<any | null>(null)
  const [sections, setSections] = useState<any[]>([])
  const [writingScore, setWritingScore] = useState<any | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadResultData = useCallback(async () => {
    if (!submissionId) {
      setError('Thiếu ID bài làm (submissionId)')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Tải chi tiết bài làm
      const { data: sub, error: subError } = await supabase
        .from('ielts_submissions')
        .select('*, ielts_tests(*)')
        .eq('id', submissionId)
        .single()

      if (subError || !sub) {
        throw new Error('Không tìm thấy bài làm trong hệ thống')
      }
      setSubmission(sub)

      // 2. Tải các phần thi (sections) và câu hỏi (questions) kèm đáp án đúng
      const { data: secs, error: secsError } = await supabase
        .from('ielts_sections')
        .select('*')
        .eq('test_id', testId)
        .order('order_index', { ascending: true })

      if (secsError) throw secsError

      if (secs && secs.length > 0 && sub.ielts_tests?.skill !== 'writing') {
        const secIds = secs.map((s: any) => s.id)
        const { data: qs, error: qsError } = await supabase
          .from('ielts_questions')
          .select('*')
          .in('section_id', secIds)
          .order('question_number', { ascending: true })

        if (qsError) throw qsError

        const assembledSecs = secs.map((s: any) => ({
          ...s,
          questions: (qs || []).filter((q: any) => q.section_id === s.id)
        }))
        setSections(assembledSecs)
      } else {
        setSections(secs || [])
      }

      // 3. Tải kết quả chấm Writing của AI nếu có
      if (sub.ielts_tests?.skill === 'writing') {
        const { data: wScore } = await supabase
          .from('ielts_writing_scores')
          .select('*')
          .eq('submission_id', submissionId)
          .maybeSingle()
        
        setWritingScore(wScore)
      }

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi tải kết quả làm bài')
    } finally {
      setLoading(false)
    }
  }, [submissionId, testId])

  useEffect(() => {
    loadResultData()
  }, [loadResultData])

  // Trực tiếp gọi AI chấm bài luận từ client
  const triggerAiGrading = async () => {
    if (!submissionId || grading) return
    setGrading(true)
    try {
      const res = await fetch('/api/ielts/grade-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId })
      })
      const json = await res.json()
      if (json.success) {
        // Reload lại dữ liệu để hiển thị điểm
        await loadResultData()
      } else {
        alert(json.error?.message || 'AI chấm điểm gặp sự cố, vui lòng thử lại sau.')
      }
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối máy chủ')
    } finally {
      setGrading(false)
    }
  }

  const formatTimeSpent = (sec: number) => {
    const mins = Math.floor(sec / 60)
    const secs = sec % 60
    return `${mins} phút ${secs} giây`
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Đang kết xuất kết quả làm bài...</p>
      </div>
    )
  }

  if (error || !submission) {
    return (
      <div className="container mx-auto p-6 text-center max-w-xl space-y-4">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
          {error || 'Lỗi tải thông tin.'}
        </div>
        <Link href="/student/ielts" className="inline-block px-5 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-muted-foreground hover:text-foreground">
          Quay lại sảnh thi
        </Link>
      </div>
    )
  }

  const skill = submission.ielts_tests?.skill

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="space-y-1">
          <Link
            href="/student/ielts"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors mb-1"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Trở lại sảnh thi
          </Link>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground truncate max-w-[500px]">
            Kết quả: <span className="text-cyan-400">{submission.ielts_tests?.title}</span>
          </h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
            Kỹ năng: <span className="text-foreground">{skill}</span>
          </p>
        </div>

        <Link href={`/student/ielts/${testId}/take`}>
          <button className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-foreground font-semibold text-xs active:scale-95 transition-all">
            Làm lại bài thi
          </button>
        </Link>
      </div>

      {/* Kết quả tổng hợp */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {/* Điểm số gauge (chỉ hiện khi đã được chấm - graded) */}
        {submission.status === 'graded' ? (
          <BandScoreDisplay score={Number(submission.score)} skill={skill} />
        ) : (
          <div className="glass-card p-6 rounded-2xl border border-white/10 bg-neutral-900/60 flex flex-col items-center justify-center text-center space-y-4">
            <Sparkles className="h-10 w-10 text-cyan-400 animate-pulse" />
            <h4 className="font-extrabold text-sm text-foreground">Bài làm đang chờ chấm điểm</h4>
            <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
              Kỹ năng tự luận IELTS Writing cần được trí tuệ nhân tạo (AI) chấm điểm để trả kết quả.
            </p>
            <button
              onClick={triggerAiGrading}
              disabled={grading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-cyan-500/10 disabled:opacity-50"
            >
              {grading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Kích hoạt AI chấm điểm
            </button>
          </div>
        )}

        {/* Thông tin chi tiết lượt thi */}
        <div className="md:col-span-2 glass-card p-6 rounded-2xl border border-white/10 bg-neutral-900/40 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-white/5 pb-2">
              Thông tin chung
            </h3>

            <div className="space-y-2">
              <div className="text-xs flex items-center justify-between text-muted-foreground">
                <span>Trạng thái bài làm:</span>
                <span className={`font-bold capitalize ${submission.status === 'graded' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {submission.status === 'graded' ? 'Đã chấm điểm' : 'Đã nộp bài'}
                </span>
              </div>

              <div className="text-xs flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Thời gian làm bài:</span>
                <span className="font-bold text-foreground">{formatTimeSpent(submission.time_spent)}</span>
              </div>

              <div className="text-xs flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Thời gian nộp:</span>
                <span className="font-bold text-foreground">{new Date(submission.submitted_at).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-white/5 pb-2">
              Kết quả chi tiết
            </h3>

            {skill === 'writing' ? (
              <div className="text-xs text-muted-foreground leading-relaxed flex flex-col justify-center h-[calc(100%-35px)]">
                {submission.status === 'graded' ? (
                  <span>
                    Hệ thống đã nhận xét bài viết của bạn. Xem phân tích chi tiết các tiêu chí và so sánh với bài luận mẫu đạt chuẩn Band 7.5+ ở phía dưới.
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium flex items-start gap-1">
                    <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                    Bấm nút &quot;Kích hoạt AI chấm điểm&quot; bên trái để gửi bài luận sang dịch vụ AI phân tích lỗi và quy đổi Band score ngay lập tức.
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs flex items-center justify-between text-muted-foreground">
                  <span>Số câu đúng:</span>
                  <span className="font-bold text-emerald-400 text-sm">{submission.correct_count} / {submission.total_questions} câu</span>
                </div>
                <div className="text-xs flex items-center justify-between text-muted-foreground">
                  <span>Tỉ lệ chính xác:</span>
                  <span className="font-bold text-foreground">
                    {submission.total_questions > 0 
                      ? `${Math.round((submission.correct_count / submission.total_questions) * 100)}%` 
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Xem chi tiết đáp án từng câu hỏi hoặc Feedback AI */}
      {submission.status === 'graded' && skill === 'writing' && writingScore && (
        <WritingResult scoreDetail={writingScore} essayContent={submission.writing_response || ''} />
      )}

      {skill !== 'writing' && sections.length > 0 && (
        <ReadingResult test={submission.ielts_tests} sections={sections} studentAnswers={submission.answers} />
      )}
    </div>
  )
}
