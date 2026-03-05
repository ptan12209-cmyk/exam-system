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
                // Check if PDF is being opened (whitelisted)
                const pdfOpenAllowed = localStorage.getItem('pdf-open-allowed')

                if (pdfOpenAllowed === 'true') {
                    // Clear flag and don't count as violation
                    localStorage.removeItem('pdf-open-allowed')
                    console.log('PDF open detected - not counting as violation')
                    return
                }

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
            // Block Ctrl+Shift+I (DevTools)
            if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "i") {
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

    // Split-screen / Floating window detection
    useEffect(() => {
        if (!enabled) return

        let blurTimeout: NodeJS.Timeout | null = null
        const initialWidth = window.innerWidth

        // 1. Window blur detection — fires when floating window overlays
        const handleWindowBlur = () => {
            // Small delay to avoid false positives from permission dialogs
            blurTimeout = setTimeout(() => {
                if (document.hidden) return // Already handled by visibility change
                const newCount = tabSwitches + fullscreenExits + 1
                addViolation(
                    "tab_switch",
                    `⚠️ Cảnh báo ${newCount}/${MAX_VIOLATIONS}: Phát hiện cửa sổ nổi/chia màn hình! Vui lòng quay lại bài thi.`
                )
            }, 500)
        }

        const handleWindowFocus = () => {
            if (blurTimeout) { clearTimeout(blurTimeout); blurTimeout = null }
        }

        // 2. Window resize detection — split-screen changes viewport
        const handleResize = () => {
            const currentWidth = window.innerWidth
            const ratio = currentWidth / screen.width

            // If window shrinks to < 75% of screen width → split-screen detected
            if (ratio < 0.75 && initialWidth > 0 && currentWidth < initialWidth * 0.8) {
                const newCount = tabSwitches + fullscreenExits + 1
                addViolation(
                    "tab_switch",
                    `⚠️ Cảnh báo ${newCount}/${MAX_VIOLATIONS}: Phát hiện chia màn hình! Vui lòng sử dụng toàn bộ màn hình cho bài thi.`
                )
            }
        }

        window.addEventListener("blur", handleWindowBlur)
        window.addEventListener("focus", handleWindowFocus)
        window.addEventListener("resize", handleResize)

        // 3. Periodic viewport check (catches PiP/overlay that doesn't trigger resize)
        const viewportCheck = setInterval(() => {
            const ratio = window.innerWidth / screen.width
            if (ratio < 0.6) {
                const newCount = tabSwitches + fullscreenExits + 1
                addViolation(
                    "tab_switch",
                    `⚠️ Cảnh báo ${newCount}/${MAX_VIOLATIONS}: Cửa sổ bài thi quá nhỏ! Vui lòng phóng to toàn màn hình.`
                )
            }
        }, 10000) // Check every 10 seconds

        return () => {
            window.removeEventListener("blur", handleWindowBlur)
            window.removeEventListener("focus", handleWindowFocus)
            window.removeEventListener("resize", handleResize)
            clearInterval(viewportCheck)
            if (blurTimeout) clearTimeout(blurTimeout)
        }
    }, [enabled, tabSwitches, fullscreenExits, addViolation])

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
