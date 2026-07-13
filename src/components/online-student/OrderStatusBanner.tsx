"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, ChevronRight, Clock } from "lucide-react"
import { getOnlineSubjectInfo } from "@/lib/subjects"
import { cn } from "@/lib/utils"
import { onlineStudyFetch } from "@/lib/online-study-client"

type StudentOrder = {
  id: string
  subject_key: string
  amount: number
  status: string
  created_at: string
  memo?: string | null
}

/**
 * Dashboard banner: pending / recent order status for the student.
 */
export function OrderStatusBanner({ className }: { className?: string }) {
  const [orders, setOrders] = useState<StudentOrder[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await onlineStudyFetch("/api/online-study/orders")
        const data = await res.json()
        if (!cancelled && res.ok && data.success) {
          setOrders((data.data?.orders || data.data || []) as StudentOrder[])
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (!loaded) return null

  const pending = orders.filter((o) => o.status === "pending").slice(0, 3)
  const recentSuccess = orders
    .filter((o) => o.status === "success")
    .slice(0, 2)
  const recentFailed = orders.filter((o) => o.status === "failed").slice(0, 1)

  if (pending.length === 0 && recentSuccess.length === 0 && recentFailed.length === 0) {
    return null
  }

  return (
    <section className={cn("space-y-3", className)} aria-label="Trạng thái đơn hàng">
      {pending.map((o) => {
        const subj = getOnlineSubjectInfo(o.subject_key)
        return (
          <Link
            key={o.id}
            href={`/online-student/payment?subject=${encodeURIComponent(o.subject_key)}`}
            className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 transition-colors hover:bg-yellow-500/15"
          >
            <Clock className="h-5 w-5 shrink-0 text-yellow-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--os-fg)]">
                Đơn đang chờ · {subj.icon} {subj.label}
              </p>
              <p className="text-[11px] text-[var(--os-muted)] mt-0.5">
                Tiếp tục quét QR hoặc chờ giáo viên duyệt. Nhấn để mở trang thanh toán.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--os-muted)]" />
          </Link>
        )
      })}

      {recentFailed.map((o) => {
        const subj = getOnlineSubjectInfo(o.subject_key)
        return (
          <Link
            key={o.id}
            href={`/online-student/payment?subject=${encodeURIComponent(o.subject_key)}`}
            className="flex items-center gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[var(--os-fg)]">
                Đơn bị từ chối · {subj.label}
              </p>
              <p className="text-[11px] text-[var(--os-muted)] mt-0.5">
                Liên hệ hỗ trợ hoặc tạo đơn mới nếu cần.
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--os-muted)]" />
          </Link>
        )
      })}

      {pending.length === 0 &&
        recentSuccess.map((o) => {
          const subj = getOnlineSubjectInfo(o.subject_key)
          return (
            <Link
              key={o.id}
              href={`/online-student/study?subject=${encodeURIComponent(o.subject_key)}`}
              className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3"
            >
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--os-fg)]">
                  Đã mở khóa · {subj.icon} {subj.label}
                </p>
                <p className="text-[11px] text-[var(--os-muted)] mt-0.5">
                  Vào học ngay môn vừa kích hoạt.
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--os-muted)]" />
            </Link>
          )
        })}
    </section>
  )
}
