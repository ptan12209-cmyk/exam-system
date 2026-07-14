"use client"

import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, XCircle, ArrowLeft, Home, GraduationCap, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Suspense } from "react"
import { cn } from "@/lib/utils"
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_URL,
  SUPPORT_ZALO,
  supportZaloUrlWithText,
} from "@/lib/support"

function PaymentResultContent() {
    const searchParams = useSearchParams()
    const success = searchParams.get("success") === "true"
    const message = searchParams.get("message") || (success ? "Thanh toán thành công!" : "Thanh toán thất bại")
    const flow = searchParams.get("flow")
    const subject = searchParams.get("subject")
    const isOnlineStudy = flow === "online-study"
    const dashboardHref = isOnlineStudy
        ? (success && subject
            ? `/online-student/study?subject=${encodeURIComponent(subject)}`
            : "/online-student/dashboard")
        : "/student/dashboard"
    const dashboardLabel = isOnlineStudy
        ? (success && subject ? "Vào học ngay" : "Về trang học online")
        : "Dashboard"

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
                            <div className="mb-8 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--muted))]/10 p-5 text-left space-y-2">
                                <p className="font-medium">Cảm ơn em đã chọn StudyHub.</p>
                                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                                    Quyền truy cập đã kích hoạt. Cần hỗ trợ kỹ thuật hoặc thắc mắc đơn hàng: liên hệ Zalo/email hỗ trợ — thầy phản hồi nhanh.
                                </p>
                                <p className="text-sm italic text-[hsl(var(--muted-foreground))]">
                                    Học viên là trung tâm; mọi góp ý đều được lắng nghe.
                                </p>
                                {isOnlineStudy && (
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] pt-1">
                                        Môn học đã được mở khóa tự động. Em có thể bắt đầu học ngay.
                                    </p>
                                )}
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
                            <Link href={dashboardHref} className="flex-1">
                                <Button className="w-full rounded-full bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                                    <Home className="mr-2 h-4 w-4" />{dashboardLabel}
                                </Button>
                            </Link>
                        </div>

                        {success && (
                            <div className="mt-6 flex flex-col gap-2 text-sm">
                                <a
                                    href={supportZaloUrlWithText("Hỗ trợ StudyHub — sau thanh toán")}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center gap-2 font-medium text-[hsl(var(--foreground))] underline-offset-4 hover:underline"
                                >
                                    <MessageCircle className="h-4 w-4" />
                                    Zalo hỗ trợ {SUPPORT_ZALO}
                                </a>
                                <Link
                                    href="/online-student/feedback"
                                    className="text-center text-[hsl(var(--muted-foreground))] underline-offset-4 hover:underline"
                                >
                                    Góp ý để StudyHub tốt hơn
                                </Link>
                            </div>
                        )}
                        
                        <p className="mt-8 text-sm text-[hsl(var(--muted-foreground))]">
                            Cần hỗ trợ?{" "}
                            <a
                                href={SUPPORT_EMAIL_URL}
                                className="font-medium text-[hsl(var(--foreground))] underline-offset-4 hover:underline"
                            >
                                {SUPPORT_EMAIL}
                            </a>
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
