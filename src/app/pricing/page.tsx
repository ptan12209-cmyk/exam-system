"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
    Check,
    Crown,
    Zap,
    Building2,
    Loader2,
    ArrowLeft,
    Star
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
                // Free plan activated
                alert("Đã kích hoạt gói miễn phí!")
                fetchData()
            } else if (data.paymentUrl) {
                // Redirect to VNPay
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
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-12 px-4">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/teacher/dashboard">
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-white">Nâng cấp tài khoản</h1>
                        <p className="text-slate-400">Chọn gói phù hợp với nhu cầu của bạn</p>
                    </div>
                </div>

                {/* Current subscription notice */}
                {currentSubscription && (
                    <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Star className="w-5 h-5 text-green-500" />
                            <div>
                                <p className="text-green-400 font-medium">
                                    Bạn đang sử dụng gói {currentSubscription.plan.name}
                                </p>
                                <p className="text-sm text-slate-400">
                                    Hết hạn: {new Date(currentSubscription.expires_at).toLocaleDateString("vi-VN")}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Billing toggle */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex items-center bg-slate-800 rounded-xl p-1">
                        <button
                            onClick={() => setBillingCycle("monthly")}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-medium transition-all",
                                billingCycle === "monthly"
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Hàng tháng
                        </button>
                        <button
                            onClick={() => setBillingCycle("yearly")}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-medium transition-all relative",
                                billingCycle === "yearly"
                                    ? "bg-blue-600 text-white"
                                    : "text-slate-400 hover:text-white"
                            )}
                        >
                            Hàng năm
                            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                                -17%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {plans.map((plan, index) => {
                        const isPopular = index === 1 // Pro is popular
                        const isCurrent = currentSubscription?.plan.id === plan.id
                        const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly

                        return (
                            <div
                                key={plan.id}
                                className={cn(
                                    "relative rounded-2xl border p-8 transition-all",
                                    isPopular
                                        ? "bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-500/50 scale-105"
                                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                                )}
                            >
                                {/* Popular badge */}
                                {isPopular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full text-sm font-medium text-white">
                                        Phổ biến nhất
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={cn(
                                    "w-14 h-14 rounded-2xl flex items-center justify-center mb-6",
                                    isPopular
                                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                                        : "bg-slate-700 text-slate-300"
                                )}>
                                    {getPlanIcon(plan.name)}
                                </div>

                                {/* Name & Price */}
                                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                                <p className="text-slate-400 text-sm mb-4">{plan.description}</p>

                                <div className="mb-6">
                                    <span className="text-4xl font-bold text-white">
                                        {price === 0 ? "0đ" : formatPrice(price)}
                                    </span>
                                    {price > 0 && (
                                        <span className="text-slate-400">
                                            /{billingCycle === "yearly" ? "năm" : "tháng"}
                                        </span>
                                    )}
                                </div>

                                {/* CTA */}
                                <Button
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={processing === plan.id || isCurrent}
                                    className={cn(
                                        "w-full mb-6",
                                        isPopular
                                            ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                                            : "bg-slate-700 hover:bg-slate-600"
                                    )}
                                >
                                    {processing === plan.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : isCurrent ? (
                                        "Đang sử dụng"
                                    ) : price === 0 ? (
                                        "Bắt đầu miễn phí"
                                    ) : (
                                        "Đăng ký ngay"
                                    )}
                                </Button>

                                {/* Features */}
                                <ul className="space-y-3">
                                    {(plan.features as string[]).map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <Check className={cn(
                                                "w-5 h-5 shrink-0 mt-0.5",
                                                isPopular ? "text-blue-400" : "text-green-500"
                                            )} />
                                            <span className="text-sm text-slate-300">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )
                    })}
                </div>

                {/* FAQ Link */}
                <div className="text-center mt-12">
                    <p className="text-slate-400">
                        Có câu hỏi?{" "}
                        <a href="mailto:support@examhub.vn" className="text-blue-400 hover:underline">
                            Liên hệ hỗ trợ
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
