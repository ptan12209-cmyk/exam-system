export interface TimetableSlot {
  id: string
  subject: string
  type: string
  time: string
  color: string
}

export const DEFAULT_TIMETABLE_SLOTS: { [key: string]: { [key: string]: TimetableSlot } } = {
  sang: {
    t2: { id: "mon-c1", subject: "Toán Học", type: "Đại số / Giải tích", time: "11:30 - 12:30", color: "toan" },
    t3: { id: "tue-c1", subject: "Vật Lý", type: "Lý thuyết / Bài tập", time: "11:30 - 12:30", color: "ly" },
    t4: { id: "wed-c1", subject: "Sinh Học", type: "Lý thuyết cốt lõi", time: "11:30 - 12:30", color: "sinh" },
    t5: { id: "thu-c1", subject: "Hóa Học", type: "Vận dụng / Phương trình", time: "11:30 - 12:30", color: "hoa" },
    t6: { id: "fri-c1", subject: "Văn / Tiếng Việt", type: "Nghị luận văn học", time: "11:30 - 12:30", color: "van" },
    t7: { id: "sat-c1", subject: "Tiếng Anh", type: "ĐGNL - Tổng hợp", time: "11:30 - 12:30", color: "anh" },
    cn: { id: "sun-c1", subject: "Toán Học", type: "Tổng ôn tuần", time: "11:30 - 12:30", color: "toan" },
  },
  chieu1: {
    t2: { id: "mon-c2", subject: "Hóa Học", type: "Lý thuyết / Bài tập", time: "14:30 - 15:30", color: "hoa" },
    t3: { id: "tue-c2", subject: "Tiếng Anh", type: "ĐGNL - Từ vựng / Ngữ pháp", time: "15:00 - 16:00", color: "anh" },
    t4: { id: "wed-c2", subject: "Văn / Tiếng Việt", type: "Luyện đề ĐGNL", time: "14:30 - 15:30", color: "van" },
    t5: { id: "thu-c2", subject: "Tiếng Anh", type: "ĐGNL - Đọc hiểu", time: "15:00 - 16:00", color: "anh" },
    t6: { id: "fri-c2", subject: "Tư duy Logic / PTSL", type: "ĐGNL", time: "14:30 - 15:30", color: "logic" },
    t7: { id: "sat-c2", subject: "Hóa Học", type: "Luyện đề", time: "17:30 - 18:30", color: "hoa" },
    cn: { id: "sun-c2", subject: "Văn / Tiếng Việt", type: "Tổng ôn tuần", time: "17:30 - 18:30", color: "van" },
  },
  chieu2: {
    t2: { id: "mon-c3", subject: "Văn / Tiếng Việt", type: "Đọc hiểu / Phân tích", time: "20:00 - 21:00", color: "van" },
    t3: { id: "tue-c3", subject: "Toán Học", type: "Hình học", time: "20:00 - 21:00", color: "toan" },
    t4: { id: "wed-c3", subject: "Vật Lý", type: "Vận dụng", time: "20:00 - 21:00", color: "ly" },
    t5: { id: "thu-c3", subject: "Sinh Học", type: "Di truyền / Sinh thái", time: "20:00 - 21:00", color: "sinh" },
    t6: { id: "fri-c3", subject: "Toán Học", type: "Vận dụng cao", time: "20:00 - 21:00", color: "toan" },
    t7: { id: "sat-c3", subject: "Vật Lý", type: "Luyện đề", time: "20:30 - 21:30", color: "ly" },
    cn: { id: "sun-c3", subject: "Tư duy Logic / PTSL", type: "Tổng ôn tuần", time: "20:30 - 21:30", color: "logic" },
  },
  toi: {
    t2: { id: "mon-c4", subject: "Tư duy Khoa Học", type: "ĐGNL - Giải quyết vấn đề", time: "23:00 - 00:00", color: "logic" },
    t3: { id: "tue-c4", subject: "Tư duy Logic / PTSL", type: "ĐGNL - Suy luận", time: "23:00 - 00:00", color: "logic" },
    t4: { id: "wed-c4", subject: "Toán ĐGNL", type: "Phản xạ nhanh", time: "23:00 - 00:00", color: "toan" },
    t5: { id: "thu-c4", subject: "Tư duy Khoa Học", type: "ĐGNL", time: "23:00 - 00:00", color: "logic" },
    t6: { id: "fri-c4", subject: "Giải Đề Mini", type: "Chọn 1 môn bất kỳ", time: "23:00 - 00:00", color: "vact" },
    t7: { id: "sat-c4", subject: "Luyện Đề ĐGNL", type: "Bấm giờ thực tế", time: "23:00 - 00:00", color: "vact" },
    cn: { id: "sun-c4", subject: "Chữa Lỗi Sai", type: "Review toàn bộ tuần (Rất quan trọng)", time: "23:00 - 00:00", color: "vact" },
  }
}

export const PRESET_SUBJECTS = [
  "Toán (THPT) x2, Anh (ĐGNL), Logic (ĐGNL)",
  "Toán (THPT), Hóa (THPT) x2, Anh (ĐGNL)",
  "Bấm Giờ Luyện Đề (THPTQG / ĐGNL)",
  "Vật Lý (THPT), Hóa (THPT), Văn/Tiếng Việt",
  "Vật Lý (THPT) x2, Logic/PTSL (ĐGNL)",
  "Lịch Kẹt Cố Định",
  "Phân Tích Sâu Lỗi Sai (Đục rỗng kiến thức)",
  "Toán (Nâng cao), Tư duy Khoa Học, Sinh",
  "Sinh Học, Văn/Tiếng Việt, Tư duy Khoa Học",
  "Toán VDC, Tiếng Anh, Logic, PTSL",
  "Nghỉ"
]

export const PRESET_TYPES = [
  "Ca 1 - 4",
  "Ca 5 - 7",
  "Ca 5 - 6",
  "Ca 7 - 10",
  "Ca 8 - 10",
  "Bận",
  "Tự Do"
]

export const PRESET_TIMES = [
  "07:30 - 10:50",
  "14:00 - 16:20",
  "13:30 - 17:00",
  "17:15 - 19:25",
  "19:30 - 21:50",
  "20:15 - 23:25",
  "--"
]
