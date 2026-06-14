"use client"

import { useState, useEffect } from "react"
import { Download, Check, Smartphone, Share2, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallButton() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
    const [isInstalled, setIsInstalled] = useState(false)
    const [isSupported, setIsSupported] = useState(false)
    const [showInstructions, setShowInstructions] = useState(false)
    const [instructionType, setInstructionType] = useState<"ios" | "other">("other")

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
    }, [deferredPrompt])

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
            setInstructionType(isIOS ? "ios" : "other")
            setShowInstructions(true)
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
        <>
            <Button
                onClick={handleInstall}
                className="w-full bg-white text-blue-600 hover:bg-blue-50 font-bold shadow-md"
            >
                <Download className="w-4 h-4 mr-2" />
                {deferredPrompt ? "Cài đặt ứng dụng" : "Hướng dẫn cài đặt"}
            </Button>

            <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
                <DialogContent className="fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-sm translate-x-[-50%] translate-y-[-50%] border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-6 shadow-2xl rounded-[2rem] duration-200 focus:outline-none">
                    <DialogHeader className="flex flex-col items-center gap-2 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border bg-indigo-500/10 border-indigo-500/20">
                            <Smartphone className="h-6 w-6 text-indigo-500" />
                        </div>
                        <DialogTitle className="text-xl font-bold tracking-tight text-white">Cài đặt ứng dụng</DialogTitle>
                        <DialogDescription className="text-sm text-[hsl(var(--muted-foreground))] mt-1 leading-relaxed">
                            Thực hiện các bước sau để cài đặt ứng dụng về màn hình chính:
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="mt-4 space-y-4">
                        {instructionType === "ios" ? (
                            <div className="space-y-3.5 text-sm">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))]/30 text-xs font-bold text-white">1</span>
                                    <p className="text-[hsl(var(--foreground))]">Nhấn nút <strong>Chia sẻ (Share)</strong> ở thanh dưới cùng trình duyệt Safari (biểu tượng <Share2 className="inline h-4 w-4 text-indigo-400" />).</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))]/30 text-xs font-bold text-white">2</span>
                                    <p className="text-[hsl(var(--foreground))]">Cuộn xuống và chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))]/30 text-xs font-bold text-white">3</span>
                                    <p className="text-[hsl(var(--foreground))]">Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải để hoàn tất.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3.5 text-sm">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))]/30 text-xs font-bold text-white">1</span>
                                    <p className="text-[hsl(var(--foreground))]">Mở menu trình duyệt bằng cách nhấn vào biểu tượng ba chấm (<MoreVertical className="inline h-4 w-4 text-indigo-400" />) ở góc màn hình.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))]/30 text-xs font-bold text-white">2</span>
                                    <p className="text-[hsl(var(--foreground))]">Chọn <strong>Cài đặt ứng dụng (Install app)</strong> hoặc <strong>Thêm vào màn hình chính</strong>.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--muted))]/30 text-xs font-bold text-white">3</span>
                                    <p className="text-[hsl(var(--foreground))]">Làm theo các bước hướng dẫn trên màn hình để xác nhận cài đặt.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="mt-6 flex justify-end">
                        <Button
                            onClick={() => setShowInstructions(false)}
                            className="w-full rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"
                        >
                            Đã hiểu
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
