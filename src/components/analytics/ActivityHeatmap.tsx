"use client"

import { useMemo } from "react"
import { format, eachDayOfInterval, subMonths, startOfDay } from "date-fns"
import { vi } from "date-fns/locale"

interface ActivityData {
    date: string
    count: number
}

interface ActivityHeatmapProps {
    data: ActivityData[]
}

function getIntensityClass(count: number): string {
    if (count === 0) return "bg-muted"
    if (count === 1) return "bg-green-500/30"
    if (count === 2) return "bg-green-500/50"
    if (count === 3) return "bg-green-500/70"
    return "bg-green-500"
}

export function ActivityHeatmap({ data }: ActivityHeatmapProps) {
    const today = startOfDay(new Date())
    const startDate = subMonths(today, 6)

    // Create a map for quick lookup
    const activityMap = useMemo(() => {
        const map = new Map<string, number>()
        data.forEach((item) => {
            map.set(item.date, item.count)
        })
        return map
    }, [data])

    // Generate all dates in range
    const allDates = useMemo(() => {
        return eachDayOfInterval({ start: startDate, end: today })
    }, [startDate, today])

    // Group by week
    const weeks = useMemo(() => {
        const result: Date[][] = []
        let currentWeek: Date[] = []

        allDates.forEach((date) => {
            if (currentWeek.length === 7) {
                result.push(currentWeek)
                currentWeek = []
            }
            currentWeek.push(date)
        })

        if (currentWeek.length > 0) {
            result.push(currentWeek)
        }

        return result
    }, [allDates])

    const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

    return (
        <div className="w-full overflow-x-auto scroll-touch">
            <div className="min-w-[600px] p-4">
                {/* Month labels */}
                <div className="flex mb-2 ml-8">
                    {weeks.map((week, weekIndex) => {
                        const firstDay = week[0]
                        const showLabel = weekIndex === 0 || firstDay.getDate() <= 7
                        return (
                            <div key={weekIndex} className="w-3 mx-[2px] text-xs text-muted-foreground">
                                {showLabel && weekIndex % 4 === 0 ? format(firstDay, "MMM", { locale: vi }) : ""}
                            </div>
                        )
                    })}
                </div>

                {/* Grid */}
                <div className="flex">
                    {/* Day labels */}
                    <div className="flex flex-col justify-around mr-2 text-xs text-muted-foreground">
                        {dayLabels.map((day, i) => (
                            <span key={i} className="h-3 leading-3">{i % 2 === 0 ? day : ""}</span>
                        ))}
                    </div>

                    {/* Heatmap grid */}
                    <div className="flex gap-[2px]">
                        {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-[2px]">
                                {Array.from({ length: 7 }).map((_, dayIndex) => {
                                    const date = week[dayIndex]
                                    if (!date) {
                                        return <div key={dayIndex} className="w-3 h-3" />
                                    }

                                    const dateStr = format(date, "yyyy-MM-dd")
                                    const count = activityMap.get(dateStr) || 0

                                    return (
                                        <div
                                            key={dayIndex}
                                            className={`w-3 h-3 rounded-sm cursor-pointer transition-all hover:ring-2 hover:ring-ring ${getIntensityClass(count)}`}
                                            title={`${format(date, "dd/MM/yyyy", { locale: vi })}: ${count} bài thi`}
                                        />
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
                    <span>Ít</span>
                    <div className="flex gap-1">
                        <div className="w-3 h-3 rounded-sm bg-muted" />
                        <div className="w-3 h-3 rounded-sm bg-green-500/30" />
                        <div className="w-3 h-3 rounded-sm bg-green-500/50" />
                        <div className="w-3 h-3 rounded-sm bg-green-500/70" />
                        <div className="w-3 h-3 rounded-sm bg-green-500" />
                    </div>
                    <span>Nhiều</span>
                </div>
            </div>
        </div>
    )
}

// Helper function to generate activity data from submissions
export function generateActivityData(
    submissions: Array<{ submitted_at: string }>
): ActivityData[] {
    const countMap = new Map<string, number>()

    submissions.forEach((sub) => {
        const date = format(new Date(sub.submitted_at), "yyyy-MM-dd")
        countMap.set(date, (countMap.get(date) || 0) + 1)
    })

    return Array.from(countMap.entries()).map(([date, count]) => ({
        date,
        count,
    }))
}
