"use client"

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts"
import { format } from "date-fns"
import { vi } from "date-fns/locale"

interface ProgressData {
    date: string
    score: number
    examTitle?: string
}

interface ProgressLineChartProps {
    data: ProgressData[]
}

export function ProgressLineChart({ data }: ProgressLineChartProps) {
    const formattedData = data.map((item) => ({
        ...item,
        displayDate: format(new Date(item.date), "dd/MM", { locale: vi }),
        fullDate: format(new Date(item.date), "dd/MM/yyyy", { locale: vi }),
    }))

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={formattedData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                        dataKey="displayDate"
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <YAxis
                        domain={[0, 10]}
                        tick={{ fill: "hsl(var(--muted-foreground))" }}
                        tickLine={{ stroke: "hsl(var(--border))" }}
                        label={{
                            value: "Điểm",
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
                        formatter={(value) => [`${Number(value).toFixed(1)} điểm`, "Điểm số"]}
                    />
                    <Legend />
                    <Line
                        type="monotone"
                        dataKey="score"
                        name="Điểm số"
                        stroke="hsl(217, 91%, 60%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(217, 91%, 60%)", strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, fill: "hsl(217, 91%, 70%)" }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
