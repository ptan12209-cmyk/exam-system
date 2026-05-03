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
    iconColor = "text-[hsl(var(--foreground))]/70",
    iconBgColor = "bg-[hsl(var(--foreground))]/5",
    trend,
    className
}: StatsCardProps) {
    return (
        <div className={cn("liquid-glass rounded-[2rem] p-6 shadow-sm", className)}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="mb-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                        {label}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-semibold text-[hsl(var(--foreground))]">
                            {value}
                        </p>
                        {trend && (
                            <span className={cn(
                                "text-xs font-medium",
                                trend.isPositive
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-red-500 dark:text-red-400"
                            )}>
                                {trend.isPositive ? "+" : ""}{trend.value}%
                            </span>
                        )}
                    </div>
                </div>
                <div className={cn("flex h-12 w-12 items-center justify-center rounded-2xl", iconBgColor)}>
                    <Icon className={cn("h-6 w-6", iconColor)} strokeWidth={1.5} />
                </div>
            </div>
        </div>
    )
}
