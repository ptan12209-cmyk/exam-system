"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { IeltsTest } from '@/types'

/**
 * Hook quản lý trạng thái làm bài, tự động lưu nháp và nộp bài IELTS của học sinh
 */
export function useIeltsSubmission(testId: string | null) {
  const [test, setTest] = useState<IeltsTest | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [writingResponse, setWritingResponse] = useState('')
  const [timeSpent, setTimeSpent] = useState(0)

  const [submitting, setSubmitting] = useState(false)
  const [grading, setGrading] = useState(false)
  const [submissionResult, setSubmissionResult] = useState<any | null>(null)

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Tải thông tin đề thi (dành cho học sinh, không chứa đáp án đúng)
  useEffect(() => {
    if (!testId) return
    let isMounted = true

    async function loadTest() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/ielts/tests/${testId}`)
        const json = await response.json()
        if (isMounted) {
          if (json.success) {
            setTest(json.data)
            
            // Phục hồi nháp từ localStorage nếu có
            const draftKey = `ECODEx_IELTS_draft_${testId}`
            const savedDraft = localStorage.getItem(draftKey)
            if (savedDraft) {
              try {
                const parsed = JSON.parse(savedDraft)
                if (parsed.answers) setAnswers(parsed.answers)
                if (parsed.writingResponse) setWritingResponse(parsed.writingResponse)
                if (parsed.timeSpent) setTimeSpent(parsed.timeSpent)
              } catch (e) {
                console.error('Lỗi khôi phục bài thi nháp:', e)
              }
            }
          } else {
            setError(json.error?.message || 'Không thể tải đề thi')
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Lỗi mạng')
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadTest()

    return () => {
      isMounted = false
    }
  }, [testId])

  // 2. Bộ đếm thời gian tự động tích lũy time_spent (chỉ chạy khi chưa nộp bài và đã tải xong đề)
  useEffect(() => {
    if (!test || submissionResult) return

    timerRef.current = setInterval(() => {
      setTimeSpent(prev => {
        const nextTime = prev + 1
        // Tự động lưu nháp mỗi 5 giây vào localStorage
        if (nextTime % 5 === 0) {
          const draftKey = `ECODEx_IELTS_draft_${testId}`
          localStorage.setItem(draftKey, JSON.stringify({
            answers,
            writingResponse,
            timeSpent: nextTime
          }))
        }
        return nextTime
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [test, testId, answers, writingResponse, submissionResult])

  // 3. Tự động lưu nháp mỗi khi answers hoặc writingResponse thay đổi
  useEffect(() => {
    if (!testId || submissionResult) return
    const draftKey = `ECODEx_IELTS_draft_${testId}`
    localStorage.setItem(draftKey, JSON.stringify({
      answers,
      writingResponse,
      timeSpent
    }))
  }, [answers, writingResponse, testId, timeSpent, submissionResult])

  // 4. Hàm chọn câu trả lời (cho Reading/Listening)
  const setQuestionAnswer = useCallback((questionId: string, answerText: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerText
    }))
  }, [])

  // 5. Nộp bài thi
  const submitTest = async () => {
    if (!testId || submitting) return null
    setSubmitting(true)
    setError(null)
    
    try {
      // Chuyển format answers sang dạng [{question_id, answer}]
      const formattedAnswers = Object.entries(answers).map(([qId, val]) => ({
        question_id: qId,
        answer: val
      }))

      const response = await fetch(`/api/ielts/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_id: testId,
          answers: formattedAnswers,
          writing_response: test?.skill === 'writing' ? writingResponse : undefined,
          time_spent: timeSpent
        })
      })

      const json = await response.json()
      if (json.success) {
        setSubmissionResult(json.data)
        
        // Xóa nháp sau khi nộp thành công
        const draftKey = `ECODEx_IELTS_draft_${testId}`
        localStorage.removeItem(draftKey)
        
        return json.data
      } else {
        setError(json.error?.message || 'Không thể nộp bài')
        return null
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi mạng, vui lòng thử lại')
      return null
    } finally {
      setSubmitting(false)
    }
  }

  // 6. Kích hoạt AI chấm bài viết (dành cho Writing)
  const gradeWritingSubmission = async (submissionId: string) => {
    if (grading) return null
    setGrading(true)
    setError(null)

    try {
      const response = await fetch(`/api/ielts/grade-writing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId })
      })
      const json = await response.json()
      if (json.success) {
        setSubmissionResult((prev: any) => prev ? { ...prev, status: 'graded', ...json.data } : json.data)
        return json.data
      } else {
        setError(json.error?.message || 'AI không thể chấm điểm lúc này')
        return null
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống khi kết nối AI')
      return null
    } finally {
      setGrading(false)
    }
  }

  return {
    test,
    loading,
    error,
    answers,
    writingResponse,
    timeSpent,
    submitting,
    grading,
    submissionResult,
    setQuestionAnswer,
    setWritingResponse,
    submitTest,
    gradeWritingSubmission
  }
}
