"use client"

import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Monitor, Palette } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { DESIGN_BRAND_META, type DesignBrand } from "@/lib/online-study-theme"

export function ThemeToggle({
    side = "bottom",
    align = "right"
}: {
    side?: "top" | "bottom"
    align?: "left" | "right"
} = {}) {
    const [mounted, setMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const themes = [
        { value: "light" as const, label: "Sáng", icon: Sun },
        { value: "dark" as const, label: "Tối", icon: Moon },
        { value: "system" as const, label: "Hệ thống", icon: Monitor },
    ]

    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg hover:bg-muted"
                aria-label="Cài đặt giao diện"
            >
                <Palette className="h-5 w-5" />
            </Button>
        )
    }

    return (
        <ThemeToggleInner
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            dropdownRef={dropdownRef}
            themes={themes}
            side={side}
            align={align}
        />
    )
}

function ThemeToggleInner({
    isOpen,
    setIsOpen,
    dropdownRef,
    themes,
    side,
    align
}: {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    dropdownRef: React.RefObject<HTMLDivElement | null>
    themes: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun }[]
    side: "top" | "bottom"
    align: "left" | "right"
}) {
    const { theme, setTheme, designTheme, setDesignTheme, resolvedTheme } = useTheme()

    const brandOrder: DesignBrand[] = ["dream", "dol", "swiss"]

    const swatch: Record<DesignBrand, string> = {
        dream: resolvedTheme === "light" ? "#8B5CF6" : "#C18CFF",
        dol: resolvedTheme === "light" ? "#D14242" : "#E05555",
        swiss: resolvedTheme === "light" ? "#E60000" : "#FF2A2A",
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 w-9 rounded-lg hover:bg-muted"
                aria-label="Cài đặt giao diện"
                aria-expanded={isOpen}
            >
                <Palette className={cn("h-5 w-5 transition-transform duration-300", isOpen && "rotate-12")} />
            </Button>

            {isOpen && (
                <div
                    className={cn(
                        "absolute w-56 rounded-2xl border border-border bg-popover p-2 shadow-xl animate-in fade-in-0 zoom-in-95 z-[100] space-y-2",
                        side === "top" ? "bottom-full mb-2" : "top-full mt-2",
                        align === "left" ? "left-0" : "right-0"
                    )}
                    role="menu"
                >
                    <div className="space-y-1">
                        <p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                            Chế độ màu
                        </p>
                        <div className="grid grid-cols-3 gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/10">
                            {themes.map(({ value, icon: Icon, label }) => (
                                <button
                                    key={value}
                                    type="button"
                                    title={label}
                                    onClick={() => setTheme(value)}
                                    className={cn(
                                        "flex justify-center items-center py-1.5 rounded-md transition-all",
                                        theme === value
                                            ? "bg-background text-foreground shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Icon className="h-4 w-4" aria-hidden />
                                    <span className="sr-only">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-border/40 pt-2 space-y-1">
                        <p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                            Thương hiệu
                        </p>
                        <div className="space-y-0.5">
                            {brandOrder.map((value) => {
                                const meta = DESIGN_BRAND_META[value]
                                const active = designTheme === value
                                return (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => {
                                            setDesignTheme(value)
                                            setIsOpen(false)
                                        }}
                                        className={cn(
                                            "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors",
                                            active
                                                ? "bg-muted text-foreground"
                                                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                                        )}
                                        role="menuitemradio"
                                        aria-checked={active}
                                    >
                                        <span
                                            className="h-3.5 w-3.5 shrink-0 rounded-full ring-1 ring-black/10 dark:ring-white/15"
                                            style={{ backgroundColor: swatch[value] }}
                                            aria-hidden
                                        />
                                        <span className="flex min-w-0 flex-col">
                                            <span className="text-xs font-semibold leading-tight">
                                                {meta.label}
                                                {(value === "dream" || value === "dol") && (
                                                    <span className="ml-1 text-[9px] font-medium opacity-60">
                                                        chính
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-[10px] opacity-75 truncate">{meta.desc}</span>
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
