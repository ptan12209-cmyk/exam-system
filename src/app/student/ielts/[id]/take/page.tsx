"use client"

import React, { useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Award, Loader2, Play, AlertCircle } from 'lucide-react'
import { useIeltsSubmission } from '@/hooks/useIeltsSubmission'
import { IeltsTimer } from './_components/IeltsTimer'
import { ReadingLayout } from './_components/ReadingLayout'
import { ListeningLayout } from './_components/ListeningLayout'
import { WritingLayout } from './_components/WritingLayout'
import { StudentShell } from '@/components/student/StudentShell'
import { Button } from '@/components/ui/button'

export default function TakeIeltsTestPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const testId = params.id
  const router = useRouter()
  
  const {
    test,
    loading,
    error,
    answers,
    writingResponse,
    timeSpent,
    submitting,
    setQuestionAnswer,
    setWritingResponse,
    submitTest
  } = useIeltsSubmission(testId)

  const [confirmSubmit, setConfirmSubmit] = useState(false)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Đang chuẩn bị đề thi...</p>
      </div>
    )
  }

  if (error || !test) {
    return (
      <div className="container mx-auto p-6 text-center max-w-xl space-y-4">
        <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-5 text-sm text-red-400">
          {error || 'Không tìm thấy đề thi này.'}
        </div>
        <Link href="/student/ielts">
          <Button variant="outline" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent px-5 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            Quay lại sảnh thi
          </Button>
        </Link>
      </div>
    )
  }

  const handleAutoSubmit = async () => {
    // Tự động nộp bài khi hết giờ
    console.log('Hết giờ làm bài! Hệ thống tự động nộp...')
    const result = await submitTest()
    if (result) {
      router.push(`/student/ielts/${testId}/result?submissionId=${result.submission_id}`)
    }
  }

  const handleManualSubmit = async () => {
    setConfirmSubmit(false)
    const result = await submitTest()
    if (result) {
      router.push(`/student/ielts/${testId}/result?submissionId=${result.submission_id}`)
    }
  }

  const sections = test.sections || []

  return (
    <StudentShell>
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
        {/* Top Header: Title, Timer, Submit */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[hsl(var(--border))]/25 pb-4">
          <div className="space-y-1">
            <Link
              href="/student/ielts"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors mb-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Thoát làm bài
            </Link>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate max-w-[450px]">
              {test.title}
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
              Luyện tập kỹ năng: {test.skill}
            </p>
          </div>

          {/* Timer & Nộp bài */}
          <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
            <IeltsTimer
              durationMinutes={test.duration}
              timeSpentSeconds={timeSpent}
              onTimeUp={handleAutoSubmit}
            />
            
            <button
              onClick={() => setConfirmSubmit(true)}
              disabled={submitting}
              className={`px-5 py-2 rounded-full font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                test.skill === 'reading' 
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-white' 
                  : test.skill === 'listening' 
                  ? 'bg-violet-500 hover:bg-violet-400 text-white' 
                  : 'bg-orange-500 hover:bg-orange-400 text-white'
              }`}
            >
              Nộp bài
            </button>
          </div>
        </div>

      {/* Main taking workspace depending on skill type */}
      <div className="space-y-4">
        {test.skill === 'reading' && (
          <ReadingLayout
            test={test}
            sections={sections}
            answers={answers}
            onAnswerChange={setQuestionAnswer}
          />
        )}

        {test.skill === 'listening' && (
          <ListeningLayout
            test={test}
            sections={sections}
            answers={answers}
            onAnswerChange={setQuestionAnswer}
          />
        )}

        {test.skill === 'writing' && (
          <WritingLayout
            test={test}
            sections={sections}
            value={writingResponse}
            onChange={setWritingResponse}
          />
        )}
      </div>

      {/* Xác nhận nộp bài modal */}
      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <AlertCircle className="h-10 w-10 text-amber-500 mx-auto animate-bounce" />
              <h3 className="text-base font-bold text-foreground">Xác nhận nộp bài?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bạn có chắc chắn muốn nộp bài làm này? Bạn sẽ không thể sửa đổi câu trả lời sau khi nộp.
              </p>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setConfirmSubmit(false)}
                className="flex-1 py-2 rounded-full border border-[hsl(var(--border))]/70 bg-transparent text-xs font-semibold h-auto"
              >
                Hủy bỏ
              </Button>
              <button
                onClick={handleManualSubmit}
                disabled={submitting}
                className={`flex-1 py-2.5 rounded-full font-bold text-xs text-white shadow-md transition-all active:scale-95 disabled:opacity-50 ${
                  test.skill === 'reading' 
                    ? 'bg-cyan-600 hover:bg-cyan-500' 
                    : test.skill === 'listening' 
                    ? 'bg-violet-600 hover:bg-violet-500' 
                    : 'bg-orange-600 hover:bg-orange-500'
                }`}
              >
                {submitting ? 'Đang nộp...' : 'Nộp bài ngay'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </StudentShell>
  )
}
