/**
 * Dữ liệu trang giới thiệu khóa học online.
 * Nguồn GV: folder checkpoint Drive COMBO XPS 2009.
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
    blurb: "Đại số, giải tích, hình học – bám sát chương trình và đề minh họa. 10 khóa / thầy cô.",
    hue: 220,
    group: "stem",
    teachers: [
      { name: "Thầy Nguyễn Thanh Tùng", role: "Nền tảng Toán" },
      { name: "Tổ Toán học MapStudy", role: "Toán MapStudy" },
      { name: "Anh Giáo Kid", role: "Toán" },
      { name: "Anh Shiper", role: "Toán" },
      { name: "Cô Ngọc Huyền LB", role: "Toán" },
      { name: "Thầy Trịnh Đình Thành", role: "Toán DPAD" },
      { name: "Thầy Đỗ Văn Đức", role: "TenSchool" },
      { name: "Thầy Nguyễn Đăng Ái", role: "Toán" },
      { name: "Thầy Nguyễn Phan Tiến", role: "Toán" },
      { name: "Thầy Nguyễn Quốc Chí", role: "ThayChi" },
    ],
  },
  {
    value: "ly",
    label: "Vật lý",
    icon: "⚛️",
    blurb: "Cơ – điện – quang, video bài giảng + tài liệu luyện đề. 8 khóa / thầy cô.",
    hue: 280,
    group: "stem",
    teachers: [
      { name: "Thầy Chu Văn Biên", role: "Vật lý" },
      { name: "Thầy Đỗ Ngọc Hà", role: "Vật lý" },
      { name: "Thầy Lê Tùng Ưng", role: "TENS" },
      { name: "Thầy Nguyễn Đăng Ái", role: "TDM" },
      { name: "Thầy Thắng & Thầy Tiến", role: "IPClass" },
      { name: "Thầy Vũ Hoàng Quân", role: "Vật lý" },
      { name: "Thầy Vũ Ngọc Anh", role: "Vật lý" },
      { name: "Thầy Vũ Tuấn Anh", role: "Vật lý" },
    ],
  },
  {
    value: "hoa",
    label: "Hóa học",
    icon: "🧪",
    blurb: "Hóa vô cơ – hữu cơ, phản ứng và bài tập định lượng. 4 khóa / thầy cô.",
    hue: 150,
    group: "stem",
    teachers: [
      { name: "Cô Thân Thị Liên", role: "Hóa học" },
      { name: "Thầy Nguyễn Anh Phong", role: "Hóa học" },
      { name: "Thầy Phạm Thắng", role: "Hóa học" },
      { name: "Thầy Phạm Văn Trọng", role: "Hóa học" },
    ],
  },
  {
    value: "sinh",
    label: "Sinh học",
    icon: "🧬",
    blurb: "Di truyền, sinh thái, sinh học tế bào – hình ảnh minh họa rõ. 3 khóa / thầy cô.",
    hue: 130,
    group: "stem",
    teachers: [
      { name: "Cô Trà My", role: "Qanda" },
      { name: "Thầy Phan Khắc Nghệ", role: "Sinh học" },
      { name: "Thầy Trương Công Kiên", role: "Sinh học" },
    ],
  },
  {
    value: "van",
    label: "Ngữ văn",
    icon: "📖",
    blurb: "Đọc hiểu, nghị luận, cảm thụ – khung bài và mẫu phân tích. 4 khóa / thầy cô.",
    hue: 35,
    group: "social",
    teachers: [
      { name: "Cô Sương Mai", role: "Học Văn" },
      { name: "Chị Linh", role: "Thưởng thức sách" },
      { name: "Cô Trần Thuỳ Dương", role: "Ngữ văn" },
      { name: "Thầy Phạm Minh Nhật", role: "Ngữ văn" },
    ],
  },
  {
    value: "su",
    label: "Lịch sử",
    icon: "📜",
    blurb: "Lược đồ sự kiện, ôn theo chuyên đề và đề thi thật.",
    hue: 45,
    group: "social",
    teachers: [
      { name: "Cô Ngô Thị Lan Hương", role: "Lịch sử" },
      { name: "Cô Nguyễn Hương Sen", role: "Lịch sử" },
    ],
  },
  {
    value: "dia",
    label: "Địa lý",
    icon: "🌍",
    blurb: "Địa lý tự nhiên – kinh tế, kỹ năng làm bài thực tế.",
    hue: 175,
    group: "social",
    teachers: [
      { name: "Cô Mai Anh", role: "Địa lý" },
      { name: "Thầy Đàm Thanh Tùng", role: "Địa lý" },
      { name: "Thầy Trần Văn Tài", role: "Thầy Tài" },
    ],
  },
  {
    value: "ktpl",
    label: "Kinh tế & Pháp luật",
    icon: "⚖️",
    blurb: "Kiến thức KTPL bám chương trình mới. (Checkpoint chưa có folder KTPL riêng — sẽ bổ sung.)",
    hue: 350,
    group: "social",
    teachers: [
      { name: "Đang cập nhật", role: "Chưa có folder KTPL trong checkpoint" },
    ],
  },
  {
    value: "anh",
    label: "Tiếng Anh",
    icon: "🌎",
    blurb: "Ngữ pháp, từ vựng, luyện kỹ năng theo lộ trình video. 3 khóa / cô.",
    hue: 200,
    group: "language",
    teachers: [
      { name: "Cô Phạm Liễu", role: "Tiếng Anh" },
      { name: "Cô Trang Anh", role: "Tiếng Anh" },
      { name: "Cô Vũ Mai Phương", role: "Tiếng Anh" },
    ],
  },
  {
    value: "dgnl_vact",
    label: "ĐGNL – V-ACT",
    icon: "🎓",
    blurb: "Luyện V-ACT (ĐH Quốc gia TP.HCM) theo đội ngũ & lộ trình video.",
    hue: 300,
    group: "dgnl",
    teachers: [
      { name: "HOCMAI", role: "V-ACT · ĐHQG TP.HCM" },
      { name: "Empire Team", role: "V-ACT · ĐHQG TP.HCM" },
      { name: "MapStudy", role: "V-ACT · ĐHQG TP.HCM" },
    ],
  },
  {
    value: "dgnl_hsa",
    label: "ĐGNL – HSA",
    icon: "🎓",
    blurb: "Luyện HSA (ĐH Quốc gia Hà Nội) theo dạng đề và đội ngũ chuyên.",
    hue: 310,
    group: "dgnl",
    teachers: [
      { name: "QDA – HOCMAI", role: "HSA · ĐHQG Hà Nội" },
      { name: "MapStudy", role: "HSA · ĐHQG Hà Nội" },
      { name: "Empire Team", role: "HSA · ĐHQG Hà Nội" },
      { name: "HSA Edu", role: "HSA · ĐHQG Hà Nội" },
    ],
  },
  {
    value: "dgnl_tsa",
    label: "ĐGNL – TSA",
    icon: "🎓",
    blurb: "Tư duy và kỹ năng làm bài TSA (ĐHBK Hà Nội).",
    hue: 290,
    group: "dgnl",
    teachers: [
      { name: "BMC", role: "TSA · ĐHBK Hà Nội" },
      { name: "HOCMAI", role: "TSA · ĐHBK Hà Nội" },
    ],
  },
  {
    value: "dgnl_sp",
    label: "ĐGNL – Sư phạm",
    icon: "🎓",
    blurb: "ĐGNL Sư phạm Hà Nội & TP.HCM theo lộ trình PEDA Edu.",
    hue: 275,
    group: "dgnl",
    teachers: [
      { name: "PEDA Edu — SP Hà Nội 1", role: "ĐGNL Sư phạm" },
      { name: "PEDA Edu — SP TP.HCM", role: "ĐGNL Sư phạm" },
    ],
  },
]

/** Môn không thuộc gói ĐGNL (dùng cho combo 450k) */
export const SUBJECTS_WITHOUT_DGNL = INTRO_SUBJECTS.filter((s) => s.group !== "dgnl")

