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
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]/60" />
                    <Input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-[hsl(var(--muted))]/10 border-[hsl(var(--border))]/60 text-[hsl(var(--foreground))] focus:ring-1 focus:ring-[hsl(var(--foreground))]/20 rounded-full"
                    />
                </div>
            )}
            {children}
            {showFilter && onFilterClick && (
                <Button
                    variant="outline"
                    size="icon"
                    onClick={onFilterClick}
                    className="shrink-0 border-[hsl(var(--border))]/60 bg-transparent hover:bg-[hsl(var(--muted))]/20 rounded-full"
                >
                    <Filter className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                </Button>
            )}
        </div>
    )
}
