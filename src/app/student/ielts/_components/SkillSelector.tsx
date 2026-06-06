"use client"

import React from 'react'
import { BookOpen, Headphones, PenTool } from 'lucide-react'
import { motion } from 'framer-motion'
import { IeltsSkill } from '@/types'

interface SkillSelectorProps {
  selectedSkill: IeltsSkill
  onChangeSkill: (skill: IeltsSkill) => void
}

export function SkillSelector({ selectedSkill, onChangeSkill }: SkillSelectorProps) {
  const skills = [
    {
      value: 'reading' as IeltsSkill,
      label: 'Reading Practice',
      description: 'Luyện tập kỹ năng Đọc hiểu văn bản học thuật',
      icon: BookOpen,
      color: 'from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30 glow-cyan',
      dotColor: 'bg-cyan-400'
    },
    {
      value: 'listening' as IeltsSkill,
      label: 'Listening Practice',
      description: 'Luyện tập kỹ năng Nghe hiểu bài hội thoại, độc thoại',
      icon: Headphones,
      color: 'from-purple-500/20 to-violet-500/20 text-violet-400 border-violet-500/30 glow-purple',
      dotColor: 'bg-violet-400'
    },
    {
      value: 'writing' as IeltsSkill,
      label: 'Writing Practice',
      description: 'Luyện tập kỹ năng Viết và nhận phản hồi chi tiết từ AI',
      icon: PenTool,
      color: 'from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/30 glow-orange',
      dotColor: 'bg-orange-400'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {skills.map((skill) => {
        const Icon = skill.icon
        const isSelected = selectedSkill === skill.value

        return (
          <motion.div
            key={skill.value}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChangeSkill(skill.value)}
            className={`glass-card p-5 rounded-2xl border cursor-pointer relative overflow-hidden transition-all duration-300 flex flex-col justify-between ${
              isSelected 
                ? `${skill.color} border-current shadow-lg ring-1 ring-white/10` 
                : 'border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 hover:border-white/20'
            }`}
          >
            {/* Active Glow Dot */}
            {isSelected && (
              <span className={`absolute top-4 right-4 h-2 w-2 rounded-full ${skill.dotColor} animate-ping`} />
            )}

            <div className="space-y-4">
              <div className={`p-3.5 rounded-xl border w-fit ${
                isSelected 
                  ? 'bg-black/20 border-white/10 text-current' 
                  : 'bg-white/5 border-white/5 text-muted-foreground'
              }`}>
                <Icon className="h-6 w-6" />
              </div>

              <div>
                <h3 className={`text-base font-bold tracking-tight mb-1.5 ${isSelected ? 'text-white' : 'text-foreground'}`}>
                  {skill.label}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {skill.description}
                </p>
              </div>
            </div>
            
            <div className="pt-4 mt-auto flex items-center justify-end">
              <span className="text-[10px] font-bold tracking-wider uppercase opacity-75">
                {isSelected ? 'Đang chọn' : 'Luyện ngay'} &rarr;
              </span>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
