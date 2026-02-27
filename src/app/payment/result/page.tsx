"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, ArrowLeft, Home, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"

function PaymentResultContent() {
    const searchParams = useSearchParams()
    const success = searchParams.get("success") === "true"
    const message = searchParams.get("message") || (success ? "Thanh toán thành công!" : "Thanh toán thất bại")

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <nav className="glass-nav border-b border-border/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-center h-16 items-center">
                        <Link href="/"><div className="flex items-center gap-3">
                            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20"><GraduationCap className="w-5 h-5 text-white" /></div>
                            <span className="text-xl font-bold text-foreground">ExamHub</span>
                        </div></Link>
                    </div>
                </div>
            </nav>

            <div className="flex-1 flex items-center justify-center p-4">
                <div className="glass-card rounded-2xl max-w-md w-full shadow-xl">
                    <div className="p-8 text-center">
                        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${success ? "bg-emerald-100 dark:bg-emerald-900/30 ring-4 ring-emerald-50 dark:ring-emerald-900/20" : "bg-red-100 dark:bg-red-900/30 ring-4 ring-red-50 dark:ring-red-900/20"}`}>
                            {success ? <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />}
                        </div>
                        <h1 className={`text-2xl font-bold mb-2 ${success ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>{success ? "Thanh toán thành công!" : "Thanh toán thất bại"}</h1>
                        <p className="text-muted-foreground mb-8">{message}</p>
                        {success && (
                            <div className="bg-muted/30 border border-border/50 rounded-xl p-5 mb-8">
                                <p className="text-foreground font-medium mb-1">Cảm ơn bạn đã sử dụng ExamHub!</p>
                                <p className="text-sm text-muted-foreground">Gói dịch vụ của bạn đã được kích hoạt. Bạn có thể bắt đầu sử dụng ngay bây giờ.</p>
                            </div>
                        )}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            {!success && <Button variant="outline" className="border-border text-muted-foreground" onClick={() => window.history.back()}><ArrowLeft className="w-4 h-4 mr-2" />Thử lại</Button>}
                            <Link href="/student/dashboard"><Button className="gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 w-full"><Home className="w-4 h-4 mr-2" />Về Dashboard</Button></Link>
                        </div>
                        <p className="text-sm text-muted-foreground mt-8">Cần hỗ trợ? <a href="mailto:support@examhub.id.vn" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">Liên hệ chúng tôi</a></p>
                    </div>
                </div>
            </div>

            <footer className="border-t border-border/50 py-6 px-4 bg-card/50">
                <div className="max-w-7xl mx-auto flex justify-center"><p className="text-muted-foreground text-sm">© 2026 ExamHub. All rights reserved.</p></div>
            </footer>
        </div>
    )
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Đang tải...</div></div>}>
            <PaymentResultContent />
        </Suspense>
    )
}
