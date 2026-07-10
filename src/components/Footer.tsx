import React from "react"
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_URL,
  SUPPORT_ZALO,
  SUPPORT_ZALO_URL,
} from "@/lib/support"

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#8C87A2]/10 bg-[#0B0A13]/80 py-6 mt-12 text-center text-xs text-[#8C87A2]">
      <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-left">
          <p className="font-semibold text-[#F1EDF9]">StudyHub Education Portal</p>
          <p className="mt-1">© 2026 StudyHub · luyende.id.vn. Bảo lưu mọi quyền.</p>
          <p className="mt-1 text-[10px] text-[#8C87A2]/80 max-w-md">
            Nội dung bài giảng, video và tài liệu thuộc bản quyền StudyHub. Nghiêm cấm sao chép, ghi hình, phát tán trái phép.
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end text-[11px] space-y-1.5">
          <p>
            Zalo hỗ trợ:{" "}
            <a
              href={SUPPORT_ZALO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-[#C18CFF] hover:underline"
            >
              {SUPPORT_ZALO}
            </a>
          </p>
          <p>
            Email:{" "}
            <a href={SUPPORT_EMAIL_URL} className="text-[#F1EDF9] hover:text-[#C18CFF] hover:underline">
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}
