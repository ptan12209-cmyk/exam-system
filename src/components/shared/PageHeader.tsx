import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    subtitle?: string
    backHref?: string
    icon?: LucideIcon
    iconColor?: string
    actions?: React.ReactNode
    className?: string
}

export function PageHeader({
    title,
    subtitle,
    backHref = "/teacher/dashboard",
    icon: Icon,
    iconColor = "text-blue-600 dark:text-blue-400",
    actions,
    className
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8", className)}>
            <div className="flex items-center gap-4">
                <Link href={backHref}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 bg-white dark:bg-slate-800 shadow-sm border border-gray-200 dark:border-slate-700"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {Icon && <Icon className={cn("w-6 h-6", iconColor)} />}
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    )
}
