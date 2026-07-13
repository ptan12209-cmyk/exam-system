/**
 * Marketing reels kit — 2k9 FB/TikTok.
 * Voice: nam, xưng “anh” / “các em”.
 */

export const MARKETING = {
  brand: "StudyHub",
  domain: "luyende.id.vn",
  domainUrl: "https://luyende.id.vn",
  zalo: "0946741031",
  zaloUrl: "https://zalo.me/0946741031",
  audience: "2k9",
  voice: "nam",
  addressSelf: "anh",
  addressAudience: "các em",
} as const

export type ReelId = "v1" | "v3" | "v6"

export type ReelBeat = {
  /** seconds from start */
  at: number
  /** duration of this beat */
  for: number
  /** big on-screen line */
  line: string
  /** smaller subline */
  sub?: string
}

export type ReelDef = {
  id: ReelId
  title: string
  durationSec: number
  aspect: "9:16"
  purpose: string
  /** full voice-over script */
  voiceScript: string
  /** on-screen beats for auto-play */
  beats: ReelBeat[]
  /** SRT-style lines for export */
  srt: { start: number; end: number; text: string }[]
}

export const REELS: Record<ReelId, ReelDef> = {
  v1: {
    id: "v1",
    title: "Hook 15s — 2k9 vào đây",
    durationSec: 15,
    aspect: "9:16",
    purpose: "Mở series TikTok/Reels: nhận diện + đẩy bio",
    voiceScript: `Các em 2k9 ơi — anh biết ôn video rải khắp Drive mệt lắm.
StudyHub gom bài theo môn: Toán, Lý, Hóa, Văn… và cả ĐGNL.
Vào luyende.id.vn xem danh sách môn và bảng giá tham khảo.
Sắp mở đăng ký — cần anh hỗ trợ thì Zalo 0946 741 031.`,
    beats: [
      { at: 0, for: 3, line: "2k9 ơi", sub: "Ôn video rải Drive mệt chưa?" },
      { at: 3, for: 4, line: "1 cổng học online", sub: "StudyHub · Video theo môn" },
      { at: 7, for: 4, line: "THPT + ĐGNL", sub: "Đủ môn · Có giáo viên theo khóa" },
      { at: 11, for: 4, line: "luyende.id.vn", sub: "Zalo 0946 741 031 · Sắp mở" },
    ],
    srt: [
      { start: 0, end: 3, text: "Các em 2k9 ơi — ôn Drive rải rác mệt lắm." },
      { start: 3, end: 7, text: "StudyHub gom bài theo môn." },
      { start: 7, end: 11, text: "Toán Lý Hóa Văn… và cả ĐGNL." },
      { start: 11, end: 15, text: "luyende.id.vn · Zalo 0946 741 031" },
    ],
  },
  v3: {
    id: "v3",
    title: "Tour 30s — Các môn học",
    durationSec: 30,
    aspect: "9:16",
    purpose: "Show catalog môn + ĐGNL, tin có nội dung thật",
    voiceScript: `Anh liệt kê nhanh các môn trên StudyHub cho các em 2k9.
Khối tự nhiên: Toán, Lý, Hóa, Sinh.
Xã hội: Văn, Sử, Địa, KTPL. Thêm Tiếng Anh.
ĐGNL: HSA, V-ACT, TSA và Sư phạm — mỗi gói có đội ngũ riêng.
Vào luyende.id.vn xem đủ giáo viên theo môn.
Zalo 0946 741 031 nếu các em cần anh tư vấn chọn môn.`,
    beats: [
      { at: 0, for: 3, line: "Tour môn học", sub: "StudyHub · 2k9" },
      { at: 3, for: 7, line: "Tự nhiên", sub: "Toán · Lý · Hóa · Sinh" },
      { at: 10, for: 7, line: "Xã hội + Anh", sub: "Văn · Sử · Địa · KTPL · Anh" },
      { at: 17, for: 7, line: "ĐGNL", sub: "HSA · V-ACT · TSA · Sư phạm" },
      { at: 24, for: 6, line: "luyende.id.vn", sub: "Xem GV từng môn · Zalo 0946 741 031" },
    ],
    srt: [
      { start: 0, end: 3, text: "Tour nhanh các môn trên StudyHub." },
      { start: 3, end: 10, text: "Tự nhiên: Toán, Lý, Hóa, Sinh." },
      { start: 10, end: 17, text: "Xã hội + Anh: Văn, Sử, Địa, KTPL, Anh." },
      { start: 17, end: 24, text: "ĐGNL: HSA, V-ACT, TSA, Sư phạm." },
      { start: 24, end: 30, text: "luyende.id.vn · Zalo 0946 741 031" },
    ],
  },
  v6: {
    id: "v6",
    title: "Trust 25s — An toàn & quyền lợi",
    durationSec: 25,
    aspect: "9:16",
    purpose: "Uy tín phụ huynh + HS: 1 máy, Zalo, quay màn hình TT",
    voiceScript: `Các em yên tâm học — anh nói rõ quyền lợi.
Mỗi tài khoản chỉ đăng nhập một thiết bị, tránh share lung tung bị khóa.
Khi thanh toán, các em nên quay màn hình hoặc quay video — có sự cố anh hỗ trợ nhanh hơn.
Hỗ trợ Zalo 0946 741 031. Trang chính: luyende.id.vn.
Học tử tế, bảo vệ tài khoản — anh đồng hành cùng các em.`,
    beats: [
      { at: 0, for: 4, line: "Quyền lợi học viên", sub: "Anh nói rõ — các em yên tâm" },
      { at: 4, for: 6, line: "1 tài khoản · 1 máy", sub: "Không share — tránh bị khóa" },
      { at: 10, for: 7, line: "Quay màn hình khi TT", sub: "Có sự cố → hỗ trợ nhanh hơn" },
      { at: 17, for: 4, line: "Zalo 0946 741 031", sub: "Anh hỗ trợ các em" },
      { at: 21, for: 4, line: "luyende.id.vn", sub: "StudyHub · Sắp mở" },
    ],
    srt: [
      { start: 0, end: 4, text: "Anh nói rõ quyền lợi học viên." },
      { start: 4, end: 10, text: "1 tài khoản chỉ 1 thiết bị." },
      { start: 10, end: 17, text: "Quay màn hình khi thanh toán để được hỗ trợ." },
      { start: 17, end: 21, text: "Zalo 0946 741 031" },
      { start: 21, end: 25, text: "luyende.id.vn" },
    ],
  },
}

export const REEL_LIST = [REELS.v1, REELS.v3, REELS.v6] as const
