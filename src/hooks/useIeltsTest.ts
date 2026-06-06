"use client"

import { useState, useCallback, useEffect } from 'react'
import { IeltsTest } from '@/types'

/**
 * Hook quản lý nạp đề và chỉnh sửa đề thi IELTS (dành cho giáo viên/admin)
 */
export function useIeltsTest(testId: string | null) {
  const [test, setTest] = useState<IeltsTest | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTest = useCallback(async () => {
    if (!testId) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/ielts/tests/${testId}`)
      const json = await response.json()
      if (json.success) {
        setTest(json.data)
      } else {
        setError(json.error?.message || 'Không thể tải đề thi')
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối mạng')
    } finally {
      setLoading(false)
    }
  }, [testId])

  useEffect(() => {
    fetchTest()
  }, [fetchTest])

  // Cập nhật thông tin cơ bản bài test
  const updateTestDetails = async (details: Partial<IeltsTest>) => {
    if (!testId) return false
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/ielts/tests/${testId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details)
      })
      const json = await response.json()
      if (json.success) {
        setTest(prev => prev ? { ...prev, ...json.data } : null)
        return true
      } else {
        setError(json.error?.message || 'Không thể cập nhật đề thi')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Quản lý sections
  const addSection = async (sectionData: any) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/ielts/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sectionData, test_id: testId })
      })
      const json = await response.json()
      if (json.success) {
        await fetchTest() // Reload toàn bộ đề thi để lấy đầy đủ thông tin
        return true
      } else {
        setError(json.error?.message || 'Không thể thêm phần thi')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống')
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateSection = async (sectionId: string, sectionData: any) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/ielts/sections`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...sectionData, id: sectionId })
      })
      const json = await response.json()
      if (json.success) {
        await fetchTest()
        return true
      } else {
        setError(json.error?.message || 'Không thể cập nhật phần thi')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống')
      return false
    } finally {
      setSaving(false)
    }
  }

  const deleteSection = async (sectionId: string) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/ielts/sections?id=${sectionId}`, {
        method: 'DELETE'
      })
      const json = await response.json()
      if (json.success) {
        await fetchTest()
        return true
      } else {
        setError(json.error?.message || 'Không thể xóa phần thi')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Quản lý questions
  const addQuestion = async (questionData: any) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/ielts/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(questionData)
      })
      const json = await response.json()
      if (json.success) {
        await fetchTest()
        return true
      } else {
        setError(json.error?.message || 'Không thể thêm câu hỏi')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống')
      return false
    } finally {
      setSaving(false)
    }
  }

  const updateQuestion = async (questionId: string, questionData: any) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/ielts/questions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...questionData, id: questionId })
      })
      const json = await response.json()
      if (json.success) {
        await fetchTest()
        return true
      } else {
        setError(json.error?.message || 'Không thể cập nhật câu hỏi')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống')
      return false
    } finally {
      setSaving(false)
    }
  }

  const deleteQuestion = async (questionId: string) => {
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/ielts/questions?id=${questionId}`, {
        method: 'DELETE'
      })
      const json = await response.json()
      if (json.success) {
        await fetchTest()
        return true
      } else {
        setError(json.error?.message || 'Không thể xóa câu hỏi')
        return false
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống')
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    test,
    loading,
    saving,
    error,
    refetch: fetchTest,
    updateTestDetails,
    addSection,
    updateSection,
    deleteSection,
    addQuestion,
    updateQuestion,
    deleteQuestion
  }
}
