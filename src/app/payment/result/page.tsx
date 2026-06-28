"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, ArrowLeft, Home, GraduationCap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"
import { cn } from "@/lib/utils"

function PaymentResultContent() {
    const searchParams = useSearchParams()
    const success = searchParams.get("success") === "true"
    const message = searchParams.get("message") || (success ? "Thanh toán thành công!" : "Thanh toán thất bại")

    return (
        <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--foreground))] selection:text-[hsl(var(--background))]">
            <nav className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/70 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-center px-4">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[hsl(var(--border))]/60">
                            <GraduationCap className="h-4 w-4" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight">ExamHub</span>
                    </Link>
                </div>
            </nav>

            <div className="flex min-h-screen items-center justify-center p-4 pt-24">
                <div className="w-full max-w-md rounded-2xl p-8 shadow-sm">
                    <div className="text-center">
                        <div className={cn(
                            "mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ring-4",
                            success 
                                ? "bg-emerald-500/10 ring-emerald-500/5 text-emerald-500" 
                                : "bg-red-500/10 ring-red-500/5 text-red-500"
                        )}>
                            {success ? <CheckCircle className="h-10 w-10" /> : <XCircle className="h-10 w-10" />}
                        </div>
                        
                        <h1 className={cn(
                            "mb-2 text-2xl font-bold tracking-tight",
                            success ? "text-emerald-500" : "text-red-500"
                        )}>
                            {success ? "Thanh toán thành công!" : "Thanh toán thất bại"}
                        </h1>
                        
                        <p className="mb-8 text-[hsl(var(--muted-foreground))]">
                            {message}
                        </p>

                        {success && (
                            <div className="mb-8 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 p-5 text-left">
                                <p className="mb-1 font-medium">Cảm ơn bạn đã sử dụng ExamHub!</p>
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                    Gói dịch vụ của bạn đã được kích hoạt. Bạn có thể bắt đầu sử dụng ngay bây giờ.
                                </p>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 sm:flex-row justify-center">
                            {!success && (
                                <Button 
                                    variant="outline" 
                                    className="rounded-full border-[hsl(var(--border))]/70 bg-transparent flex-1" 
                                    onClick={() => window.history.back()}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />Thử lại
                                </Button>
                            )}
                            <Link href="/student/dashboard" className="flex-1">
                                <Button className="w-full rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                                    <Home className="mr-2 h-4 w-4" />Dashboard
                                </Button>
                            </Link>
                        </div>
                        
                        <p className="mt-8 text-sm text-[hsl(var(--muted-foreground))]">
                            Cần hỗ trợ? <a href="mailto:support@examhub.id.vn" className="font-medium text-[hsl(var(--foreground))] underline-offset-4 hover:underline">Liên hệ chúng tôi</a>
                        </p>
                    </div>
                </div>
            </div>

            <footer className="border-t border-[hsl(var(--border))]/25 py-8">
                <div className="mx-auto flex max-w-7xl justify-center">
                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                        © 2026 ExamHub. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}

export default function PaymentResultPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--background))]">
                <div className="animate-pulse text-[hsl(var(--muted-foreground))]">Đang tải...</div>
            </div>
        }>
            <PaymentResultContent />
        </Suspense>
    )
}
