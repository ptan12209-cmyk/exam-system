"use client"

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react"

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
const STORAGE_KEY = "anticheat_violations"

/**
 * Safely reads persisted violation counts from sessionStorage.
 * sessionStorage survives F5 but is cleared when the tab is closed.
 */
function getPersistedViolations(examId: string): { tabSwitches: number; fullscreenExits: number; copyAttempts: number } {
    try {
        const raw = sessionStorage.getItem(`${STORAGE_KEY}_${examId}`)
        if (raw) {
            const parsed = JSON.parse(raw)
            return {
                tabSwitches: parsed.tabSwitches ?? 0,
                fullscreenExits: parsed.fullscreenExits ?? 0,
                copyAttempts: parsed.copyAttempts ?? 0,
            }
        }
    } catch { /* ignore */ }
    return { tabSwitches: 0, fullscreenExits: 0, copyAttempts: 0 }
}

function persistViolations(examId: string, data: { tabSwitches: number; fullscreenExits: number; copyAttempts: number }) {
    try {
        sessionStorage.setItem(`${STORAGE_KEY}_${examId}`, JSON.stringify(data))
    } catch { /* ignore */ }
}

export function AntiCheatProvider({
    children,
    onMaxViolations,
    onViolation,
    enabled = true,
    examId = "",
    initialViolations = 0,
}: {
    children: ReactNode
    onMaxViolations?: () => void
    onViolation?: (type: ViolationType, count: number) => void
    enabled?: boolean
    examId?: string
    /** Number of violations already recorded on server (for session restore after F5) */
    initialViolations?: number
}) {
    // Merge: take the MAX of server-side count and sessionStorage count to prevent gaming
    const persisted = getPersistedViolations(examId)
    const initTabSwitches = Math.max(persisted.tabSwitches, initialViolations)

    const [violations, setViolations] = useState<Violation[]>([])
    const [tabSwitches, setTabSwitches] = useState(initTabSwitches)
    const [fullscreenExits, setFullscreenExits] = useState(persisted.fullscreenExits)
    const [copyAttempts, setCopyAttempts] = useState(persisted.copyAttempts)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [warningVisible, setWarningVisible] = useState(false)
    const [warningMessage, setWarningMessage] = useState("")

    // Use refs for stable access in event handlers (avoids stale closures)
    const tabSwitchesRef = useRef(initTabSwitches)
    const fullscreenExitsRef = useRef(persisted.fullscreenExits)
    const isFullscreenRef = useRef(false)
    const hasEnteredFullscreenRef = useRef(false)

    // Debounce: prevent duplicate violations from blur+visibilitychange firing together
    const lastViolationTimeRef = useRef(0)
    const VIOLATION_DEBOUNCE_MS = 2000

    // Track if a viewport-size violation was already fired (prevent spam)
    const viewportViolationFiredRef = useRef(false)

    const totalViolations = tabSwitches + fullscreenExits

    // Persist to sessionStorage whenever counts change
    useEffect(() => {
        persistViolations(examId, { tabSwitches, fullscreenExits, copyAttempts })
    }, [examId, tabSwitches, fullscreenExits, copyAttempts])

    const addViolation = useCallback((type: ViolationType, message: string) => {
        if (!enabled) return

        // Debounce: prevent rapid-fire violations from overlapping browser events
        const now = Date.now()
        if (now - lastViolationTimeRef.current < VIOLATION_DEBOUNCE_MS) return
        lastViolationTimeRef.current = now

        const violation: Violation = {
            type,
            timestamp: new Date().toISOString()
        }

        setViolations(prev => [...prev, violation])

        let newTotal = 0
        if (type === "tab_switch") {
            const newCount = tabSwitchesRef.current + 1
            tabSwitchesRef.current = newCount
            setTabSwitches(newCount)
            newTotal = newCount + fullscreenExitsRef.current
        } else if (type === "fullscreen_exit") {
            const newCount = fullscreenExitsRef.current + 1
            fullscreenExitsRef.current = newCount
            setFullscreenExits(newCount)
            newTotal = tabSwitchesRef.current + newCount
        } else if (type === "copy_attempt") {
            setCopyAttempts(prev => prev + 1)
            return // Copy attempts don't count toward max violations
        }

        // Notify parent for session tracking
        if (onViolation) {
            onViolation(type, newTotal)
        }

        // Show warning
        setWarningMessage(message)
        setWarningVisible(true)
    }, [enabled, onViolation])

    // Check if max violations reached
    useEffect(() => {
        if (totalViolations >= MAX_VIOLATIONS && onMaxViolations) {
            onMaxViolations()
        }
    }, [totalViolations, onMaxViolations])

    // Tab visibility detection (handles Alt+Tab, switching tabs)
    useEffect(() => {
        if (!enabled) return

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // Check if PDF is being opened (whitelisted action)
                const pdfOpenAllowed = localStorage.getItem('pdf-open-allowed')
                if (pdfOpenAllowed === 'true') {
                    localStorage.removeItem('pdf-open-allowed')
                    console.log('PDF open detected - not counting as violation')
                    return
                }

                const currentTotal = tabSwitchesRef.current + fullscreenExitsRef.current + 1
                addViolation(
                    "tab_switch",
                    `⚠️ Cảnh báo ${currentTotal}/${MAX_VIOLATIONS}: Bạn đã chuyển tab! Nếu vi phạm ${MAX_VIOLATIONS - currentTotal} lần nữa, bài sẽ tự động nộp.`
                )
            }
        }

        document.addEventListener("visibilitychange", handleVisibilityChange)
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
    }, [enabled, addViolation])

    // Fullscreen detection
    useEffect(() => {
        if (!enabled) return

        const handleFullscreenChange = () => {
            const isNowFullscreen = !!document.fullscreenElement
            setIsFullscreen(isNowFullscreen)
            isFullscreenRef.current = isNowFullscreen

            if (isNowFullscreen) {
                hasEnteredFullscreenRef.current = true
                return
            }

            // Only count exit if we had previously entered fullscreen
            if (!isNowFullscreen && hasEnteredFullscreenRef.current) {
                const currentTotal = tabSwitchesRef.current + fullscreenExitsRef.current + 1
                addViolation(
                    "fullscreen_exit",
                    `⚠️ Cảnh báo ${currentTotal}/${MAX_VIOLATIONS}: Bạn đã thoát chế độ toàn màn hình! Nếu vi phạm ${MAX_VIOLATIONS - currentTotal} lần nữa, bài sẽ tự động nộp.`
                )
            }
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange)
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }, [enabled, addViolation])

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
    // IMPROVED: 
    //   - Removed window.blur handler (it causes too many false positives from
    //     system notifications, permission dialogs, etc.)
    //   - Only use viewport ratio check which is more reliable
    //   - Fire at most ONCE per resize to avoid spam
    useEffect(() => {
        if (!enabled) return

        // Window resize detection — split-screen changes viewport
        const handleResize = () => {
            const ratio = window.innerWidth / screen.width

            // If window shrinks to < 70% of screen width → likely split-screen
            if (ratio < 0.70 && !viewportViolationFiredRef.current) {
                viewportViolationFiredRef.current = true
                const currentTotal = tabSwitchesRef.current + fullscreenExitsRef.current + 1
                addViolation(
                    "tab_switch",
                    `⚠️ Cảnh báo ${currentTotal}/${MAX_VIOLATIONS}: Phát hiện chia màn hình! Vui lòng sử dụng toàn bộ màn hình cho bài thi.`
                )
                // Allow re-detection after 60s cooldown
                setTimeout(() => { viewportViolationFiredRef.current = false }, 60000)
            }
        }

        window.addEventListener("resize", handleResize)

        return () => {
            window.removeEventListener("resize", handleResize)
        }
    }, [enabled, addViolation])

    const enterFullscreen = useCallback(async () => {
        try {
            await document.documentElement.requestFullscreen()
            setIsFullscreen(true)
            isFullscreenRef.current = true
            hasEnteredFullscreenRef.current = true
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
