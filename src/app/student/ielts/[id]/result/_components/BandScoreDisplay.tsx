"use client"

import React from 'react'

interface BandScoreDisplayProps {
  score: number
  skill: 'reading' | 'listening' | 'writing'
}

export function BandScoreDisplay({ score, skill }: BandScoreDisplayProps) {
  // Lấy danh giá nhận xét của IELTS dựa trên Band score
  const getIeltsLevel = (band: number) => {
    if (band >= 8.5) return { label: 'Expert User', desc: 'Thông thạo hoàn toàn ngôn ngữ.' }
    if (band >= 7.5) return { label: 'Very Good User', desc: 'Thông thạo tốt ngôn ngữ, xử lý lập luận phức tạp.' }
    if (band >= 6.5) return { label: 'Good User', desc: 'Sử dụng ngôn ngữ hiệu quả, thỉnh thoảng có lỗi nhỏ.' }
    if (band >= 5.5) return { label: 'Competent User', desc: 'Sử dụng ngôn ngữ tạm ổn, hiểu trong tình huống quen thuộc.' }
    if (band >= 4.5) return { label: 'Modest User', desc: 'Có khả năng giao tiếp cơ bản, hay gặp khó khăn.' }
    return { label: 'Limited User', desc: 'Hạn chế nhiều trong việc sử dụng tiếng Anh.' }
  }

  const level = getIeltsLevel(score)

  const getThemeColor = () => {
    switch (skill) {
      case 'reading':
        return {
          stroke: 'stroke-cyan-500',
          text: 'text-cyan-400',
          bg: 'bg-cyan-500/10 border-cyan-500/20'
        }
      case 'listening':
        return {
          stroke: 'stroke-violet-500',
          text: 'text-violet-400',
          bg: 'bg-violet-500/10 border-violet-500/20'
        }
      default:
        return {
          stroke: 'stroke-orange-500',
          text: 'text-orange-400',
          bg: 'bg-orange-500/10 border-orange-500/20'
        }
    }
  }

  const theme = getThemeColor()

  // SVG parameters for circle gauge
  const radius = 50
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 9) * circumference

  return (
    <div className={`p-6 rounded-[2rem] border flex flex-col items-center justify-center text-center ${theme.bg} shadow-sm`}>
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Kết quả IELTS Overall</span>

      {/* SVG Circle Gauge */}
      <div className="relative h-32 w-32 flex items-center justify-center mb-4">
        <svg className="absolute inset-0 transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            className="stroke-[hsl(var(--border))]/30"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="transparent"
            className={`${theme.stroke} transition-all duration-1000 ease-out`}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Display Text inside Gauge */}
        <div className="flex flex-col items-center">
          <span className={`text-3xl font-extrabold tracking-tight ${theme.text}`}>
            {score.toFixed(1)}
          </span>
          <span className="text-[9px] text-muted-foreground font-semibold uppercase">Band Score</span>
        </div>
      </div>

      <h4 className="font-extrabold text-sm text-foreground">{level.label}</h4>
      <p className="text-[11px] text-muted-foreground mt-1 max-w-[200px] leading-relaxed">
        {level.desc}
      </p>
    </div>
  )
}
