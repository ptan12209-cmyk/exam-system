"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Clock,
  Zap,
  Coffee,
  ArrowLeft,
  X,
  Check,
  Edit2,
  RotateCcw,
  Sparkles
} from "lucide-react"
import { Loading } from "@/components/shared/Loading"
import { cn } from "@/lib/utils"
import { StudentShell } from "@/components/student/StudentShell"
import { UserMenu } from "@/components/UserMenu"

import { DEFAULT_TIMETABLE_SLOTS, TimetableSlot } from "./_components/constants"
import { EditSlotModal } from "./_components/EditSlotModal"
import { ConfirmResetModal } from "./_components/ConfirmResetModal"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

interface Profile {
  id: string
  role: string
  full_name: string | null
  nickname: string | null
}

export default function TimetablePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Trạng thái lưu thời khóa biểu hiện tại (tùy chỉnh hoặc mặc định)
  const [slots, setSlots] = useState<{ [key: string]: { [key: string]: TimetableSlot } }>(DEFAULT_TIMETABLE_SLOTS)
  // Chế độ tùy chỉnh/chỉnh sửa
  const [isEditMode, setIsEditMode] = useState(false)
  // Ca học đang được chọn chỉnh sửa
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null)
  // Hiện modal xác nhận khôi phục mặc định
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Trạng thái lưu danh sách ID các ca học đã hoàn thành trong tuần
  const [completedSlots, setCompletedSlots] = useState<string[]>([])
  // Ca học đang được chọn để mở Modal xác nhận hoàn thành
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null)
  // Mốc Thứ 2 của tuần hiện tại (YYYY-MM-DD)
  const [currentWeekMonday, setCurrentWeekMonday] = useState("")

  // Hàm tính toán ngày Thứ 2 đầu tuần hiện tại theo giờ Việt Nam (UTC+7)
  const getVietnamMonday = () => {
    const now = new Date()
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
    const day = vnTime.getUTCDay()
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

      // 2. Tính toán tuần và xử lý tự động reset trạng thái hoàn thành
      const vnMonday = getVietnamMonday()
      setCurrentWeekMonday(vnMonday)

      const savedWeekStart = localStorage.getItem("student_x_timetable_week_start")
      let currentCompleted: string[] = []

      if (savedWeekStart !== vnMonday) {
        // Tuần mới -> reset hoàn thành
        localStorage.setItem("student_x_timetable_week_start", vnMonday)
        localStorage.setItem("student_x_timetable_completed_slots", JSON.stringify([]))
        setCompletedSlots([])
      } else {
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

      // 3. Load thời khóa biểu tùy chỉnh nếu có
      const savedCustomSlots = localStorage.getItem("student_x_custom_timetable_slots")
      if (savedCustomSlots) {
        try {
          const parsed = JSON.parse(savedCustomSlots)
          setSlots(parsed)
        } catch (e) {
          console.error("Lỗi đọc thời khóa biểu tùy chỉnh:", e)
        }
      }

      setLoading(false)
    }

    initPage()
  }, [router, supabase])

  // Lưu thông tin ca học đã chỉnh sửa
  const handleSaveSlot = (updatedSlot: TimetableSlot) => {
    const updatedSlots = { ...slots }
    let found = false
    
    for (const timeKey in updatedSlots) {
      for (const dayKey in updatedSlots[timeKey]) {
        if (updatedSlots[timeKey][dayKey].id === updatedSlot.id) {
          updatedSlots[timeKey][dayKey] = updatedSlot
          found = true
          break
        }
      }
      if (found) break
    }

    setSlots(updatedSlots)
    localStorage.setItem("student_x_custom_timetable_slots", JSON.stringify(updatedSlots))
    setEditingSlot(null)
  }

  // Khôi phục thời khóa biểu về mặc định ban đầu
  const handleResetTimetable = () => {
    localStorage.removeItem("student_x_custom_timetable_slots")
    setSlots(DEFAULT_TIMETABLE_SLOTS)
    setShowResetConfirm(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Xử lý hoàn thành/hủy hoàn thành ca học
  const handleToggleComplete = () => {
    if (!selectedSlot) return

    let updatedCompleted: string[]
    if (completedSlots.includes(selectedSlot.id)) {
      updatedCompleted = completedSlots.filter(id => id !== selectedSlot.id)
    } else {
      updatedCompleted = [...completedSlots, selectedSlot.id]
    }

    setCompletedSlots(updatedCompleted)
    localStorage.setItem("student_x_timetable_completed_slots", JSON.stringify(updatedCompleted))
    setSelectedSlot(null)
  }

  // Tính phần trăm hoàn thành tuần
  const completionPercentage = useMemo(() => {
    const totalSlots = 24
    return Math.round((completedSlots.length / totalSlots) * 100)
  }, [completedSlots])

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <Loading label="Đang đồng bộ thời khóa biểu Dream Engine..." />
      </div>
    )
  }

  // Render ô ca học
  const renderSlotCell = (slot: TimetableSlot) => {
    const isCompleted = completedSlots.includes(slot.id)

    return (
      <button
        key={slot.id}
        onClick={() => isEditMode ? setEditingSlot(slot) : setSelectedSlot(slot)}
        className={cn(
          "w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group select-none",
          isCompleted
            ? "bg-[hsl(var(--secondary))] border-[hsl(var(--primary))] shadow-[0_0_15px_hsl(var(--primary)/0.25)] text-[hsl(var(--foreground))] hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
            : "bg-[hsl(var(--card))]/80 border-[hsl(var(--border))]/30 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))]/50 hover:bg-[hsl(var(--secondary))]"
        )}
      >
        {isCompleted && (
          <div className="absolute inset-0 bg-[hsl(var(--primary))]/5 pointer-events-none" />
        )}

        <div className="flex items-start justify-between">
          <span className={cn(
            "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded",
            isCompleted
              ? "bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))]"
              : "bg-[hsl(var(--muted-foreground))]/10 text-[hsl(var(--muted-foreground))]"
          )}>
            {slot.type}
          </span>
          {isEditMode ? (
            <span className="flex h-5 w-5 items-center justify-center rounded-lg bg-[hsl(var(--primary))]/15 border border-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] group-hover:bg-[hsl(var(--primary))] group-hover:text-[hsl(var(--primary-foreground))] transition-all">
              <Edit2 className="h-3 w-3 stroke-[2.5]" />
            </span>
          ) : isCompleted ? (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]">
              <Check className="h-3 w-3 stroke-[3]" />
            </span>
          ) : null}
        </div>

        <h3 className={cn(
          "mt-3 text-lg font-medium leading-none tracking-tight",
          isCompleted ? "text-[hsl(var(--foreground))]" : "text-[hsl(var(--foreground))]/70 group-hover:text-[hsl(var(--foreground))]"
        )}>
          {slot.subject}
        </h3>

        <div className="mt-4 flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
          <Clock className="h-3 w-3" />
          <span className={jetbrainsMono.className}>{slot.time}</span>
        </div>
      </button>
    )
  }

  return (
    <StudentShell className={cn("bg-[hsl(var(--background))] text-[hsl(var(--foreground))] min-h-screen", inter.className)}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/90 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/student/X/dashboard"
            className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Dashboard X</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <div className={cn("hidden sm:block text-[10px] font-bold uppercase tracking-[0.25em] text-[hsl(var(--primary))] animate-pulse", jetbrainsMono.className)}>
              Space X Timetable
            </div>
            <UserMenu
              userName={profile?.full_name || "X"}
              userClass="Lớp X"
              onLogout={handleLogout}
              role="student"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
        
        {/* Banner */}
        <section className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex flex-wrap gap-3 items-center mb-3">
                <p className={cn("inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/20 bg-[hsl(var(--card))] px-3.5 py-1.5 text-[9px] uppercase tracking-[0.2em] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--primary))] animate-pulse" />
                  Lịch trình thông minh
                </p>
                {isEditMode && (
                  <p className={cn("inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 px-3 py-1 text-[9px] uppercase tracking-[0.15em] text-[hsl(var(--primary))]", jetbrainsMono.className)}>
                    Chế độ chỉnh sửa
                  </p>
                )}
              </div>
              <h1 className={cn("text-5xl text-[hsl(var(--foreground))] font-normal leading-tight md:text-7xl", instrumentSerif.className)}>
                Thời khóa biểu X
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
                Thời khóa biểu tự động làm mới lúc 00:00 Thứ 2 hàng tuần (UTC+7). {isEditMode ? "Chọn bất kỳ ca học nào để bắt đầu tùy chỉnh thông tin học tập." : "Bấm vào ca học để cập nhật tiến độ và thắp sáng không gian học tập."}
              </p>
              
              {/* Nút điều khiển chỉnh sửa */}
              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl border flex items-center gap-2 font-medium text-xs transition-all duration-300",
                    isEditMode
                      ? "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))] border-[hsl(var(--primary))]"
                      : "bg-[hsl(var(--card))] border border-[hsl(var(--border))]/30 hover:border-[hsl(var(--border))]/50 text-[hsl(var(--foreground))]"
                  )}
                >
                  {isEditMode ? (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Thoát tùy chỉnh</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Tùy chỉnh lịch học</span>
                    </>
                  )}
                </Button>
                
                {isEditMode && (
                  <Button
                    onClick={() => setShowResetConfirm(true)}
                    variant="outline"
                    className="px-5 py-2.5 rounded-xl border border-red-500/20 hover:border-red-500/40 bg-transparent text-red-400 hover:text-red-300 flex items-center gap-2 font-medium text-xs transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Khôi phục mặc định</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Trạng thái */}
            <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]/20 rounded-2xl p-5 min-w-[280px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Tiến độ tuần học</span>
                <span className={cn("text-sm font-bold text-[hsl(var(--primary))]", jetbrainsMono.className)}>
                  {completedSlots.length} / 24 Ca
                </span>
              </div>
              <div className="h-1.5 w-full bg-[hsl(var(--background))] rounded-full overflow-hidden border border-[hsl(var(--border))]/20">
                <div
                  className="h-full bg-[hsl(var(--primary))] rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-[hsl(var(--muted-foreground))]">
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3 text-[hsl(var(--primary))]" />
                  Đạt {completionPercentage}%
                </span>
                <span className={jetbrainsMono.className}>Tuần: {currentWeekMonday}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Lưới Thời Khóa Biểu */}
        <section className="bg-[hsl(var(--card))]/50 border border-[hsl(var(--border))]/20 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left min-w-[1000px]">
              <thead>
                <tr className="border-b border-[hsl(var(--border))]/25 bg-[hsl(var(--background))]/50">
                  <th className={cn("p-5 text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] w-[120px] text-center border-r border-[hsl(var(--border))]/10", jetbrainsMono.className)}>
                    Khung Giờ
                  </th>
                  <th className="p-5 text-sm font-semibold text-[hsl(var(--foreground))] text-center border-r border-[hsl(var(--border))]/10">Thứ 2</th>
                  <th className="p-5 text-sm font-semibold text-[hsl(var(--foreground))] text-center border-r border-[hsl(var(--border))]/10">Thứ 3</th>
                  <th className="p-5 text-sm font-semibold text-[hsl(var(--foreground))] text-center border-r border-[hsl(var(--border))]/10">Thứ 4</th>
                  <th className="p-5 text-sm font-semibold text-[hsl(var(--foreground))] text-center border-r border-[hsl(var(--border))]/10">Thứ 5</th>
                  <th className="p-5 text-sm font-semibold text-[hsl(var(--foreground))] text-center border-r border-[hsl(var(--border))]/10">Thứ 6</th>
                  <th className="p-5 text-sm font-semibold text-[hsl(var(--foreground))] text-center border-r border-[hsl(var(--border))]/10">Thứ 7</th>
                  <th className="p-5 text-sm font-semibold text-[hsl(var(--foreground))] text-center">Chủ Nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]/25">
                {/* HÀNG 1: CA SÁNG */}
                <tr>
                  <td className="p-4 text-center border-r border-[hsl(var(--border))]/10 bg-[hsl(var(--background))]/20">
                    <span className="block text-xs font-bold text-[hsl(var(--foreground))]/90">Ca Sáng</span>
                    <span className={cn("block mt-1.5 text-[10px] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>08:00 - 10:30</span>
                  </td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t2)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t3)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t4)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t5)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t6)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t7)}</td>
                  
                  <td rowSpan={4} className="p-4 bg-[hsl(var(--background))]/30 text-center align-middle w-[15%]">
                    <div className="flex flex-col items-center justify-center space-y-4 px-2 py-10">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/25 shadow-[0_0_15px_hsl(var(--primary)/0.15)]">
                        <Coffee className="h-6 w-6 text-[hsl(var(--primary))]" />
                      </div>
                      <div className="space-y-2">
                        <h4 className={cn("text-2xl text-[hsl(var(--foreground))] font-normal italic", instrumentSerif.className)}>
                          OFF TRỌN VẸN
                        </h4>
                        <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                          Dành riêng để nạp năng lượng, tĩnh dưỡng tinh thần và phục hồi cơ thể chuẩn bị cho một tuần mới rực rỡ.
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>

                {/* HÀNG 2: CA CHIỀU 1 */}
                <tr>
                  <td className="p-4 text-center border-r border-[hsl(var(--border))]/10 bg-[hsl(var(--background))]/20">
                    <span className="block text-xs font-bold text-[hsl(var(--foreground))]/90">Ca Chiều 1</span>
                    <span className={cn("block mt-1.5 text-[10px] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>14:00 - 16:30</span>
                  </td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t2)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t3)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t4)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t5)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t6)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t7)}</td>
                </tr>

                {/* HÀNG 3: CA CHIỀU 2 */}
                <tr>
                  <td className="p-4 text-center border-r border-[hsl(var(--border))]/10 bg-[hsl(var(--background))]/20">
                    <span className="block text-xs font-bold text-[hsl(var(--foreground))]/90">Ca Chiều 2</span>
                    <span className={cn("block mt-1.5 text-[10px] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>16:45 - 19:15</span>
                  </td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t2)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t3)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t4)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t5)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t6)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t7)}</td>
                </tr>

                {/* HÀNG 4: CA TỐI */}
                <tr>
                  <td className="p-4 text-center border-r border-[hsl(var(--border))]/10 bg-[hsl(var(--background))]/20">
                    <span className="block text-xs font-bold text-[hsl(var(--foreground))]/90">Ca Tối</span>
                    <span className={cn("block mt-1.5 text-[10px] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>20:00 - 22:30</span>
                  </td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t2)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t3)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t4)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t5)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t6)}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t7)}</td>
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
            <div key={idx} className="bg-[hsl(var(--card))] border border-[hsl(var(--border))]/25 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-[hsl(var(--primary))]/30 group-hover:bg-[hsl(var(--primary))] transition-all" />
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{item.desc}</p>
            </div>
          ))}
        </section>
      </main>

      {/* Modal Xác nhận hoàn thành */}
      {selectedSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[hsl(var(--background))]/85 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--primary))]/20 rounded-2xl overflow-hidden shadow-2xl p-6 relative">
            <button
              onClick={() => setSelectedSlot(null)}
              className="absolute top-4 right-4 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10 border border-[hsl(var(--primary))]/20">
                <Calendar className="h-5 w-5 text-[hsl(var(--primary))]" />
              </div>
              <div>
                <h3 className={cn("text-2xl text-[hsl(var(--foreground))] font-normal", instrumentSerif.className)}>
                  Cập nhật tiến trình
                </h3>
                <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider mt-0.5">Xác nhận ca học</p>
              </div>
            </div>

            <div className="bg-[hsl(var(--background))] border border-[hsl(var(--border))]/25 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Môn học</span>
                <span className="text-sm font-bold text-[hsl(var(--foreground))]">{selectedSlot.subject}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Hình thức</span>
                <span className={cn("text-xs font-bold text-[hsl(var(--primary))]", jetbrainsMono.className)}>{selectedSlot.type}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-[hsl(var(--muted-foreground))]">Thời gian</span>
                <span className={cn("text-xs text-[hsl(var(--foreground))]", jetbrainsMono.className)}>{selectedSlot.time}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              {completedSlots.includes(selectedSlot.id) ? (
                <Button
                  onClick={handleToggleComplete}
                  variant="destructive"
                  className="w-full py-5 rounded-xl bg-red-950/40 text-red-400 border border-red-900/35 hover:bg-red-900/40 font-medium text-xs"
                >
                  Hủy xác nhận hoàn thành
                </Button>
              ) : (
                <Button
                  onClick={handleToggleComplete}
                  className="w-full py-5 rounded-xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-[hsl(var(--primary-foreground))] font-semibold tracking-wide text-xs"
                >
                  Xác nhận đã hoàn thành ca học
                </Button>
              )}
              
              <Button
                onClick={() => setSelectedSlot(null)}
                variant="outline"
                className="w-full py-5 rounded-xl border-[hsl(var(--border))]/40 hover:border-[hsl(var(--border))]/60 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] bg-transparent font-medium text-xs"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tùy chỉnh ca học */}
      {editingSlot && (
        <EditSlotModal
          slot={editingSlot}
          onClose={() => setEditingSlot(null)}
          onSave={handleSaveSlot}
        />
      )}

      {/* Modal Xác nhận Reset */}
      {showResetConfirm && (
        <ConfirmResetModal
          onClose={() => setShowResetConfirm(false)}
          onConfirm={handleResetTimetable}
        />
      )}
    </StudentShell>
  )
}
