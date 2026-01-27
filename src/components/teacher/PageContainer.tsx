import { cn } from "@/lib/utils"

interface PageContainerProps {
    children: React.ReactNode
    maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl" | "6xl" | "7xl"
    className?: string
}

const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl"
}

export function PageContainer({
    children,
    maxWidth = "7xl",
    className
}: PageContainerProps) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 md:p-8">
            <div className={cn(maxWidthClasses[maxWidth], "mx-auto", className)}>
                {children}
            </div>
        </div>
    )
}
