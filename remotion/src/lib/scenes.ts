/**
 * SSOT 100%: chữ trên màn hình = đúng câu giọng nói (theo thứ tự).
 * voice = lines nối lại (ElevenLabs).
 * Không số điện thoại.
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
  section: string;
  /**
   * Mọi dòng hiện trên màn + đọc voice (cùng thứ tự).
   * Dòng đầu = title lớn.
   */
  lines: string[];
  visual: SceneVisual;
  minSeconds: number;
  /** Icon/chip phụ — chỉ dùng từ đã có trong lines */
  chips?: string[];
};

export const SCENES: Scene[] = [
  {
    id: "s01",
    section: "Mở đầu",
    visual: "hook",
    minSeconds: 4,
    lines: [
      "Các em 2k9 ơi.",
      "Anh mời các em xem qua khóa học online một chút.",
    ],
  },
  {
    id: "s02",
    section: "Vấn đề",
    visual: "pain",
    minSeconds: 5,
    lines: [
      "Ôn video đang loạn.",
      "File rải khắp Drive, khó theo dõi, dễ bỏ cuộc.",
      "Đúng không các em?",
    ],
  },
  {
    id: "s03",
    section: "Giải pháp",
    visual: "overview",
    minSeconds: 6,
    lines: [
      "StudyHub.",
      "Cổng học online: video theo môn, có thầy cô phụ trách.",
      "Học THPT và ĐGNL, linh hoạt thời gian.",
    ],
    chips: ["THPT", "ĐGNL", "Online"],
  },
  {
    id: "s04",
    section: "Nội dung",
    visual: "content",
    minSeconds: 6,
    lines: [
      "Trong mỗi môn có gì?",
      "Bài giảng video theo chương.",
      "Tài liệu ôn kèm theo.",
      "Các em học mọi lúc, mọi nơi.",
    ],
  },
  {
    id: "s05",
    section: "Chương trình",
    visual: "subjects",
    minSeconds: 5,
    lines: [
      "Chương trình đủ môn cho 2k9.",
      "Tự nhiên, xã hội, tiếng Anh,",
      "và ĐGNL.",
    ],
    chips: ["Tự nhiên", "Xã hội", "Tiếng Anh", "ĐGNL"],
  },
  {
    id: "s06",
    section: "Giáo viên · Tự nhiên",
    visual: "teachers-stem",
    minSeconds: 8,
    lines: [
      "Giáo viên khối tự nhiên.",
      "Toán khoảng mười khóa.",
      "Lý khoảng tám thầy.",
      "Hóa bốn, Sinh ba.",
      "Nhiều thầy cô theo từng môn, các em chọn được lộ trình phù hợp.",
    ],
    chips: ["Toán ×10", "Lý ×8", "Hóa ×4", "Sinh ×3"],
  },
  {
    id: "s07",
    section: "Giáo viên · Xã hội & Anh",
    visual: "teachers-social",
    minSeconds: 8,
    lines: [
      "Xã hội và tiếng Anh.",
      "Văn bốn khóa.",
      "Sử, Địa có cô Lan Hương, cô Hương Sen, cô Mai Anh.",
      "Tiếng Anh: cô Phạm Liễu, cô Trang Anh, cô Vũ Mai Phương.",
    ],
  },
  {
    id: "s08",
    section: "ĐGNL",
    visual: "teachers-dgnl",
    minSeconds: 7,
    lines: [
      "ĐGNL bốn hướng.",
      "HSA.",
      "V-ACT.",
      "TSA.",
      "và Sư phạm.",
      "Mỗi hướng có đội ngũ riêng.",
    ],
    chips: ["HSA", "V-ACT", "TSA", "Sư phạm"],
  },
  {
    id: "s09",
    section: "Ưu đãi",
    visual: "promo",
    minSeconds: 14,
    lines: [
      "Chương trình ưu đãi đang mở tham khảo.",
      "Mua lẻ một môn: chín mươi chín nghìn đồng, giảm mười lăm phần trăm.",
      "Combo ba môn: hai trăm năm mươi nghìn, giảm hai mươi lăm.",
      "Toàn vẹn chưa ĐGNL: bốn trăm năm mươi nghìn, giảm ba mươi.",
      "Chỉ ĐGNL: một trăm chín mươi chín nghìn.",
      "Full kèm ĐGNL: năm trăm chín mươi chín nghìn, giảm bốn mươi phần trăm.",
    ],
  },
  {
    id: "s10",
    section: "Học thử",
    visual: "trial",
    minSeconds: 6,
    lines: [
      "Đặc biệt.",
      "Các em được học thử miễn phí một ngày.",
      "Xem giao diện, xem bài mẫu, không ép mua ngay.",
    ],
  },
  {
    id: "s11",
    section: "Quyền lợi",
    visual: "benefits",
    minSeconds: 8,
    lines: [
      "Quyền lợi học viên.",
      "Một tài khoản, một thiết bị.",
      "Hỗ trợ qua Zalo bằng cách quét mã QR.",
      "Nên quay màn hình khi thanh toán.",
      "Nội dung bám chương trình 2k9.",
    ],
  },
  {
    id: "s12",
    section: "Chốt",
    visual: "cta-qr",
    minSeconds: 8,
    lines: [
      "Muốn học thử ngay.",
      "Các em quét mã QR Zalo trên màn hình.",
      "Hoặc vào luyende.id.vn.",
      "Hoặc bấm link bio.",
      "Anh mở học thử cho các em.",
      "Hẹn gặp các em trên StudyHub.",
    ],
  },
];

/** Voice = đúng lines (khớp 100% màn hình) */
export const SCENE_VOICE: Record<string, string> = Object.fromEntries(
  SCENES.map((s) => [s.id, s.lines.join(" ")])
);

export function getSceneVoice(id: string): string {
  return SCENE_VOICE[id] ?? "";
}

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const PAD_AFTER_SPEECH = 0.55;
export const TRANSITION_FRAMES = 14;
