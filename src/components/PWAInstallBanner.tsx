"use client"

import { useEffect, useState } from "react"
import { X, Download } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallBanner() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [showBanner, setShowBanner] = useState(false)

    useEffect(() => {
        // Check if user has dismissed banner permanently
        const dismissed = localStorage.getItem("pwa-banner-dismissed")
        if (dismissed === "true") {
            return
        }

        // Listen for beforeinstallprompt event
        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setShowBanner(true)
        }

        window.addEventListener("beforeinstallprompt", handler)

        return () => {
            window.removeEventListener("beforeinstallprompt", handler)
        }
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return

        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice

        if (outcome === "accepted") {
            console.log("User accepted the install prompt")
        }

        setDeferredPrompt(null)
        setShowBanner(false)
    }

    const handleDismiss = () => {
        setShowBanner(false)
    }

    const handleDismissPermanently = () => {
        localStorage.setItem("pwa-banner-dismissed", "true")
        setShowBanner(false)
    }

    if (!showBanner) return null

    return (
        <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl p-4 text-white">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                            <span className="text-2xl font-bold text-blue-600">E</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Cài đặt ExamHub</h3>
                            <p className="text-xs text-blue-100">Truy cập nhanh hơn, offline được!</p>
                        </div>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-white/80 hover:text-white transition -mt-1"
                        aria-label="Đóng"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="space-y-2">
                    <Button
                        onClick={handleInstall}
                        className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Thêm vào màn hình chính
                    </Button>
                    <button
                        onClick={handleDismissPermanently}
                        className="w-full text-center text-xs text-blue-100 hover:text-white underline py-1"
                    >
                        Không hiển thị lại
                    </button>
                </div>
            </div>
        </div>
    )
}
