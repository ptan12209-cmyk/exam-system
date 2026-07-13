/**
 * SSOT cho video StudyHubFull.
 * - title / line / bullets: chữ trên màn (giữ brand tiếng Anh ổn)
 * - voice: đọc cho ElevenLabs — hạn chế tiếng Anh khó, dùng cách đọc Việt
 * Không số điện thoại trên màn / trong voice.
 */

export type SceneVisual =
  | "hook"
  | "pain"
  | "overview"
  | "content"
  | "subjects"
  | "teachers-stem"
  | "teachers-social"
  | "teachers-dgnl"
  | "promo"
  | "trial"
  | "benefits"
  | "cta-qr";

export type Scene = {
  id: string;
  /** Section label nhỏ trên màn */
  section?: string;
  title: string;
  line: string;
  /** Gợi ý thời lượng khi chưa có file voice (giây) */
  minSeconds: number;
  visual: SceneVisual;
  chips?: string[];
  /** Dòng phụ (giá / tên GV…) */
  rows?: string[];
  bullets?: string[];
};

export const SCENES: Scene[] = [
  {
    id: "s01",
    section: "Mở đầu",
    title: "Các em 2k9 ơi",
    line: "Anh mời các em xem qua khóa học online",
    visual: "hook",
    minSeconds: 4,
  },
  {
    id: "s02",
    section: "Vấn đề",
    title: "Ôn video đang loạn",
    line: "File rải khắp nơi · Khó theo dõi · Dễ bỏ cuộc",
    visual: "pain",
    minSeconds: 5,
    bullets: ["Drive lộn xộn", "Không biết học môn nào trước", "Thiếu người hướng dẫn"],
  },
  {
    id: "s03",
    section: "Giải pháp",
    title: "StudyHub",
    line: "Cổng học online · Video theo môn · Có thầy cô phụ trách",
    visual: "overview",
    minSeconds: 5,
    chips: ["Trung học phổ thông", "Đánh giá năng lực", "Học linh hoạt"],
  },
  {
    id: "s04",
    section: "Nội dung",
    title: "Trong mỗi môn có gì?",
    line: "Bài giảng video · Tài liệu · Lộ trình theo thư mục",
    visual: "content",
    minSeconds: 5,
    bullets: [
      "Video bài giảng theo chương",
      "Tài liệu ôn kèm theo",
      "Học mọi lúc · mọi nơi",
    ],
  },
  {
    id: "s05",
    section: "Chương trình",
    title: "Đủ môn cho 2k9",
    line: "Tự nhiên · Xã hội · Tiếng Anh · Đánh giá năng lực",
    visual: "subjects",
    minSeconds: 5,
    chips: [
      "Toán · Lý · Hóa · Sinh",
      "Văn · Sử · Địa · Kinh tế pháp luật",
      "Tiếng Anh",
      "Đánh giá năng lực",
    ],
  },
  {
    id: "s06",
    section: "Giáo viên · Tự nhiên",
    title: "Toán · Lý · Hóa · Sinh",
    line: "Nhiều thầy cô / khóa theo từng môn",
    visual: "teachers-stem",
    minSeconds: 7,
    rows: [
      "Toán — 10 khóa (Tùng, MapStudy, TenSchool…)",
      "Lý — 8 thầy (Biên, TENS, IPClass…)",
      "Hóa — 4 · Sinh — 3 (gồm Qanda)",
    ],
  },
  {
    id: "s07",
    section: "Giáo viên · Xã hội & Anh",
    title: "Văn · Sử · Địa · Anh",
    line: "Và Kinh tế pháp luật",
    visual: "teachers-social",
    minSeconds: 6,
    rows: [
      "Văn — 4 (Sương Mai, Minh Nhật…)",
      "Sử · Địa — Lan Hương, Hương Sen, Mai Anh…",
      "Anh — Phạm Liễu, Trang Anh, Vũ Mai Phương",
    ],
  },
  {
    id: "s08",
    section: "Giáo viên · Đánh giá năng lực",
    title: "Bốn hướng luyện thi",
    line: "Theo từng kỳ thi — đội ngũ riêng",
    visual: "teachers-dgnl",
    minSeconds: 6,
    rows: [
      "Hát-ét-a — QDA, MapStudy, Empire…",
      "Vi-áct — HOCMAI, Empire, MapStudy",
      "Tê-ét-a — BMC, HOCMAI",
      "Sư phạm — PEDA (Hà Nội & TP.HCM)",
    ],
  },
  {
    id: "s09",
    section: "Ưu đãi",
    title: "Gói học linh hoạt",
    line: "Giá đang mở tham khảo · Sắp mở bán",
    visual: "promo",
    minSeconds: 8,
    rows: [
      "Lẻ 1 môn — 99.000đ (−15%)",
      "Combo 3 môn — 250.000đ (−25%)",
      "Toàn vẹn chưa ĐGNL — 450.000đ (−30%)",
      "Chỉ ĐGNL — 199.000đ (−30%)",
      "Full + ĐGNL — 599.000đ (−40%)",
    ],
  },
  {
    id: "s10",
    section: "Học thử",
    title: "Miễn phí 1 ngày",
    line: "Trải nghiệm cổng học trước khi quyết định",
    visual: "trial",
    minSeconds: 5,
    bullets: [
      "Xem giao diện & bài mẫu",
      "Không ép mua ngay",
      "Liên hệ anh để mở học thử",
    ],
  },
  {
    id: "s11",
    section: "Quyền lợi",
    title: "Học yên tâm",
    line: "An toàn tài khoản · Hỗ trợ tận tình",
    visual: "benefits",
    minSeconds: 6,
    bullets: [
      "1 tài khoản · 1 thiết bị",
      "Hỗ trợ qua Zalo (quét QR)",
      "Nên quay màn hình khi thanh toán",
      "Nội dung bám chương trình 2k9",
    ],
  },
  {
    id: "s12",
    section: "Chốt",
    title: "Học thử ngay",
    line: "Quét QR Zalo · luyende.id.vn · Link bio",
    visual: "cta-qr",
    minSeconds: 6,
  },
];

