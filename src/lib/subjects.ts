// Danh sách môn học cho hệ thống phân loại đề thi

export const SUBJECTS = [
    { value: "toan", label: "Toán", icon: "📐", color: "from-blue-500 to-cyan-500" },
    { value: "ly", label: "Vật lý", icon: "⚛️", color: "from-purple-500 to-violet-500" },
    { value: "hoa", label: "Hóa học", icon: "🧪", color: "from-green-500 to-emerald-500" },
    { value: "sinh", label: "Sinh học", icon: "🧬", color: "from-lime-500 to-green-500" },
    { value: "anh", label: "Tiếng Anh", icon: "🌎", color: "from-sky-500 to-blue-500" },
    { value: "van", label: "Ngữ văn", icon: "📖", color: "from-amber-500 to-orange-500" },
    { value: "su", label: "Lịch sử", icon: "📜", color: "from-yellow-500 to-amber-500" },
    { value: "dia", label: "Địa lý", icon: "🌍", color: "from-teal-500 to-cyan-500" },
    { value: "gdcd", label: "GDCD", icon: "⚖️", color: "from-rose-500 to-pink-500" },
    { value: "tin", label: "Tin học", icon: "💻", color: "from-indigo-500 to-purple-500" },
    { value: "dgnl", label: "ĐGNL/TSA", icon: "🎓", color: "from-fuchsia-500 to-pink-500" },
    { value: "other", label: "Khác", icon: "📝", color: "from-slate-500 to-gray-500" },
] as const

export type SubjectValue = typeof SUBJECTS[number]["value"]

// Mapping từ frontend subject key → DB subject value
// IMPORTANT: Mỗi môn phải có key riêng trong DB, tránh collision (gdcd/tin/dgnl trước đây đều map về 'other')
export const MAP_SUBJECT_TO_DB: Record<string, string> = {
  toan: "math",
  ly: "physics",
  hoa: "chemistry",
  sinh: "biology",
  anh: "english",
  van: "literature",
  su: "history",
  dia: "geography",
  gdcd: "civic_education",
  tin: "informatics",
  dgnl: "aptitude_test",
  other: "other",
}

// Reverse mapping: DB subject value → frontend key
export const MAP_DB_TO_SUBJECT: Record<string, string> = {
  math: "toan",
  physics: "ly",
  chemistry: "hoa",
  biology: "sinh",
  english: "anh",
  literature: "van",
  history: "su",
  geography: "dia",
  civic_education: "gdcd",
  informatics: "tin",
  aptitude_test: "dgnl",
  other: "other",
}

// Helper function to get subject info by value
export function getSubjectInfo(value: string) {
    return SUBJECTS.find(s => s.value === value) || SUBJECTS[SUBJECTS.length - 1]
}

// Get all subjects for dropdown/select
export function getSubjectOptions() {
    return SUBJECTS.map(s => ({ value: s.value, label: `${s.icon} ${s.label}` }))
}
