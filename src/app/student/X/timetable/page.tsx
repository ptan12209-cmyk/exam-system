"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Instrument_Serif, JetBrains_Mono, Inter } from "next/font/google"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  Zap,
  Coffee,
  CheckCircle2,
  ArrowLeft,
  X,
  Check,
  AlertCircle,
  HelpCircle,
  Lock
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"
import { StudentShell } from "@/components/student/StudentShell"

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
})

interface Profile {
  id: string
  role: string
  full_name: string | null
  nickname: string | null
}

interface TimetableSlot {
  id: string
  subject: string
  type: string
  time: string
  color: string
}

// Cấu hình danh sách 24 ca học chi tiết
const TIMETABLE_SLOTS: { [key: string]: { [key: string]: TimetableSlot } } = {
  sang: {
    t2: { id: "mon-sang", subject: "Toán", type: "Lý Thuyết", time: "08:00 - 10:30", color: "toan" },
    t3: { id: "tue-sang", subject: "Sinh Học", type: "Lý Thuyết", time: "08:00 - 10:30", color: "sinh" },
    t4: { id: "wed-sang", subject: "Toán", type: "Bài Tập 1", time: "08:00 - 10:30", color: "toan" },
    t5: { id: "thu-sang", subject: "Sinh Học", type: "Bài Tập 1", time: "08:00 - 10:30", color: "sinh" },
    t6: { id: "fri-sang", subject: "Toán", type: "Bài Tập 2", time: "08:00 - 10:30", color: "toan" },
    t7: { id: "sat-sang", subject: "Sinh Học", type: "Bài Tập 2", time: "08:00 - 10:30", color: "sinh" },
  },
  chieu1: {
    t2: { id: "mon-chieu1", subject: "Vật Lý", type: "Lý Thuyết", time: "14:00 - 16:30", color: "ly" },
    t3: { id: "tue-chieu1", subject: "Ngữ Văn", type: "Lý Thuyết", time: "14:00 - 16:30", color: "van" },
    t4: { id: "wed-chieu1", subject: "Vật Lý", type: "Bài Tập 1", time: "14:00 - 16:30", color: "ly" },
    t5: { id: "thu-chieu1", subject: "Ngữ Văn", type: "Bài Tập 1", time: "14:00 - 16:30", color: "van" },
    t6: { id: "fri-chieu1", subject: "Vật Lý", type: "Bài Tập 2", time: "14:00 - 16:30", color: "ly" },
    t7: { id: "sat-chieu1", subject: "Ngữ Văn", type: "Bài Tập 2", time: "14:00 - 16:30", color: "van" },
  },
  chieu2: {
    t2: { id: "mon-chieu2", subject: "Hóa Học", type: "Lý Thuyết", time: "16:45 - 19:15", color: "hoa" },
    t3: { id: "tue-chieu2", subject: "Tiếng Anh", type: "Lý Thuyết", time: "16:45 - 19:15", color: "anh" },
    t4: { id: "wed-chieu2", subject: "Hóa Học", type: "Bài Tập 1", time: "16:45 - 19:15", color: "hoa" },
    t5: { id: "thu-chieu2", subject: "Tiếng Anh", type: "Bài Tập 1", time: "16:45 - 19:15", color: "anh" },
    t6: { id: "fri-chieu2", subject: "Hóa Học", type: "Bài Tập 2", time: "16:45 - 19:15", color: "hoa" },
    t7: { id: "sat-chieu2", subject: "Tiếng Anh", type: "Bài Tập 2", time: "16:45 - 19:15", color: "anh" },
  },
  toi: {
    t2: { id: "mon-toi", subject: "V-ACT (1)", type: "Tư Duy Logic", time: "20:00 - 22:30", color: "vact" },
    t3: { id: "tue-toi", subject: "V-ACT (2)", type: "Phân Tích Số Liệu", time: "20:00 - 22:30", color: "vact" },
    t4: { id: "wed-toi", subject: "V-ACT (3)", type: "Tiếng Anh V-ACT", time: "20:00 - 22:30", color: "vact" },
    t5: { id: "thu-toi", subject: "V-ACT (4)", type: "Tiếng Việt V-ACT", time: "20:00 - 22:30", color: "vact" },
    t6: { id: "fri-toi", subject: "V-ACT (5)", type: "Thực Chiến TDLG", time: "20:00 - 22:30", color: "vact" },
    t7: { id: "sat-toi", subject: "V-ACT (6)", type: "Thực Chiến PTSL", time: "20:00 - 22:30", color: "vact" },
  }
}

