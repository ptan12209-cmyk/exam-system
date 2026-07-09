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

// Danh sách môn học cho phân hệ Học Online (E-learning)
export const ONLINE_SUBJECTS = [
  { value: "toan", dbValue: "math", label: "Toán học", icon: "📐", color: "from-blue-600 to-cyan-600", price: 299000 },
  { value: "ly", dbValue: "physics", label: "Vật lý", icon: "⚛️", color: "from-purple-600 to-violet-600", price: 299000 },
  { value: "hoa", dbValue: "chemistry", label: "Hóa học", icon: "🧪", color: "from-green-600 to-emerald-600", price: 299000 },
  { value: "van", dbValue: "literature", label: "Ngữ văn", icon: "📖", color: "from-amber-600 to-orange-600", price: 199000 },
  { value: "su", dbValue: "history", label: "Lịch sử", icon: "📜", color: "from-yellow-600 to-amber-600", price: 199000 },
  { value: "dia", dbValue: "geography", label: "Địa lý", icon: "🌍", color: "from-teal-600 to-cyan-600", price: 199000 },
  { value: "ktpl", dbValue: "civic_education", label: "Kinh tế & Pháp luật (KTPL)", icon: "⚖️", color: "from-rose-600 to-pink-600", price: 199000 },
  { value: "sinh", dbValue: "biology", label: "Sinh học", icon: "🧬", color: "from-lime-600 to-green-600", price: 299000 },
  { value: "anh", dbValue: "english", label: "Tiếng Anh", icon: "🌎", color: "from-sky-600 to-blue-600", price: 299000 },
  { value: "dgnl_hsa", dbValue: "dgnl_hsa", label: "ĐGNL - HSA", icon: "🎓", color: "from-fuchsia-600 to-pink-600", price: 499000 },
  { value: "dgnl_vact", dbValue: "dgnl_vact", label: "ĐGNL - VACT", icon: "🎓", color: "from-fuchsia-600 to-purple-600", price: 499000 },
  { value: "dgnl_tsa", dbValue: "dgnl_tsa", label: "ĐGNL - TSA", icon: "🎓", color: "from-violet-600 to-pink-600", price: 499000 },
] as const

export type OnlineSubjectValue = typeof ONLINE_SUBJECTS[number]["value"]

export function getOnlineSubjectInfo(value: string) {
    return ONLINE_SUBJECTS.find(s => s.value === value) || ONLINE_SUBJECTS[0]
}
