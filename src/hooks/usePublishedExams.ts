"use client"

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Exam } from "@/types"

/**
 * Hook to fetch all published exams.
 * Returns the list of exams with status 'published', sorted by creation date descending.
 *
 * @returns Object containing exams array, loading state, and error message.
 */
export function usePublishedExams() {
  const supabase = useMemo(() => createClient(), [])
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchExams() {
      const { data, error: fetchError } = await supabase
        .from("exams")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })

      if (cancelled) return

      if (fetchError) {
        setError(fetchError.message)
      } else if (data) {
        setExams(data as Exam[])
      }

      setLoading(false)
    }

    fetchExams()

    return () => {
      cancelled = true
    }
  }, [supabase])

  return { exams, loading, error }
}
