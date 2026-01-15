"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"

type ViolationType = "tab_switch" | "fullscreen_exit" | "copy_attempt"

interface Violation {
    type: ViolationType
    timestamp: string
}

interface AntiCheatContextType {
    violations: Violation[]
    tabSwitches: number
    fullscreenExits: number
    copyAttempts: number
    totalViolations: number
    isFullscreen: boolean
    warningVisible: boolean
    warningMessage: string
    enterFullscreen: () => Promise<void>
    dismissWarning: () => void
    getViolationData: () => {
        tab_switches: number
        fullscreen_exits: number
        copy_attempts: number
        violations: Violation[]
    }
}

const AntiCheatContext = createContext<AntiCheatContextType | null>(null)

const MAX_VIOLATIONS = 3

export function AntiCheatProvider({
    children,
    onMaxViolations,
    onViolation,
    enabled = true
}: {
    children: ReactNode
    onMaxViolations?: () => void
    onViolation?: (type: ViolationType, count: number) => void
    enabled?: boolean
}) {
    const [violations, setViolations] = useState<Violation[]>([])
    const [tabSwitches, setTabSwitches] = useState(0)
    const [fullscreenExits, setFullscreenExits] = useState(0)
    const [copyAttempts, setCopyAttempts] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [warningVisible, setWarningVisible] = useState(false)
    const [warningMessage, setWarningMessage] = useState("")

    const totalViolations = tabSwitches + fullscreenExits

    const addViolation = useCallback((type: ViolationType, message: string) => {
        if (!enabled) return

        const violation: Violation = {
            type,
            timestamp: new Date().toISOString()
        }

        setViolations(prev => [...prev, violation])

        let newCount = 0
        if (type === "tab_switch") {
            setTabSwitches(prev => {
                newCount = prev + 1
                return newCount
            })
        } else if (type === "fullscreen_exit") {
            setFullscreenExits(prev => {
                newCount = prev + 1
                return newCount
            })
        } else if (type === "copy_attempt") {
            setCopyAttempts(prev => {
                newCount = prev + 1
                return newCount
            })
        }

        // Notify parent for session tracking
        if (onViolation) {
            onViolation(type, tabSwitches + fullscreenExits + 1)
        }

        // Show warning
        setWarningMessage(message)
        setWarningVisible(true)
    }, [enabled, onViolation, tabSwitches, fullscreenExits])

    // Check if max violations reached
    useEffect(() => {
        if (totalViolations >= MAX_VIOLATIONS && onMaxViolations) {
            onMaxViolations()
        }
    }, [totalViolations, onMaxViolations])

    // Tab visibility detection
    useEffect(() => {
        if (!enabled) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                const newCount = tabSwitches + fullscreenExits + 1
                addViolation(
                    "tab_switch",
                    `⚠️ Cảnh báo ${newCount}/${MAX_VIOLATIONS}: Bạn đã chuyển tab! Nếu vi phạm ${MAX_VIOLATIONS - newCount} lần nữa, bài sẽ tự động nộp.`
                )
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, [enabled, tabSwitches, fullscreenExits, addViolation])

    // Fullscreen detection
    useEffect(() => {
        if (!enabled) return

        const handleFullscreenChange = () => {
            const isNowFullscreen = !!document.fullscreenElement
            setIsFullscreen(isNowFullscreen)

            // Only count exit if we were in fullscreen before
            if (!isNowFullscreen && (fullscreenExits > 0 || isFullscreen)) {
                const newCount = tabSwitches + fullscreenExits + 1
                addViolation(
                    "fullscreen_exit",
                    `⚠️ Cảnh báo ${newCount}/${MAX_VIOLATIONS}: Bạn đã thoát chế độ toàn màn hình! Nếu vi phạm ${MAX_VIOLATIONS - newCount} lần nữa, bài sẽ tự động nộp.`
                )
            }
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange)
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }, [enabled, isFullscreen, fullscreenExits, tabSwitches, addViolation])

    // Copy/paste prevention
    useEffect(() => {
        if (!enabled) return

        const handleCopy = (e: ClipboardEvent) => {
            e.preventDefault()
            setCopyAttempts(prev => prev + 1)
        }

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // Block Ctrl+C, Ctrl+V, Ctrl+A, Ctrl+P
            if (e.ctrlKey && ["c", "v", "a", "p"].includes(e.key.toLowerCase())) {
                e.preventDefault()
            }
            // Block F12 (DevTools)
            if (e.key === "F12") {
                e.preventDefault()
            }
        }

        document.addEventListener("copy", handleCopy)
        document.addEventListener("contextmenu", handleContextMenu)
        document.addEventListener("keydown", handleKeyDown)

        return () => {
            document.removeEventListener("copy", handleCopy)
            document.removeEventListener("contextmenu", handleContextMenu)
            document.removeEventListener("keydown", handleKeyDown)
        }
    }, [enabled])

    const enterFullscreen = useCallback(async () => {
        try {
            await document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } catch (err) {
            console.error("Fullscreen error:", err)
        }
    }, [])

    const dismissWarning = useCallback(() => {
        setWarningVisible(false)
    }, [])

    const getViolationData = useCallback(() => ({
        tab_switches: tabSwitches,
        fullscreen_exits: fullscreenExits,
        copy_attempts: copyAttempts,
        violations
    }), [tabSwitches, fullscreenExits, copyAttempts, violations])

    return (
        <AntiCheatContext.Provider value={{
            violations,
            tabSwitches,
            fullscreenExits,
            copyAttempts,
            totalViolations,
            isFullscreen,
            warningVisible,
            warningMessage,
            enterFullscreen,
            dismissWarning,
            getViolationData
        }}>
            {children}
        </AntiCheatContext.Provider>
    )
}

export function useAntiCheat() {
    const context = useContext(AntiCheatContext)
    if (!context) {
        throw new Error("useAntiCheat must be used within AntiCheatProvider")
    }
    return context
}
