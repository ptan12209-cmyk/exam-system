"use client"

import React from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from 'recharts'

interface BandScoreChartProps {
  taskAchievement: number
  coherenceCohesion: number
  lexicalResource: number
  grammarAccuracy: number
}

export function BandScoreChart({
  taskAchievement,
  coherenceCohesion,
  lexicalResource,
  grammarAccuracy
}: BandScoreChartProps) {
  const data = [
    { name: 'Task Achievement (TA)', score: taskAchievement },
    { name: 'Coherence & Cohesion (CC)', score: coherenceCohesion },
    { name: 'Lexical Resource (LR)', score: lexicalResource },
    { name: 'Grammar Accuracy (GRA)', score: grammarAccuracy }
  ]

  return (
    <div className="w-full h-[300px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid 
            stroke="rgba(255, 255, 255, 0.1)" 
            strokeOpacity={0.8} 
          />
          <PolarAngleAxis
            dataKey="name"
            tick={{ fill: 'rgba(255, 255, 255, 0.6)', fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 9]}
            tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 10 }}
            tickCount={10} // 0, 1, 2, 3, 4, 5, 6, 7, 8, 9
          />
          <Radar
            name="Điểm thành phần"
            dataKey="score"
            stroke="hsl(33, 100%, 50%)" // Cam sáng
            fill="hsl(33, 100%, 50%)"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(20, 20, 20, 0.9)',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '12px'
            }}
            formatter={(value) => [`Band ${Number(value).toFixed(1)}`, 'Điểm số']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
