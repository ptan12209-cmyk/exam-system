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

import { DEFAULT_TIMETABLE_SLOTS, TimetableSlot } from "./constants"
import { EditSlotModal } from "./EditSlotModal"
import { ConfirmResetModal } from "./ConfirmResetModal"

const instrumentSerif = { className: "font-instrument-serif" }
const jetbrainsMono = { className: "font-jetbrains-mono" }
const inter = { className: "font-inter" }

interface Profile {
  id: string
  role: string
  full_name: string | null
  nickname: string | null
}

export function XTimetable() {
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

  // Hàm lấy key thứ trong tuần hiện tại theo giờ Việt Nam
  const currentDayKey = useMemo(() => {
    const now = new Date()
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000))
    const day = vnTime.getUTCDay()
    const keys = ["cn", "t2", "t3", "t4", "t5", "t6", "t7"]
    return keys[day]
  }, [])

  const getHeaderClass = (dayKey: string, hasRightBorder = true) => {
    const isToday = dayKey === currentDayKey
    return cn(
      "p-5 text-sm font-semibold text-center transition-all duration-300 relative",
      hasRightBorder && "border-r border-[hsl(var(--border))]/10",
      isToday 
        ? "text-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 border-b-2 border-b-[hsl(var(--primary))]" 
        : "text-[hsl(var(--foreground))]"
    )
  }

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
      if ((profileData.role !== "student" && profileData.role !== "online_student") || profileData.nickname !== "X") {
        router.push("/student/dashboard")
        return
      }

      setProfile(profileData)

      // 2. Tính toán tuần và xử lý tự động reset trạng thái hoàn thành
      const vnMonday = getVietnamMonday()
      setCurrentWeekMonday(vnMonday)

      let currentCompleted: string[] = []

      // Sync completed slots from database
      try {
        const { data: dbCompleted, error: completedError } = await supabase
          .from("timetable_study_logs")
          .select("slot_id")
          .eq("student_id", user.id)
          .gte("session_date", vnMonday)
          .eq("is_completed", true)

        if (completedError) {
          console.error("Lỗi truy vấn completed slots từ DB:", completedError)
        }

        if (dbCompleted && dbCompleted.length > 0) {
          currentCompleted = dbCompleted.map((row: any) => row.slot_id)
        }
      } catch (err) {
        console.error("Lỗi đọc dữ liệu hoàn thành từ database:", err)
      }

      // Fallback/Merge with localStorage completed slots
      const savedWeekStart = localStorage.getItem("student_x_timetable_week_start")
      if (savedWeekStart !== vnMonday) {
        localStorage.setItem("student_x_timetable_week_start", vnMonday)
        localStorage.setItem("student_x_timetable_completed_slots", JSON.stringify(currentCompleted))
        setCompletedSlots(currentCompleted)
      } else {
        const savedCompleted = localStorage.getItem("student_x_timetable_completed_slots")
        if (savedCompleted) {
          try {
            const localCompleted = JSON.parse(savedCompleted)
            const merged = Array.from(new Set([...currentCompleted, ...localCompleted]))
            setCompletedSlots(merged)
          } catch (e) {
            setCompletedSlots(currentCompleted)
          }
        } else {
          setCompletedSlots(currentCompleted)
        }
      }

      // 3. Load thời khóa biểu tùy chỉnh từ database
      try {
        const { data: dbSlots, error: slotsError } = await supabase
          .from("student_timetable_entries")
          .select("*")
          .eq("student_id", user.id)

        if (slotsError) {
          console.error("Lỗi truy vấn student timetable entries từ DB:", slotsError)
        }

        if (dbSlots && dbSlots.length > 0) {
          const grid = JSON.parse(JSON.stringify(DEFAULT_TIMETABLE_SLOTS)) // clone
          dbSlots.forEach((row: any) => {
            let timeKey = ''
            if (row.start_time.startsWith('11:30')) timeKey = 'sang'
            else if (row.start_time.startsWith('14:30') || row.start_time.startsWith('15:00') || row.start_time.startsWith('17:30')) timeKey = 'chieu1'
            else if (row.start_time.startsWith('20:00') || row.start_time.startsWith('20:30')) timeKey = 'chieu2'
            else if (row.start_time.startsWith('23:00')) timeKey = 'toi'

            const dayKeys: Record<number, string> = { 1: 't2', 2: 't3', 3: 't4', 4: 't5', 5: 't6', 6: 't7', 0: 'cn' }
            const dayKey = dayKeys[row.day_of_week]

            if (timeKey && dayKey) {
              grid[timeKey][dayKey] = {
                id: row.id, // keep DB row UUID as slot ID
                subject: row.subject,
                type: row.note || '',
                time: `${row.start_time.slice(0, 5)} - ${row.end_time.slice(0, 5)}`,
                color: row.color || 'toan'
              }
            }
          })
          setSlots(grid)
        } else {
          // Fallback to localStorage if database is empty
          const savedCustomSlots = localStorage.getItem("student_x_custom_timetable_slots")
          if (savedCustomSlots) {
            try {
              const parsed = JSON.parse(savedCustomSlots)
              setSlots(parsed)
            } catch (e) {
              console.error("Lỗi đọc thời khóa biểu tùy chỉnh từ localStorage:", e)
            }
          }
        }
      } catch (err) {
        console.error("Lỗi nạp thời khóa biểu từ database:", err)
      }

      setLoading(false)
    }

    initPage()
  }, [router, supabase])

  // Lưu thông tin ca học đã chỉnh sửa (Đồng bộ localStorage và Database)
  const handleSaveSlot = async (updatedSlot: TimetableSlot) => {
    const updatedSlots = { ...slots }
    let found = false
    let slotTimeKey = ''
    let slotDayKey = ''
    
    for (const timeKey in updatedSlots) {
      for (const dayKey in updatedSlots[timeKey]) {
        if (updatedSlots[timeKey][dayKey].id === updatedSlot.id) {
          updatedSlots[timeKey][dayKey] = updatedSlot
          slotTimeKey = timeKey
          slotDayKey = dayKey
          found = true
          break
        }
      }
      if (found) break
    }

    setSlots(updatedSlots)
    localStorage.setItem("student_x_custom_timetable_slots", JSON.stringify(updatedSlots))
    setEditingSlot(null)

    // Save to Database
    if (profile && slotDayKey) {
      const [sTime, eTime] = updatedSlot.time.split(' - ')
      const dayMap: Record<string, number> = { 't2': 1, 't3': 2, 't4': 3, 't5': 4, 't6': 5, 't7': 6, 'cn': 0 }
      const dayOfWeek = dayMap[slotDayKey] !== undefined ? dayMap[slotDayKey] : 1

      try {
        const payload = {
          student_id: profile.id,
          assigned_by: profile.id, // Student X assignments are self-assigned
          day_of_week: dayOfWeek,
          start_time: `${sTime}:00`,
          end_time: `${eTime}:00`,
          subject: updatedSlot.subject,
          note: updatedSlot.type, // type is saved to note
          color: updatedSlot.color
        }

        // Try to update using slot's UUID if it is a UUID.
        // If it starts with 'mon', 'tue', etc. (default ID format), it's not in DB yet, query first.
        const isUUID = updatedSlot.id.length === 36 || updatedSlot.id.includes('-') && updatedSlot.id.split('-').length === 5;
        if (isUUID) {
          const { error: upsertError } = await supabase
            .from("student_timetable_entries")
            .upsert({ id: updatedSlot.id, ...payload })
          
          if (upsertError) {
            console.error("Lỗi upsert student_timetable_entries:", upsertError)
          }
        } else {
          // Check if slot already exists in DB by checking day_of_week and start_time
          const { data: existing, error: selectError } = await supabase
            .from("student_timetable_entries")
            .select("id")
            .eq("student_id", profile.id)
            .eq("day_of_week", dayOfWeek)
            .eq("start_time", `${sTime}:00`)
            .maybeSingle()

          if (selectError) {
            console.error("Lỗi tìm kiếm slot đã tồn tại từ DB:", selectError)
          }

          if (existing) {
            const { error: updateError } = await supabase
              .from("student_timetable_entries")
              .update(payload)
              .eq("id", existing.id)
            
            if (updateError) {
              console.error("Lỗi cập nhật student_timetable_entries:", updateError)
            }
          } else {
            const { data: newRow, error: insertError } = await supabase
              .from("student_timetable_entries")
              .insert(payload)
              .select("id")
              .single()
            
            if (insertError) {
              console.error("Lỗi thêm mới student_timetable_entries:", insertError)
            }
            
            if (newRow) {
              // Update slot ID in active state with the new database UUID
              const nextSlots = { ...updatedSlots }
              nextSlots[slotTimeKey][slotDayKey].id = newRow.id
              setSlots(nextSlots)
              localStorage.setItem("student_x_custom_timetable_slots", JSON.stringify(nextSlots))
            }
          }
        }
      } catch (err) {
        console.error("Lỗi đồng bộ lưu ca học vào database:", err)
      }
    }
  }

  // Xóa ca học (Thiết lập thành "Nghỉ")
  const handleDeleteSlot = async (slot: TimetableSlot) => {
    const deletedSlot = {
      ...slot,
      subject: "Nghỉ",
      type: "Nghỉ",
      color: "other"
    }
    await handleSaveSlot(deletedSlot)
  }

  // Khôi phục ca học về mặc định
  const handleResetSingleSlot = async (slot: TimetableSlot) => {
    if (!profile) return

    try {
      const { error } = await supabase
        .from("student_timetable_entries")
        .delete()
        .eq("id", slot.id)
      
      if (error) {
        console.error("Lỗi xóa slot tùy chỉnh trên DB:", error)
        return
      }
    } catch (err) {
      console.error("Lỗi khi kết nối database:", err)
      return
    }

    let slotTimeKey = ''
    let slotDayKey = ''
    let found = false

    const updatedSlots = { ...slots }
    for (const timeKey in updatedSlots) {
      for (const dayKey in updatedSlots[timeKey]) {
        if (updatedSlots[timeKey][dayKey].id === slot.id) {
          slotTimeKey = timeKey
          slotDayKey = dayKey
          found = true
          break
        }
      }
      if (found) break
    }

    if (slotTimeKey && slotDayKey) {
      const defaultSlot = DEFAULT_TIMETABLE_SLOTS[slotTimeKey][slotDayKey]
      updatedSlots[slotTimeKey][slotDayKey] = defaultSlot
      setSlots(updatedSlots)
      localStorage.setItem("student_x_custom_timetable_slots", JSON.stringify(updatedSlots))
    }

    setEditingSlot(null)
  }

  // Khôi phục thời khóa biểu về mặc định ban đầu
  const handleResetTimetable = async () => {
    localStorage.removeItem("student_x_custom_timetable_slots")
    setSlots(DEFAULT_TIMETABLE_SLOTS)
    setShowResetConfirm(false)

    if (profile) {
      try {
        const { error: deleteError } = await supabase
          .from("student_timetable_entries")
          .delete()
          .eq("student_id", profile.id)
        
        if (deleteError) {
          console.error("Lỗi xóa student_timetable_entries trên DB:", deleteError)
        }
      } catch (err) {
        console.error("Lỗi xóa thời khóa biểu trên database:", err)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  // Xử lý hoàn thành/hủy hoàn thành ca học (Đồng bộ Database & localStorage)
  const handleToggleComplete = async () => {
    if (!selectedSlot || !profile) return

    const isCompleted = completedSlots.includes(selectedSlot.id)
    let updatedCompleted: string[]
    if (isCompleted) {
      updatedCompleted = completedSlots.filter(id => id !== selectedSlot.id)
    } else {
      updatedCompleted = [...completedSlots, selectedSlot.id]
    }

    setCompletedSlots(updatedCompleted)
    localStorage.setItem("student_x_timetable_completed_slots", JSON.stringify(updatedCompleted))
    setSelectedSlot(null)

    // Sync state to Supabase
    try {
      const todayStr = new Date().toISOString().split('T')[0]
      const [sTime, eTime] = selectedSlot.time.split(' - ')
      
      if (isCompleted) {
        // Delete or set completed = false
        const { error: deleteLogError } = await supabase
          .from("timetable_study_logs")
          .delete()
          .eq("student_id", profile.id)
          .eq("slot_id", selectedSlot.id)
          .eq("session_date", todayStr)

        if (deleteLogError) {
          console.error("Lỗi xóa timetable_study_logs trên DB:", deleteLogError)
        }
      } else {
        // Upsert log as completed
        const { error: upsertLogError } = await supabase
          .from("timetable_study_logs")
          .upsert({
            student_id: profile.id,
            slot_id: selectedSlot.id,
            subject: selectedSlot.subject,
            session_date: todayStr,
            is_completed: true,
            duration_seconds: 5400, // 90 minutes for manual check
            start_time: `${sTime}:00`,
            end_time: `${eTime}:00`
          }, {
            onConflict: "student_id,slot_id,session_date"
          })

        if (upsertLogError) {
          console.error("Lỗi upsert timetable_study_logs trên DB:", upsertLogError)
        }
      }
    } catch (err) {
      console.error("Lỗi đồng bộ trạng thái ca học lên database:", err)
    }
  }

  // Tính phần trăm hoàn thành tuần
  const completionPercentage = useMemo(() => {
    let totalActiveSlots = 0
    for (const timeKey in slots) {
      for (const dayKey in slots[timeKey]) {
        if (slots[timeKey][dayKey].subject !== "Nghỉ") {
          totalActiveSlots++
        }
      }
    }
    const total = totalActiveSlots || 1
    return Math.round((completedSlots.length / total) * 100)
  }, [slots, completedSlots])

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center">
        <Loading label="Đang đồng bộ thời khóa biểu Dream Engine..." />
      </div>
    )
  }

  // Render ô ca học
  const renderSlotCell = (slot: TimetableSlot, cellDayKey: string) => {
    const isCompleted = completedSlots.includes(slot.id)
    const isOff = slot.subject === "Nghỉ"
    const isToday = cellDayKey === currentDayKey

    return (
      <button
        key={slot.id}
        onClick={() => {
          if (isEditMode) {
            setEditingSlot(slot)
          } else if (!isOff) {
            setSelectedSlot(slot)
          }
        }}
        className={cn(
          "w-full text-left p-4 rounded-xl border transition-all duration-300 relative overflow-hidden group select-none flex flex-col justify-between h-[135px]",
          isCompleted
            ? "bg-[hsl(var(--secondary))] border-[hsl(var(--primary))] shadow-[0_0_15px_hsl(var(--primary)/0.25)] text-[hsl(var(--foreground))] hover:shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
            : isOff
              ? "bg-[hsl(var(--card))]/30 border-dashed border-[hsl(var(--border))]/20 text-[hsl(var(--muted-foreground))]/40"
              : "bg-[hsl(var(--card))]/80 border-[hsl(var(--border))]/30 text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--muted-foreground))]/50 hover:bg-[hsl(var(--secondary))]",
          isToday && !isOff && (isCompleted 
            ? "ring-2 ring-[hsl(var(--primary))] border-[hsl(var(--primary))] shadow-[0_0_20px_hsl(var(--primary)/0.45)]"
            : "ring-2 ring-[hsl(var(--primary))]/50 border-[hsl(var(--primary))]/70 shadow-[0_0_15px_hsl(var(--primary)/0.3)] bg-[hsl(var(--card))]/95"
          )
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
              : isOff
                ? "bg-[hsl(var(--muted-foreground))]/5 text-[hsl(var(--muted-foreground))]/30"
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

        <div className="flex-1 flex flex-col justify-center my-1.5 space-y-0.5">
          {isOff ? (
            <h3 className="text-[13px] font-normal italic leading-snug tracking-tight text-[hsl(var(--muted-foreground))]/45">
              Nghỉ học
            </h3>
          ) : (
            slot.subject.split(",").map((sub, idx) => (
              <div
                key={idx}
                className={cn(
                  "text-[11.5px] font-medium leading-tight tracking-tight truncate",
                  isCompleted
                    ? "text-[hsl(var(--foreground))]"
                    : "text-[hsl(var(--foreground))]/75 group-hover:text-[hsl(var(--foreground))]"
                )}
              >
                {sub.trim()}
              </div>
            ))
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))]">
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
            href="/student/dashboard"
            className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            <span>Dashboard</span>
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
                  {completedSlots.length} / 28 Ca
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
                  <th className={getHeaderClass('t2')}>Thứ 2</th>
                  <th className={getHeaderClass('t3')}>Thứ 3</th>
                  <th className={getHeaderClass('t4')}>Thứ 4</th>
                  <th className={getHeaderClass('t5')}>Thứ 5</th>
                  <th className={getHeaderClass('t6')}>Thứ 6</th>
                  <th className={getHeaderClass('t7')}>Thứ 7</th>
                  <th className={getHeaderClass('cn', false)}>Chủ Nhật</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]/25">
                {/* HÀNG 1: CA SÁNG */}
                <tr>
                  <td className="p-4 text-center border-r border-[hsl(var(--border))]/10 bg-[hsl(var(--background))]/20">
                    <span className="block text-xs font-bold text-[hsl(var(--foreground))]/90">Ca 1</span>
                    <span className={cn("block mt-1 text-[10px] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>11:30</span>
                  </td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t2, "t2")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t3, "t3")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t4, "t4")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t5, "t5")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t6, "t6")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.sang.t7, "t7")}</td>
                  <td className="p-3">{renderSlotCell(slots.sang.cn, "cn")}</td>
                </tr>

                {/* HÀNG 2: CA CHIỀU 1 */}
                <tr>
                  <td className="p-4 text-center border-r border-[hsl(var(--border))]/10 bg-[hsl(var(--background))]/20">
                    <span className="block text-xs font-bold text-[hsl(var(--foreground))]/90">Ca 2</span>
                    <span className={cn("block mt-1 text-[10px] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>Chiều</span>
                  </td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t2, "t2")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t3, "t3")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t4, "t4")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t5, "t5")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t6, "t6")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu1.t7, "t7")}</td>
                  <td className="p-3">{renderSlotCell(slots.chieu1.cn, "cn")}</td>
                </tr>

                {/* HÀNG 3: CA CHIỀU 2 */}
                <tr>
                  <td className="p-4 text-center border-r border-[hsl(var(--border))]/10 bg-[hsl(var(--background))]/20">
                    <span className="block text-xs font-bold text-[hsl(var(--foreground))]/90">Ca 3</span>
                    <span className={cn("block mt-1 text-[10px] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>Tối</span>
                  </td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t2, "t2")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t3, "t3")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t4, "t4")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t5, "t5")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t6, "t6")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.chieu2.t7, "t7")}</td>
                  <td className="p-3">{renderSlotCell(slots.chieu2.cn, "cn")}</td>
                </tr>

                {/* HÀNG 4: CA TỐI */}
                <tr>
                  <td className="p-4 text-center border-r border-[hsl(var(--border))]/10 bg-[hsl(var(--background))]/20">
                    <span className="block text-xs font-bold text-[hsl(var(--foreground))]/90">Ca 4</span>
                    <span className={cn("block mt-1 text-[10px] text-[hsl(var(--muted-foreground))]", jetbrainsMono.className)}>23:00</span>
                  </td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t2, "t2")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t3, "t3")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t4, "t4")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t5, "t5")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t6, "t6")}</td>
                  <td className="p-3 border-r border-[hsl(var(--border))]/10">{renderSlotCell(slots.toi.t7, "t7")}</td>
                  <td className="p-3">{renderSlotCell(slots.toi.cn, "cn")}</td>
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
          onDelete={handleDeleteSlot}
          onReset={handleResetSingleSlot}
          isCustomized={editingSlot.id.length === 36 || (editingSlot.id.includes('-') && editingSlot.id.split('-').length === 5)}
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
