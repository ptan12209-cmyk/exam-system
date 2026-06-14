"use client"

import { useState, useMemo } from "react"
import type { Exam } from "@/types"

interface UseExamsPaginationOptions {
  exams: Exam[]
  /** Number of items per page. Defaults to the full list length, showing all items. */
  itemsPerPage?: number
}

/**
 * Hook phân trang cho danh sách bài thi.
 * Nhận danh sách bài thi và số lượng mỗi trang (tuỳ chọn),
 * trả về danh sách bài thi đã phân trang, trang hiện tại, tổng số trang và setter trang.
 *
 * @param options - Đối tượng: exams (mảng Exam), itemsPerPage (số bài mỗi trang, mặc định toàn bộ).
 * @returns Object chứa paginatedExams, currentPage, totalPages, setCurrentPage.
 * @example
 * const { paginatedExams, currentPage, totalPages, setCurrentPage } = useExamsPagination({ exams, itemsPerPage: 10 });
 */
export function useExamsPagination({
  exams,
  itemsPerPage = exams.length,
}: UseExamsPaginationOptions) {
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = Math.max(1, Math.ceil(exams.length / itemsPerPage))

  const paginatedExams = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return exams.slice(start, start + itemsPerPage)
  }, [exams, currentPage, itemsPerPage])

  return {
    paginatedExams,
    currentPage,
    totalPages,
    setCurrentPage,
  }
}
