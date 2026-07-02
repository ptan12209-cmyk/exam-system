const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://pcqqpjowvqfngytarkzs.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error("Error: SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables (.env.local).");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const X_ID = "6b4f85c6-b496-464f-967e-4402db77d714";

const newTimetable = [
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
];

async function run() {
  console.log("Starting seeding of X's new 4-session timetable...");

  // Delete existing X entries
  const { error: deleteError } = await supabase
    .from('student_timetable_entries')
    .delete()
    .eq('student_id', X_ID);

  if (deleteError) {
    console.error("Error clearing X old timetable:", deleteError);
    process.exit(1);
  }
  console.log("Cleared old timetable entries of X.");

  // Insert new X entries
  const { error: insertError } = await supabase
    .from('student_timetable_entries')
    .insert(newTimetable);

  if (insertError) {
    console.error("Error inserting X new timetable:", insertError);
    process.exit(1);
  }
  
  console.log(`Successfully seeded ${newTimetable.length} new entries for student X!`);
}

run();
