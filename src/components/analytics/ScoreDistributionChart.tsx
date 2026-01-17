"use client"

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts"

interface ScoreDistributionData {
    range: string
    count: number
}

interface ScoreDistributionChartProps {
    data: ScoreDistributionData[]
}

const COLORS = [
    "hsl(0, 84%, 60%)",      // 0-1: Red
    "hsl(15, 84%, 60%)",     // 1-2: Orange-red
    "hsl(30, 84%, 60%)",     // 2-3: Orange
    "hsl(45, 84%, 60%)",     // 3-4: Yellow-orange
    "hsl(55, 84%, 60%)",     // 4-5: Yellow
    "hsl(75, 70%, 50%)",     // 5-6: Yellow-green
    "hsl(100, 70%, 50%)",    // 6-7: Light green
    "hsl(130, 70%, 50%)",    // 7-8: Green
    "hsl(160, 70%, 50%)",    // 8-9: Teal
    "hsl(180, 70%, 50%)",    // 9-10: Cyan
]

export function ScoreDistributionChart({ data }: ScoreDistributionChartProps) {
    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                        dataKey="range"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                        label={{
                            value: "Số học sinh",
                            angle: -90,
                            position: "insideLeft",
                            fill: "hsl(var(--muted-foreground))"
                        }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: "hsl(var(--popover))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "8px",
                        }}
                        labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                        itemStyle={{ color: "hsl(var(--popover-foreground))" }}
                        formatter={(value) => [`${value} học sinh`, "Số lượng"]}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// Helper function to generate score distribution from submissions
export function generateScoreDistribution(scores: number[]): ScoreDistributionData[] {
    const ranges = ["0-1", "1-2", "2-3", "3-4", "4-5", "5-6", "6-7", "7-8", "8-9", "9-10"]
    const counts = new Array(10).fill(0)

    scores.forEach((score) => {
        const index = Math.min(Math.floor(score), 9)
        counts[index]++
    })

    return ranges.map((range, index) => ({
        range,
        count: counts[index],
    }))
}
