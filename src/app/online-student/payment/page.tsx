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
} from "lucide-react"
import Footer from "@/components/Footer"
import { SupportFab } from "@/components/support/SupportFab"

type PayState = "loading" | "ready" | "polling" | "success" | "error"

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
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang tạo đơn thanh toán payOS…" />
      </div>
    )
  }

  return (
    <OnlineStudentShell>
      <OnlineStudentTopbar name={profileName} onLogout={handleLogout} />

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/online-student/dashboard"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#8C87A2]/25 text-[#8C87A2] hover:text-[#F1EDF9] hover:border-[#C18CFF]/40 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-[#8C87A2]">
              Thanh toán khóa học
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-[#F1EDF9]">
              {subjectInfo.label}
            </h1>
          </div>
        </div>

        {state === "error" && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center space-y-4">
            <p className="text-red-300 text-sm">{errorMsg}</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={() => window.location.reload()}
                className="rounded-xl bg-[#C18CFF] text-[#0B0A13] font-bold"
              >
                Thử lại
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/online-student/dashboard")}
                className="rounded-xl border-[#8C87A2]/30 text-[#F1EDF9]"
              >
                Về dashboard
              </Button>
            </div>
          </div>
        )}

        {state === "success" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 sm:p-12 text-center space-y-5">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#F1EDF9]">Mở khóa thành công!</h2>
              <p className="mt-2 text-sm text-[#8C87A2]">
                Môn <strong className="text-[#C18CFF]">{subjectInfo.label}</strong> đã được kích hoạt.
              </p>
            </div>
            <Button
              onClick={() => router.push(`/online-student/study?subject=${subjectKey}`)}
              className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#C18CFF] to-[#8B5CF6] text-[#0B0A13] font-bold px-8 py-3"
            >
              Vào học ngay
            </Button>
          </div>
        )}

        {(state === "ready" || state === "polling") && qrPayload && (
          <div className="space-y-6">
            {/* Amount banner */}
            <div className="rounded-2xl border border-[#C18CFF]/25 bg-[#15131F] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#C18CFF]/15 text-[#C18CFF]">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase text-[#8C87A2]">Số tiền cần chuyển</p>
                  <p className="text-2xl font-bold font-mono text-[#C18CFF]">{formatPrice(amount)}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Tự mở khóa qua payOS
              </div>
            </div>

            {/* Large QR */}
            <div className="rounded-3xl border border-[#8C87A2]/20 bg-[#15131F] p-6 sm:p-10">
              <p className="text-center text-sm font-semibold text-[#F1EDF9] mb-1">
                Quét mã QR bằng app ngân hàng
              </p>
              <p className="text-center text-[11px] text-[#8C87A2] mb-6 max-w-md mx-auto">
                Mã do payOS cấp — không dùng QR ngân hàng khác. Giữ màn hình sáng, đưa máy quét gần QR.
              </p>

              <div className="flex justify-center">
                <PayosQrDisplay value={qrPayload} size={340} />
              </div>

              {/* Account details */}
              <div className="mt-8 max-w-md mx-auto space-y-3 text-sm">
                {accountNumber && (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0B0A13] border border-[#8C87A2]/15 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#8C87A2] font-mono uppercase">Số tài khoản</p>
                      <p className="font-mono font-bold text-[#F1EDF9] truncate">{accountNumber}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText("stk", accountNumber)}
                      className="shrink-0 p-2 rounded-lg border border-[#8C87A2]/25 text-[#8C87A2] hover:text-[#C18CFF]"
                      aria-label="Copy STK"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {accountName && (
                  <div className="rounded-xl bg-[#0B0A13] border border-[#8C87A2]/15 px-4 py-3">
                    <p className="text-[10px] text-[#8C87A2] font-mono uppercase">Chủ tài khoản</p>
                    <p className="font-bold text-[#F1EDF9] uppercase">{accountName}</p>
                  </div>
                )}
                {description && (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-[#0B0A13] border border-[#C18CFF]/30 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] text-[#8C87A2] font-mono uppercase">
                        Nội dung CK (bắt buộc đúng)
                      </p>
                      <p className="font-mono font-bold text-[#C18CFF] break-all">{description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText("memo", description)}
                      className="shrink-0 p-2 rounded-lg border border-[#C18CFF]/30 text-[#C18CFF]"
                      aria-label="Copy memo"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {copyOk && (
                  <p className="text-center text-[11px] text-emerald-400 font-mono">Đã sao chép!</p>
                )}
              </div>
            </div>

            {/* Status / poll */}
            <div className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F] p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-sm text-[#8C87A2]">
                {state === "polling" ? (
                  <Loader2 className="h-5 w-5 animate-spin text-[#C18CFF] shrink-0" />
                ) : (
                  <RefreshCw className="h-5 w-5 text-[#C18CFF] shrink-0" />
                )}
                <span>{pollHint}</span>
              </div>
              <Button
                variant="outline"
                disabled={!orderId}
                onClick={() => orderId && checkOrderStatus(orderId, false)}
                className="rounded-xl border-[#8C87A2]/30 text-[#F1EDF9] w-full sm:w-auto"
              >
                Kiểm tra ngay
              </Button>
            </div>

            <p className="text-center text-[11px] text-[#8C87A2] leading-relaxed">
              Sau khi chuyển khoản thành công, hệ thống tự mở khóa (webhook payOS). Không cần mở trang payOS riêng.
            </p>
          </div>
        )}
      </main>
      <Footer />
      <SupportFab />
    </OnlineStudentShell>
  )
}

export default function OnlineStudentPaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
          <Loading label="Đang mở trang thanh toán…" />
        </div>
      }
    >
      <PaymentPageInner />
    </Suspense>
  )
}
