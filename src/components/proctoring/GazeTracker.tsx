"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { AlertTriangle, Eye, Smartphone, CheckCircle } from "lucide-react"

interface GazeTrackerProps {
    enabled: boolean
    onViolation?: (type: string, details: any) => void
    maxWarnings?: number
    onMaxWarningsReached?: () => void
    lookAwayThreshold?: number // seconds before warning
}

interface GazeState {
    isCalibrated: boolean
    isLookingAway: boolean
    lookAwayCount: number
    lookAwayStartTime: number | null
    currentLookAwayDuration: number
    phoneDetected: boolean
    phoneCount: number
}

export function GazeTracker({
    enabled,
    onViolation,
    maxWarnings = 5,
    onMaxWarningsReached,
    lookAwayThreshold = 15 // 15 seconds default
}: GazeTrackerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [gazeState, setGazeState] = useState<GazeState>({
        isCalibrated: false,
        isLookingAway: false,
        lookAwayCount: 0,
        lookAwayStartTime: null,
        currentLookAwayDuration: 0,
        phoneDetected: false,
        phoneCount: 0
    })
    const [calibrationStep, setCalibrationStep] = useState(0)
    const [showCalibration, setShowCalibration] = useState(false)
    const [faceDetected, setFaceDetected] = useState(false)
    const [status, setStatus] = useState<"initializing" | "ready" | "error">("initializing")

    const animationFrameRef = useRef<number | null>(null)
    const lookAwayTimerRef = useRef<NodeJS.Timeout | null>(null)
    const phoneDetectorRef = useRef<any>(null)

    // Calibration points (5-point calibration)
    const calibrationPoints = [
        { x: 50, y: 50, label: "Trung tâm" },
        { x: 10, y: 10, label: "Góc trên trái" },
        { x: 90, y: 10, label: "Góc trên phải" },
        { x: 10, y: 90, label: "Góc dưới trái" },
        { x: 90, y: 90, label: "Góc dưới phải" }
    ]

    // Initialize MediaPipe and Object Detection
    useEffect(() => {
        if (!enabled) return

        const initTracking = async () => {
            try {
                // Initialize MediaPipe Face Mesh
                const { FaceMesh } = await import("@mediapipe/face_mesh")
                const { Camera } = await import("@mediapipe/camera_utils")

                const mesh = new FaceMesh({
                    locateFile: (file) => {
                        return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
                    }
                })

                mesh.setOptions({
                    maxNumFaces: 2,
                    refineLandmarks: true,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                })

                mesh.onResults(onFaceMeshResults)

                // Initialize COCO-SSD for phone detection
                const cocoSsd = await import("@tensorflow-models/coco-ssd")
                const tf = await import("@tensorflow/tfjs")
                await tf.ready()
                phoneDetectorRef.current = await cocoSsd.load()

                // Start camera
                if (videoRef.current) {
                    const camera = new Camera(videoRef.current, {
                        onFrame: async () => {
                            if (videoRef.current) {
                                await mesh.send({ image: videoRef.current })
                                // Run phone detection every 2 seconds
                                detectPhone()
                            }
                        },
                        width: 640,
                        height: 480
                    })
                    await camera.start()
                    setStatus("ready")
                }
            } catch (error) {
                console.error("Failed to initialize tracking:", error)
                setStatus("error")
            }
        }

        initTracking()

        return () => {
            if (lookAwayTimerRef.current) {
                clearInterval(lookAwayTimerRef.current)
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
            }
        }
    }, [enabled])

    // Timer to track look-away duration
    useEffect(() => {
        if (!enabled) return

        lookAwayTimerRef.current = setInterval(() => {
            setGazeState(prev => {
                if (prev.lookAwayStartTime && prev.isLookingAway) {
                    const duration = (Date.now() - prev.lookAwayStartTime) / 1000

                    // Check if exceeded threshold
                    if (duration >= lookAwayThreshold && duration < lookAwayThreshold + 1) {
                        // Just crossed threshold - trigger warning
                        onViolation?.("look_away_exceeded", {
                            duration: Math.round(duration),
                            threshold: lookAwayThreshold
                        })

                        const newCount = prev.lookAwayCount + 1
                        if (newCount >= maxWarnings) {
                            onMaxWarningsReached?.()
                        }

                        return {
                            ...prev,
                            currentLookAwayDuration: duration,
                            lookAwayCount: newCount
                        }
                    }

                    return { ...prev, currentLookAwayDuration: duration }
                }
                return prev
            })
        }, 1000)

        return () => {
            if (lookAwayTimerRef.current) {
                clearInterval(lookAwayTimerRef.current)
            }
        }
    }, [enabled, lookAwayThreshold, maxWarnings])

    // Phone detection using COCO-SSD
    const detectPhone = useCallback(async () => {
        if (!phoneDetectorRef.current || !videoRef.current) return

        try {
            const predictions = await phoneDetectorRef.current.detect(videoRef.current)

            // Look for cell phone class
            const phoneDetection = predictions.find(
                (p: any) => p.class === "cell phone" && p.score > 0.5
            )

            if (phoneDetection) {
                setGazeState(prev => {
                    const newCount = prev.phoneCount + 1
                    onViolation?.("phone_detected", {
                        confidence: phoneDetection.score,
                        count: newCount
                    })
                    return {
                        ...prev,
                        phoneDetected: true,
                        phoneCount: newCount
                    }
                })
            } else {
                setGazeState(prev => ({ ...prev, phoneDetected: false }))
            }
        } catch (error) {
            console.error("Phone detection error:", error)
        }
    }, [onViolation])

    const onFaceMeshResults = useCallback((results: any) => {
        if (!results.multiFaceLandmarks) return

        const faceCount = results.multiFaceLandmarks.length

        // Multi-face detection
        if (faceCount > 1) {
            onViolation?.("multi_face", { count: faceCount })
        }

        // No face detected - start look-away timer
        if (faceCount === 0) {
            setFaceDetected(false)
            setGazeState(prev => {
                if (!prev.isLookingAway) {
                    return {
                        ...prev,
                        isLookingAway: true,
                        lookAwayStartTime: Date.now()
                    }
                }
                return prev
            })
            return
        }

        setFaceDetected(true)
        const landmarks = results.multiFaceLandmarks[0]

        // Get iris landmarks for gaze estimation
        const leftIris = landmarks[468]
        const rightIris = landmarks[473]
        const noseTip = landmarks[1]

        // Eye corner landmarks
        const leftEyeInner = landmarks[133]
        const leftEyeOuter = landmarks[33]
        const rightEyeInner = landmarks[362]
        const rightEyeOuter = landmarks[263]

        // Calculate gaze direction
        const leftGazeX = (leftIris.x - leftEyeInner.x) / (leftEyeOuter.x - leftEyeInner.x)
        const rightGazeX = (rightIris.x - rightEyeInner.x) / (rightEyeOuter.x - rightEyeInner.x)
        const avgGazeX = (leftGazeX + rightGazeX) / 2
        const gazeY = noseTip.y

        // Check if looking away (wider threshold to allow calculator use)
        const isLookingAway = avgGazeX < 0.15 || avgGazeX > 0.85 || gazeY < 0.25 || gazeY > 0.75

        setGazeState(prev => {
            if (isLookingAway && !prev.isLookingAway) {
                // Just started looking away
                return {
                    ...prev,
                    isLookingAway: true,
                    lookAwayStartTime: Date.now(),
                    currentLookAwayDuration: 0
                }
            } else if (!isLookingAway && prev.isLookingAway) {
                // Returned to looking at screen - reset timer
                return {
                    ...prev,
                    isLookingAway: false,
                    lookAwayStartTime: null,
                    currentLookAwayDuration: 0
                }
            }
            return prev
        })

        // Draw on canvas for debugging (optional)
        if (canvasRef.current) {
            drawFaceMesh(landmarks, canvasRef.current)
        }
    }, [onViolation])

    const drawFaceMesh = (landmarks: any[], canvas: HTMLCanvasElement) => {
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.fillStyle = "#00ff00"

        // Draw iris points
        const irisIndices = [468, 469, 470, 471, 472, 473, 474, 475, 476, 477]
        irisIndices.forEach(idx => {
            const point = landmarks[idx]
            ctx.beginPath()
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 2, 0, 2 * Math.PI)
            ctx.fill()
        })
    }

    const startCalibration = () => {
        setShowCalibration(true)
        setCalibrationStep(0)
    }

    const nextCalibrationStep = () => {
        if (calibrationStep < calibrationPoints.length - 1) {
            setCalibrationStep(calibrationStep + 1)
        } else {
            setShowCalibration(false)
            setGazeState(prev => ({ ...prev, isCalibrated: true }))
        }
    }

    if (!enabled) return null

    return (
        <div className="fixed top-4 right-4 z-50">
            {/* Hidden video for camera capture */}
            <video
                ref={videoRef}
                className="hidden"
                autoPlay
                playsInline
                muted
            />
            <canvas
                ref={canvasRef}
                width={160}
                height={120}
                className="hidden"
            />

            {/* Status indicator */}
            <div className="bg-slate-800/90 backdrop-blur-sm rounded-lg p-3 border border-slate-700 shadow-lg min-w-[200px]">
                {/* Status header */}
                <div className="flex items-center gap-2 text-sm mb-2">
                    {status === "initializing" && (
                        <>
                            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                            <span className="text-blue-400">Đang khởi tạo...</span>
                        </>
                    )}
                    {status === "ready" && faceDetected && !gazeState.isLookingAway && (
                        <>
                            <Eye className="w-4 h-4 text-green-400" />
                            <span className="text-green-400">Đang giám sát</span>
                        </>
                    )}
                    {status === "ready" && !faceDetected && (
                        <>
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400">Không thấy khuôn mặt</span>
                        </>
                    )}
                    {status === "ready" && gazeState.isLookingAway && (
                        <>
                            <AlertTriangle className="w-4 h-4 text-orange-400" />
                            <span className="text-orange-400">
                                Nhìn đi: {Math.round(gazeState.currentLookAwayDuration)}s
                            </span>
                        </>
                    )}
                    {status === "error" && (
                        <>
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <span className="text-red-400">Lỗi camera</span>
                        </>
                    )}
                </div>

                {/* Progress bar for look-away */}
                {gazeState.isLookingAway && (
                    <div className="mb-2">
                        <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${gazeState.currentLookAwayDuration >= lookAwayThreshold
                                        ? "bg-red-500"
                                        : "bg-yellow-500"
                                    }`}
                                style={{
                                    width: `${Math.min(100, (gazeState.currentLookAwayDuration / lookAwayThreshold) * 100)}%`
                                }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {gazeState.currentLookAwayDuration < lookAwayThreshold
                                ? `Còn ${Math.round(lookAwayThreshold - gazeState.currentLookAwayDuration)}s`
                                : "⚠️ Vượt ngưỡng!"}
                        </p>
                    </div>
                )}

                {/* Phone detection alert */}
                {gazeState.phoneDetected && (
                    <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/20 rounded px-2 py-1 mb-2">
                        <Smartphone className="w-4 h-4" />
                        <span>Phát hiện điện thoại!</span>
                    </div>
                )}

                {/* Warning counter */}
                {gazeState.lookAwayCount > 0 && (
                    <div className="text-xs text-yellow-400 border-t border-slate-700 pt-2">
                        Cảnh báo: {gazeState.lookAwayCount}/{maxWarnings}
                    </div>
                )}

                {gazeState.phoneCount > 0 && (
                    <div className="text-xs text-red-400">
                        Điện thoại: {gazeState.phoneCount} lần
                    </div>
                )}

                {/* Calibration button */}
                {status === "ready" && !gazeState.isCalibrated && (
                    <button
                        onClick={startCalibration}
                        className="mt-2 w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                        Hiệu chuẩn camera
                    </button>
                )}
            </div>

            {/* Calibration overlay */}
            {showCalibration && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-white text-2xl font-bold mb-4">
                            Hiệu chuẩn Camera
                        </h2>
                        <p className="text-slate-300 mb-8">
                            Nhìn vào điểm màu xanh và bấm <strong>Tiếp tục</strong>
                        </p>

                        {/* Calibration point */}
                        <div
                            className="fixed w-8 h-8 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"
                            style={{
                                left: `${calibrationPoints[calibrationStep].x}%`,
                                top: `${calibrationPoints[calibrationStep].y}%`,
                                transform: "translate(-50%, -50%)"
                            }}
                        />

                        <p className="text-slate-400 text-sm mb-4">
                            {calibrationPoints[calibrationStep].label}
                            <span className="text-slate-500 ml-2">
                                ({calibrationStep + 1}/{calibrationPoints.length})
                            </span>
                        </p>

                        <button
                            onClick={nextCalibrationStep}
                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                        >
                            {calibrationStep === calibrationPoints.length - 1
                                ? "✓ Hoàn thành"
                                : "Tiếp tục →"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
