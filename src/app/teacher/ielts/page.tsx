"use client"

import React, { useState, useEffect } from 'react'
import { Plus, Loader2, Award, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { IeltsStats } from './_components/IeltsStats'
import { TestList } from './_components/TestList'
import { CreateTestModal } from './_components/CreateTestModal'
import { IeltsTest } from '@/types'

export default function TeacherIeltsDashboard() {
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [submissionsCount, setSubmissionsCount] = useState(0)
  const [avgBandScore, setAvgBandScore] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const supabase = createClient()

  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Tải danh sách các đề thi
      const response = await fetch('/api/ielts/tests')
      const json = await response.json()
      if (json.success) {
        setTests(json.data)
      } else {
        setError(json.error?.message || 'Không thể tải danh sách đề thi')
      }

      // 2. Tính toán thống kê lượt nộp bài
      const { data: submissions, error: subError } = await supabase
        .from('ielts_submissions')
        .select('score, status')

      if (subError) throw subError

      if (submissions) {
        setSubmissionsCount(submissions.length)
        
        // Tính điểm trung bình của các bài đã được chấm điểm (status = graded)
        const gradedSubmissions = submissions.filter((s: any) => s.status === 'graded' && s.score !== null)
        if (gradedSubmissions.length > 0) {
          const sum = gradedSubmissions.reduce((acc: number, curr: any) => acc + Number(curr.score), 0)
          setAvgBandScore(sum / gradedSubmissions.length)
        } else {
          setAvgBandScore(0)
        }
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống khi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Xóa bài test
  const handleDeleteTest = async (testId: string) => {
    try {
      const response = await fetch(`/api/ielts/tests/${testId}`, {
        method: 'DELETE'
      })
      const json = await response.json()
      if (json.success) {
        setTests(prev => prev.filter(t => t.id !== testId))
        loadDashboardData() // Tải lại để cập nhật thống kê
      } else {
        alert(json.error?.message || 'Không thể xóa đề thi')
      }
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra khi xóa')
    }
  }

  const handleCreateSuccess = (newTestId: string) => {
    // Tải lại dữ liệu và chuyển hướng giáo viên tới trang chỉnh sửa
    loadDashboardData()
    window.location.href = `/teacher/ielts/${newTestId}/edit`
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href="/teacher"
              className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Quay lại
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <Award className="h-8 w-8 text-cyan-400" /> Quản lý Đề thi IELTS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tạo, cập nhật và quản lý các bài luyện tập IELTS Reading, Listening và Writing.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all w-full sm:w-auto"
        >
          <Plus className="h-5 w-5" /> Thêm đề thi mới
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          {/* Thống kê tổng quan */}
          <IeltsStats 
            tests={tests} 
            submissionsCount={submissionsCount} 
            avgBandScore={avgBandScore} 
          />

          {/* Danh sách đề thi */}
          <TestList 
            tests={tests} 
            onDelete={handleDeleteTest} 
          />
        </>
      )}

      {/* Modal tạo đề thi mới */}
      <CreateTestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleCreateSuccess} 
      />
    </div>
  )
}
