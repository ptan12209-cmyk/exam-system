"use client"

import { Button } from "@/components/ui/button"
import { getOnlineSubjectInfo } from "@/lib/subjects"
import {
  Activity,
  BadgeDollarSign,
  CreditCard,
  Download,
  Loader2,
  RefreshCw,
  ShieldAlert,
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
  onRequestApprove: (order: TeacherOrder) => void
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
  onRequestApprove,
}: OrdersRevenuePanelProps) {
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

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">
            Tổng DT đã nhận
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#C18CFF] font-mono mt-2">
            {formatVnd(revenue)}
          </h3>
          <BadgeDollarSign className="absolute right-4 top-4 h-5 w-5 text-[#C18CFF]/40" />
        </div>
        <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">
            DT tháng này
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-[#F1EDF9] font-mono mt-2">
            {formatVnd(monthRevenue)}
          </h3>
          <Activity className="absolute right-4 top-4 h-5 w-5 text-[#8C87A2]/40" />
        </div>
        <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">
            Đơn thành công
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono mt-2">
            {successOrders.length}
          </h3>
          <CreditCard className="absolute right-4 top-4 h-5 w-5 text-emerald-400/40" />
        </div>
        <div className="bg-[#15131F] border border-yellow-500/20 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C87A2] font-mono">
            Chờ duyệt
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-yellow-400 font-mono mt-2">
            {pendingOrders.length}
          </h3>
          <ShieldAlert className="absolute right-4 top-4 h-5 w-5 text-yellow-400/40" />
        </div>
      </div>

      <div className="rounded-2xl border border-[#8C87A2]/20 bg-[#15131F]/10 overflow-hidden">
        <div className="p-4 border-b border-[#8C87A2]/20 bg-[#15131F]/50 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#8C87A2] font-mono">
            Danh sách giao dịch học viên
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
              className="h-9 rounded-lg border border-[#8C87A2]/25 bg-[#0B0A13] px-2 text-[10px] text-[#F1EDF9] font-mono min-h-[44px] sm:min-h-0 sm:h-8"
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
              className="h-9 sm:h-8 rounded-lg border border-[#8C87A2]/25 text-[#8C87A2] text-[10px]"
            >
              <RefreshCw className="h-3 w-3 mr-1" /> Làm mới
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={orders.length === 0}
              onClick={() => exportCsv(filteredOrders)}
              className="h-9 sm:h-8 rounded-lg border border-[#8C87A2]/25 text-[#8C87A2] text-[10px]"
            >
              <Download className="h-3 w-3 mr-1" /> CSV
            </Button>
            <span className="text-[10px] bg-[#0B0A13] px-2 py-0.5 rounded border border-[#8C87A2]/20 text-[#8C87A2] font-mono">
              {filteredOrders.length}/{orders.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#C18CFF]" />
            <p className="mt-2 text-xs text-[#8C87A2]">Đang tải danh sách đơn hàng...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 text-sm text-[#8C87A2] italic">
            {orders.length === 0
              ? "Chưa có giao dịch mua khóa học nào được ghi nhận."
              : "Không có đơn khớp bộ lọc."}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#8C87A2]/10 bg-[#0B0A13]/30 text-[#8C87A2] uppercase font-mono tracking-wider">
                    <th className="p-4 font-bold">Ngày</th>
                    <th className="p-4 font-bold">Học viên</th>
                    <th className="p-4 font-bold">Môn</th>
                    <th className="p-4 font-bold text-right">Số tiền</th>
                    <th className="p-4 font-bold">Memo</th>
                    <th className="p-4 font-bold text-center">TT</th>
                    <th className="p-4 font-bold text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#8C87A2]/10">
                  {filteredOrders.map((order) => {
                    const subj = getOnlineSubjectInfo(order.subject_key)
                    return (
                      <tr key={order.id} className="hover:bg-[#15131F]/30">
                        <td className="p-4 text-[#8C87A2] font-mono whitespace-nowrap">
                          {new Date(order.created_at).toLocaleString("vi-VN", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="p-4 min-w-[140px]">
                          <p className="font-bold text-[#F1EDF9]">
                            {order.student?.full_name || "Ẩn danh"}
                          </p>
                          <p className="text-[10px] text-[#8C87A2]">{order.student?.email}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 rounded bg-[#0B0A13] border border-[#8C87A2]/25 font-mono inline-flex gap-1">
                            {subj.icon} {subj.label}
                          </span>
                        </td>
                        <td className="p-4 text-right font-bold font-mono text-[#F1EDF9]">
                          {formatVnd(order.amount)}
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded bg-[#0B0A13] border border-[#C18CFF]/20 text-[#C18CFF] font-mono font-bold">
                            {order.memo}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <StatusPill status={order.status} />
                        </td>
                        <td className="p-4 text-right">
                          {order.status === "pending" && (
                            <Button
                              size="sm"
                              disabled={approvingOrderId === order.id}
                              onClick={() => onRequestApprove(order)}
                              className="rounded-lg bg-emerald-500 text-[#0B0A13] text-[10px] font-bold"
                            >
                              {approvingOrderId === order.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                "Duyệt"
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[#8C87A2]/10">
              {filteredOrders.map((order) => {
                const subj = getOnlineSubjectInfo(order.subject_key)
                return (
                  <div key={order.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-[#F1EDF9] truncate">
                          {order.student?.full_name || "Ẩn danh"}
                        </p>
                        <p className="text-[10px] text-[#8C87A2] truncate">
                          {order.student?.email}
                        </p>
                      </div>
                      <StatusPill status={order.status} />
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px] text-[#8C87A2] font-mono">
                      <span>
                        {subj.icon} {subj.label}
                      </span>
                      <span className="text-[#F1EDF9] font-bold">{formatVnd(order.amount)}</span>
                      <span>
                        {new Date(order.created_at).toLocaleString("vi-VN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {order.memo && (
                      <p className="text-[11px] font-mono text-[#C18CFF] break-all">{order.memo}</p>
                    )}
                    {order.status === "pending" && (
                      <Button
                        size="sm"
                        disabled={approvingOrderId === order.id}
                        onClick={() => onRequestApprove(order)}
                        className="w-full rounded-lg bg-emerald-500 text-[#0B0A13] text-xs font-bold h-11"
                      >
                        {approvingOrderId === order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Duyệt thủ công"
                        )}
                      </Button>
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
        ✓ OK
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="inline-flex text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full font-mono">
        ✗ Lỗi
      </span>
    )
  }
  return (
    <span className="inline-flex text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-mono motion-safe:animate-pulse">
      ⏳ Chờ
    </span>
  )
}
