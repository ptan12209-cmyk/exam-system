"use client"

import { useState, useEffect } from "react"
import { Download, Check, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isSupported, setIsSupported] = useState(false)

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true)
            return
        }

        // Check if iOS (Safari)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
        if (isIOS) {
            setIsSupported(true)
            return
        }

        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
            setIsSupported(true)
        }

        window.addEventListener("beforeinstallprompt", handler)

        // Set timeout to show manual instructions if event doesn't fire
        const timeout = setTimeout(() => {
            if (!deferredPrompt) {
                setIsSupported(true)
            }
        }, 2000)

        return () => {
            window.removeEventListener("beforeinstallprompt", handler)
            clearTimeout(timeout)
        }
    }, [])

    const handleInstall = async () => {
        if (deferredPrompt) {
            // Chrome/Edge - use install prompt
            deferredPrompt.prompt()
            const { outcome } = await deferredPrompt.userChoice

            if (outcome === "accepted") {
                setIsInstalled(true)
            }

            setDeferredPrompt(null)
        } else {
            // Fallback - show manual instructions
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
            if (isIOS) {
                alert("📱 Để cài đặt:\n\n1. Nhấn nút Share (⬆️)\n2. Chọn 'Add to Home Screen'\n3. Nhấn 'Add'")
            } else {
                alert("📱 Để cài đặt:\n\n1. Mở menu trình duyệt (⋮)\n2. Chọn 'Install app' hoặc 'Add to Home screen'\n3. Làm theo hướng dẫn")
            }
        }
    }

    if (isInstalled) {
        return (
            <Button variant="outline" disabled className="w-full">
                <Check className="w-4 h-4 mr-2" />
                Đã cài đặt
            </Button>
        )
    }

    if (!isSupported) {
        return (
            <Button variant="outline" disabled className="w-full">
                <Smartphone className="w-4 h-4 mr-2" />
                Đang tải...
            </Button>
        )
    }

    return (
        <Button
            onClick={handleInstall}
            className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold shadow-md"
        >
            <Download className="w-4 h-4 mr-2" />
            {deferredPrompt ? "Cài đặt ứng dụng" : "Hướng dẫn cài đặt"}
        </Button>
    )
}
