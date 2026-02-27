"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    Check,
    Crown,
    Zap,
    Building2,
    Loader2,
    Star,
    GraduationCap,
    ArrowRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

interface Plan {
    id: string
    name: string
    description: string
    price_monthly: number
    price_yearly: number
    features: string[]
    max_exams: number
    max_questions_per_exam: number
    max_students: number
    ai_grading_enabled: boolean
    priority_support: boolean
}

interface Subscription {
    id: string
    status: string
    billing_cycle: string
    expires_at: string
    plan: Plan
}

export default function PricingPage() {
    const [plans, setPlans] = useState<Plan[]>([])
    const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
    const [loading, setLoading] = useState(true)
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
    const [processing, setProcessing] = useState<string | null>(null)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            const res = await fetch("/api/subscriptions")
            const data = await res.json()
            if (res.ok) {
                setPlans(data.plans || [])
                setCurrentSubscription(data.currentSubscription)
            }
        } catch (error) {
            console.error("Failed to fetch plans:", error)
        } finally {
            setLoading(false)
        }
    }

    async function handleSubscribe(planId: string) {
        setProcessing(planId)
        try {
            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "subscription", planId, billingCycle }),
            })
            const data = await res.json()
            if (data.free) {
                alert("Đã kích hoạt gói miễn phí!")
                fetchData()
            } else if (data.paymentUrl) {
                window.location.href = data.paymentUrl
            } else {
                alert(data.error || "Có lỗi xảy ra")
            }
        } catch (error) {
            console.error("Subscribe error:", error)
            alert("Không thể xử lý thanh toán")
        } finally {
            setProcessing(null)
        }
    }

    const getPlanIcon = (name: string) => {
        if (name.toLowerCase().includes("enterprise")) return <Building2 className="w-6 h-6" />
        if (name.toLowerCase().includes("pro")) return <Crown className="w-6 h-6" />
        return <Zap className="w-6 h-6" />
    }

    const formatPrice = (amount: number) => {
        if (amount === 0) return "Miễn phí"
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    <p className="text-sm text-muted-foreground">Đang tải...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="glass-nav sticky top-0 z-50 safe-top">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <GraduationCap className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-foreground">
                                Exam<span className="text-gradient">Hub</span>
                            </span>
                        </Link>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Link href="/login">
                                <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium hidden sm:inline-flex">
                                    Đăng nhập
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button className="gradient-primary hover:opacity-90 text-white border-0 shadow-lg shadow-indigo-500/25 font-semibold">
                                    Đăng ký ngay
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="py-16 px-4 relative">
                {/* Background */}
                <div className="absolute inset-0 gradient-mesh pointer-events-none" />
                <div className="absolute top-32 left-1/4 w-72 h-72 bg-indigo-400/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-32 right-1/4 w-96 h-96 bg-violet-400/5 rounded-full blur-3xl pointer-events-none" />

                <div className="max-w-6xl mx-auto relative z-10">
                    {/* Header */}
                    <div className="text-center mb-14">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-sm font-medium mb-4">
                            <Zap className="w-3.5 h-3.5" />
                            Pricing
                        </span>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
                            Chọn gói <span className="text-gradient-animated">phù hợp</span>
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Tất cả các gói đều bao gồm thử nghiệm miễn phí. Nâng cấp bất cứ lúc nào.
                        </p>
                    </div>

                    {/* Current subscription notice */}
                    {currentSubscription && (
                        <div className="mb-10 p-5 glass-card rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 border-emerald-500/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                                    <Star className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                        Bạn đang sử dụng gói {currentSubscription.plan.name}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Hết hạn: {new Date(currentSubscription.expires_at).toLocaleDateString("vi-VN")}
                                    </p>
                                </div>
                            </div>
                            <Link href="/student/dashboard">
                                <Button variant="outline" className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400">
                                    Vào Dashboard
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Billing toggle */}
                    <div className="flex justify-center mb-14">
                        <div className="inline-flex items-center glass-card rounded-2xl p-1.5">
                            <button
                                onClick={() => setBillingCycle("monthly")}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
                                    billingCycle === "monthly"
                                        ? "gradient-primary text-white shadow-lg shadow-indigo-500/20"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Hàng tháng
                            </button>
                            <button
                                onClick={() => setBillingCycle("yearly")}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 relative",
                                    billingCycle === "yearly"
                                        ? "gradient-primary text-white shadow-lg shadow-indigo-500/20"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                Hàng năm
                                <span className="absolute -top-3 -right-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold shadow">
                                    -17%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Pricing cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {plans.map((plan, index) => {
                            const isPopular = index === 1
                            const isCurrent = currentSubscription?.plan.id === plan.id
                            const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly

                            return (
                                <div
                                    key={plan.id}
                                    className={cn(
                                        "relative rounded-3xl p-8 transition-all duration-300",
                                        isPopular
                                            ? "gradient-primary text-white scale-[1.03] shadow-2xl shadow-indigo-500/30 z-10"
                                            : "glass-card hover:shadow-xl"
                                    )}
                                >
                                    {isPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-white rounded-full text-sm font-bold text-indigo-600 shadow-lg">
                                            ⭐ Phổ biến nhất
                                        </div>
                                    )}

                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
                                        isPopular
                                            ? "bg-white/15 backdrop-blur-sm text-white"
                                            : "gradient-primary-soft text-indigo-600 dark:text-indigo-400"
                                    )}>
                                        {getPlanIcon(plan.name)}
                                    </div>

                                    <h3 className={cn(
                                        "text-2xl font-bold mb-2",
                                        isPopular ? "text-white" : "text-foreground"
                                    )}>{plan.name}</h3>
                                    <p className={cn(
                                        "text-sm mb-6 h-10",
                                        isPopular ? "text-white/70" : "text-muted-foreground"
                                    )}>{plan.description}</p>

                                    <div className="mb-8">
                                        <span className={cn(
                                            "text-5xl font-extrabold",
                                            isPopular ? "text-white" : "text-foreground"
                                        )}>
                                            {price === 0 ? "0đ" : formatPrice(price)}
                                        </span>
                                        {price > 0 && (
                                            <span className={cn(
                                                "font-medium",
                                                isPopular ? "text-white/60" : "text-muted-foreground"
                                            )}>
                                                /{billingCycle === "yearly" ? "năm" : "tháng"}
                                            </span>
                                        )}
                                    </div>

                                    <Button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={processing === plan.id || isCurrent}
                                        className={cn(
                                            "w-full mb-8 h-12 text-base font-semibold rounded-xl",
                                            isPopular
                                                ? "bg-white hover:bg-white/90 text-indigo-600 shadow-lg"
                                                : isCurrent
                                                    ? "bg-muted text-muted-foreground"
                                                    : "gradient-primary text-white border-0 shadow-lg shadow-indigo-500/20 hover:opacity-90"
                                        )}
                                    >
                                        {processing === plan.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : isCurrent ? (
                                            "Đang sử dụng"
                                        ) : price === 0 ? (
                                            <>Bắt đầu miễn phí <ArrowRight className="w-4 h-4 ml-1" /></>
                                        ) : (
                                            <>Đăng ký ngay <ArrowRight className="w-4 h-4 ml-1" /></>
                                        )}
                                    </Button>

                                    <ul className="space-y-4">
                                        {(plan.features as string[]).map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <div className={cn(
                                                    "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                                    isPopular ? "bg-white/15" : "bg-emerald-500/10"
                                                )}>
                                                    <Check className={cn(
                                                        "w-3 h-3",
                                                        isPopular ? "text-white" : "text-emerald-600 dark:text-emerald-400"
                                                    )} />
                                                </div>
                                                <span className={cn(
                                                    "text-sm",
                                                    isPopular ? "text-white/80" : "text-muted-foreground"
                                                )}>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        })}
                    </div>

                    <div className="text-center mt-16">
                        <p className="text-muted-foreground">
                            Có câu hỏi?{" "}
                            <a href="mailto:support@luyende.vn" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                                Liên hệ hỗ trợ
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            <footer className="border-t border-border py-8 px-4 bg-card">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-foreground">ExamHub</span>
                    </div>
                    <p className="text-muted-foreground text-sm">
                        © 2026 ExamHub. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
