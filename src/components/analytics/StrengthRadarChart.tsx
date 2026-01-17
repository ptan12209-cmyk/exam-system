"use client"

import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
    Legend,
    Tooltip
} from "recharts"

interface StrengthData {
    subject: string
    score: number
    fullMark: number
}

interface StrengthRadarChartProps {
    data: StrengthData[]
}

export function StrengthRadarChart({ data }: StrengthRadarChartProps) {
    return (
        <div className="w-full h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
                    <PolarGrid
                        stroke="hsl(var(--border))"
                        strokeOpacity={0.5}
                    />
                    <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                        angle={90}
                        domain={[0, 10]}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickCount={6}
                    />
                    <Radar
                        name="Điểm trung bình"
                        dataKey="score"
                        stroke="hsl(217, 91%, 60%)"
                        fill="hsl(217, 91%, 60%)"
                        fillOpacity={0.4}
                        strokeWidth={2}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                        }}
                        formatter={(value) => [`${Number(value).toFixed(1)} điểm`, "Điểm TB"]}
                    />
                    <Legend />
                </RadarChart>
            </ResponsiveContainer>
        </div>
    )
}

// Subject mapping
const SUBJECT_LABELS: Record<string, string> = {
    math: "Toán",
    physics: "Vật Lý",
    chemistry: "Hóa Học",
    english: "Tiếng Anh",
    literature: "Văn",
    biology: "Sinh Học",
    history: "Lịch Sử",
    geography: "Địa Lý",
    other: "Khác",
}

// Helper function to calculate strength by subject
export function calculateStrengthBySubject(
    submissions: Array<{ score: number; exam?: { subject?: string } }>
): StrengthData[] {
    const subjectScores: Map<string, number[]> = new Map()

    submissions.forEach((sub) => {
        const subject = sub.exam?.subject || "other"
        if (!subjectScores.has(subject)) {
            subjectScores.set(subject, [])
        }
        subjectScores.get(subject)!.push(sub.score)
    })

    return Array.from(subjectScores.entries()).map(([subject, scores]) => ({
        subject: SUBJECT_LABELS[subject] || subject,
        score: scores.reduce((a, b) => a + b, 0) / scores.length,
        fullMark: 10,
    }))
}
