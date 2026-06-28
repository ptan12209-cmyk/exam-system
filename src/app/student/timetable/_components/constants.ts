export interface TimetableSlot {
  id: string
  subject: string
  type: string
  time: string
  color: string
}

export const DEFAULT_TIMETABLE_SLOTS: { [key: string]: { [key: string]: TimetableSlot } } = {
  sang: {
    t2: { id: "mon-sang", subject: "Toán (THPT) x2, Anh (ĐGNL), Logic (ĐGNL)", type: "Ca 1 - 4", time: "07:30 - 10:50", color: "toan" },
    t3: { id: "tue-sang", subject: "Toán (THPT), Hóa (THPT) x2, Anh (ĐGNL)", type: "Ca 1 - 4", time: "07:30 - 10:50", color: "toan" },
    t4: { id: "wed-sang", subject: "Toán (THPT) x2, Anh (ĐGNL), Logic (ĐGNL)", type: "Ca 1 - 4", time: "07:30 - 10:50", color: "toan" },
    t5: { id: "thu-sang", subject: "Toán (THPT), Hóa (THPT) x2, Anh (ĐGNL)", type: "Ca 1 - 4", time: "07:30 - 10:50", color: "toan" },
    t6: { id: "fri-sang", subject: "Toán (THPT) x2, Anh (ĐGNL), Logic (ĐGNL)", type: "Ca 1 - 4", time: "07:30 - 10:50", color: "toan" },
    t7: { id: "sat-sang", subject: "Bấm Giờ Luyện Đề (THPTQG / ĐGNL)", type: "Ca 1 - 4", time: "07:30 - 10:50", color: "logic" },
    cn: { id: "sun-sang", subject: "Bấm Giờ Luyện Đề (THPTQG / ĐGNL)", type: "Ca 1 - 4", time: "07:30 - 10:50", color: "logic" },
  },
  chieu1: {
    t2: { id: "mon-chieu1", subject: "Vật Lý (THPT), Hóa (THPT), Văn/Tiếng Việt", type: "Ca 5 - 7", time: "14:00 - 16:20", color: "ly" },
    t3: { id: "tue-chieu1", subject: "Vật Lý (THPT) x2, Logic/PTSL (ĐGNL)", type: "Ca 5 - 7", time: "14:00 - 16:20", color: "ly" },
    t4: { id: "wed-chieu1", subject: "Vật Lý (THPT), Hóa (THPT), Văn/Tiếng Việt", type: "Ca 5 - 7", time: "14:00 - 16:20", color: "ly" },
    t5: { id: "thu-chieu1", subject: "Vật Lý (THPT) x2, Logic/PTSL (ĐGNL)", type: "Ca 5 - 7", time: "14:00 - 16:20", color: "ly" },
    t6: { id: "fri-chieu1", subject: "Vật Lý (THPT), Hóa (THPT), Văn/Tiếng Việt", type: "Ca 5 - 7", time: "14:00 - 16:20", color: "ly" },
    t7: { id: "sat-chieu1", subject: "Lịch Kẹt Cố Định", type: "Bận", time: "13:30 - 17:00", color: "busy" },
    cn: { id: "sun-chieu1", subject: "Lịch Kẹt Cố Định", type: "Bận", time: "13:30 - 17:00", color: "busy" },
  },
  chieu2: {
    t2: { id: "mon-chieu2", subject: "Nghỉ", type: "Tự Do", time: "--", color: "busy" },
    t3: { id: "tue-chieu2", subject: "Nghỉ", type: "Tự Do", time: "--", color: "busy" },
    t4: { id: "wed-chieu2", subject: "Nghỉ", type: "Tự Do", time: "--", color: "busy" },
    t5: { id: "thu-chieu2", subject: "Nghỉ", type: "Tự Do", time: "--", color: "busy" },
    t6: { id: "fri-chieu2", subject: "Nghỉ", type: "Tự Do", time: "--", color: "busy" },
    t7: { id: "sat-chieu2", subject: "Phân Tích Sâu Lỗi Sai (Đục rỗng kiến thức)", type: "Ca 5 - 6", time: "17:15 - 19:25", color: "van" },
    cn: { id: "sun-chieu2", subject: "Phân Tích Sâu Lỗi Sai (Đục rỗng kiến thức)", type: "Ca 5 - 6", time: "17:15 - 19:25", color: "van" },
  },
  toi: {
    t2: { id: "mon-toi", subject: "Toán (Nâng cao), Tư duy Khoa Học, Sinh", type: "Ca 8 - 10", time: "19:30 - 21:50", color: "vact" },
    t3: { id: "tue-toi", subject: "Sinh Học, Văn/Tiếng Việt, Tư duy Khoa Học", type: "Ca 8 - 10", time: "19:30 - 21:50", color: "vact" },
    t4: { id: "wed-toi", subject: "Toán (Nâng cao), Tư duy Khoa Học, Sinh", type: "Ca 8 - 10", time: "19:30 - 21:50", color: "vact" },
    t5: { id: "thu-toi", subject: "Sinh Học, Văn/Tiếng Việt, Tư duy Khoa Học", type: "Ca 8 - 10", time: "19:30 - 21:50", color: "vact" },
    t6: { id: "fri-toi", subject: "Toán (Nâng cao), Tư duy Khoa Học, Sinh", type: "Ca 8 - 10", time: "19:30 - 21:50", color: "vact" },
    t7: { id: "sat-toi", subject: "Toán VDC, Tiếng Anh, Logic, PTSL", type: "Ca 7 - 10", time: "20:15 - 23:25", color: "vact" },
    cn: { id: "sun-toi", subject: "Toán VDC, Tiếng Anh, Logic, PTSL", type: "Ca 7 - 10", time: "20:15 - 23:25", color: "vact" },
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
