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
    GraduationCap
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
                body: JSON.stringify({
                    type: "subscription",
                    planId,
                    billingCycle,
                }),
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
            <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
            {/* Navigation */}
            <nav className="border-b border-gray-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-4">
                            <Link href="/">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                        <GraduationCap className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">LuyenDe 2026</span>
                                </div>
                            </Link>
                        </div>
                        <div className="flex items-center gap-3">
                            <ThemeToggle />
                            <Link href="/login">
                                <Button variant="ghost" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-medium">
                                    Đăng nhập
                                </Button>
                            </Link>
                            <Link href="/register">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                    Đăng ký ngay
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="py-12 px-4">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4">Bảng giá</h1>
                        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                            Chọn gói phù hợp với nhu cầu của bạn. Tất cả các gói đều bao gồm thử nghiệm miễn phí.
                        </p>
                    </div>

                    {/* Current subscription notice */}
                    {currentSubscription && (
                        <div className="mb-10 p-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                                    <Star className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-green-800 dark:text-green-300 font-semibold">
                                        Bạn đang sử dụng gói {currentSubscription.plan.name}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        Hết hạn: {new Date(currentSubscription.expires_at).toLocaleDateString("vi-VN")}
                                    </p>
                                </div>
                            </div>
                            <Link href="/student/dashboard">
                                <Button variant="outline" className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                                    Vào Dashboard
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Billing toggle */}
                    <div className="flex justify-center mb-12">
                        <div className="inline-flex items-center bg-gray-100 dark:bg-slate-800 rounded-xl p-1.5 shadow-inner">
                            <button
                                onClick={() => setBillingCycle("monthly")}
                                className={cn(
                                    "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all",
                                    billingCycle === "monthly"
                                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-md"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                )}
                            >
                                Hàng tháng
                            </button>
                            <button
                                onClick={() => setBillingCycle("yearly")}
                                className={cn(
                                    "px-6 py-2.5 rounded-lg text-sm font-semibold transition-all relative",
                                    billingCycle === "yearly"
                                        ? "bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-md"
                                        : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                )}
                            >
                                Hàng năm
                                <span className="absolute -top-3 -right-3 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold shadow">
                                    -17%
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Pricing cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan, index) => {
                            const isPopular = index === 1
                            const isCurrent = currentSubscription?.plan.id === plan.id
                            const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly

                            return (
                                <div
                                    key={plan.id}
                                    className={cn(
                                        "relative rounded-2xl border p-8 transition-all duration-300 bg-white dark:bg-slate-900",
                                        isPopular
                                            ? "border-blue-500 shadow-2xl shadow-blue-500/20 scale-105 z-10"
                                            : "border-gray-200 dark:border-slate-800 shadow-lg hover:shadow-xl hover:border-gray-300 dark:hover:border-slate-700"
                                    )}
                                >
                                    {isPopular && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full text-sm font-bold text-white shadow-lg">
                                            Phổ biến nhất
                                        </div>
                                    )}

                                    <div className={cn(
                                        "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg",
                                        isPopular
                                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                                            : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                                    )}>
                                        {getPlanIcon(plan.name)}
                                    </div>

                                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 h-10">{plan.description}</p>

                                    <div className="mb-8">
                                        <span className="text-5xl font-extrabold text-gray-900 dark:text-white">
                                            {price === 0 ? "0đ" : formatPrice(price)}
                                        </span>
                                        {price > 0 && (
                                            <span className="text-gray-500 dark:text-gray-400 font-medium">
                                                /{billingCycle === "yearly" ? "năm" : "tháng"}
                                            </span>
                                        )}
                                    </div>

                                    <Button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={processing === plan.id || isCurrent}
                                        className={cn(
                                            "w-full mb-8 h-12 text-base font-semibold",
                                            isPopular
                                                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20"
                                                : isCurrent
                                                    ? "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400"
                                                    : "bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900"
                                        )}
                                    >
                                        {processing === plan.id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : isCurrent ? (
                                            "Đang sử dụng"
                                        ) : price === 0 ? (
                                            "Bắt đầu miễn phí"
                                        ) : (
                                            "Đăng ký ngay"
                                        )}
                                    </Button>

                                    <ul className="space-y-4">
                                        {(plan.features as string[]).map((feature, i) => (
                                            <li key={i} className="flex items-start gap-3">
                                                <Check className={cn(
                                                    "w-5 h-5 shrink-0 mt-0.5",
                                                    isPopular ? "text-blue-600" : "text-green-600"
                                                )} />
                                                <span className="text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )
                        })}
                    </div>

                    <div className="text-center mt-16">
                        <p className="text-gray-600 dark:text-gray-400">
                            Có câu hỏi?{" "}
                            <a href="mailto:support@luyende.vn" className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                                Liên hệ hỗ trợ
                            </a>
                        </p>
                    </div>
                </div>
            </div>

            <footer className="border-t border-gray-200 dark:border-slate-800 py-8 px-4 bg-white dark:bg-slate-950 mt-12">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-lg flex items-center justify-center">
                            <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">LuyenDe 2026</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-500 text-sm">
                        © 2026 LuyenDe. All rights reserved.
                    </p>
                </div>
            </footer>
        </div>
    )
}
