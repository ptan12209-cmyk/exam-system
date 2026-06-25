"use client"

import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Monitor, Settings } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
    const [mounted, setMounted] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Only access theme context after mount
    useEffect(() => {
        setMounted(true)
    }, [])

    // Close dropdown when clicking outside
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

    // Show placeholder while not mounted
    if (!mounted) {
        return (
            <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-lg hover:bg-muted"
                aria-label="Cài đặt giao diện"
            >
                <Settings className="h-5 w-5" />
            </Button>
        )
    }

    // Now safe to use the hook
    return <ThemeToggleInner isOpen={isOpen} setIsOpen={setIsOpen} dropdownRef={dropdownRef} themes={themes} />
}

function ThemeToggleInner({
    isOpen,
    setIsOpen,
    dropdownRef,
    themes
}: {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    dropdownRef: React.RefObject<HTMLDivElement | null>
    themes: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun }[]
}) {
    const { theme, setTheme, designTheme, setDesignTheme } = useTheme()

    const designThemes = [
        { value: "dream" as const, label: "🌌 Dream Engine", desc: "Obsidian & Violet" },
        { value: "swiss" as const, label: "🇨🇭 Swiss Grid", desc: "Alpine & Red" },
        { value: "dol" as const, label: "🎓 DOL English", desc: "LMS & Crimson" }
    ]

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 w-9 rounded-lg hover:bg-muted"
                aria-label="Cài đặt giao diện"
            >
                <Settings className={cn("h-5 w-5 transition-transform duration-300", isOpen && "rotate-45")} />
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-border bg-popover p-2 shadow-xl animate-in fade-in-0 zoom-in-95 z-[100] space-y-2">
                    <div className="space-y-1">
                        <p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Chế độ màu</p>
                        <div className="grid grid-cols-3 gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/10">
                            {themes.map(({ value, icon: Icon, label }) => (
                                <button
                                    key={value}
                                    title={label}
                                    onClick={() => setTheme(value)}
                                    className={`flex justify-center items-center py-1.5 rounded-md transition-all ${theme === value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="border-t border-border/40 pt-2 space-y-1">
                        <p className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Thiết kế</p>
                        <div className="space-y-0.5">
                            {designThemes.map(({ value, label, desc }) => (
                                <button
                                    key={value}
                                    onClick={() => {
                                        setDesignTheme(value)
                                        setIsOpen(false)
                                    }}
                                    className={`flex w-full flex-col items-start rounded-xl px-2.5 py-1.5 text-left transition-colors hover:bg-muted/80 ${designTheme === value ? "bg-muted text-foreground" : "text-muted-foreground"}`}
                                >
                                    <span className="text-xs font-semibold">{label}</span>
                                    <span className="text-[10px] opacity-75">{desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
