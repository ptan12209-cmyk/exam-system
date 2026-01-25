"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, ArrowLeft, Home, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Suspense } from "react"

function PaymentResultContent() {
    const searchParams = useSearchParams()
    const success = searchParams.get("success") === "true"
    const message = searchParams.get("message") || (success ? "Thanh toán thành công!" : "Thanh toán thất bại")

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col">
            {/* Navigation */}
            <nav className="border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center h-16 items-center">
                        <Link href="/">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-xl font-bold text-gray-900 dark:text-white">LuyenDe 2026</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-4">
                <Card className="max-w-md w-full border-gray-200 dark:border-slate-700 shadow-xl bg-white dark:bg-slate-800">
                    <CardContent className="p-8 text-center">
                        {/* Icon */}
                        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${success
                            ? "bg-green-100 dark:bg-green-900/30 ring-4 ring-green-50 dark:ring-green-900/20"
                            : "bg-red-100 dark:bg-red-900/30 ring-4 ring-red-50 dark:ring-red-900/20"
                            }`}>
                            {success ? (
                                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                            ) : (
                                <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                            )}
                        </div>

                        {/* Title */}
                        <h1 className={`text-2xl font-bold mb-2 ${success ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                            {success ? "Thanh toán thành công!" : "Thanh toán thất bại"}
                        </h1>

                        {/* Message */}
                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                            {message}
                        </p>

                        {/* Success content */}
                        {success && (
                            <div className="bg-gray-50 dark:bg-slate-700 border border-gray-100 dark:border-slate-600 rounded-xl p-5 mb-8">
                                <p className="text-gray-800 dark:text-gray-200 font-medium mb-1">Cảm ơn bạn đã sử dụng LuyenDe!</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Gói dịch vụ của bạn đã được kích hoạt. Bạn có thể bắt đầu sử dụng ngay bây giờ.
                                </p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {!success && (
                                <Button
                                    variant="outline"
                                    className="border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300"
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Thử lại
                                </Button>
                            )}
                            <Link href="/student/dashboard">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full shadow-lg shadow-blue-500/20">
                                    <Home className="w-4 h-4 mr-2" />
                                    Về Dashboard
                                </Button>
                            </Link>
                        </div>

                        {/* Support link */}
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-8">
                            Cần hỗ trợ?{" "}
                            <a href="mailto:support@luyende.vn" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                                Liên hệ chúng tôi
                            </a>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Footer */}
            <footer className="border-t border-gray-200 dark:border-slate-800 py-6 px-4 bg-white dark:bg-slate-900">
                <div className="max-w-7xl mx-auto flex justify-center">
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                        © 2026 LuyenDe. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <div className="animate-pulse text-gray-500 dark:text-gray-400">Đang tải...</div>
            </div>
        }>
            <PaymentResultContent />
        </Suspense>
    )
}
