"use client"

import React, { useState } from 'react'
import { Sparkles, MessageSquare, Award, BookOpen, PenTool, CheckCircle } from 'lucide-react'
import { IeltsWritingScore } from '@/types'
import { BandScoreChart } from '../../../_components/BandScoreChart'

interface WritingResultProps {
  scoreDetail: IeltsWritingScore
  essayContent: string
}

export function WritingResult({ scoreDetail, essayContent }: WritingResultProps) {
  const [activeTab, setActiveTab] = useState<'essay' | 'sample'>('essay')

  // Cấu hình các tiêu chí để map nội dung phản hồi
  const criteria = [
    {
      title: 'Task Achievement (TA)',
      score: scoreDetail.task_achievement,
      feedback: scoreDetail.feedback_task,
      color: 'border-orange-500/20 bg-orange-500/5 text-orange-400'
    },
    {
      title: 'Coherence & Cohesion (CC)',
      score: scoreDetail.coherence_cohesion,
      feedback: scoreDetail.feedback_coherence,
      color: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400'
    },
    {
      title: 'Lexical Resource (LR)',
      score: scoreDetail.lexical_resource,
      feedback: scoreDetail.feedback_lexical,
      color: 'border-purple-500/20 bg-purple-500/5 text-purple-400'
    },
    {
      title: 'Grammar Accuracy (GRA)',
      score: scoreDetail.grammar_accuracy,
      feedback: scoreDetail.feedback_grammar,
      color: 'border-blue-500/20 bg-blue-500/5 text-blue-400'
    }
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Cột Trái: Biểu đồ Radar + Phân tích feedback của AI (lg:col-span-7) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="p-6 rounded-[2rem] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Award className="h-4.5 w-4.5 text-orange-400" /> Điểm số thành phần
            </h3>
            <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 px-2.5 py-0.5 rounded-full border border-orange-500/20">
              AI Grader: {scoreDetail.ai_model}
            </span>
          </div>

          <BandScoreChart
            taskAchievement={Number(scoreDetail.task_achievement)}
            coherenceCohesion={Number(scoreDetail.coherence_cohesion)}
            lexicalResource={Number(scoreDetail.lexical_resource)}
            grammarAccuracy={Number(scoreDetail.grammar_accuracy)}
          />
        </div>

        {/* Danh sách nhận xét theo từng tiêu chí */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider pl-1">Phân tích chi tiết lỗi sai và từ vựng</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {criteria.map((c, idx) => (
              <div 
                key={idx}
                className={`p-4 rounded-2xl border flex flex-col justify-between ${c.color}`}
              >
                <div>
                  <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/20 pb-2 mb-2">
                    <span className="font-bold text-xs">{c.title}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-black/25 text-xs font-black">
                      Band {Number(c.score).toFixed(1)}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {c.feedback || 'Không có nhận xét chi tiết.'}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Lời khuyên tổng quan */}
          {scoreDetail.feedback_overall && (
            <div className="p-5 rounded-[2rem] border border-cyan-500/20 bg-cyan-500/5 space-y-3 shadow-sm">
              <div className="flex items-center gap-1.5 text-cyan-400 border-b border-[hsl(var(--border))]/20 pb-2.5">
                <Sparkles className="h-4.5 w-4.5" />
                <span className="text-xs font-extrabold uppercase">Nhận xét tổng thể & Lời khuyên cải thiện</span>
              </div>
              
              <div className="text-xs leading-relaxed text-muted-foreground whitespace-pre-line">
                {scoreDetail.feedback_overall}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cột Phải: Xem bài làm của học sinh VS Bài luận mẫu đạt band 7.5+ (lg:col-span-5) */}
      <div className="lg:col-span-5 flex flex-col">
        <div className="border border-[hsl(var(--border))]/60 rounded-[2rem] p-5 bg-[hsl(var(--card))] h-full flex flex-col justify-between min-h-[500px] shadow-sm">
          <div className="space-y-4 flex-1 flex flex-col">
            {/* Tab select between student essay and model sample */}
            <div className="flex bg-[hsl(var(--muted))]/20 p-1 rounded-full border border-[hsl(var(--border))]/25 self-start">
              <button
                onClick={() => setActiveTab('essay')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  activeTab === 'essay' ? 'bg-orange-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Bài làm của bạn
              </button>
              
              {scoreDetail.sample_answer && (
                <button
                  onClick={() => setActiveTab('sample')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeTab === 'sample' ? 'bg-orange-500 text-white shadow-md' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Bài viết mẫu 7.5+
                </button>
              )}
            </div>

            {/* Display Content */}
            <div className="flex-1 overflow-y-auto max-h-[420px] rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))]/60 p-4 text-sm leading-relaxed whitespace-pre-wrap select-none text-foreground">
              {activeTab === 'essay' ? (
                essayContent
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-full w-fit border border-emerald-500/25 font-bold uppercase">
                    <CheckCircle className="w-3.5 h-3.5" /> High Band Answer (Band 7.5+)
                  </div>
                  <div className="text-muted-foreground italic">
                    {scoreDetail.sample_answer}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-right text-xs text-muted-foreground pt-4 border-t border-[hsl(var(--border))]/25">
            {activeTab === 'essay' ? (
              `${essayContent.trim().split(/\s+/).filter(Boolean).length} từ`
            ) : (
              `${scoreDetail.sample_answer?.trim().split(/\s+/).filter(Boolean).length || 0} từ`
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
