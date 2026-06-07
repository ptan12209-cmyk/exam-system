"use client"

import React from 'react'
import Link from 'next/link'
import { Calendar, Eye, FileText, CheckCircle, Clock } from 'lucide-react'
import { IeltsHistoryItem } from '@/types'
import { formatTimeSpentShort } from '@/lib/format'

interface HistoryPanelProps {
  history: IeltsHistoryItem[]
}

export function HistoryPanel({ history }: HistoryPanelProps) {
  const getSkillLabel = (skill: string) => {
    switch (skill) {
      case 'reading': return 'Reading'
      case 'listening': return 'Listening'
      case 'writing': return 'Writing'
      default: return skill
    }
  }

  const getStatusDisplay = (item: IeltsHistoryItem) => {
    if (item.status === 'in_progress') {
      return <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">Đang làm</span>
    }
    if (item.status === 'submitted' && item.skill === 'writing') {
      return <span className="text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold animate-pulse">Đang chấm AI</span>
    }
    return <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">Đã hoàn thành</span>
  }


  return (
    <div className="rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] overflow-hidden shadow-sm">
      <div className="p-4 border-b border-[hsl(var(--border))]/20 flex items-center gap-2">
        <CheckCircle className="h-4.5 w-4.5 text-cyan-400" />
        <h3 className="text-sm font-bold text-foreground">Lịch sử làm bài gần đây</h3>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-2 opacity-35" />
          <p className="text-xs">Bạn chưa làm bài test IELTS nào. Hãy chọn kỹ năng phía trên và thử sức ngay!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[hsl(var(--border))]/10 text-muted-foreground bg-[hsl(var(--muted))]/10">
                <th className="p-4 font-semibold">Tên đề thi</th>
                <th className="p-4 font-semibold text-center">Kỹ năng</th>
                <th className="p-4 font-semibold text-center">Kết quả</th>
                <th className="p-4 font-semibold text-center">Thời gian</th>
                <th className="p-4 font-semibold text-center">Trạng thái</th>
                <th className="p-4 font-semibold text-center">Ngày nộp</th>
                <th className="p-4 font-semibold text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[hsl(var(--border))]/10">
              {history.map((sub) => (
                <tr key={sub.id} className="hover:bg-[hsl(var(--muted))]/5 transition-colors">
                  <td className="p-4">
                    <span className="font-semibold text-foreground block line-clamp-1">
                      {sub.test_title}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-0.5 rounded-md font-bold uppercase text-[9px] ${
                      sub.skill === 'reading' 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                        : sub.skill === 'listening'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {getSkillLabel(sub.skill)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    {sub.status === 'graded' && sub.band_score !== null ? (
                      <span className="font-bold text-sm text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-2.5 py-1 rounded-full">
                        Band {sub.band_score.toFixed(1)}
                      </span>
                    ) : sub.skill !== 'writing' && sub.status === 'graded' ? (
                      <span className="text-muted-foreground">{sub.correct_count}/{sub.total_questions} câu</span>
                    ) : (
                      <span className="text-muted-foreground italic">Đang chờ...</span>
                    )}
                  </td>
                  <td className="p-4 text-center font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 opacity-60" />
                      {formatTimeSpentShort(sub.time_spent)}
                    </span>
                  </td>
                  <td className="p-4 text-center">{getStatusDisplay(sub)}</td>
                  <td className="p-4 text-center text-muted-foreground font-medium">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 opacity-60" />
                      {new Date(sub.submitted_at).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link
                      href={`/student/ielts/${sub.test_id}/result?submissionId=${sub.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-[hsl(var(--border))]/70 bg-transparent hover:border-cyan-500/35 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all font-semibold text-[11px]"
                    >
                      <Eye className="w-3.5 h-3.5" /> Xem bài làm
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
