import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pcqqpjowvqfngytarkzs.supabase.co"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const X_ID = "6b4f85c6-b496-464f-967e-4402db77d714"
const DAT_ID = "cfb9b2b9-c21e-4417-a7d3-17e77db7af03"

const xTimetable = [
  // SÁNG (Ca 1 - 4)
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 1, start_time: "07:30:00", end_time: "10:50:00", subject: "Toán (THPT) x2, Anh (ĐGNL), Logic (ĐGNL)", note: "Ca 1 - 4", color: "toan" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 2, start_time: "07:30:00", end_time: "10:50:00", subject: "Toán (THPT), Hóa (THPT) x2, Anh (ĐGNL)", note: "Ca 1 - 4", color: "toan" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 3, start_time: "07:30:00", end_time: "10:50:00", subject: "Toán (THPT) x2, Anh (ĐGNL), Logic (ĐGNL)", note: "Ca 1 - 4", color: "toan" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 4, start_time: "07:30:00", end_time: "10:50:00", subject: "Toán (THPT), Hóa (THPT) x2, Anh (ĐGNL)", note: "Ca 1 - 4", color: "toan" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 5, start_time: "07:30:00", end_time: "10:50:00", subject: "Toán (THPT) x2, Anh (ĐGNL), Logic (ĐGNL)", note: "Ca 1 - 4", color: "toan" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 6, start_time: "07:30:00", end_time: "10:50:00", subject: "Bấm Giờ Luyện Đề (THPTQG / ĐGNL)", note: "Ca 1 - 4", color: "logic" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 0, start_time: "07:30:00", end_time: "10:50:00", subject: "Bấm Giờ Luyện Đề (THPTQG / ĐGNL)", note: "Ca 1 - 4", color: "logic" },

  // CHIỀU (Ca 5 - 7)
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 1, start_time: "14:00:00", end_time: "16:20:00", subject: "Vật Lý (THPT), Hóa (THPT), Văn/Tiếng Việt", note: "Ca 5 - 7", color: "ly" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 2, start_time: "14:00:00", end_time: "16:20:00", subject: "Vật Lý (THPT) x2, Logic/PTSL (ĐGNL)", note: "Ca 5 - 7", color: "ly" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 3, start_time: "14:00:00", end_time: "16:20:00", subject: "Vật Lý (THPT), Hóa (THPT), Văn/Tiếng Việt", note: "Ca 5 - 7", color: "ly" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 4, start_time: "14:00:00", end_time: "16:20:00", subject: "Vật Lý (THPT) x2, Logic/PTSL (ĐGNL)", note: "Ca 5 - 7", color: "ly" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 5, start_time: "14:00:00", end_time: "16:20:00", subject: "Vật Lý (THPT), Hóa (THPT), Văn/Tiếng Việt", note: "Ca 5 - 7", color: "ly" },
  
  // Thứ 7 kẹt 13h30-17h, then Chiều Muộn 17h15-19h25
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 6, start_time: "13:30:00", end_time: "17:00:00", subject: "Lịch Kẹt Cố Định", note: "Bận", color: "busy" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 6, start_time: "17:15:00", end_time: "19:25:00", subject: "Phân Tích Sâu Lỗi Sai (Đục rỗng kiến thức)", note: "Ca 5 - 6", color: "van" },
  
  // Chủ Nhật kẹt 13h30-17h, then Chiều Muộn 17h15-19h25
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 0, start_time: "13:30:00", end_time: "17:00:00", subject: "Lịch Kẹt Cố Định", note: "Bận", color: "busy" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 0, start_time: "17:15:00", end_time: "19:25:00", subject: "Phân Tích Sâu Lỗi Sai (Đục rỗng kiến thức)", note: "Ca 5 - 6", color: "van" },

  // TỐI (Ca 8 - 10)
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 1, start_time: "19:30:00", end_time: "21:50:00", subject: "Toán (Nâng cao), Tư duy Khoa Học, Sinh", note: "Ca 8 - 10", color: "vact" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 2, start_time: "19:30:00", end_time: "21:50:00", subject: "Sinh Học, Văn/Tiếng Việt, Tư duy Khoa Học", note: "Ca 8 - 10", color: "vact" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 3, start_time: "19:30:00", end_time: "21:50:00", subject: "Toán (Nâng cao), Tư duy Khoa Học, Sinh", note: "Ca 8 - 10", color: "vact" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 4, start_time: "19:30:00", end_time: "21:50:00", subject: "Sinh Học, Văn/Tiếng Việt, Tư duy Khoa Học", note: "Ca 8 - 10", color: "vact" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 5, start_time: "19:30:00", end_time: "21:50:00", subject: "Toán (Nâng cao), Tư duy Khoa Học, Sinh", note: "Ca 8 - 10", color: "vact" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 6, start_time: "20:15:00", end_time: "23:25:00", subject: "Toán VDC, Tiếng Anh, Logic, PTSL", note: "Ca 7 - 10", color: "vact" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 0, start_time: "20:15:00", end_time: "23:25:00", subject: "Toán VDC, Tiếng Anh, Logic, PTSL", note: "Ca 7 - 10", color: "vact" }
]

