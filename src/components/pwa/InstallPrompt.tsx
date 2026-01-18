"use client"

import { useState, useEffect } from "react"
import { Download, X, Smartphone } from "lucide-react"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [showBanner, setShowBanner] = useState(false)
    const [isIOS, setIsIOS] = useState(false)
    const [showIOSGuide, setShowIOSGuide] = useState(false)

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            return
        }

        // Check if dismissed recently
        const dismissed = localStorage.getItem("pwa-install-dismissed")
        if (dismissed) {
            const dismissedTime = parseInt(dismissed)
            const daysSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24)
            if (daysSinceDismissed < 7) return
        }

        // Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
        setIsIOS(isIOSDevice)

        if (isIOSDevice) {
            // Show iOS guide after a delay
            const timer = setTimeout(() => setShowBanner(true), 3000)
            return () => clearTimeout(timer)
        }

        // Handle beforeinstallprompt for Android/Desktop
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setTimeout(() => setShowBanner(true), 2000)
        }

        window.addEventListener("beforeinstallprompt", handler)
        return () => window.removeEventListener("beforeinstallprompt", handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) {
            if (isIOS) {
                setShowIOSGuide(true)
            }
            return
        }

        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === "accepted") {
            setShowBanner(false)
        }
        setDeferredPrompt(null)
    }

    const handleDismiss = () => {
        setShowBanner(false)
        setShowIOSGuide(false)
        localStorage.setItem("pwa-install-dismissed", Date.now().toString())
    }

    if (!showBanner) return null

    return (
        <>
            {/* Install Banner */}
            <div className={cn(
                "fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50",
                "bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl",
                "animate-in slide-in-from-bottom-5 duration-300"
            )}>
                <div className="p-4">
                    <button
                        onClick={handleDismiss}
                        className="absolute top-3 right-3 text-white/70 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                            <Smartphone className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-white mb-1">
                                Cài đặt ExamHub
                            </h3>
                            <p className="text-sm text-white/80 mb-3">
                                Thêm vào màn hình chính để truy cập nhanh hơn
                            </p>
                            <button
                                onClick={handleInstall}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                {isIOS ? "Xem hướng dẫn" : "Cài đặt ngay"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* iOS Installation Guide Modal */}
            {showIOSGuide && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-lg bg-slate-900 rounded-t-3xl p-6 animate-in slide-in-from-bottom">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">
                                Cài đặt trên iOS
                            </h2>
                            <button
                                onClick={handleDismiss}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-slate-800 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                                    1
                                </div>
                                <div>
                                    <p className="text-white font-medium">
                                        Nhấn nút Chia sẻ
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        Biểu tượng <span className="text-blue-400">⬆️</span> ở thanh công cụ Safari
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-slate-800 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                                    2
                                </div>
                                <div>
                                    <p className="text-white font-medium">
                                        Chọn &quot;Thêm vào Màn hình chính&quot;
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        Cuộn xuống và tìm tùy chọn này
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-4 bg-slate-800 rounded-xl">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold shrink-0">
                                    3
                                </div>
                                <div>
                                    <p className="text-white font-medium">
                                        Nhấn &quot;Thêm&quot;
                                    </p>
                                    <p className="text-sm text-slate-400">
                                        ExamHub sẽ xuất hiện trên màn hình chính
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleDismiss}
                            className="w-full mt-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl"
                        >
                            Đã hiểu
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
