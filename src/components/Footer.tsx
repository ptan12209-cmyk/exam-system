import React from "react"

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#8C87A2]/10 bg-[#0B0A13]/80 py-6 mt-12 text-center text-xs text-[#8C87A2]">
      <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-left sm:text-left">
          <p className="font-semibold text-[#F1EDF9]">StudyHub Education Portal</p>
          <p className="mt-1">© 2026 StudyHub. Bảo lưu mọi quyền.</p>
        </div>
        <div className="flex flex-col items-start sm:items-end text-[11px] space-y-1">
          <p>Hotline/Zalo hỗ trợ học viên: <strong className="text-[#C18CFF]">0348.574.888</strong></p>
          <p>Email: <span className="text-[#F1EDF9]">support@studyhub.edu.vn</span></p>
        </div>
      </div>
    </footer>
  )
}