const datTimetable = [
  // SÁNG (08:00 - 11:00)
  { student_id: DAT_ID, day_of_week: 1, start_time: "08:00:00", end_time: "11:00:00", subject: "Toán Học", note: "3 Blocks 45/15", color: "toan" },
  { student_id: DAT_ID, day_of_week: 2, start_time: "08:00:00", end_time: "11:00:00", subject: "KHTN", note: "3 Blocks 45/15", color: "sinh" },
  { student_id: DAT_ID, day_of_week: 3, start_time: "08:00:00", end_time: "11:00:00", subject: "Ngữ Văn", note: "3 Blocks 45/15", color: "van" },
  { student_id: DAT_ID, day_of_week: 4, start_time: "08:00:00", end_time: "11:00:00", subject: "Toán Học", note: "3 Blocks 45/15", color: "toan" },
  { student_id: DAT_ID, day_of_week: 5, start_time: "08:00:00", end_time: "11:00:00", subject: "KHTN", note: "3 Blocks 45/15", color: "sinh" },
  { student_id: DAT_ID, day_of_week: 6, start_time: "08:00:00", end_time: "11:00:00", subject: "Ngữ Văn", note: "3 Blocks 45/15", color: "van" },
  { student_id: DAT_ID, day_of_week: 0, start_time: "08:00:00", end_time: "11:00:00", subject: "Toán Học", note: "3 Blocks 45/15", color: "toan" },

  // CHIỀU (14:00 - 17:00 / Linh hoạt)
  { student_id: DAT_ID, day_of_week: 1, start_time: "14:00:00", end_time: "17:00:00", subject: "KHTN", note: "Chi tiết", color: "sinh" },
  { student_id: DAT_ID, day_of_week: 2, start_time: "14:00:00", end_time: "17:00:00", subject: "Ngữ Văn", note: "Chi tiết", color: "van" },
  { student_id: DAT_ID, day_of_week: 3, start_time: "14:00:00", end_time: "17:00:00", subject: "Toán Học", note: "Chi tiết", color: "toan" },
  
  // T5 kẹt 13h50-15h50, KHTN lùi 16h00-19h00
  { student_id: DAT_ID, day_of_week: 4, start_time: "13:50:00", end_time: "15:50:00", subject: "Lịch Kẹt Cố Định", note: "Bận", color: "busy" },
  { student_id: DAT_ID, day_of_week: 4, start_time: "16:00:00", end_time: "19:00:00", subject: "KHTN (Học Lùi)", note: "Chi tiết", color: "sinh" },

  // T6 kẹt 13h50-15h50, Ngữ Văn lùi 16h00-19h00
  { student_id: DAT_ID, day_of_week: 5, start_time: "13:50:00", end_time: "15:50:00", subject: "Lịch Kẹt Cố Định", note: "Bận", color: "busy" },
  { student_id: DAT_ID, day_of_week: 5, start_time: "16:00:00", end_time: "19:00:00", subject: "Ngữ Văn (Học Lùi)", note: "Chi tiết", color: "van" },

  { student_id: DAT_ID, day_of_week: 6, start_time: "14:00:00", end_time: "17:00:00", subject: "Toán Học", note: "Chi tiết", color: "toan" },
  { student_id: DAT_ID, day_of_week: 0, start_time: "14:00:00", end_time: "17:00:00", subject: "KHTN", note: "Chi tiết", color: "sinh" },

  // TỐI (Linh hoạt)
  // T2 kẹt 19h00-21h00, Ngữ Văn muộn 21h00-23:59
  { student_id: DAT_ID, day_of_week: 1, start_time: "19:00:00", end_time: "21:00:00", subject: "Lịch Kẹt Cố Định", note: "Bận", color: "busy" },
  { student_id: DAT_ID, day_of_week: 1, start_time: "21:00:00", end_time: "23:59:59", subject: "Ngữ Văn (Muộn)", note: "Chi tiết", color: "van" },

  { student_id: DAT_ID, day_of_week: 2, start_time: "19:00:00", end_time: "22:00:00", subject: "Toán Học", note: "Chi tiết", color: "toan" },

  // T4 kẹt 19h00-21h00, KHTN muộn 21h00-23:59
  { student_id: DAT_ID, day_of_week: 3, start_time: "19:00:00", end_time: "21:00:00", subject: "Lịch Kẹt Cố Định", note: "Bận", color: "busy" },
  { student_id: DAT_ID, day_of_week: 3, start_time: "21:00:00", end_time: "23:59:59", subject: "KHTN (Muộn)", note: "Chi tiết", color: "sinh" },

  { student_id: DAT_ID, day_of_week: 4, start_time: "20:00:00", end_time: "23:00:00", subject: "Ngữ Văn", note: "Chi tiết", color: "van" },

  // T6 kẹt 19h00-21h00, Toán muộn 21h00-23:59
  { student_id: DAT_ID, day_of_week: 5, start_time: "19:00:00", end_time: "21:00:00", subject: "Lịch Kẹt Cố Định", note: "Bận", color: "busy" },
  { student_id: DAT_ID, day_of_week: 5, start_time: "21:00:00", end_time: "23:59:59", subject: "Toán (Muộn)", note: "Chi tiết", color: "toan" },

  { student_id: DAT_ID, day_of_week: 6, start_time: "19:00:00", end_time: "22:00:00", subject: "KHTN", note: "Chi tiết", color: "sinh" },
  { student_id: DAT_ID, day_of_week: 0, start_time: "19:00:00", end_time: "22:00:00", subject: "Tổng Ôn/Luyện Đề", note: "Chi tiết", color: "logic" }
]

export async function GET(request: NextRequest) {
  if (!supabaseServiceKey) {
    return NextResponse.json({
      success: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables."
    }, { status: 500 })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Clear entries
    await supabase.from("student_timetable_entries").delete().eq("student_id", X_ID)
    await supabase.from("student_timetable_entries").delete().eq("student_id", DAT_ID)

    // Insert entries
    const { error: xErr } = await supabase.from("student_timetable_entries").insert(xTimetable)
    if (xErr) throw xErr

    const { error: datErr } = await supabase.from("student_timetable_entries").insert(datTimetable)
    if (datErr) throw datErr

    return NextResponse.json({
      success: true,
      message: "Successfully seeded timetables for X (Anh Lớn) and Hồ Tấn Đạt (Em Út)!",
      x_entries_count: xTimetable.length,
      dat_entries_count: datTimetable.length
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || error
    }, { status: 500 })
  }
}
