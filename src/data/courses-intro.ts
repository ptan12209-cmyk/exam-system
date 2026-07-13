/**
 * Dữ liệu trang giới thiệu khóa học online.
 * Sửa tên giáo viên / mô tả tại đây khi cần.
 */

export type CourseTeacher = {
  name: string
  role: string
}

export type CourseSubject = {
  value: string
  label: string
  icon: string
  blurb: string
  /** CSS accent for illustration */
  hue: number
  teachers: CourseTeacher[]
  group: "stem" | "social" | "language" | "dgnl"
}

/** Môn học online (DGNL tách riêng trong bảng giá) */
export const INTRO_SUBJECTS: CourseSubject[] = [
  {
    value: "toan",
    label: "Toán học",
    icon: "📐",
    blurb: "Đại số, giải tích, hình học – bám sát chương trình và đề minh họa.",
    hue: 220,
    group: "stem",
    teachers: [{ name: "Thầy phụ trách Toán", role: "Giảng viên Toán THPT" }],
  },
  {
    value: "ly",
    label: "Vật lý",
    icon: "⚛️",
    blurb: "Cơ – điện – quang, video bài giảng + tài liệu luyện đề.",
    hue: 280,
    group: "stem",
    teachers: [{ name: "Thầy phụ trách Vật lý", role: "Giảng viên Vật lý" }],
  },
  {
    value: "hoa",
    label: "Hóa học",
    icon: "🧪",
    blurb: "Hóa vô cơ – hữu cơ, phản ứng và bài tập định lượng.",
    hue: 150,
    group: "stem",
    teachers: [{ name: "Cô phụ trách Hóa", role: "Giảng viên Hóa học" }],
  },
  {
    value: "sinh",
    label: "Sinh học",
    icon: "🧬",
    blurb: "Di truyền, sinh thái, sinh học tế bào – hình ảnh minh họa rõ.",
    hue: 130,
    group: "stem",
    teachers: [{ name: "Cô phụ trách Sinh", role: "Giảng viên Sinh học" }],
  },
  {
    value: "van",
    label: "Ngữ văn",
    icon: "📖",
    blurb: "Đọc hiểu, nghị luận, cảm thụ – khung bài và mẫu phân tích.",
    hue: 35,
    group: "social",
    teachers: [{ name: "Cô phụ trách Văn", role: "Giảng viên Ngữ văn" }],
  },
  {
    value: "su",
    label: "Lịch sử",
    icon: "📜",
    blurb: "Lược đồ sự kiện, ôn theo chuyên đề và đề thi thật.",
    hue: 45,
    group: "social",
    teachers: [{ name: "Thầy phụ trách Sử", role: "Giảng viên Lịch sử" }],
  },
  {
    value: "dia",
    label: "Địa lý",
    icon: "🌍",
    blurb: "Địa lý tự nhiên – kinh tế, kỹ năng làm bài thực tế.",
    hue: 175,
    group: "social",
    teachers: [{ name: "Cô phụ trách Địa", role: "Giảng viên Địa lý" }],
  },
  {
    value: "ktpl",
    label: "Kinh tế & Pháp luật",
    icon: "⚖️",
    blurb: "Kiến thức KTPL bám chương trình mới, dễ ghi nhớ.",
    hue: 350,
    group: "social",
    teachers: [{ name: "Thầy phụ trách KTPL", role: "Giảng viên KTPL" }],
  },
  {
    value: "anh",
    label: "Tiếng Anh",
    icon: "🌎",
    blurb: "Ngữ pháp, từ vựng, luyện kỹ năng theo lộ trình video.",
    hue: 200,
    group: "language",
    teachers: [{ name: "Cô phụ trách Anh", role: "Giảng viên Tiếng Anh" }],
  },
  {
    value: "dgnl_hsa",
    label: "ĐGNL – HSA",
    icon: "🎓",
    blurb: "Luyện thi đánh giá năng lực HSA theo dạng đề.",
    hue: 310,
    group: "dgnl",
    teachers: [{ name: "Thầy phụ trách ĐGNL", role: "Luyện thi ĐGNL" }],
  },
  {
    value: "dgnl_vact",
    label: "ĐGNL – VACT",
    icon: "🎓",
    blurb: "Ôn V-ACT với video và tài liệu chuyên đề.",
    hue: 300,
    group: "dgnl",
    teachers: [{ name: "Thầy phụ trách ĐGNL", role: "Luyện thi ĐGNL" }],
  },
  {
    value: "dgnl_tsa",
    label: "ĐGNL – TSA",
    icon: "🎓",
    blurb: "Tư duy và kỹ năng làm bài TSA.",
    hue: 290,
    group: "dgnl",
    teachers: [{ name: "Thầy phụ trách ĐGNL", role: "Luyện thi ĐGNL" }],
  },
]

/** Môn không thuộc gói ĐGNL (dùng cho combo 450k) */
export const SUBJECTS_WITHOUT_DGNL = INTRO_SUBJECTS.filter((s) => s.group !== "dgnl")

export const PRICING = {
  single: {
    id: "single",
    name: "Mua lẻ 1 môn",
    price: 99_000,
    note: "Chọn đúng 1 môn (không gồm ĐGNL trừ khi chọn riêng gói ĐGNL).",
    highlight: false,
  },
  combo3: {
    id: "combo3",
    name: "Combo 3 môn",
    price: 250_000,
    note: "Chọn bất kỳ 3 môn. Chưa bao gồm ĐGNL.",
    highlight: false,
  },
  fullNoDgnl: {
    id: "full-no-dgnl",
    name: "Combo toàn vẹn (chưa ĐGNL)",
    price: 450_000,
    note: "Toàn bộ môn học thường. Chưa tính các gói ĐGNL.",
    highlight: true,
  },
  fullWithDgnl: {
    id: "full-with-dgnl",
    name: "Combo toàn vẹn + ĐGNL",
    price: 599_000,
    note: "Bao gồm toàn bộ môn học và các gói ĐGNL (HSA / VACT / TSA).",
    highlight: true,
  },
} as const

export function formatVnd(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n)
}
