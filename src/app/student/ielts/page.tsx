"use client"

import React, { useState, useEffect } from 'react'
import { Award, BookOpen, GraduationCap, Loader2, Sparkles } from 'lucide-react'
import { SkillSelector } from './_components/SkillSelector'
import { TestCard } from './_components/TestCard'
import { HistoryPanel } from './_components/HistoryPanel'
import { IeltsTest, IeltsSkill } from '@/types'

export default function StudentIeltsLobby() {
  const [selectedSkill, setSelectedSkill] = useState<IeltsSkill>('reading')
  const [tests, setTests] = useState<IeltsTest[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Tải danh sách đề thi và lịch sử làm bài
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Tải các đề thi đã xuất bản
      const testsRes = await fetch('/api/ielts/tests')
      const testsJson = await testsRes.json()
      if (testsJson.success) {
        setTests(testsJson.data)
      } else {
        throw new Error(testsJson.error?.message || 'Không thể tải đề thi')
      }

      // Tải lịch sử làm bài
      const historyRes = await fetch('/api/ielts/history')
      const historyJson = await historyRes.json()
      if (historyJson.success) {
        setHistory(historyJson.data)
      } else {
        throw new Error(historyJson.error?.message || 'Không thể tải lịch sử làm bài')
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối máy chủ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Lọc danh sách đề thi theo kỹ năng đang chọn
  const filteredTests = tests.filter(test => test.skill === selectedSkill)

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-8 max-w-7xl">
      {/* Banner */}
      <div className="relative rounded-3xl border border-white/10 bg-gradient-to-r from-blue-950/40 via-purple-950/20 to-neutral-900/60 p-6 sm:p-8 overflow-hidden shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        {/* Liquid gradient highlights */}
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-cyan-500/10 blur-[120px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[200px] h-[200px] bg-purple-500/10 blur-[80px] rounded-full -ml-10 -mb-10 pointer-events-none" />

        <div className="space-y-2 relative z-10">
          <span className="text-xs font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full border border-cyan-400/20 w-fit flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> ECODEx Prep IELTS
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Luyện thi IELTS thông minh
          </h1>
          <p className="text-sm text-muted-foreground max-w-[600px] font-medium leading-relaxed">
            Học tập và cọ xát với các dạng đề chuẩn cấu trúc IELTS. Nhận ngay kết quả kiểm tra tự động và bài phân tích Writing chấm bởi Trí tuệ nhân tạo (AI).
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-4 rounded-2xl w-fit relative z-10 shrink-0 self-start sm:self-auto">
          <GraduationCap className="h-10 w-10 text-cyan-400" />
          <div>
            <span className="text-xs text-muted-foreground block font-medium">Hoàn thành luyện tập</span>
            <span className="text-xl font-bold text-foreground">{history.filter(h => h.status === 'graded').length} bài làm</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Bộ Chọn Kỹ Năng */}
      <SkillSelector 
        selectedSkill={selectedSkill} 
        onChangeSkill={setSelectedSkill} 
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-cyan-400 animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Đang chuẩn bị đề thi...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Danh sách đề khả dụng */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-cyan-400" />
              Đề thi luyện tập khả dụng
            </h3>

            {filteredTests.length === 0 ? (
              <div className="glass-card p-12 rounded-2xl border border-white/10 text-center text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Hiện chưa có đề thi luyện tập nào được xuất bản cho kỹ năng này.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTests.map((test) => (
                  <TestCard key={test.id} test={test} />
                ))}
              </div>
            )}
          </div>

          {/* Lịch sử làm bài */}
          <HistoryPanel history={history} />
        </div>
      )}
    </div>
  )
}
