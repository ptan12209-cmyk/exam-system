import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
    icon: LucideIcon
    title: string
    description: string
    actionLabel?: string
    onAction?: () => void
    actionHref?: string
    iconColor?: string
    iconBgColor?: string
    className?: string
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    actionHref,
    iconColor = "text-gray-300 dark:text-gray-500",
    iconBgColor = "bg-gray-50 dark:bg-slate-800",
    className
}: EmptyStateProps) {
    return (
        <Card className={cn("border-gray-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900", className)}>
            <CardContent className="p-12 text-center">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", iconBgColor)}>
                    <Icon className={cn("w-8 h-8", iconColor)} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                    {description}
                </p>
                {actionLabel && (onAction || actionHref) && (
                    <Button
                        onClick={onAction}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        asChild={!!actionHref}
                    >
                        {actionHref ? (
                            <a href={actionHref}>{actionLabel}</a>
                        ) : (
                            actionLabel
                        )}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
