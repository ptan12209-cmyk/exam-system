export interface TimetableSlot {
  id: string
  subject: string
  type: string
  time: string
  color: string
}

export const DEFAULT_TIMETABLE_SLOTS: { [key: string]: { [key: string]: TimetableSlot } } = {
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

export const PRESET_SUBJECTS = [
  "Toán",
  "Vật Lý",
  "Hóa Học",
  "Sinh Học",
  "Ngữ Văn",
  "Tiếng Anh",
  "V-ACT (1)",
  "V-ACT (2)",
  "V-ACT (3)",
  "V-ACT (4)",
  "V-ACT (5)",
  "V-ACT (6)",
]

export const PRESET_TYPES = [
  "Lý Thuyết",
  "Bài Tập 1",
  "Bài Tập 2",
  "Tư Duy Logic",
  "Phân Tích Số Liệu",
  "Tiếng Anh V-ACT",
  "Tiếng Việt V-ACT",
  "Thực Chiến TDLG",
  "Thực Chiến PTSL",
]

export const PRESET_TIMES = [
  "08:00 - 10:30",
  "14:00 - 16:30",
  "16:45 - 19:15",
  "20:00 - 22:30"
]
