"use client"

import React from 'react'
import Link from 'next/link'
import { Clock, HelpCircle, ArrowRight, Play } from 'lucide-react'
import { IeltsTest } from '@/types'

interface TestCardProps {
  test: IeltsTest
}

export function TestCard({ test }: TestCardProps) {
  const getSkillTheme = (skill: string) => {
    switch (skill) {
      case 'reading':
        return {
          btn: 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-cyan-500/20',
          badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
        }
      case 'listening':
        return {
          btn: 'bg-violet-500 hover:bg-violet-400 text-white shadow-violet-500/20',
          badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20'
        }
      default:
        return {
          btn: 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/20',
          badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20'
        }
    }
  }

  const theme = getSkillTheme(test.skill)

  return (
    <div className="glass-card p-5 rounded-2xl border border-white/10 bg-neutral-900/30 hover:border-white/20 transition-all duration-300 flex flex-col justify-between group relative">
      <div className="space-y-3">
        {/* Title & Badge */}
        <div className="flex items-start justify-between gap-3">
          <h4 className="font-bold text-sm sm:text-base text-foreground leading-tight group-hover:text-white transition-colors line-clamp-2">
            {test.title}
          </h4>
        </div>

        {test.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium leading-relaxed">
            {test.description}
          </p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1.5">
          <span className="flex items-center gap-1 font-medium">
            <Clock className="h-3.5 w-3.5 opacity-60" />
            {test.duration} phút
          </span>
          <span className="flex items-center gap-1 font-medium">
            <HelpCircle className="h-3.5 w-3.5 opacity-60" />
            {test.skill === 'writing' ? 'Tự luận' : `${test.total_questions} câu hỏi`}
          </span>
        </div>
      </div>

      {/* Button Action */}
      <div className="pt-5 mt-auto">
        <Link href={`/student/ielts/${test.id}/take`}>
          <button className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 shadow-md active:scale-98 ${theme.btn}`}>
            <Play className="h-3.5 w-3.5 fill-current" />
            Bắt đầu làm bài
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </Link>
      </div>
    </div>
  )
}
