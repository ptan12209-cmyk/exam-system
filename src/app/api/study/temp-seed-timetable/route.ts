import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pcqqpjowvqfngytarkzs.supabase.co"
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const X_ID = "6b4f85c6-b496-464f-967e-4402db77d714"
const DAT_ID = "cfb9b2b9-c21e-4417-a7d3-17e77db7af03"

const xTimetable = [
  // Thứ 2
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 1, start_time: "11:30:00", end_time: "12:30:00", subject: "Toán Học", note: "Đại số / Giải tích", color: "toan" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 1, start_time: "14:30:00", end_time: "15:30:00", subject: "Hóa Học", note: "Lý thuyết / Bài tập", color: "hoa" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 1, start_time: "20:00:00", end_time: "21:00:00", subject: "Văn / Tiếng Việt", note: "Đọc hiểu / Phân tích", color: "van" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 1, start_time: "23:00:00", end_time: "00:00:00", subject: "Tư duy Khoa Học", note: "ĐGNL - Giải quyết vấn đề", color: "logic" },

  // Thứ 3
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 2, start_time: "11:30:00", end_time: "12:30:00", subject: "Vật Lý", note: "Lý thuyết / Bài tập", color: "ly" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 2, start_time: "15:00:00", end_time: "16:00:00", subject: "Tiếng Anh", note: "ĐGNL - Từ vựng / Ngữ pháp", color: "anh" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 2, start_time: "20:00:00", end_time: "21:00:00", subject: "Toán Học", note: "Hình học", color: "toan" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 2, start_time: "23:00:00", end_time: "00:00:00", subject: "Tư duy Logic / PTSL", note: "ĐGNL - Suy luận", color: "logic" },

  // Thứ 4
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 3, start_time: "11:30:00", end_time: "12:30:00", subject: "Sinh Học", note: "Lý thuyết cốt lõi", color: "sinh" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 3, start_time: "14:30:00", end_time: "15:30:00", subject: "Văn / Tiếng Việt", note: "Luyện đề ĐGNL", color: "van" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 3, start_time: "20:00:00", end_time: "21:00:00", subject: "Vật Lý", note: "Vận dụng", color: "ly" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 3, start_time: "23:00:00", end_time: "00:00:00", subject: "Toán ĐGNL", note: "Phản xạ nhanh", color: "toan" },

  // Thứ 5
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 4, start_time: "11:30:00", end_time: "12:30:00", subject: "Hóa Học", note: "Vận dụng / Phương trình", color: "hoa" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 4, start_time: "15:00:00", end_time: "16:00:00", subject: "Tiếng Anh", note: "ĐGNL - Đọc hiểu", color: "anh" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 4, start_time: "20:00:00", end_time: "21:00:00", subject: "Sinh Học", note: "Di truyền / Sinh thái", color: "sinh" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 4, start_time: "23:00:00", end_time: "00:00:00", subject: "Tư duy Khoa Học", note: "ĐGNL", color: "logic" },

  // Thứ 6
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 5, start_time: "11:30:00", end_time: "12:30:00", subject: "Văn / Tiếng Việt", note: "Nghị luận văn học", color: "van" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 5, start_time: "14:30:00", end_time: "15:30:00", subject: "Tư duy Logic / PTSL", note: "ĐGNL", color: "logic" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 5, start_time: "20:00:00", end_time: "21:00:00", subject: "Toán Học", note: "Vận dụng cao", color: "toan" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 5, start_time: "23:00:00", end_time: "00:00:00", subject: "Giải Đề Mini", note: "Chọn 1 môn bất kỳ", color: "vact" },

  // Thứ 7
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 6, start_time: "11:30:00", end_time: "12:30:00", subject: "Tiếng Anh", note: "ĐGNL - Tổng hợp", color: "anh" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 6, start_time: "17:30:00", end_time: "18:30:00", subject: "Hóa Học", note: "Luyện đề", color: "hoa" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 6, start_time: "20:30:00", end_time: "21:30:00", subject: "Vật Lý", note: "Luyện đề", color: "ly" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 6, start_time: "23:00:00", end_time: "00:00:00", subject: "Luyện Đề ĐGNL", note: "Bấm giờ thực tế", color: "vact" },

  // Chủ Nhật
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 0, start_time: "11:30:00", end_time: "12:30:00", subject: "Toán Học", note: "Tổng ôn tuần", color: "toan" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 0, start_time: "17:30:00", end_time: "18:30:00", subject: "Văn / Tiếng Việt", note: "Tổng ôn tuần", color: "van" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 0, start_time: "20:30:00", end_time: "21:30:00", subject: "Tư duy Logic / PTSL", note: "Tổng ôn tuần", color: "logic" },
  { student_id: X_ID, assigned_by: X_ID, day_of_week: 0, start_time: "23:00:00", end_time: "00:00:00", subject: "Chữa Lỗi Sai", note: "Review toàn bộ tuần (Rất quan trọng)", color: "vact" }
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
