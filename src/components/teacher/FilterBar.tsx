import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter } from "lucide-react"
import { cn } from "@/lib/utils"

interface FilterBarProps {
    searchValue?: string
    onSearchChange?: (value: string) => void
    searchPlaceholder?: string
    onFilterClick?: () => void
    showFilter?: boolean
    className?: string
    children?: React.ReactNode
}

export function FilterBar({
    searchValue = "",
    onSearchChange,
    searchPlaceholder = "Tìm kiếm...",
    onFilterClick,
    showFilter = true,
    className,
    children
}: FilterBarProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            {onSearchChange && (
                <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <Input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            )}
            {children}
            {showFilter && onFilterClick && (
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onFilterClick}
                    className="shrink-0 border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                >
                    <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </Button>
            )}
        </div>
    )
}
