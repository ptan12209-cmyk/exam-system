"use client"

import { useState, useMemo } from "react"
import type { Exam } from "@/types"

interface UseExamsFilterOptions {
  exams: Exam[]
  initialSubject?: string
  initialSearch?: string
}

/**
 * Hook lọc danh sách bài thi theo môn học và từ khóa tìm kiếm.
 * Nhận danh sách bài thi, môn học và từ khóa ban đầu (tuỳ chọn),
 * trả về các state bộ lọc và danh sách bài thi đã lọc.
 *
 * @param options - Đối tượng: exams (mảng Exam), initialSubject (mặc định "all"), initialSearch (mặc định "").
 * @returns Object chứa selectedSubject, setSelectedSubject, searchQuery, setSearchQuery, filteredExams.
 * @example
 * const { selectedSubject, setSelectedSubject, searchQuery, setSearchQuery, filteredExams } = useExamsFilter({ exams });
 */
export function useExamsFilter({
  exams,
  initialSubject = "all",
  initialSearch = "",
}: UseExamsFilterOptions) {
  const [selectedSubject, setSelectedSubject] = useState(initialSubject)
  const [searchQuery, setSearchQuery] = useState(initialSearch)

  const filteredExams = useMemo(() => {
    return exams
      .filter((e) => selectedSubject === "all" || e.subject === selectedSubject)
      .filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [exams, selectedSubject, searchQuery])

  return {
    selectedSubject,
    setSelectedSubject,
    searchQuery,
    setSearchQuery,
    filteredExams,
  }
}
