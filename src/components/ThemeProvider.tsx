"use client"

import { createContext, useContext, useEffect, useState, useRef } from "react"

type Theme = "dark" | "light" | "system"
type DesignTheme = "dream" | "swiss" | "dol"

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: "dark" | "light"
    designTheme: DesignTheme
    setDesignTheme: (theme: DesignTheme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system")
    const [designTheme, setDesignThemeState] = useState<DesignTheme>("dream")
    const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark")
    const [mounted, setMounted] = useState(false)

    const themeRef = useRef(theme)
    const designThemeRef = useRef(designTheme)
    useEffect(() => {
        themeRef.current = theme
        designThemeRef.current = designTheme
    }, [theme, designTheme])

    // Get system preference
    const getSystemTheme = (): "dark" | "light" => {
        if (typeof window === "undefined") return "dark"
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    }

    // Apply theme to document
    const applyTheme = (theme: Theme, dTheme: DesignTheme) => {
        const root = document.documentElement
        const resolved = theme === "system" ? getSystemTheme() : theme

        root.classList.remove("light", "dark")
        root.classList.add(resolved)
        setResolvedTheme(resolved)

        // Apply design theme classes
        root.classList.remove("theme-dream", "theme-swiss", "theme-dol")
        root.classList.add(`theme-${dTheme}`)
    }

    // Set theme and persist
    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem("theme", newTheme)
        applyTheme(newTheme, designTheme)
    }

    // Set design theme and persist
    const setDesignTheme = (newDTheme: DesignTheme) => {
        setDesignThemeState(newDTheme)
        localStorage.setItem("design-theme", newDTheme)
        applyTheme(theme, newDTheme)
    }

    // Initialize on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as Theme | null
        const initialTheme = savedTheme || "system"
        setThemeState(initialTheme)

        const savedDTheme = localStorage.getItem("design-theme") as DesignTheme | null
        const initialDTheme = savedDTheme || "dream"
        setDesignThemeState(initialDTheme)

        applyTheme(initialTheme, initialDTheme)
        setMounted(true)

        // Listen for system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handleChange = () => {
            if (themeRef.current === "system") {
                applyTheme("system", designThemeRef.current)
            }
        }
        mediaQuery.addEventListener("change", handleChange)
        return () => mediaQuery.removeEventListener("change", handleChange)
    }, [])

    // Re-apply when theme state changes
    useEffect(() => {
        if (mounted) {
            applyTheme(theme, designTheme)
        }
    }, [theme, designTheme, mounted])

    // Prevent hydration mismatch
    if (!mounted) {
        return <>{children}</>
    }

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, designTheme, setDesignTheme }}>
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
