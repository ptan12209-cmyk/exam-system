"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Camera, CameraOff, AlertTriangle, UserCheck, Users, UserX } from "lucide-react"
import { cn } from "@/lib/utils"

interface WebcamProctorProps {
    enabled: boolean
    enableFaceDetection?: boolean
    onViolation?: (type: "no_face" | "multiple_faces", message: string) => void
    snapshotIntervalMs?: number
    onSnapshot?: (blob: Blob) => void
}

export function WebcamProctor({
    enabled,
    enableFaceDetection = false,
    onViolation,
    snapshotIntervalMs = 30000,
    onSnapshot
}: WebcamProctorProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const [cameraActive, setCameraActive] = useState(false)
    const [cameraError, setCameraError] = useState<string | null>(null)
    const [faceStatus, setFaceStatus] = useState<"ok" | "no_face" | "multiple" | "checking">("checking")
    const [faceCount, setFaceCount] = useState(0)
    const noFaceTimerRef = useRef<NodeJS.Timeout | null>(null)

    // Start camera
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 320, height: 240, facingMode: "user" },
                audio: false
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
            setCameraActive(true)
            setCameraError(null)
        } catch (err) {
            console.error("Camera error:", err)
            setCameraError("Không thể truy cập camera. Vui lòng cấp quyền.")
            setCameraActive(false)
        }
    }, [])

    // Stop camera
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop())
            streamRef.current = null
        }
        setCameraActive(false)
    }, [])

    useEffect(() => {
        if (enabled) startCamera()
        return () => stopCamera()
    }, [enabled, startCamera, stopCamera])

    // Snapshot capture
    useEffect(() => {
        if (!cameraActive || !onSnapshot) return
        const interval = setInterval(() => {
            if (videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext("2d")
                if (ctx) {
                    canvasRef.current.width = 320
                    canvasRef.current.height = 240
                    ctx.drawImage(videoRef.current, 0, 0, 320, 240)
                    canvasRef.current.toBlob(blob => {
                        if (blob) onSnapshot(blob)
                    }, "image/jpeg", 0.6)
                }
            }
        }, snapshotIntervalMs)
        return () => clearInterval(interval)
    }, [cameraActive, onSnapshot, snapshotIntervalMs])

    // Simple face detection using canvas pixel analysis (lightweight alternative to face-api.js)
    // This uses skin-color detection heuristic as a basic face presence check
    useEffect(() => {
        if (!cameraActive || !enableFaceDetection) return

        const detectInterval = setInterval(() => {
            if (!videoRef.current || !canvasRef.current) return
            const ctx = canvasRef.current.getContext("2d")
            if (!ctx) return

            canvasRef.current.width = 160
            canvasRef.current.height = 120
            ctx.drawImage(videoRef.current, 0, 0, 160, 120)

            const imageData = ctx.getImageData(0, 0, 160, 120)
            const data = imageData.data
            let skinPixels = 0
            const totalPixels = 160 * 120

            // Skin color detection in RGB space
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2]
                // Basic skin color range
                if (r > 95 && g > 40 && b > 20 &&
                    r > g && r > b &&
                    (r - g) > 15 &&
                    Math.abs(r - g) > 15 &&
                    r - b > 15) {
                    skinPixels++
                }
            }

            const skinRatio = skinPixels / totalPixels

            if (skinRatio < 0.02) {
                // Very low skin detection = likely no face
                setFaceStatus("no_face")
                setFaceCount(0)
                if (!noFaceTimerRef.current) {
                    noFaceTimerRef.current = setTimeout(() => {
                        onViolation?.("no_face", "⚠️ Không phát hiện khuôn mặt trước camera!")
                        noFaceTimerRef.current = null
                    }, 5000) // 5s grace period
                }
            } else if (skinRatio > 0.35) {
                // Very high skin ratio = possibly multiple people close
                setFaceStatus("multiple")
                setFaceCount(2)
                onViolation?.("multiple_faces", "⚠️ Phát hiện nhiều người trước camera!")
                if (noFaceTimerRef.current) { clearTimeout(noFaceTimerRef.current); noFaceTimerRef.current = null }
            } else {
                setFaceStatus("ok")
                setFaceCount(1)
                if (noFaceTimerRef.current) { clearTimeout(noFaceTimerRef.current); noFaceTimerRef.current = null }
            }
        }, 3000) // Check every 3 seconds

        return () => {
            clearInterval(detectInterval)
            if (noFaceTimerRef.current) clearTimeout(noFaceTimerRef.current)
        }
    }, [cameraActive, enableFaceDetection, onViolation])

    if (!enabled) return null

    return (
        <div className="fixed bottom-4 left-4 z-40">
            <div className="glass-card rounded-2xl overflow-hidden shadow-xl border border-border/50 w-[180px]">
                {/* Camera feed */}
                <div className="relative bg-black aspect-[4/3]">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Camera error overlay */}
                    {cameraError && (
                        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center p-2">
                            <CameraOff className="w-6 h-6 text-red-300 mb-1" />
                            <p className="text-[10px] text-red-200 text-center">{cameraError}</p>
                        </div>
                    )}

                    {/* Recording indicator */}
                    {cameraActive && (
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-[10px] text-white font-medium bg-black/50 px-1 rounded">REC</span>
                        </div>
                    )}
                </div>

                {/* Status bar */}
                <div className={cn(
                    "px-3 py-2 flex items-center justify-between text-xs font-medium",
                    faceStatus === "ok" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" :
                        faceStatus === "no_face" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400" :
                            faceStatus === "multiple" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400" :
                                "bg-muted/30 text-muted-foreground"
                )}>
                    <div className="flex items-center gap-1.5">
                        {faceStatus === "ok" && <><UserCheck className="w-3.5 h-3.5" />OK</>}
                        {faceStatus === "no_face" && <><UserX className="w-3.5 h-3.5" />Vắng mặt</>}
                        {faceStatus === "multiple" && <><Users className="w-3.5 h-3.5" />{faceCount} người</>}
                        {faceStatus === "checking" && <><Camera className="w-3.5 h-3.5" />Đang kiểm tra</>}
                    </div>
                    {enableFaceDetection && faceStatus !== "checking" && (
                        <div className={cn("w-2 h-2 rounded-full", faceStatus === "ok" ? "bg-emerald-500" : "bg-red-500 animate-pulse")} />
                    )}
                </div>
            </div>
        </div>
    )
}
