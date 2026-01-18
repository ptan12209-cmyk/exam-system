"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, ArrowLeft, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"

function PaymentResultContent() {
    const searchParams = useSearchParams()
    const success = searchParams.get("success") === "true"
    const message = searchParams.get("message") || (success ? "Thanh toán thành công!" : "Thanh toán thất bại")

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${success
                        ? "bg-green-500/20 border-2 border-green-500"
                        : "bg-red-500/20 border-2 border-red-500"
                    }`}>
                    {success ? (
                        <CheckCircle className="w-12 h-12 text-green-500" />
                    ) : (
                        <XCircle className="w-12 h-12 text-red-500" />
                    )}
                </div>

                {/* Title */}
                <h1 className={`text-2xl font-bold mb-2 ${success ? "text-green-400" : "text-red-400"}`}>
                    {success ? "Thanh toán thành công!" : "Thanh toán thất bại"}
                </h1>

                {/* Message */}
                <p className="text-slate-400 mb-8">
                    {message}
                </p>

                {/* Success content */}
                {success && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
                        <p className="text-white mb-2">Cảm ơn bạn đã sử dụng ExamHub!</p>
                        <p className="text-sm text-slate-400">
                            Gói dịch vụ của bạn đã được kích hoạt. Bạn có thể bắt đầu sử dụng ngay bây giờ.
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {!success && (
                        <Button
                            variant="outline"
                            className="border-slate-600 text-slate-300"
                            onClick={() => window.history.back()}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Thử lại
                        </Button>
                    )}
                    <Link href="/teacher/dashboard">
                        <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 w-full">
                            <Home className="w-4 h-4 mr-2" />
                            Về trang chủ
                        </Button>
                    </Link>
                </div>

                {/* Support link */}
                <p className="text-sm text-slate-500 mt-8">
                    Cần hỗ trợ?{" "}
                    <a href="mailto:support@examhub.vn" className="text-blue-400 hover:underline">
                        Liên hệ chúng tôi
                    </a>
                </p>
            </div>
        </div>
    )
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-pulse text-white">Loading...</div>
            </div>
        }>
            <PaymentResultContent />
        </Suspense>
    )
}
