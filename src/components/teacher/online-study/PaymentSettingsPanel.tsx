"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ONLINE_SUBJECTS } from "@/lib/subjects"
import { Loader2 } from "lucide-react"

interface PaymentSettingsPanelProps {
  bankId: string
  accountNo: string
  accountName: string
  subjectPrices: Record<string, number>
  saving: boolean
  onBankIdChange: (v: string) => void
  onAccountNoChange: (v: string) => void
  onAccountNameChange: (v: string) => void
  onPriceChange: (subject: string, price: number) => void
  onSubmit: (e: React.FormEvent) => void
}

export function PaymentSettingsPanel({
  bankId,
  accountNo,
  accountName,
  subjectPrices,
  saving,
  onBankIdChange,
  onAccountNoChange,
  onAccountNameChange,
  onPriceChange,
  onSubmit,
}: PaymentSettingsPanelProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6" aria-label="Cấu hình thanh toán">
      <div className="grid gap-6 md:grid-cols-[1fr_1.5fr] items-start">
        <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 space-y-4">
          <div className="pb-3 border-b border-[#8C87A2]/10">
            <h3 className="text-sm font-bold text-[#F1EDF9] font-mono tracking-wide">
              THÔNG TIN THỤ HƯỞNG
            </h3>
            <p className="text-[11px] text-[#8C87A2] mt-1">
              Tài khoản nhận chuyển khoản (payOS / VietQR). Giá môn bên dưới ={" "}
              <strong className="text-[#C8C4D8]">giá charge thật</strong> (ưu tiên hơn
              catalog default). Trang intro chỉ marketing.
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="bank-id" className="text-xs text-[#8C87A2] font-mono">
                Ngân hàng (VietQR)
              </Label>
              <select
                id="bank-id"
                value={bankId}
                onChange={(e) => onBankIdChange(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#8C87A2]/25 bg-[#0B0A13] px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#C18CFF] text-[#F1EDF9] h-11 font-sans"
              >
                <option value="MB">MB Bank</option>
                <option value="VCB">Vietcombank</option>
                <option value="TCB">Techcombank</option>
                <option value="BIDV">BIDV</option>
                <option value="ICB">VietinBank</option>
                <option value="ACB">ACB</option>
                <option value="TPB">TPBank</option>
                <option value="VPB">VPBank</option>
                <option value="STB">Sacombank</option>
                <option value="VBA">Agribank</option>
              </select>
            </div>
            <div>
              <Label htmlFor="account-no" className="text-xs text-[#8C87A2] font-mono">
                Số tài khoản
              </Label>
              <Input
                id="account-no"
                value={accountNo}
                onChange={(e) => onAccountNoChange(e.target.value)}
                placeholder="VD: 0348574888"
                className="mt-1 h-11 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9] font-mono"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <Label htmlFor="account-name" className="text-xs text-[#8C87A2] font-mono">
                Tên chủ TK (không dấu)
              </Label>
              <Input
                id="account-name"
                value={accountName}
                onChange={(e) => onAccountNameChange(e.target.value)}
                placeholder="VD: NGUYEN VAN A"
                className="mt-1 h-11 bg-[#0B0A13] border-[#8C87A2]/25 focus:ring-[#C18CFF] text-[#F1EDF9] uppercase"
                required
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className="bg-[#15131F] border border-[#8C87A2]/20 rounded-2xl p-6 space-y-4">
          <div className="pb-3 border-b border-[#8C87A2]/10">
            <h3 className="text-sm font-bold text-[#F1EDF9] font-mono tracking-wide">
              GIÁ MÔN HỌC
            </h3>
            <p className="text-[11px] text-[#8C87A2] mt-1">Giá mở khóa từng môn (VND).</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {ONLINE_SUBJECTS.map((sub) => {
              const currentPrice =
                subjectPrices[sub.value] !== undefined
                  ? subjectPrices[sub.value]
                  : (sub as { price?: number }).price || 299000
              return (
                <div
                  key={sub.value}
                  className="flex items-center justify-between p-3 rounded-xl border border-[#8C87A2]/10 bg-[#0B0A13]/30"
                >
                  <div className="flex items-center gap-2 min-w-0 mr-2">
                    <span className="text-lg shrink-0" aria-hidden>
                      {sub.icon}
                    </span>
                    <Label
                      htmlFor={`price-${sub.value}`}
                      className="text-xs font-semibold text-[#F1EDF9] truncate cursor-pointer"
                    >
                      {sub.label}
                    </Label>
                  </div>
                  <div className="relative w-32 shrink-0">
                    <input
                      id={`price-${sub.value}`}
                      type="number"
                      value={currentPrice}
                      onChange={(e) => onPriceChange(sub.value, Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-[#8C87A2]/25 bg-[#0B0A13] pr-7 pl-2.5 py-1 text-right text-xs text-[#F1EDF9] outline-none focus:ring-1 focus:ring-[#C18CFF] font-mono"
                      min={0}
                      required
                      aria-label={`Giá ${sub.label}`}
                    />
                    <span className="absolute right-2 top-2.5 text-[10px] text-[#8C87A2] font-mono" aria-hidden>
                      đ
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-[#C18CFF] text-[#0B0A13] hover:bg-[#C18CFF]/90 font-bold px-8 h-11 flex items-center gap-1.5"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Lưu cấu hình thanh toán
        </Button>
      </div>
    </form>
  )
}
