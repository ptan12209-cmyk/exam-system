/**
 * Single source of truth: on-screen text === spoken voice (tight sync).
 * No phone digits anywhere.
 */

export type SceneVisual =
  | "hook-badge"
  | "hook-pain"
  | "hook-solution"
  | "tour-stem"
  | "tour-social"
  | "tour-dgnl"
  | "trust-device"
  | "trust-record"
  | "end-qr";

export type Scene = {
  id: string;
  /** Shown large on screen */
  title: string;
  /** Shown under title — also the spoken line (or close paraphrase) */
  line: string;
  /** Exact TTS text (must match meaning of line/title) */
  voice: string;
  visual: SceneVisual;
  /** Minimum hold if audio is shorter */
  minSeconds: number;
  chips?: string[];
};

export const SCENES: Scene[] = [
  {
    id: "s01",
    title: "2k9 ơi",
    line: "Anh nói chuyện với các em một chút",
    voice: "Các em 2k9 ơi. Anh nói chuyện với các em một chút.",
    visual: "hook-badge",
    minSeconds: 2.8,
  },
  {
    id: "s02",
    title: "Drive loạn quá",
    line: "Ôn video rải khắp nơi — mệt đúng không?",
    voice: "Ôn video rải khắp Drive, loạn quá, mệt đúng không các em?",
    visual: "hook-pain",
    minSeconds: 3.2,
  },
  {
    id: "s03",
    title: "StudyHub",
    line: "Một cổng — video theo từng môn",
    voice: "StudyHub. Một cổng học online. Video theo từng môn.",
    visual: "hook-solution",
    minSeconds: 3.5,
    chips: ["THPT", "ĐGNL", "Online"],
  },
  {
    id: "s04",
    title: "Tự nhiên",
    line: "Toán · Lý · Hóa · Sinh",
    voice: "Khối tự nhiên: Toán, Lý, Hóa, Sinh.",
    visual: "tour-stem",
    minSeconds: 3.5,
    chips: ["📐 Toán", "⚛️ Lý", "🧪 Hóa", "🧬 Sinh"],
  },
  {
    id: "s05",
    title: "Xã hội + Anh",
    line: "Văn · Sử · Địa · KTPL · Anh",
    voice: "Xã hội và Anh: Văn, Sử, Địa, Kinh tế pháp luật, Tiếng Anh.",
    visual: "tour-social",
    minSeconds: 4,
    chips: ["📖 Văn", "📜 Sử", "🌍 Địa", "⚖️ KTPL", "🌎 Anh"],
  },
  {
    id: "s06",
    title: "Đánh giá năng lực",
    line: "HSA · V-ACT · TSA · Sư phạm",
    voice: "Đánh giá năng lực: HSA, V-ACT, TSA, và Sư phạm.",
    visual: "tour-dgnl",
    minSeconds: 3.8,
    chips: ["HSA", "V-ACT", "TSA", "Sư phạm"],
  },
  {
    id: "s07",
    title: "1 tài khoản · 1 máy",
    line: "Không share — tránh bị khóa",
    voice: "Mỗi tài khoản chỉ một thiết bị. Đừng share, tránh bị khóa.",
    visual: "trust-device",
    minSeconds: 3.5,
  },
  {
    id: "s08",
    title: "Quay màn hình khi TT",
    line: "Có sự cố — anh hỗ trợ nhanh hơn",
    voice: "Khi thanh toán, các em nên quay màn hình. Có sự cố anh hỗ trợ nhanh hơn.",
    visual: "trust-record",
    minSeconds: 4,
  },
  {
    id: "s09",
    title: "luyende.id.vn",
    line: "Quét QR Zalo · Link bio · Sắp mở",
    voice: "Vào luyende.id.vn. Quét QR Zalo để nhắn anh. Link bio cũng được. StudyHub sắp mở. Hẹn gặp các em.",
    visual: "end-qr",
    minSeconds: 5.5,
  },
];

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const PAD_AFTER_SPEECH = 0.45; // seconds hold after TTS ends
export const TRANSITION_FRAMES = 12;
