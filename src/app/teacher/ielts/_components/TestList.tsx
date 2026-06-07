"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { Search, Edit2, Trash2, Clock, Eye, FileText, ChevronRight } from 'lucide-react'
import { IeltsTest, IeltsSkill, IeltsTestStatus } from '@/types'
import { QUESTION_TYPE_LABELS } from '@/lib/ielts'

interface TestListProps {
  tests: IeltsTest[]
  onDelete: (id: string) => void
}

export function TestList({ tests, onDelete }: TestListProps) {
  const [search, setSearch] = useState('')
  const [filterSkill, setFilterSkill] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Xác nhận xóa
  const handleDeleteConfirm = (test: IeltsTest) => {
    if (confirm(`Bạn có chắc chắn muốn xóa bài thi "${test.title}"? Thao tác này sẽ xóa tất cả phần thi, câu hỏi và điểm số liên quan.`)) {
      onDelete(test.id)
    }
  }

  // Filter
  const filteredTests = tests.filter(test => {
    const matchesSearch = test.title.toLowerCase().includes(search.toLowerCase()) || 
                          (test.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesSkill = filterSkill === 'all' || test.skill === filterSkill
    const matchesStatus = filterStatus === 'all' || test.status === filterStatus
    return matchesSearch && matchesSkill && matchesStatus
  })

  const getSkillBadge = (skill: IeltsSkill) => {
    switch (skill) {
      case 'reading':
        return <span className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Reading</span>
      case 'listening':
        return <span className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Listening</span>
      case 'writing':
        return <span className="px-2.5 py-1 text-xs rounded-lg font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">Writing</span>
      default:
        return null
    }
  }

  const getStatusBadge = (status: IeltsTestStatus) => {
    switch (status) {
      case 'draft':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-500/10 text-neutral-400 border border-neutral-500/25">Draft</span>
      case 'published':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">Published</span>
      case 'archived':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/25">Archived</span>
      default:
        return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm tiêu đề đề thi..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] text-sm text-foreground focus:border-cyan-500/50 focus:outline-none transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterSkill}
            onChange={e => setFilterSkill(e.target.value)}
            className="rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-sm text-foreground focus:outline-none cursor-pointer [&>option]:bg-neutral-900"
          >
            <option value="all">Tất cả kỹ năng</option>
            <option value="reading">Reading</option>
            <option value="listening">Listening</option>
            <option value="writing">Writing</option>
          </select>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))] px-4 py-2 text-sm text-foreground focus:outline-none cursor-pointer [&>option]:bg-neutral-900"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
        </div>
      </div>

      {/* Tests List */}
      <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden shadow-sm">
        {filteredTests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Không tìm thấy bài thi IELTS nào phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]/20 text-muted-foreground">
                  <th className="p-4 font-semibold">Tên đề thi</th>
                  <th className="p-4 font-semibold text-center">Kỹ năng</th>
                  <th className="p-4 font-semibold text-center">Thời gian</th>
                  <th className="p-4 font-semibold text-center">Câu hỏi</th>
                  <th className="p-4 font-semibold text-center">Trạng thái</th>
                  <th className="p-4 font-semibold text-center">Ngày tạo</th>
                  <th className="p-4 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]/10">
                {filteredTests.map((test) => (
                  <tr key={test.id} className="hover:bg-[hsl(var(--muted))]/10 transition-colors group">
                    <td className="p-4">
                      <div>
                        <span className="font-semibold text-foreground block group-hover:text-cyan-400 transition-colors">
                          {test.title}
                        </span>
                        {test.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {test.description}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-center">{getSkillBadge(test.skill)}</td>
                    <td className="p-4 text-center font-medium">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 opacity-60" />
                        {test.duration} ph
                      </span>
                    </td>
                    <td className="p-4 text-center font-medium">
                      {test.skill === 'writing' ? 'N/A (Tự luận)' : `${test.total_questions} câu`}
                    </td>
                    <td className="p-4 text-center">{getStatusBadge(test.status)}</td>
                    <td className="p-4 text-center text-xs text-muted-foreground">
                      {new Date(test.created_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/teacher/ielts/${test.id}/edit`}
                          className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--muted))]/20 transition-all"
                          title="Chỉnh sửa nội dung đề"
                        >
                          <Edit2 className="h-4.5 w-4.5 text-cyan-400" />
                        </Link>
                        <button
                          onClick={() => handleDeleteConfirm(test)}
                          className="p-1.5 rounded-full text-muted-foreground hover:text-red-400 hover:bg-[hsl(var(--muted))]/20 transition-all"
                          title="Xóa đề thi"
                        >
                          <Trash2 className="h-4.5 w-4.5 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
