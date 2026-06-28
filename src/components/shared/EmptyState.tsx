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
    iconColor = "text-[hsl(var(--muted-foreground))]/40",
    iconBgColor = "bg-[hsl(var(--muted))]/10",
    className
}: EmptyStateProps) {
    return (
        <div className={cn("rounded-2xl shadow-sm", className)}>
            <div className="p-12 text-center">
                <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4", iconBgColor)}>
                    <Icon className={cn("w-8 h-8", iconColor)} strokeWidth={1.2} />
                </div>
                <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-2">
                    {title}
                </h3>
                <p className="text-[hsl(var(--muted-foreground))] mb-6">
                    {description}
                </p>
                {actionLabel && (onAction || actionHref) && (
                    <Button
                        onClick={onAction}
                        className="bg-[hsl(var(--foreground))] hover:bg-[hsl(var(--foreground))]/90 text-[hsl(var(--background))] rounded-full"
                        asChild={!!actionHref}
                    >
                        {actionHref ? (
                            <a href={actionHref}>{actionLabel}</a>
                        ) : (
                            actionLabel
                        )}
                    </Button>
                )}
            </div>
        </div>
    )
}
