import React from "react"
import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ConfirmResetModalProps {
  onClose: () => void
  onConfirm: () => void
}

export function ConfirmResetModal({ onClose, onConfirm }: ConfirmResetModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0A13]/85 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#15131F] border border-red-500/20 rounded-2xl overflow-hidden shadow-2xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#8C87A2] hover:text-[#F1EDF9] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Tiêu đề */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-xl text-[#F1EDF9] font-normal italic font-instrument-serif">
              Khôi phục mặc định
            </h3>
            <p className="text-[10px] text-[#8C87A2] uppercase tracking-wider mt-0.5">Xác nhận thao tác</p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-[#8C87A2] mb-6">
          Bạn có chắc chắn muốn khôi phục lại lịch học mặc định ban đầu không? Mọi thông tin môn học, hình thức học và khung giờ bạn đã tùy chỉnh trước đó sẽ bị xóa bỏ hoàn toàn.
        </p>

        {/* Nút hành động */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 py-5 rounded-xl border-[#8C87A2]/20 hover:border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent font-medium"
          >
            Hủy bỏ
          </Button>
          <Button
            onClick={onConfirm}
            className="flex-1 py-5 rounded-xl bg-red-650 hover:bg-red-700 bg-red-500/80 text-white font-semibold tracking-wide border border-red-500/20"
          >
            Khôi phục
          </Button>
        </div>
      </div>
    </div>
  )
}
