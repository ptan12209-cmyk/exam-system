"use client"

import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react"
import type { DesignBrand } from "@/lib/online-study-theme"

type Theme = "dark" | "light" | "system"
/** @deprecated Use DesignBrand from online-study-theme */
export type DesignTheme = DesignBrand

const DESIGN_THEMES: DesignBrand[] = ["dream", "dol", "swiss"]

function isDesignTheme(v: string | null): v is DesignBrand {
    return v === "dream" || v === "dol" || v === "swiss"
}

interface ThemeContextType {
    theme: Theme
    setTheme: (theme: Theme) => void
    resolvedTheme: "dark" | "light"
    designTheme: DesignBrand
    setDesignTheme: (theme: DesignBrand) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

function getSystemTheme(): "dark" | "light" {
    if (typeof window === "undefined") return "dark"
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyDocumentTheme(mode: Theme, brand: DesignBrand): "dark" | "light" {
    const root = document.documentElement
    const resolved = mode === "system" ? getSystemTheme() : mode

    root.classList.remove("light", "dark")
    root.classList.add(resolved)

    root.classList.remove("theme-dream", "theme-swiss", "theme-dol")
    root.classList.add(`theme-${brand}`)
    root.dataset.design = brand
    root.dataset.mode = resolved

    // Keep meta theme-color roughly in sync with brand surface
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
        const bg = getComputedStyle(root).getPropertyValue("--os-bg").trim()
        if (bg) meta.setAttribute("content", bg)
    }

    return resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setThemeState] = useState<Theme>("system")
    const [designTheme, setDesignThemeState] = useState<DesignBrand>("dream")
    const [resolvedTheme, setResolvedTheme] = useState<"dark" | "light">("dark")
    const [mounted, setMounted] = useState(false)

    const themeRef = useRef(theme)
    const designThemeRef = useRef(designTheme)
    useEffect(() => {
        themeRef.current = theme
        designThemeRef.current = designTheme
    }, [theme, designTheme])

    const applyTheme = useCallback((mode: Theme, brand: DesignBrand) => {
        const resolved = applyDocumentTheme(mode, brand)
        setResolvedTheme(resolved)
    }, [])

    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme)
        localStorage.setItem("theme", newTheme)
        applyTheme(newTheme, designThemeRef.current)
    }, [applyTheme])

    const setDesignTheme = useCallback((newBrand: DesignBrand) => {
        if (!DESIGN_THEMES.includes(newBrand)) return
        setDesignThemeState(newBrand)
        localStorage.setItem("design-theme", newBrand)
        applyTheme(themeRef.current, newBrand)
    }, [applyTheme])

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as Theme | null
        const initialTheme: Theme =
            savedTheme === "light" || savedTheme === "dark" || savedTheme === "system"
                ? savedTheme
                : "system"
        setThemeState(initialTheme)

        const savedBrand = localStorage.getItem("design-theme")
        const initialBrand: DesignBrand = isDesignTheme(savedBrand) ? savedBrand : "dream"
        setDesignThemeState(initialBrand)

        applyTheme(initialTheme, initialBrand)
        setMounted(true)

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
        const handleChange = () => {
            if (themeRef.current === "system") {
                applyTheme("system", designThemeRef.current)
            }
        }
        mediaQuery.addEventListener("change", handleChange)
        return () => mediaQuery.removeEventListener("change", handleChange)
    }, [applyTheme])

    useEffect(() => {
        if (mounted) {
            applyTheme(theme, designTheme)
        }
    }, [theme, designTheme, mounted, applyTheme])

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
