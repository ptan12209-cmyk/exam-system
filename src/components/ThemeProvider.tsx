"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: "dark" | "light"
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system")
    const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark")
    const [mounted, setMounted] = useState(false)

    // Get system preference
    const getSystemTheme = (): "dark" | "light" => {
        if (typeof window === "undefined") return "dark"
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }

    // Apply theme to document
    const applyTheme = (theme: Theme) => {
        const root = document.documentElement
        const resolved = theme === "system" ? getSystemTheme() : theme

        root.classList.remove("light", "dark")
        root.classList.add(resolved)
        setResolvedTheme(resolved)
    }

    // Set theme and persist
    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem("theme", newTheme)
        applyTheme(newTheme)
    }

    // Initialize on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as Theme | null
        const initialTheme = savedTheme || "system"
        setThemeState(initialTheme)
        applyTheme(initialTheme)
        setMounted(true)

        // Listen for system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handleChange = () => {
            if (theme === "system") {
                applyTheme("system")
            }
        }
        mediaQuery.addEventListener("change", handleChange)
        return () => mediaQuery.removeEventListener("change", handleChange)
    }, [])

    // Re-apply when theme state changes
    useEffect(() => {
        if (mounted) {
            applyTheme(theme)
        }
    }, [theme, mounted])

    // Prevent hydration mismatch
    if (!mounted) {
        return <>{children}</>
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider")
    }
    return context
}
