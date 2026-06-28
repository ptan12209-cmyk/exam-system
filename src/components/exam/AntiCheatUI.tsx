"use client"

import { useAntiCheat } from "./AntiCheatProvider"
import { AlertTriangle, X, Maximize, ShieldAlert, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AntiCheatWarning() {
    const { warningVisible, warningMessage, dismissWarning, totalViolations, isFullscreen, enterFullscreen } = useAntiCheat()

    if (!warningVisible) return null

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/80 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="border border-red-500/30 rounded-2xl p-8 max-w-md mx-4 shadow-[0_30px_80px_-20px_rgba(239,68,68,0.2)] animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center shrink-0 mb-4 animate-bounce">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                    </div>
                    
                    <h3 className="text-2xl font-bold tracking-tight mb-3">
                        Phát hiện vi phạm!
                    </h3>
                    <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed mb-6">
                        {warningMessage}
                    </p>

                    <div className="flex flex-col items-center gap-2 mb-6 w-full rounded-2xl border border-[hsl(var(--border))]/40 bg-[hsl(var(--muted))]/5 p-4">
                        <div className="flex gap-1.5">
                            {[1, 2, 3].map((i) => (
                                <div
                                    key={i}
                                    className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${i <= totalViolations
                                            ? "bg-red-500 scale-110 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                                            : "bg-[hsl(var(--border))]"
                                        }`}
                                />
                            ))}
                        </div>
                        <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                            Cảnh báo: {totalViolations}/3 lần vi phạm
                        </span>
                    </div>

                    <div className="flex gap-3 w-full">
                        {!isFullscreen && (
                            <Button
                                onClick={() => {
                                    enterFullscreen()
                                    dismissWarning()
                                }}
                                className="flex-1 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all duration-200"
                            >
                                <Maximize className="w-4 h-4 mr-2" />
                                Vào toàn màn hình
                            </Button>
                        )}
                        <Button
                            onClick={dismissWarning}
                            variant="outline"
                            className="flex-1 rounded-full border-[hsl(var(--border))]/70 bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))]/10 transition-all duration-200"
                        >
                            Đã hiểu
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export function FullscreenPrompt({ onStart }: { onStart: () => void }) {
    const { enterFullscreen } = useAntiCheat()

    const handleStart = async () => {
        await enterFullscreen()
        onStart()
    }

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[hsl(var(--background))]/95 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="border border-[hsl(var(--border))]/60 rounded-[2.5rem] p-8 max-w-lg mx-4 text-center shadow-[0_30px_100px_-40px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in duration-300">
                <div className="w-20 h-20 bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldAlert className="w-10 h-10 text-[hsl(var(--foreground))]" />
                </div>
                <h2 className="text-3xl font-medium tracking-tight mb-3">
                    Xác nhận chế độ làm bài
                </h2>
                <p className="text-[hsl(var(--muted-foreground))] text-sm leading-relaxed mb-6">
                    Để đảm bảo tính trung thực và công bằng cho kỳ thi, bạn cần làm bài trong chế độ <strong className="text-[hsl(var(--foreground))] font-semibold">toàn màn hình</strong> dưới sự giám sát tự động.
                </p>

                <div className="rounded-2xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--muted))]/5 p-5 mb-8 text-left space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
                        ⚠️ Quy chế phòng thi bắt buộc:
                    </h4>
                    <ul className="text-sm text-[hsl(var(--muted-foreground))] space-y-2.5">
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 font-semibold">•</span>
                            <span>Không chuyển tab hoặc thoát khỏi màn hình làm bài</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 font-semibold">•</span>
                            <span>Không thoát chế độ toàn màn hình trước khi nộp bài</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 font-semibold">•</span>
                            <span>Không copy/paste hay thực hiện các phím tắt sao chép</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 font-semibold">•</span>
                            <span className="font-medium text-[hsl(var(--foreground))]">Tự động nộp bài nếu vi phạm quá 3 lần</span>
                        </li>
                    </ul>
                </div>

                <Button
                    onClick={handleStart}
                    size="lg"
                    className="w-full rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90 py-6 text-base font-semibold shadow-lg shadow-[hsl(var(--foreground))]/10 transition-all duration-300"
                >
                    <Maximize className="w-5 h-5 mr-2 animate-pulse" />
                    Bắt đầu làm bài ngay
                </Button>
            </div>
        </div>
    )
}

export function ViolationIndicator() {
    const { tabSwitches, fullscreenExits, totalViolations } = useAntiCheat()

    if (totalViolations === 0) return null

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-semibold text-red-500">
                {totalViolations}/3 lần vi phạm
            </span>
        </div>
    )
}