/** Voice-only text for ElevenLabs (phonetic-friendly Vietnamese). */
export const SCENE_VOICE: Record<string, string> = {
  s01: "Các em hai nghìn lẻ chín ơi. Anh mời các em xem qua khóa học online một chút.",
  s02: "Ôn video đang loạn. File rải khắp nơi, khó theo dõi, dễ bỏ cuộc. Đúng không các em?",
  s03: "Sta-đi Háp. Cổng học online: video theo môn, có thầy cô phụ trách. Học trung học phổ thông và đánh giá năng lực, linh hoạt thời gian.",
  s04: "Trong mỗi môn có gì? Bài giảng video theo chương, tài liệu ôn kèm theo. Các em học mọi lúc, mọi nơi.",
  s05: "Chương trình đủ môn cho hai nghìn lẻ chín. Tự nhiên, xã hội, tiếng Anh, và đánh giá năng lực.",
  s06: "Giáo viên khối tự nhiên. Toán khoảng mười khóa. Lý khoảng tám thầy. Hóa bốn, Sinh ba. Nhiều thầy cô theo từng môn, các em chọn được lộ trình phù hợp.",
  s07: "Xã hội và tiếng Anh. Văn bốn khóa. Sử, Địa có cô Lan Hương, cô Hương Sen, cô Mai Anh. Tiếng Anh có cô Phạm Liễu, cô Trang Anh, cô Vũ Mai Phương.",
  s08: "Đánh giá năng lực bốn hướng. Hát-ét-a, Vi-áct, Tê-ét-a, và Sư phạm. Mỗi hướng có đội ngũ riêng.",
  s09: "Chương trình ưu đãi đang mở tham khảo. Mua lẻ một môn chín mươi chín nghìn, giảm mười lăm phần trăm. Combo ba môn hai trăm năm mươi nghìn, giảm hai mươi lăm. Toàn vẹn chưa đánh giá năng lực bốn trăm năm mươi nghìn, giảm ba mươi. Chỉ đánh giá năng lực một trăm chín mươi chín nghìn. Full kèm đánh giá năng lực năm trăm chín mươi chín nghìn, giảm bốn mươi phần trăm.",
  s10: "Đặc biệt: các em được học thử miễn phí một ngày. Xem giao diện, xem bài mẫu, không ép mua ngay.",
  s11: "Quyền lợi học viên. Một tài khoản một thiết bị. Hỗ trợ qua Da-lo bằng cách quét mã Q R. Nên quay màn hình khi thanh toán. Nội dung bám chương trình hai nghìn lẻ chín.",
  s12: "Muốn học thử ngay, các em quét mã Q R Da-lo trên màn hình, hoặc vào luyende chấm i đê chấm vân ên, hoặc bấm link bio. Anh mở học thử cho các em. Hẹn gặp các em trên Sta-đi Háp.",
};

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
/** Hold after speech when audio drives duration */
export const PAD_AFTER_SPEECH = 0.55;
export const TRANSITION_FRAMES = 14;
