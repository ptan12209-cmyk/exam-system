import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
    label: string
    value: string | number
    icon: LucideIcon
    iconColor?: string
    iconBgColor?: string
    trend?: {
        value: number
        isPositive: boolean
    }
    className?: string
}

export function StatsCard({
    label,
    value,
    icon: Icon,
    iconColor = "text-blue-600 dark:text-blue-400",
    iconBgColor = "bg-blue-50 dark:bg-blue-900/20",
    trend,
    className
}: StatsCardProps) {
    return (
        <Card className={cn("border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-2">
                            {label}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-gray-800 dark:text-white">
                                {value}
                            </p>
                            {trend && (
                                <span className={cn(
                                    "text-xs font-medium",
                                    trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                )}>
                                    {trend.isPositive ? "+" : ""}{trend.value}%
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBgColor)}>
                        <Icon className={cn("w-6 h-6", iconColor)} />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
