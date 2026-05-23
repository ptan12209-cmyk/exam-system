"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"

/**
 * Represents a student's exam submission record.
 */
export interface SubmissionRecord {
  /** Unique submission ID. */
  id: string
  /** The exam this submission belongs to. */
  exam_id: string
  /** Score achieved (0-10 scale). */
  score: number
  /** Time spent on the exam in seconds. */
  time_spent?: number
  /** Timestamp when the submission was created. */
  submitted_at?: string
  /** ID of the student who submitted. */
  student_id?: string
}

/**
 * Hook to fetch all submissions for a given student.
 * Also computes a submissionMap mapping each exam_id to the student's best score.
 *
 * @param studentId - The student's unique ID, or null to skip fetching.
 * @returns Object containing submissions array, best-score map, and loading state.
 */
export function useStudentSubmissions(studentId: string | null) {
  const supabase = useMemo(() => createClient(), [])
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([])
  const [submissionMap, setSubmissionMap] = useState<Map<string, number>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!studentId) {
      setSubmissions([])
      setSubmissionMap(new Map())
      setLoading(false)
      return
    }

    let cancelled = false

    async function fetchSubmissions() {
      const { data } = await supabase
        .from("submissions")
        .select("id, exam_id, score, time_spent, submitted_at, student_id")
        .eq("student_id", studentId)

      if (cancelled) return

      if (data) {
        const raw = data as SubmissionRecord[]
        setSubmissions(raw)

        const bestMap = new Map<string, number>()
        raw.forEach((s) => {
          const existing = bestMap.get(s.exam_id)
          if (existing === undefined || s.score > existing) {
            bestMap.set(s.exam_id, s.score)
          }
        })
        setSubmissionMap(bestMap)
      }

      setLoading(false)
    }

    fetchSubmissions()

    return () => {
      cancelled = true
    }
  }, [studentId, supabase])

  return { submissions, submissionMap, loading }
}
