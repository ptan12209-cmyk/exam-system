"use client"

import React from 'react'
import { BookOpen, Headphones, PenTool, Users, FileSpreadsheet, Percent } from 'lucide-react'
import { IeltsTest } from '@/types'

interface IeltsStatsProps {
  tests: IeltsTest[]
  submissionsCount: number
  avgBandScore: number
}

export function IeltsStats({ tests, submissionsCount, avgBandScore }: IeltsStatsProps) {
  const readingCount = tests.filter(t => t.skill === 'reading').length
  const listeningCount = tests.filter(t => t.skill === 'listening').length
  const writingCount = tests.filter(t => t.skill === 'writing').length

  const stats = [
    {
      label: 'Tổng số đề thi',
      value: tests.length,
      icon: FileSpreadsheet,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
      desc: 'Tất cả kỹ năng'
    },
    {
      label: 'Reading / Listening / Writing',
      value: `${readingCount} / ${listeningCount} / ${writingCount}`,
      icon: BookOpen,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      desc: 'Phân loại kỹ năng'
    },
    {
      label: 'Lượt học sinh thi',
      value: submissionsCount,
      icon: Users,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      desc: 'Lượt nộp bài làm'
    },
    {
      label: 'Band score trung bình',
      value: avgBandScore > 0 ? avgBandScore.toFixed(1) : 'N/A',
      icon: Percent,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      desc: 'Điểm quy đổi IELTS'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="liquid-glass p-5 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] transition-all duration-300 flex items-start justify-between relative overflow-hidden group shadow-sm"
        >
          {/* Decorative fluid background on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div>
            <span className="text-xs text-muted-foreground block mb-1 font-medium">{stat.label}</span>
            <span className="text-2xl font-bold tracking-tight text-foreground block">{stat.value}</span>
            <span className="text-xs text-muted-foreground mt-1 block font-medium">{stat.desc}</span>
          </div>

          <div className={`p-3 rounded-[1rem] border ${stat.color} flex items-center justify-center`}>
            <stat.icon className="h-5 w-5" />
          </div>
        </div>
      ))}
    </div>
  )
}
