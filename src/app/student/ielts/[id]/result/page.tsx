"use client"

import React, { useState, useEffect, use, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ChevronLeft, Loader2, Sparkles, RefreshCw, AlertTriangle, Calendar, Clock } from 'lucide-react'
import { BandScoreDisplay } from './_components/BandScoreDisplay'
import { ReadingResult } from './_components/ReadingResult'
import { WritingResult } from './_components/WritingResult'
import { IeltsSubmission, IeltsSection, IeltsWritingScore } from '@/types'
import { formatTimeSpent } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { StudentShell } from '@/components/student/StudentShell'
import { StudentHeader } from '@/components/student/StudentHeader'
import { Button } from '@/components/ui/button'

export default function StudentIeltsResultPage(props: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ submissionId?: string }>
}) {
  const params = use(props.params)
  const searchParams = use(props.searchParams)
  
  const testId = params.id
  const submissionId = searchParams.submissionId
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  const [submission, setSubmission] = useState<IeltsSubmission | null>(null)
  const [sections, setSections] = useState<IeltsSection[]>([])
  const [writingScore, setWritingScore] = useState<IeltsWritingScore | null>(null)
  const [user, setUser] = useState<{ full_name: string | null; class: string | null } | null>(null)
  
  const [loading, setLoading] = useState(true)
  const [grading, setGrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toast = useToast()

  const loadResultData = useCallback(async () => {
    if (!submissionId) {
      setError('Thiếu ID bài làm (submissionId)')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Tải profile người dùng
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, class')
          .eq('id', authUser.id)
          .single()
        setUser(profile)
      }

      // Gọi API route duy nhất để lấy toàn bộ dữ liệu kết quả (submission + sections + writingScore)
      const res = await fetch(`/api/ielts/result/${submissionId}`)
      const json = await res.json()

      if (json.success) {
        setSubmission(json.data.submission)
        setSections(json.data.sections)
        setWritingScore(json.data.writing_score)
      } else {
        throw new Error(json.error?.message || 'Không thể tải kết quả bài làm')
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Lỗi tải kết quả làm bài')
    } finally {
      setLoading(false)
    }
  }, [submissionId, supabase])

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
        toast.success('Đã hoàn thành chấm bài tự động bằng AI!')
        await loadResultData()
      } else {
        toast.error(json.error?.message || 'AI chấm điểm gặp sự cố, vui lòng thử lại sau.')
      }
    } catch (err: any) {
      toast.error(err.message || 'Lỗi kết nối máy chủ')
    } finally {
      setGrading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
        <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
          {error || 'Lỗi tải thông tin.'}
        </div>
        <Link href="/student/ielts">
          <Button variant="outline" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent px-5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            Quay lại sảnh thi
          </Button>
        </Link>
      </div>
    )
  }

  const skill = submission.ielts_tests?.skill || 'reading'

  return (
    <StudentShell>
      <StudentHeader name={user?.full_name} studentClass={user?.class} onLogout={handleLogout} />
      
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:py-10 space-y-6">
        {/* Top Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))]/20 pb-4">
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
            <button className="px-5 py-2.5 rounded-full bg-transparent border border-[hsl(var(--border))]/70 hover:bg-[hsl(var(--muted))]/20 text-foreground font-semibold text-xs active:scale-95 transition-all">
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
            <div className="p-6 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] flex flex-col items-center justify-center text-center space-y-4 shadow-sm">
              <Sparkles className="h-10 w-10 text-cyan-400 animate-pulse" />
              <h4 className="font-extrabold text-sm text-foreground">Bài làm đang chờ chấm điểm</h4>
              <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
                Kỹ năng tự luận IELTS Writing cần được trí tuệ nhân tạo (AI) chấm điểm để trả kết quả.
              </p>
              <Button
                onClick={triggerAiGrading}
                disabled={grading}
                className="px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-cyan-500/10 disabled:opacity-50 border-0 h-auto"
              >
                {grading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Kích hoạt AI chấm điểm
              </Button>
            </div>
          )}

          {/* Thông tin chi tiết lượt thi */}
          <div className="md:col-span-2 p-6 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-[hsl(var(--border))]/20 pb-2">
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
                  <span className="font-bold text-foreground">
                    {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('vi-VN') : ''}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b border-[hsl(var(--border))]/20 pb-2">
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
          <ReadingResult test={submission.ielts_tests!} sections={sections} studentAnswers={submission.answers} />
        )}
      </main>
    </StudentShell>
  )
}