export default function TimetablePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Trạng thái lưu danh sách ID các ca học đã hoàn thành
  const [completedSlots, setCompletedSlots] = useState<string[]>([])
  // Ca học đang được chọn để mở Modal xác nhận
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null)
  // Mốc Thứ 2 của tuần hiện tại (YYYY-MM-DD)
  const [currentWeekMonday, setCurrentWeekMonday] = useState("")

  // Hàm tính toán ngày Thứ 2 đầu tuần hiện tại theo giờ Việt Nam (UTC+7)
  const getVietnamMonday = () => {
    const now = new Date()
    // Chuyển đổi timestamp sang múi giờ Việt Nam (UTC+7) bằng cách cộng thêm 7 tiếng
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
    
    // getUTCDay() trả về 0 (Chủ Nhật) đến 6 (Thứ 7) của vnTime
    const day = vnTime.getUTCDay()
    // Nếu là Chủ Nhật (0), quay về Thứ 2 bằng cách trừ đi 6 ngày.
    // Nếu là các ngày từ Thứ 2 đến Thứ 7 (1-6), trừ (day - 1) ngày.
    const diff = vnTime.getUTCDate() - day + (day === 0 ? -6 : 1)
    
    const monday = new Date(vnTime)
    monday.setUTCDate(diff)
    
    const year = monday.getUTCFullYear()
    const month = String(monday.getUTCMonth() + 1).padStart(2, '0')
    const date = String(monday.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${date}`
  }

  useEffect(() => {
    const initPage = async () => {
      // 1. Kiểm tra xác thực & Phân quyền
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/login")
        return
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (!profileData) {
        await supabase.auth.signOut()
        router.push("/login?error=profile_not_found")
        return
      }

      // Chỉ cho phép học sinh X
      if (profileData.role !== "student" || profileData.nickname !== "X") {
        router.push("/student/dashboard")
        return
      }

      setProfile(profileData)

      // 2. Tính toán tuần và xử lý tự động reset thời khóa biểu
      const vnMonday = getVietnamMonday()
      setCurrentWeekMonday(vnMonday)

      const savedWeekStart = localStorage.getItem("student_x_timetable_week_start")
      let currentCompleted: string[] = []

      if (savedWeekStart !== vnMonday) {
        // Đã bước sang tuần mới hoặc lần đầu sử dụng -> Reset toàn bộ dữ liệu hoàn thành
        localStorage.setItem("student_x_timetable_week_start", vnMonday)
        localStorage.setItem("student_x_timetable_completed_slots", JSON.stringify([]))
        setCompletedSlots([])
      } else {
        // Vẫn trong tuần cũ -> Nạp dữ liệu cũ
        const savedCompleted = localStorage.getItem("student_x_timetable_completed_slots")
        if (savedCompleted) {
          try {
            currentCompleted = JSON.parse(savedCompleted)
            setCompletedSlots(currentCompleted)
          } catch (e) {
            console.error("Lỗi đọc dữ liệu hoàn thành:", e)
          }
        }
      }

      setLoading(false)
    }

    initPage()
  }, [router, supabase])

  // Xử lý xác nhận hoàn thành / hủy hoàn thành ca học
  const handleToggleComplete = () => {
    if (!selectedSlot) return

    let updatedCompleted: string[]
    if (completedSlots.includes(selectedSlot.id)) {
      // Nếu đã hoàn thành -> Hủy hoàn thành
      updatedCompleted = completedSlots.filter(id => id !== selectedSlot.id)
    } else {
      // Nếu chưa hoàn thành -> Xác nhận hoàn thành
      updatedCompleted = [...completedSlots, selectedSlot.id]
    }

    setCompletedSlots(updatedCompleted)
    localStorage.setItem("student_x_timetable_completed_slots", JSON.stringify(updatedCompleted))
    setSelectedSlot(null)
  }

  // Tính phần trăm hoàn thành tuần
  const completionPercentage = useMemo(() => {
    const totalSlots = 24 // 6 ngày * 4 ca
    return Math.round((completedSlots.length / totalSlots) * 100)
  }, [completedSlots])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0A13] flex items-center justify-center">
        <Loading label="Đang đồng bộ thời khóa biểu Dream Engine..." />
      </div>
    )
  }

  // Hàm render giao diện từng ô ca học
  const renderSlotCell = (slot: TimetableSlot) => {
    const isCompleted = completedSlots.includes(slot.id)

    return (
      <button
        key={slot.id}
        onClick={() => setSelectedSlot(slot)}
        className={cn(
          "w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group select-none",
          isCompleted
            ? "bg-[#1C1A2E] border-[#C18CFF] shadow-[0_0_15px_rgba(193,140,255,0.25)] text-[#F1EDF9] hover:shadow-[0_0_20px_rgba(193,140,255,0.4)]"
            : "bg-[#15131F]/80 border-[#8C87A2]/10 text-[#8C87A2] hover:border-[#8C87A2]/30 hover:bg-[#1C1A2D]"
        )}
      >
        {/* Glow Effect khi hoàn thành */}
        {isCompleted && (
          <div className="absolute inset-0 bg-[#C18CFF]/5 pointer-events-none" />
        )}

        <div className="flex items-start justify-between">
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
            isCompleted
              ? "bg-[#C18CFF]/20 text-[#C18CFF]"
              : "bg-[#8C87A2]/10 text-[#8C87A2]"
          )}>
            {slot.type}
          </span>
          {isCompleted && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#C18CFF] text-[#0B0A13]">
              <Check className="h-3 w-3 stroke-[3]" />
            </span>
          )}
        </div>

        <h3 className={cn(
          "mt-3 text-lg font-medium leading-none tracking-tight",
          isCompleted ? "text-[#F1EDF9]" : "text-[#F1EDF9]/70 group-hover:text-[#F1EDF9]"
        )}>
          {slot.subject}
        </h3>

        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[#8C87A2]">
          <Clock className="h-3 w-3" />
          <span className={jetbrainsMono.className}>{slot.time}</span>
        </div>
      </button>
    )
  }

  return (
    <StudentShell className={cn("bg-[#0B0A13] text-[#F1EDF9] min-h-screen", inter.className)}>
      {/* Header Điều hướng */}
      <header className="sticky top-0 z-40 border-b border-[#8C87A2]/10 bg-[#0B0A13]/90 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/student/X/dashboard"
            className="flex items-center gap-2 text-xs text-[#8C87A2] hover:text-[#C18CFF] transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Dashboard X</span>
          </Link>
          
          <div className={cn("text-[10px] font-bold uppercase tracking-[0.25em] text-[#C18CFF] animate-pulse", jetbrainsMono.className)}>
            Space X Timetable
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Banner tiêu đề */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className={cn("mb-3 inline-flex items-center gap-2 rounded-full border border-[#8C87A2]/20 bg-[#15131F] px-3.5 py-1.5 text-[9px] uppercase tracking-[0.2em] text-[#8C87A2]", jetbrainsMono.className)}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C18CFF] animate-pulse" />
                Lịch trình thông minh
              </p>
              <h1 className={cn("text-5xl text-[#F1EDF9] font-normal leading-tight md:text-7xl", instrumentSerif.className)}>
                Thời khóa biểu X
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#8C87A2]">
                Thời khóa biểu tự động làm mới lúc 00:00 Thứ 2 hàng tuần (UTC+7). Bấm vào ca học để cập nhật tiến độ và thắp sáng không gian học tập.
              </p>
            </div>

            {/* Trạng thái Tiến độ Tuần */}
            <div className="bg-[#15131F] border border-[#8C87A2]/10 rounded-2xl p-5 min-w-[280px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-[#8C87A2] uppercase tracking-wider">Tiến độ tuần học</span>
                <span className={cn("text-sm font-bold text-[#C18CFF]", jetbrainsMono.className)}>
                  {completedSlots.length} / 24 Ca
                </span>
              </div>
              <div className="h-1.5 w-full bg-[#0B0A13] rounded-full overflow-hidden border border-[#8C87A2]/10">
                <div
                  className="h-full bg-[#C18CFF] rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(193,140,255,0.6)]"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-[#8C87A2]">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-[#C18CFF]" />
                  Đạt {completionPercentage}%
                </span>
                <span className={jetbrainsMono.className}>Tuần: {currentWeekMonday}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Bảng Thời Khóa Biểu (Lưới) */}
        <section className="bg-[#15131F]/50 border border-[#8C87A2]/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1000px]">
              <thead>
                <tr className="border-b border-[#8C87A2]/10 bg-[#0B0A13]/50">
                  <th className={cn("p-5 text-xs font-bold uppercase tracking-wider text-[#8C87A2] w-[120px] text-center border-r border-[#8C87A2]/5", jetbrainsMono.className)}>
                    Khung Giờ
                  </th>
                  <th className="p-5 text-sm font-semibold text-[#F1EDF9] text-center border-r border-[#8C87A2]/5">Thứ 2</th>
                  <th className="p-5 text-sm font-semibold text-[#F1EDF9] text-center border-r border-[#8C87A2]/5">Thứ 3</th>
                  <th className="p-5 text-sm font-semibold text-[#F1EDF9] text-center border-r border-[#8C87A2]/5">Thứ 4</th>
                  <th className="p-5 text-sm font-semibold text-[#F1EDF9] text-center border-r border-[#8C87A2]/5">Thứ 5</th>
                  <th className="p-5 text-sm font-semibold text-[#F1EDF9] text-center border-r border-[#8C87A2]/5">Thứ 6</th>
                  <th className="p-5 text-sm font-semibold text-[#F1EDF9] text-center border-r border-[#8C87A2]/5">Thứ 7</th>
                  <th className="p-5 text-sm font-semibold text-[#F1EDF9] text-center">Chủ Nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#8C87A2]/10">
                {/* HÀNG 1: CA SÁNG */}
                <tr>
                  <td className="p-4 text-center border-r border-[#8C87A2]/5 bg-[#0B0A13]/20">
                    <span className="block text-xs font-bold text-[#F1EDF9]/90">Ca Sáng</span>
                    <span className={cn("block mt-1.5 text-[10px] text-[#8C87A2]", jetbrainsMono.className)}>08:00 - 10:30</span>
                  </td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.sang.t2)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.sang.t3)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.sang.t4)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.sang.t5)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.sang.t6)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.sang.t7)}</td>
                  
                  {/* Ô CHỦ NHẬT (Kéo dài 4 hàng) */}
                  <td rowSpan={4} className="p-4 bg-[#0B0A13]/30 text-center align-middle w-[15%]">
                    <div className="flex flex-col items-center justify-center space-y-4 px-2 py-10">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#C18CFF]/10 border border-[#C18CFF]/25 shadow-[0_0_15px_rgba(193,140,255,0.15)]">
                        <Coffee className="h-6 w-6 text-[#C18CFF]" />
                      </div>
                      <div className="space-y-2">
                        <h4 className={cn("text-2xl text-[#F1EDF9] font-normal italic", instrumentSerif.className)}>
                          OFF TRỌN VẸN
                        </h4>
                        <p className="text-[11px] leading-relaxed text-[#8C87A2]">
                          Dành riêng để nạp năng lượng, tĩnh dưỡng tinh thần và phục hồi cơ thể chuẩn bị cho một tuần mới rực rỡ.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* HÀNG 2: CA CHIỀU 1 */}
                <tr>
                  <td className="p-4 text-center border-r border-[#8C87A2]/5 bg-[#0B0A13]/20">
                    <span className="block text-xs font-bold text-[#F1EDF9]/90">Ca Chiều 1</span>
                    <span className={cn("block mt-1.5 text-[10px] text-[#8C87A2]", jetbrainsMono.className)}>14:00 - 16:30</span>
                  </td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu1.t2)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu1.t3)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu1.t4)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu1.t5)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu1.t6)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu1.t7)}</td>
                </tr>

                {/* HÀNG 3: CA CHIỀU 2 */}
                <tr>
                  <td className="p-4 text-center border-r border-[#8C87A2]/5 bg-[#0B0A13]/20">
                    <span className="block text-xs font-bold text-[#F1EDF9]/90">Ca Chiều 2</span>
                    <span className={cn("block mt-1.5 text-[10px] text-[#8C87A2]", jetbrainsMono.className)}>16:45 - 19:15</span>
                  </td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu2.t2)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu2.t3)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu2.t4)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu2.t5)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu2.t6)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.chieu2.t7)}</td>
                </tr>

                {/* HÀNG 4: CA TỐI */}
                <tr>
                  <td className="p-4 text-center border-r border-[#8C87A2]/5 bg-[#0B0A13]/20">
                    <span className="block text-xs font-bold text-[#F1EDF9]/90">Ca Tối</span>
                    <span className={cn("block mt-1.5 text-[10px] text-[#8C87A2]", jetbrainsMono.className)}>20:00 - 22:30</span>
                  </td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.toi.t2)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.toi.t3)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.toi.t4)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.toi.t5)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.toi.t6)}</td>
                  <td className="p-3 border-r border-[#8C87A2]/5">{renderSlotCell(TIMETABLE_SLOTS.toi.t7)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Hướng dẫn chiến thuật */}
        <section className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Tính đối xứng của Lịch học",
              desc: "Tuần học được thiết kế khoa học: Thứ 2-3 tập trung học lý thuyết mới; Thứ 4-5 cày bài tập cơ bản/thông hiểu; Thứ 6-7 bứt phá bài tập nâng cao và giải đề thực chiến V-ACT."
            },
            {
              title: "Quản lý 2h30p mỗi ca học",
              desc: "Áp dụng phương pháp Pomodoro: Học 50 phút - nghỉ 10 phút. Lặp lại đúng 2.5 chu kỳ để não bộ duy trì khả năng hấp thu kiến thức cao nhất và không bị quá tải."
            },
            {
              title: "Kỷ luật ngày nghỉ Chủ Nhật",
              desc: "Dành riêng Chủ Nhật để phục hồi sức khỏe tinh thần. Tránh xa các thiết bị điện tử liên quan đến học tập, vận động nhẹ nhàng để sẵn sàng cho chu kỳ mới."
            }
          ].map((item, idx) => (
            <div key={idx} className="bg-[#15131F] border border-[#8C87A2]/10 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#C18CFF]/30 group-hover:bg-[#C18CFF] transition-all" />
              <h3 className="text-sm font-semibold text-[#F1EDF9]">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[#8C87A2]">{item.desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Modal Xác nhận hoàn thành */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0A13]/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#15131F] border border-[#C18CFF]/20 rounded-2xl overflow-hidden shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedSlot(null)}
              className="absolute top-4 right-4 text-[#8C87A2] hover:text-[#F1EDF9] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#C18CFF]/10 border border-[#C18CFF]/20">
                <Calendar className="h-5 w-5 text-[#C18CFF]" />
              </div>
              <div>
                <h3 className={cn("text-2xl text-[#F1EDF9] font-normal", instrumentSerif.className)}>
                  Cập nhật tiến trình
                </h3>
                <p className="text-[10px] text-[#8C87A2] uppercase tracking-wider mt-0.5">Xác nhận ca học</p>
              </div>
            </div>

            {/* Chi tiết ca học */}
            <div className="bg-[#0B0A13] border border-[#8C87A2]/10 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8C87A2]">Môn học</span>
                <span className="text-sm font-bold text-[#F1EDF9]">{selectedSlot.subject}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8C87A2]">Hình thức</span>
                <span className={cn("text-xs font-bold text-[#C18CFF]", jetbrainsMono.className)}>{selectedSlot.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[#8C87A2]">Thời gian</span>
                <span className={cn("text-xs text-[#F1EDF9]", jetbrainsMono.className)}>{selectedSlot.time}</span>
              </div>
            </div>

            {/* Nút Hành động */}
            <div className="flex flex-col gap-2.5">
              {completedSlots.includes(selectedSlot.id) ? (
                <Button
                  onClick={handleToggleComplete}
                  variant="destructive"
                  className="w-full py-5 rounded-xl bg-red-950/40 text-red-400 border border-red-900/35 hover:bg-red-900/40 font-medium"
                >
                  Hủy xác nhận hoàn thành
                </Button>
              ) : (
                <Button
                  onClick={handleToggleComplete}
                  className="w-full py-5 rounded-xl bg-[#C18CFF] hover:bg-[#C18CFF]/90 text-[#0B0A13] font-semibold tracking-wide"
                >
                  Xác nhận đã hoàn thành ca học
                </Button>
              )}
              
              <Button
                onClick={() => setSelectedSlot(null)}
                variant="outline"
                className="w-full py-5 rounded-xl border-[#8C87A2]/20 hover:border-[#8C87A2]/40 text-[#8C87A2] hover:text-[#F1EDF9] bg-transparent font-medium"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </StudentShell>
  )
}
