"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { OnlineStudentShell } from "@/components/online-student/OnlineStudentShell"
import { OnlineStudentTopbar } from "@/components/online-student/OnlineStudentTopbar"
import { Loading } from "@/components/shared/Loading"
import { PayosQrDisplay } from "@/components/payment/PayosQrDisplay"
import { getOnlineSubjectInfo, ONLINE_SUBJECTS } from "@/lib/subjects"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

import { ErrorState } from "@/components/online-student/ErrorState"
import { cn } from "@/lib/utils"

type PayState = "loading" | "ready" | "polling" | "success" | "error"

const PAY_STEPS = [
  { key: "create", label: "Tạo đơn" },
  { key: "qr", label: "Quét QR" },
  { key: "confirm", label: "Xác nhận" },
  { key: "done", label: "Vào học" },
] as const

function stepIndex(state: PayState): number {
  if (state === "loading") return 0
  if (state === "ready" || state === "polling") return 1
  if (state === "success") return 3
  if (state === "error") return 0
  return 0
}

function PaymentStepBar({ state }: { state: PayState }) {
  const active = stepIndex(state)
  // When polling, highlight confirm as in-progress
  const confirmActive = state === "polling"
  return (
    <ol className="mb-6 grid grid-cols-4 gap-1 sm:gap-2" aria-label="Các bước thanh toán">
      {PAY_STEPS.map((s, i) => {
        const done = state === "success" ? i <= 3 : i < active || (confirmActive && i <= 2 && i > 0)
        const current =
          state === "success"
            ? i === 3
            : confirmActive
              ? i === 2
              : i === active
        return (
          <li key={s.key} className="flex flex-col items-center gap-1.5 min-w-0">
            <div
              className={cn(
                "h-1.5 w-full rounded-full transition-colors",
                done || current ? "bg-[var(--os-accent)]" : "bg-[var(--os-border)]",
                current && state !== "success" && "animate-pulse"
              )}
            />
            <span
              className={cn(
                "text-[9px] sm:text-[10px] font-mono uppercase truncate max-w-full",
                current || done ? "text-[var(--os-accent)] font-bold" : "text-[var(--os-muted)]"
              )}
            >
              {s.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price)
}

function PaymentPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const subjectKey = (searchParams.get("subject") || "").trim()
  const subjectInfo = getOnlineSubjectInfo(subjectKey)
  const isValidSubject = ONLINE_SUBJECTS.some((s) => s.value === subjectKey)

  const supabase = createClient()
  const [profileName, setProfileName] = useState<string | null>(null)
  const [state, setState] = useState<PayState>("loading")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const [orderId, setOrderId] = useState<string | null>(null)
  const [amount, setAmount] = useState(0)
  const [qrPayload, setQrPayload] = useState<string | null>(null)
  const [accountNumber, setAccountNumber] = useState<string | null>(null)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [description, setDescription] = useState<string | null>(null)
  const [pollHint, setPollHint] = useState("Đang chờ thanh toán…")
  const [copyOk, setCopyOk] = useState<string | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const creatingRef = useRef(false)

  const stopPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopyOk(label)
      setTimeout(() => setCopyOk(null), 1500)
    } catch {
      setCopyOk(null)
    }
  }

  const checkOrderStatus = useCallback(
    async (id: string, silent = false) => {
      try {
        const res = await fetch("/api/online-study/orders")
        const data = await res.json()
        if (!res.ok || !data.success) {
          if (!silent) setPollHint("Không kiểm tra được trạng thái. Thử lại.")
          return false
        }
        const orders = data.data?.orders || data.data || []
        const list = Array.isArray(orders) ? orders : []
        const mine = list.find((o: { id: string }) => o.id === id)
        if (mine?.status === "success") {
          stopPoll()
          setState("success")
          return true
        }
        if (mine?.status === "failed") {
          stopPoll()
          setState("error")
          setErrorMsg("Đơn hàng thất bại hoặc bị hủy. Vui lòng tạo lại.")
          return false
        }
        if (!silent) setPollHint("Chưa nhận được thanh toán. Giữ nguyên nội dung CK và đợi thêm…")
        return false
      } catch {
        if (!silent) setPollHint("Lỗi mạng khi kiểm tra. Thử lại sau.")
        return false
      }
    },
    []
  )

  const startPolling = useCallback(
    (id: string) => {
      stopPoll()
      setState("polling")
      setPollHint("Đang theo dõi thanh toán tự động…")
      // Immediate check then every 4s
      void checkOrderStatus(id, true)
      pollRef.current = setInterval(() => {
        void checkOrderStatus(id, true).then((ok) => {
          if (ok) stopPoll()
        })
      }, 4000)
    },
    [checkOrderStatus]
  )

  // Auth + create payOS order
  useEffect(() => {
    if (!isValidSubject) {
      setState("error")
      setErrorMsg("Môn học không hợp lệ.")
      return
    }

    let cancelled = false

    ;(async () => {
      if (creatingRef.current) return
      creatingRef.current = true
      setState("loading")
      setErrorMsg(null)

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.push(`/login?redirectTo=${encodeURIComponent(`/online-student/payment?subject=${subjectKey}`)}`)
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single()

        if (!profile || (profile.role !== "student" && profile.role !== "online_student")) {
          router.push("/login")
          return
        }
        if (!cancelled) setProfileName(profile.full_name)

        // Already unlocked?
        const resSub = await fetch("/api/online-study/my-subjects")
        const dataSub = await resSub.json()
        if (resSub.ok && dataSub.success) {
          const list: string[] = dataSub.data || []
          if (list.includes("all") || list.includes(subjectKey)) {
            if (!cancelled) setState("success")
            return
          }
        }

        const res = await fetch("/api/online-study/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subjectKey }),
        })
        const data = await res.json()
        if (cancelled) return

        if (!res.ok || !data.success || !data.data) {
          const msg =
            data?.error?.message || data?.error || "Không tạo được đơn thanh toán payOS"
          throw new Error(typeof msg === "string" ? msg : "Tạo đơn thất bại")
        }

        const d = data.data
        if (d.unlocked || d.status === "success" || d.free) {
          setState("success")
          return
        }

        if (d.paymentMethod !== "payos" || !d.qrCode) {
          throw new Error(
            d.paymentError ||
              "Không lấy được mã QR payOS. Kiểm tra cấu hình PAYOS_* trên server."
          )
        }

        setOrderId(d.id)
        setAmount(Number(d.amount) || 0)
        setQrPayload(d.qrCode)
        setAccountNumber(d.accountNumber || null)
        setAccountName(d.accountName || null)
        setDescription(d.payosDescription || d.memo || null)
        setState("ready")
        startPolling(d.id)
      } catch (e) {
        if (!cancelled) {
          setState("error")
          setErrorMsg(e instanceof Error ? e.message : "Lỗi tạo thanh toán")
        }
      } finally {
        creatingRef.current = false
      }
    })()

    return () => {
      cancelled = true
      stopPoll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey, isValidSubject])

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-[var(--os-bg)] flex flex-col items-center justify-center px-4">
        <Loading label="Đang tạo đơn thanh toán payOS…" />
        <p className="mt-4 text-[11px] text-[var(--os-muted)] font-mono text-center max-w-xs">
          Bước 1/4 · Tạo đơn an toàn · không trừ tiền trước khi bạn CK
        </p>
      </div>
    )
  }

  const showQr = (state === "ready" || state === "polling") && !!qrPayload

  return (
    <OnlineStudentShell>
      <OnlineStudentTopbar name={profileName} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-3xl px-4 pb-36 pt-6 sm:px-6 lg:px-8 lg:pb-28">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/online-student/dashboard"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--os-border)] text-[var(--os-muted)] hover:text-[var(--os-fg)] hover:border-[var(--os-accent)]/40 transition-colors"
            aria-label="Về dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--os-muted)]">
              Thanh toán khóa học
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--os-fg)]">
              {subjectInfo.icon} {subjectInfo.label}
            </h1>
          </div>
        </div>

        <PaymentStepBar state={state} />

        <div className="mb-5 rounded-xl border border-[var(--os-border)] bg-[var(--os-card)]/60 px-3 py-2.5 flex items-start gap-2 text-[11px] text-[var(--os-muted)]">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Chuyển khoản đúng số tiền + nội dung → <strong className="text-[var(--os-fg)]">tự mở khóa</strong> qua
            payOS. Không cần gửi bill, không vào trang payOS riêng.
          </p>
        </div>

        {state === "error" && (
          <ErrorState
            title="Không hoàn tất thanh toán"
            description={errorMsg || "Vui lòng thử lại hoặc liên hệ hỗ trợ."}
            onRetry={() => window.location.reload()}
            action={
              <Button
                variant="outline"
                onClick={() => router.push("/online-student/dashboard")}
                className="rounded-xl border-[var(--os-border)] text-[var(--os-fg)] text-xs"
              >
                Về dashboard
              </Button>
            }
          />
        )}

        {state === "success" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 sm:p-12 text-center space-y-5 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-[var(--os-accent)]/20 blur-3xl" />
            </div>
            <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 motion-safe:animate-in motion-safe:zoom-in-50">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div className="relative">
              <div className="inline-flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono uppercase mb-2">
                <Sparkles className="h-3.5 w-3.5" /> Đã kích hoạt
              </div>
              <h2 className="text-2xl font-bold text-[var(--os-fg)]">Mở khóa thành công!</h2>
              <p className="mt-2 text-sm text-[var(--os-muted)]">
                Môn <strong className="text-[var(--os-accent)]">{subjectInfo.label}</strong> sẵn sàng để học.
              </p>
            </div>
            <Button
              onClick={() => router.push(`/online-student/study?subject=${subjectKey}`)}
              className="relative w-full sm:w-auto rounded-xl bg-gradient-to-r from-[var(--os-accent)] to-[#8B5CF6] text-[var(--os-accent-fg)] font-bold px-8 py-3 h-12 min-w-[180px]"
            >
              Vào học ngay
            </Button>
          </div>
        )}

        {showQr && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-[var(--os-accent)]/25 bg-[var(--os-card)] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--os-accent)]/15 text-[var(--os-accent)]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-[var(--os-muted)]">Số tiền cần chuyển</p>
                  <p className="text-2xl font-bold font-mono text-[var(--os-accent)]">{formatPrice(amount)}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Tự mở khóa · payOS
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--os-border)] bg-[var(--os-card)] p-6 sm:p-10">
              <p className="text-center text-sm font-semibold text-[var(--os-fg)] mb-1">
                Quét mã QR bằng app ngân hàng
              </p>
              <p className="text-center text-[11px] text-[var(--os-muted)] mb-6 max-w-md mx-auto">
                Mã do payOS cấp — không dùng QR ngân hàng khác. Giữ màn hình sáng.
              </p>

              <div className="flex justify-center">
                <div className="w-full max-w-[min(100%,340px)]">
                  <PayosQrDisplay value={qrPayload} size={320} />
                </div>
              </div>

              <div className="mt-8 max-w-md mx-auto space-y-3 text-sm">
                {accountNumber && (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--os-bg)] border border-[var(--os-border)] px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-[var(--os-muted)] font-mono uppercase">Số tài khoản</p>
                      <p className="font-mono font-bold text-[var(--os-fg)] truncate">{accountNumber}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText("stk", accountNumber)}
                      className="shrink-0 min-h-11 min-w-11 p-2 rounded-lg border border-[var(--os-border)] text-[var(--os-muted)] hover:text-[var(--os-accent)]"
                      aria-label="Sao chép số tài khoản"
                    >
                      <Copy className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                )}
                {accountName && (
                  <div className="rounded-xl bg-[var(--os-bg)] border border-[var(--os-border)] px-4 py-3">
                    <p className="text-[10px] text-[var(--os-muted)] font-mono uppercase">Chủ tài khoản</p>
                    <p className="font-bold text-[var(--os-fg)] uppercase">{accountName}</p>
                  </div>
                )}
                {description && (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--os-bg)] border border-[var(--os-accent)]/30 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-[var(--os-muted)] font-mono uppercase">
                        Nội dung CK (bắt buộc đúng)
                      </p>
                      <p className="font-mono font-bold text-[var(--os-accent)] break-all">{description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText("memo", description)}
                      className="shrink-0 min-h-11 min-w-11 p-2 rounded-lg border border-[var(--os-accent)]/30 text-[var(--os-accent)]"
                      aria-label="Sao chép nội dung chuyển khoản"
                    >
                      <Copy className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                )}
                {copyOk && (
                  <p className="text-center text-[11px] text-emerald-400 font-mono" role="status">
                    Đã sao chép!
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-[var(--os-muted)]">
                {state === "polling" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--os-accent)] shrink-0" />
                ) : (
                  <RefreshCw className="h-5 w-5 text-[var(--os-accent)] shrink-0" />
                )}
                <span>{pollHint}</span>
              </div>
              <Button
                variant="outline"
                disabled={!orderId}
                onClick={() => orderId && checkOrderStatus(orderId, false)}
                className="rounded-xl border-[var(--os-border)] text-[var(--os-fg)] w-full sm:w-auto min-h-11"
              >
                Kiểm tra ngay
              </Button>
            </div>

            <p className="text-center text-[11px] text-[var(--os-muted)] leading-relaxed pb-4">
              Webhook chậm? Bấm &quot;Kiểm tra ngay&quot; hoặc đợi thêm 1–2 phút. Hỗ trợ Zalo nếu vẫn chưa mở khóa.
            </p>
          </div>
        )}
      </main>

      {/* Sticky copy memo on mobile while waiting for payment */}
      {showQr && description && (
        <div
          className="fixed bottom-16 inset-x-0 z-40 border-t border-[var(--os-border)] bg-[var(--os-card)]/95 backdrop-blur-md px-4 py-3 lg:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-lg flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-mono text-[var(--os-muted)] uppercase">Nội dung CK</p>
              <p className="font-mono text-xs font-bold text-[var(--os-accent)] truncate">{description}</p>
            </div>
            <Button
              type="button"
              onClick={() => copyText("memo", description)}
              className="shrink-0 rounded-xl bg-[var(--os-accent)] text-[var(--os-accent-fg)] font-bold text-xs h-11 px-4"
            >
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy
            </Button>
          </div>
        </div>
      )}

    </OnlineStudentShell>
  )
}

export default function OnlineStudentPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--os-bg)] flex items-center justify-center">
          <Loading label="Đang mở trang thanh toán…" />
        </div>
      }
    >
      <PaymentPageInner />
    </Suspense>
  )
}
