"use client"

import { useAntiCheat } from "./AntiCheatProvider"
import { AlertTriangle, X, Maximize } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AntiCheatWarning() {
    const { warningVisible, warningMessage, dismissWarning, totalViolations, isFullscreen, enterFullscreen } = useAntiCheat()

    if (!warningVisible) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="bg-slate-800 border border-red-500/50 rounded-xl p-6 max-w-md mx-4 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">
                            Phát hiện vi phạm!
                        </h3>
                        <p className="text-slate-300 text-sm mb-4">
                            {warningMessage}
                        </p>

                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex gap-1">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className={`w-3 h-3 rounded-full ${i <= totalViolations
                                                ? "bg-red-500"
                                                : "bg-slate-600"
                                            }`}
                                    />
                                ))}
                            </div>
                            <span className="text-xs text-slate-400">
                                {totalViolations}/3 lần vi phạm
                            </span>
                        </div>

                        <div className="flex gap-2">
                            {!isFullscreen && (
                                <Button
                                    onClick={() => {
                                        enterFullscreen()
                                        dismissWarning()
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Maximize className="w-4 h-4 mr-2" />
                                    Vào toàn màn hình
                                </Button>
                            )}
                            <Button
                                onClick={dismissWarning}
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                Đã hiểu
                            </Button>
                        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 max-w-lg mx-4 text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Maximize className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">
                    Chế độ làm bài
                </h2>
                <p className="text-slate-400 mb-6">
                    Để đảm bảo tính công bằng, bạn cần làm bài trong chế độ <strong className="text-white">toàn màn hình</strong>.
                </p>

                <div className="bg-slate-700/50 rounded-lg p-4 mb-6 text-left">
                    <h4 className="text-sm font-medium text-white mb-2">⚠️ Lưu ý:</h4>
                    <ul className="text-xs text-slate-400 space-y-1">
                        <li>• Không được chuyển tab trong khi làm bài</li>
                        <li>• Không được thoát chế độ toàn màn hình</li>
                        <li>• Không được copy/paste nội dung</li>
                        <li>• Vi phạm 3 lần = tự động nộp bài</li>
                    </ul>
                </div>

                <Button
                    onClick={handleStart}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full"
                >
                    <Maximize className="w-5 h-5 mr-2" />
                    Bắt đầu làm bài
                </Button>
            </div>
        </div>
    )
}

export function ViolationIndicator() {
    const { tabSwitches, fullscreenExits, totalViolations } = useAntiCheat()

    if (totalViolations === 0) return null

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-red-400">
                {totalViolations}/3 vi phạm
            </span>
        </div>
    )
}
