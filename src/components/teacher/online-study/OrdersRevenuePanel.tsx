"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { getOnlineSubjectInfo } from "@/lib/subjects"
import { cn } from "@/lib/utils"
import {
  Activity,
  BadgeDollarSign,
  CheckSquare,
  CreditCard,
  Download,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Square,
  XCircle,
} from "lucide-react"

export type TeacherOrder = {
  id: string
  created_at: string
  amount: number
  status: string
  memo?: string | null
  subject_key: string
  student?: { full_name?: string | null; email?: string | null } | null
}

type StatusFilter = "all" | "pending" | "success" | "failed"

interface OrdersRevenuePanelProps {
  orders: TeacherOrder[]
  revenue: number
  loading: boolean
  statusFilter: StatusFilter
  onStatusFilterChange: (v: StatusFilter) => void
  onRefresh: () => void
  approvingOrderId: string | null
  bulkBusy?: boolean
  onRequestApprove: (order: TeacherOrder) => void
  onRequestReject?: (order: TeacherOrder) => void
  onBulkApprove?: (orders: TeacherOrder[]) => void
  onBulkReject?: (orders: TeacherOrder[]) => void
}

function formatVnd(n: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n)
}

function exportCsv(orders: TeacherOrder[]) {
  const header = ["created_at", "student", "email", "subject", "amount", "status", "memo"]
  const rows = orders.map((o) => [
    o.created_at,
    o.student?.full_name || "",
    o.student?.email || "",
    o.subject_key,
    String(o.amount ?? 0),
    o.status,
    (o.memo || "").replace(/"/g, '""'),
  ])
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${c}"`).join(","))
    .join("\n")
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function OrdersRevenuePanel({
  orders,
  revenue,
  loading,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  approvingOrderId,
  bulkBusy = false,
  onRequestApprove,
  onRequestReject,
  onBulkApprove,
  onBulkReject,
}: OrdersRevenuePanelProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const successOrders = orders.filter((o) => o.status === "success")
  const pendingOrders = orders.filter((o) => o.status === "pending")
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthRevenue = successOrders
    .filter((o) => new Date(o.created_at) >= monthStart)
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0)
  const filteredOrders =
    statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter)

  const pendingInView = useMemo(
    () => filteredOrders.filter((o) => o.status === "pending"),
    [filteredOrders]
  )

  const selectedPending = useMemo(
    () => pendingInView.filter((o) => selected.has(o.id)),
    [pendingInView, selected]
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAllPendingInView = () => {
    setSelected(new Set(pendingInView.map((o) => o.id)))
  }

  const clearSelection = () => setSelected(new Set())

  const busy = bulkBusy || !!approvingOrderId

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--os-muted)] font-mono">
            Tổng DT đã nhận
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-[var(--os-accent)] font-mono mt-2 tabular-nums">
            {formatVnd(revenue)}
          </h3>
          <BadgeDollarSign className="absolute right-4 top-4 h-5 w-5 text-[var(--os-accent)]/40" />
        </div>
        <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--os-muted)] font-mono">
            DT tháng này
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-[var(--os-fg)] font-mono mt-2 tabular-nums">
            {formatVnd(monthRevenue)}
          </h3>
          <Activity className="absolute right-4 top-4 h-5 w-5 text-[var(--os-muted)]/40" />
        </div>
        <div className="bg-[var(--os-card)] border border-[var(--os-border)] rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--os-muted)] font-mono">
            Đơn thành công
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono mt-2 tabular-nums">
            {successOrders.length}
          </h3>
          <CreditCard className="absolute right-4 top-4 h-5 w-5 text-emerald-400/40" />
        </div>
        <div className="bg-[var(--os-card)] border border-yellow-500/20 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--os-muted)] font-mono">
            Chờ duyệt
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-yellow-400 font-mono mt-2 tabular-nums">
            {pendingOrders.length}
          </h3>
          <ShieldAlert className="absolute right-4 top-4 h-5 w-5 text-yellow-400/40" />
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--os-border)] bg-[var(--os-card)]/10 overflow-hidden">
        <div className="p-4 border-b border-[var(--os-border)] bg-[var(--os-card)]/50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--os-muted)] font-mono">
            Danh sách giao dịch học viên
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
              className="h-9 rounded-lg border border-[var(--os-border)] bg-[var(--os-bg)] px-2 text-[10px] text-[var(--os-fg)] font-mono min-h-[44px] sm:min-h-0 sm:h-8"
              aria-label="Lọc trạng thái đơn"
            >
              <option value="all">Tất cả</option>
              <option value="pending">Chờ duyệt</option>
              <option value="success">Thành công</option>
              <option value="failed">Lỗi / Hủy</option>
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              className="h-9 sm:h-8 rounded-lg border border-[var(--os-border)] text-[var(--os-muted)] text-[10px]"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Làm mới
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={orders.length === 0}
              onClick={() => exportCsv(filteredOrders)}
              className="h-9 sm:h-8 rounded-lg border border-[var(--os-border)] text-[var(--os-muted)] text-[10px]"
            >
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
            <span className="text-[10px] bg-[var(--os-bg)] px-2 py-0.5 rounded border border-[var(--os-border)] text-[var(--os-muted)] font-mono tabular-nums">
              {filteredOrders.length}/{orders.length}
            </span>
          </div>
        </div>

        {/* Bulk toolbar */}
        {pendingInView.length > 0 && (
          <div className="px-4 py-2.5 border-b border-[var(--os-border)] bg-[var(--os-bg)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--os-muted)]">
              <button
                type="button"
                onClick={selectAllPendingInView}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--os-border)] px-2.5 py-1.5 font-semibold text-[var(--os-fg)] hover:border-[var(--os-accent)]/40"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                Chọn tất cả chờ duyệt ({pendingInView.length})
              </button>
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={clearSelection}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--os-border)] px-2.5 py-1.5 hover:text-[var(--os-fg)]"
                >
                  <Square className="h-3.5 w-3.5" />
                  Bỏ chọn
                </button>
              )}
              <span className="font-mono tabular-nums">
                Đã chọn:{" "}
                <strong className="text-[var(--os-accent)]">{selectedPending.length}</strong> đơn chờ
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={selectedPending.length === 0 || busy || !onBulkApprove}
                onClick={() => onBulkApprove?.(selectedPending)}
                className="rounded-lg bg-emerald-500 text-[var(--os-accent-fg)] text-xs font-bold h-9"
              >
                {bulkBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  `Duyệt hàng loạt (${selectedPending.length})`
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={selectedPending.length === 0 || busy || !onBulkReject}
                onClick={() => onBulkReject?.(selectedPending)}
                className="rounded-lg border border-red-500/30 text-red-400 text-xs font-bold h-9"
              >
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Từ chối
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--os-accent)]" />
            <p className="mt-2 text-xs text-[var(--os-muted)]">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-sm text-[var(--os-muted)] italic">
            {orders.length === 0
              ? "Chưa có giao dịch mua khóa học nào được ghi nhận."
              : "Không có đơn khớp bộ lọc."}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--os-border)] bg-[var(--os-bg)]/30 text-[var(--os-muted)] uppercase font-mono tracking-wider">
                    <th className="p-3 w-10" />
                    <th className="p-4 font-bold">Ngày</th>
                    <th className="p-4 font-bold">Học viên</th>
                    <th className="p-4 font-bold">Môn</th>
                    <th className="p-4 font-bold text-right">Số tiền</th>
                    <th className="p-4 font-bold">Memo</th>
                    <th className="p-4 font-bold text-center">TT</th>
                    <th className="p-4 font-bold text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--os-border)]">
                  {filteredOrders.map((order) => {
                    const subj = getOnlineSubjectInfo(order.subject_key)
                    const isPending = order.status === "pending"
                    const checked = selected.has(order.id)
                    return (
                      <tr
                        key={order.id}
                        className={cn(
                          "hover:bg-[var(--os-card)]/30",
                          checked && "bg-[var(--os-accent)]/5"
                        )}
                      >
                        <td className="p-3">
                          {isPending ? (
                            <button
                              type="button"
                              onClick={() => toggle(order.id)}
                              className="p-0.5 text-[var(--os-muted)] hover:text-[var(--os-accent)]"
                              aria-label={checked ? "Bỏ chọn" : "Chọn đơn"}
                            >
                              {checked ? (
                                <CheckSquare className="h-4 w-4 text-[var(--os-accent)]" />
                              ) : (
                                <Square className="h-4 w-4" />
                              )}
                            </button>
                          ) : null}
                        </td>
                        <td className="p-4 text-[var(--os-muted)] font-mono whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-4 min-w-[140px]">
                          <p className="font-bold text-[var(--os-fg)]">
                            {order.student?.full_name || "Ẩn danh"}
                          </p>
                          <p className="text-[10px] text-[var(--os-muted)]">{order.student?.email}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-[var(--os-bg)] border border-[var(--os-border)] font-mono inline-flex gap-1">
                            {subj.icon} {subj.label}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold font-mono text-[var(--os-fg)] tabular-nums">
                          {formatVnd(order.amount)}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-[var(--os-bg)] border border-[var(--os-accent)]/20 text-[var(--os-accent)] font-mono font-bold">
                            {order.memo}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <StatusPill status={order.status} />
                        </td>
                        <td className="p-4 text-right">
                          {isPending && (
                            <div className="inline-flex gap-1.5">
                              <Button
                                size="sm"
                                disabled={busy}
                                onClick={() => onRequestApprove(order)}
                                className="rounded-lg bg-emerald-500 text-[var(--os-accent-fg)] text-[10px] font-bold"
                              >
                                {approvingOrderId === order.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  "Duyệt"
                                )}
                              </Button>
                              {onRequestReject && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busy}
                                  onClick={() => onRequestReject(order)}
                                  className="rounded-lg border border-red-500/20 text-red-400 text-[10px] font-bold"
                                >
                                  Từ chối
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-[var(--os-border)]">
              {filteredOrders.map((order) => {
                const subj = getOnlineSubjectInfo(order.subject_key)
                const isPending = order.status === "pending"
                const checked = selected.has(order.id)
                return (
                  <div
                    key={order.id}
                    className={cn("p-4 space-y-2", checked && "bg-[var(--os-accent)]/5")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        {isPending && (
                          <button
                            type="button"
                            onClick={() => toggle(order.id)}
                            className="mt-0.5 p-0.5 text-[var(--os-muted)]"
                            aria-label={checked ? "Bỏ chọn" : "Chọn đơn"}
                          >
                            {checked ? (
                              <CheckSquare className="h-4 w-4 text-[var(--os-accent)]" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--os-fg)] truncate">
                            {order.student?.full_name || "Ẩn danh"}
                          </p>
                          <p className="text-[10px] text-[var(--os-muted)] truncate">
                            {order.student?.email}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={order.status} />
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-[var(--os-muted)] font-mono">
                      <span>
                        {subj.icon} {subj.label}
                      </span>
                      <span className="text-[var(--os-fg)] font-bold tabular-nums">
                        {formatVnd(order.amount)}
                      </span>
                      <span>
                        {new Date(order.created_at).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {order.memo && (
                      <p className="text-[11px] font-mono text-[var(--os-accent)] break-all">
                        {order.memo}
                      </p>
                    )}
                    {isPending && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={busy}
                          onClick={() => onRequestApprove(order)}
                          className="flex-1 rounded-lg bg-emerald-500 text-[var(--os-accent-fg)] text-xs font-bold h-11"
                        >
                          {approvingOrderId === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Duyệt"
                          )}
                        </Button>
                        {onRequestReject && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => onRequestReject(order)}
                            className="rounded-lg border border-red-500/30 text-red-400 text-xs font-bold h-11 px-3"
                          >
                            Từ chối
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  if (status === "success") {
    return (
      <span className="inline-flex text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
        OK
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="inline-flex text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-mono">
        Từ chối
      </span>
    )
  }
  return (
    <span className="inline-flex text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-mono">
      Chờ
    </span>
  )
}
