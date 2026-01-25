"use client"

import { useTheme } from "@/components/ThemeProvider"
import { Button } from "@/components/ui/button"
import { Sun, Moon, Monitor } from "lucide-react"
import { useState, useRef, useEffect } from "react"

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
                aria-label="Chọn giao diện"
            >
                <Sun className="h-5 w-5" />
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
    const { theme, setTheme, resolvedTheme } = useTheme()
    const CurrentIcon = resolvedTheme === "dark" ? Moon : Sun

    return (
        <div className="relative" ref={dropdownRef}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="h-9 w-9 rounded-lg hover:bg-muted"
                aria-label="Chọn giao diện"
            >
                <CurrentIcon className="h-5 w-5 transition-transform duration-300" />
            </Button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-36 rounded-lg border border-border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95 z-50">
                    {themes.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            onClick={() => {
                                setTheme(value)
                                setIsOpen(false)
                            }}
                            className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted ${theme === value ? "bg-muted text-foreground" : "text-muted-foreground"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
