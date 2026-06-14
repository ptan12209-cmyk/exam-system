"use client"

import { useState, useMemo } from "react"
import type { Exam } from "@/types"

/**
 * Options for the useSubjectFilter hook.
 */
interface UseSubjectFilterOptions {
  /** Array of exams to filter. */
  exams: Exam[]
  /** Initially selected subject (default: "all"). */
  initialSubject?: string
  /** Initial search query string (default: ""). */
  initialSearch?: string
}

/**
 * Hook to filter exams by subject and search query.
 * Provides subject dropdown state, text search, filtered results,
 * and the list of available subjects extracted from the exam data.
 *
 * @param options - Configuration including the exam array and initial filter values.
 * @returns Object with filter state setters, filtered exams, and available subjects.
 */
export function useSubjectFilter({
  exams,
  initialSubject = "all",
  initialSearch = "",
}: UseSubjectFilterOptions) {
  const [selectedSubject, setSelectedSubject] = useState(initialSubject)
  const [searchQuery, setSearchQuery] = useState(initialSearch)

  const filteredExams = useMemo(() => {
    return exams
      .filter((e) => selectedSubject === "all" || e.subject === selectedSubject)
      .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [exams, selectedSubject, searchQuery])

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>()
    exams.forEach((e) => {
      if (e.subject) subjects.add(e.subject)
    })
    return Array.from(subjects).sort()
  }, [exams])

  return {
    selectedSubject,
    setSelectedSubject,
    searchQuery,
    setSearchQuery,
    filteredExams,
    availableSubjects,
  }
}
