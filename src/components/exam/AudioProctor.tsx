"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Mic, MicOff, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface AudioProctorProps {
    enabled: boolean
    onViolation?: (message: string) => void
    volumeThreshold?: number // 0-100 (used as fallback if auto-calibration fails)
    sustainedDurationMs?: number // How long loud audio must persist before violation
}

/**
 * AudioProctor v2 – Monitors ambient noise through the microphone.
 *
 * KEY IMPROVEMENTS over v1:
 *   1. Auto-calibration: Measures ambient noise level for 3 seconds on start,
 *      then sets threshold to (baseline + 20). This eliminates false positives
 *      caused by different microphone sensitivities.
 *   2. Increased sustained duration from 8s → 10s to reduce false positives
 *      from brief sounds (coughing, chair creaking, etc.)
 *   3. Added visual calibration indicator so students know when calibration
 *      is happening.
 *   4. Cooldown between violations increased to 45s.
 */
export function AudioProctor({
    enabled,
    onViolation,
    volumeThreshold = 45,
    sustainedDurationMs = 10000
}: AudioProctorProps) {
    const audioContextRef = useRef<AudioContext | null>(null)
    const analyserRef = useRef<AnalyserNode | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const animFrameRef = useRef<number | null>(null)

    const [micActive, setMicActive] = useState(false)
    const [micError, setMicError] = useState<string | null>(null)
    const [currentVolume, setCurrentVolume] = useState(0)
    const [isLoud, setIsLoud] = useState(false)
    const [isCalibrating, setIsCalibrating] = useState(false)
    const [calibratedThreshold, setCalibratedThreshold] = useState<number | null>(null)

    const loudStartRef = useRef<number | null>(null)
    const violationFiredRef = useRef(false)

    // Auto-calibration state
    const calibrationSamplesRef = useRef<number[]>([])
    const calibrationStartRef = useRef<number | null>(null)
    const CALIBRATION_DURATION_MS = 3000 // 3 seconds of ambient sampling
    const CALIBRATION_MARGIN = 20 // threshold = baseline + this margin
    const VIOLATION_COOLDOWN = 45000 // 45s cooldown

    const startMic = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            streamRef.current = stream

            const audioContext = new AudioContext()
            audioContextRef.current = audioContext

            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.8
            source.connect(analyser)
            analyserRef.current = analyser

            setMicActive(true)
            setMicError(null)
            setIsCalibrating(true)
            calibrationSamplesRef.current = []
            calibrationStartRef.current = Date.now()
        } catch (err) {
            console.error("Mic error:", err)
            setMicError("Không thể truy cập microphone")
            setMicActive(false)
        }
    }, [])

    const stopMic = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
        if (audioContextRef.current) audioContextRef.current.close()
        streamRef.current = null
        audioContextRef.current = null
        analyserRef.current = null
        setMicActive(false)
    }, [])

    useEffect(() => {
        if (enabled) startMic()
        return () => stopMic()
    }, [enabled, startMic, stopMic])

    // Volume monitoring loop with auto-calibration
    useEffect(() => {
        if (!micActive || !analyserRef.current) return

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
        let activeThreshold = calibratedThreshold ?? volumeThreshold

        const monitor = () => {
            if (!analyserRef.current) return
            analyserRef.current.getByteFrequencyData(dataArray)

            // Calculate RMS volume
            let sum = 0
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i]
            const rms = Math.sqrt(sum / dataArray.length)
            const normalizedVolume = Math.min(100, Math.round((rms / 128) * 100))

            setCurrentVolume(normalizedVolume)

            // ── Auto-calibration phase ──
            if (calibrationStartRef.current !== null) {
                calibrationSamplesRef.current.push(normalizedVolume)
                const elapsed = Date.now() - calibrationStartRef.current

                if (elapsed >= CALIBRATION_DURATION_MS) {
                    // Calculate baseline from calibration samples
                    const samples = calibrationSamplesRef.current
                    if (samples.length > 0) {
                        // Use the 75th percentile as baseline to be robust against brief spikes
                        const sorted = [...samples].sort((a, b) => a - b)
                        const p75Index = Math.floor(sorted.length * 0.75)
                        const baseline = sorted[p75Index]
                        const newThreshold = Math.min(85, Math.max(30, baseline + CALIBRATION_MARGIN))

                        activeThreshold = newThreshold
                        setCalibratedThreshold(newThreshold)
                        console.log(`[AudioProctor] Calibrated: baseline=${baseline}, threshold=${newThreshold}`)
                    }

                    calibrationStartRef.current = null
                    calibrationSamplesRef.current = []
                    setIsCalibrating(false)
                }

                animFrameRef.current = requestAnimationFrame(monitor)
                return // Don't check violations during calibration
            }

            // ── Violation detection phase ──
            if (normalizedVolume > activeThreshold) {
                setIsLoud(true)
                if (!loudStartRef.current) loudStartRef.current = Date.now()
                else if (Date.now() - loudStartRef.current > sustainedDurationMs && !violationFiredRef.current) {
                    violationFiredRef.current = true
                    onViolation?.("⚠️ Phát hiện tiếng ồn lớn kéo dài! Có thể đang trao đổi bài.")
                    // Reset after cooldown
                    setTimeout(() => { violationFiredRef.current = false }, VIOLATION_COOLDOWN)
                }
            } else {
                setIsLoud(false)
                loudStartRef.current = null
            }

            animFrameRef.current = requestAnimationFrame(monitor)
        }

        animFrameRef.current = requestAnimationFrame(monitor)
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        }
    }, [micActive, volumeThreshold, calibratedThreshold, sustainedDurationMs, onViolation])

    if (!enabled) return null

    return (
        <div className="fixed bottom-4 left-[200px] z-40">
            <div className={cn(
                "glass-card rounded-xl px-3 py-2 shadow-lg border flex items-center gap-2 transition-colors",
                isCalibrating ? "border-blue-300 dark:border-blue-700" :
                    isLoud ? "border-red-300 dark:border-red-700" : "border-border/50"
            )}>
                {micError ? (
                    <div className="flex items-center gap-2 text-red-500 text-xs">
                        <MicOff className="w-4 h-4" />
                        <span>Mic lỗi</span>
                    </div>
                ) : isCalibrating ? (
                    <div className="flex items-center gap-2 text-blue-500 text-xs">
                        <Mic className="w-4 h-4 animate-pulse" />
                        <span className="font-medium">Đang hiệu chỉnh...</span>
                    </div>
                ) : (
                    <>
                        <div className={cn("p-1 rounded-lg", isLoud ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30")}>
                            {isLoud ? <Volume2 className="w-4 h-4 text-red-500 animate-pulse" /> : <Mic className="w-4 h-4 text-emerald-500" />}
                        </div>
                        {/* Volume bar */}
                        <div className="w-16 h-2 bg-muted/30 rounded-full overflow-hidden">
                            <div
                                className={cn("h-full rounded-full transition-all duration-100", isLoud ? "bg-red-500" : "bg-emerald-500")}
                                style={{ width: `${currentVolume}%` }}
                            />
                        </div>
                        <span className={cn("text-[10px] font-mono w-6 text-right", isLoud ? "text-red-500" : "text-muted-foreground")}>
                            {currentVolume}
                        </span>
                    </>
                )}
            </div>
        </div>
    )
}
