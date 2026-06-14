"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Building2, Check, Crown, Loader2, Sparkles, Star, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/ui/ThemeToggle"
import { useToast } from "@/components/ui/toast"

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
  const { success, error: toastError } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly")
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
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
    })()
  }, [])

  const handleSubscribe = async (planId: string) => {
    setProcessing(planId)
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "subscription", planId, billingCycle }),
      })
      const data = await res.json()

      if (data.free) {
        success("Đã kích hoạt gói miễn phí!")
        await fetch("/api/subscriptions")
      } else if (data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        toastError(data.error || "Có lỗi xảy ra")
      }
    } catch {
      toastError("Không thể xử lý thanh toán")
    } finally {
      setProcessing(null)
    }
  }

  const formatPrice = (amount: number) =>
    amount === 0 ? "Miễn phí" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount)

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--foreground))] selection:text-[hsl(var(--background))]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))]/30 bg-[hsl(var(--background))]/80 px-6 py-4 backdrop-blur-xl md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[hsl(var(--foreground))]/60">
              <div className="h-4 w-4 rounded-full border border-[hsl(var(--foreground))]/60" />
            </div>
            <span className="text-lg font-bold tracking-tight">ExamHub</span>
          </Link>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:inline-flex">
              <Button variant="outline" className="rounded-full border-[hsl(var(--border))]/70 bg-transparent px-5">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/register">
              <Button className="rounded-full bg-[hsl(var(--foreground))] px-5 text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90">
                Đăng ký ngay
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="px-6 pt-28 md:px-10 md:pt-32">
        <section className="mx-auto max-w-7xl pb-20 text-center">
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/60 px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))]">
            <Sparkles className="h-4 w-4" /> Pricing
          </div>
          <h1 className="mx-auto max-w-4xl text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">
            Chọn gói phù hợp với <span className="font-serif-italic">nhịp vận hành</span> của bạn
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-[1.7] text-[hsl(var(--muted-foreground))]">
            Giữ mọi thứ rõ ràng, gọn nhẹ và đủ mạnh để bạn tạo đề, quản lý học sinh, theo dõi tiến độ và mở rộng khi cần.
          </p>

          <div className="mx-auto mt-10 inline-flex rounded-full border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))] p-1">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-medium transition-colors",
                billingCycle === "monthly" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "text-[hsl(var(--muted-foreground))]"
              )}
            >
              Hàng tháng
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-medium transition-colors",
                billingCycle === "yearly" ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "text-[hsl(var(--muted-foreground))]"
              )}
            >
              Hàng năm
            </button>
          </div>
        </section>

        {currentSubscription && (
          <section className="mx-auto mb-10 max-w-7xl rounded-[2rem] border border-emerald-500/20 bg-emerald-500/5 p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Star className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-600">Bạn đang sử dụng gói {currentSubscription.plan.name}</p>
                  <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
                    Hết hạn: {new Date(currentSubscription.expires_at).toLocaleDateString("vi-VN")}
                  </p>
                </div>
              </div>
              <Link href="/student/dashboard">
                <Button variant="outline" className="rounded-full border-emerald-300 bg-transparent text-emerald-700 hover:bg-emerald-500/10">
                  Vào Dashboard
                </Button>
              </Link>
            </div>
          </section>
        )}

        <section className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3 pb-24">
          {plans.map((plan, index) => {
            const isPopular = index === 1
            const isCurrent = currentSubscription?.plan.id === plan.id
            const price = billingCycle === "yearly" ? plan.price_yearly : plan.price_monthly

            return (
              <article
                key={plan.id}
                className={cn(
                  "relative rounded-[2rem] p-8 shadow-sm transition-transform hover:-translate-y-1",
                  isPopular ? "bg-[hsl(var(--foreground))] text-[hsl(var(--background))]" : "liquid-glass"
                )}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-xs font-semibold text-[hsl(var(--foreground))]">
                    Phổ biến nhất
                  </div>
                )}

                <div className={cn("mb-6 flex h-14 w-14 items-center justify-center rounded-2xl", isPopular ? "bg-white/10" : "bg-[hsl(var(--muted))]/20")}>{plan.name.toLowerCase().includes("enterprise") ? <Building2 className="h-6 w-6" /> : plan.name.toLowerCase().includes("pro") ? <Crown className="h-6 w-6" /> : <Zap className="h-6 w-6" />}</div>
                <h3 className="text-2xl font-semibold">{plan.name}</h3>
                <p className={cn("mt-3 min-h-12 text-sm leading-6", isPopular ? "text-white/70" : "text-[hsl(var(--muted-foreground))]")}>{plan.description}</p>

                <div className="mt-8 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-tight">{formatPrice(price)}</span>
                  {price > 0 && <span className={cn("pb-1", isPopular ? "text-white/60" : "text-[hsl(var(--muted-foreground))]")}>/{billingCycle === "yearly" ? "năm" : "tháng"}</span>}
                </div>

                <Button
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={processing === plan.id || isCurrent}
                  className={cn(
                    "mt-8 w-full rounded-full py-6 text-sm font-semibold",
                    isPopular
                      ? "bg-white text-[hsl(var(--foreground))] hover:bg-white/90"
                      : isCurrent
                        ? "bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
                        : "bg-[hsl(var(--foreground))] text-[hsl(var(--background))] hover:bg-[hsl(var(--foreground))]/90"
                  )}
                >
                  {processing === plan.id ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isCurrent ? (
                    "Đang sử dụng"
                  ) : price === 0 ? (
                    <>
                      Bắt đầu miễn phí <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Đăng ký ngay <ArrowRight className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className={cn("mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full", isPopular ? "bg-white/10" : "bg-emerald-500/10") }>
                        <Check className={cn("h-3 w-3", isPopular ? "text-white" : "text-emerald-600")} />
                      </div>
                      <span className={cn("text-sm leading-6", isPopular ? "text-white/80" : "text-[hsl(var(--muted-foreground))]")}>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </section>

        <section className="mx-auto max-w-7xl pb-28">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { title: "Rõ ràng", desc: "Mỗi gói được trình bày ngắn gọn để bạn quyết định nhanh hơn." },
              { title: "Lin hoạt", desc: "Chuyển đổi giữa chu kỳ tháng và năm chỉ bằng một thao tác." },
              { title: "Sẵn sàng mở rộng", desc: "Khi nhu cầu tăng, nâng cấp gói mà không làm gián đoạn trải nghiệm." },
            ].map((item) => (
              <div key={item.title} className="border-l border-[hsl(var(--border))]/50 pl-6">
                <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{item.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-16 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Có câu hỏi? <a href="mailto:support@luyende.vn" className="font-medium text-[hsl(var(--foreground))] underline decoration-[hsl(var(--border))] underline-offset-4">Liên hệ hỗ trợ</a>
          </p>
        </section>
      </main>

      <footer className="border-t border-[hsl(var(--border))]/20 px-6 py-12 md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[hsl(var(--foreground))]/60">
              <div className="h-4 w-4 rounded-full border border-[hsl(var(--foreground))]/60" />
            </div>
            <span className="font-semibold">ExamHub</span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">© 2026 ExamHub. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
