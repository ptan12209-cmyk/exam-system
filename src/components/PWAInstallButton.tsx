"use client"

import { useState, useEffect } from "react"
import { Download, Check } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)

    useEffect(() => {
        // Check if app is already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstalled(true)
            return
        }

        const handler = (e: Event) => {
            e.preventDefault()
            setDeferredPrompt(e as BeforeInstallPromptEvent)
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
            setIsInstalled(true)
        }

        setDeferredPrompt(null)
    }

    if (isInstalled) {
        return (
            <Button variant="outline" disabled className="w-full">
                <Check className="w-4 h-4 mr-2" />
                Đã cài đặt
            </Button>
        )
    }

    if (!deferredPrompt) return null

    return (
        <Button
            onClick={handleInstall}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
            <Download className="w-4 h-4 mr-2" />
            Cài đặt ứng dụng
        </Button>
    )
}