/**
 * Giá bán thật (`price`) giữ nguyên.
 * `originalPrice` = giá niêm yết (đã tăng) để hiển thị gạch ngang + % giảm.
 * original ≈ price / (1 - discount/100), làm tròn nghìn cho đẹp.
 * `contactEnabled: false` = chỉ xem tham khảo (chưa mở mua / Zalo).
 */
export const PRICING = {
  single: {
    id: "single",
    name: "Mua lẻ 1 môn",
    originalPrice: 117_000,
    price: 99_000,
    discountPercent: 15,
    note: "Chọn đúng 1 môn (không gồm ĐGNL). Đang mở tham khảo giá — chưa bán chính thức.",
    highlight: false,
    badge: "Sắp mở",
    contactEnabled: false,
  },
  combo3: {
    id: "combo3",
    name: "Combo 3 môn",
    originalPrice: 334_000,
    price: 250_000,
    discountPercent: 25,
    note: "Chọn bất kỳ 3 môn. Chưa bao gồm ĐGNL. Đang mở tham khảo giá — chưa bán chính thức.",
    highlight: false,
    badge: "Sắp mở",
    contactEnabled: false,
  },
  fullNoDgnl: {
    id: "full-no-dgnl",
    name: "Combo toàn vẹn (chưa ĐGNL)",
    originalPrice: 643_000,
    price: 450_000,
    discountPercent: 30,
    note: "Toàn bộ môn học thường. Chưa tính ĐGNL. Đang mở tham khảo giá — chưa bán chính thức.",
    highlight: true,
    badge: "Sắp mở",
    contactEnabled: false,
  },
  dgnlOnly: {
    id: "dgnl-only",
    name: "Gói ĐGNL riêng",
    originalPrice: 285_000,
    price: 199_000,
    discountPercent: 30,
    note: "Chỉ các gói ĐGNL (V-ACT / HSA / TSA / Sư phạm). Đang mở tham khảo giá — chưa bán chính thức.",
    highlight: false,
    badge: "Sắp mở",
    contactEnabled: false,
  },
  fullWithDgnl: {
    id: "full-with-dgnl",
    name: "Combo toàn vẹn + ĐGNL",
    originalPrice: 999_000,
    price: 599_000,
    discountPercent: 40,
    note: "Toàn bộ môn học + ĐGNL. Đang mở tham khảo giá — chưa bán chính thức.",
    highlight: true,
    badge: "Sắp mở",
    contactEnabled: false,
  },
} as const

/** Câu khuyến khích tin cậy khi thanh toán (marketing / UX) */
export const PAYMENT_TRUST_HINT =
  "Để đảm bảo quyền lợi, vui lòng quay màn hình hoặc quay video trong quá trình thanh toán. Video sẽ giúp chúng tôi hỗ trợ nhanh hơn nếu xảy ra sự cố ngoài ý muốn."

export function formatVnd(n: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n)
}
