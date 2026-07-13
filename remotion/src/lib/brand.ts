export const BRAND = {
  name: "StudyHub",
  domain: "luyende.id.vn",
  zalo: "0946741031",
  zaloDisplay: "0946 741 031",
  accent: "#C18CFF",
  bg: "#060510",
  fg: "#F4F0FF",
  muted: "#8C87A2",
  soft: "#C8C4D8",
} as const;

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

export type SubjectChip = { icon: string; label: string };

export const STEM: SubjectChip[] = [
  { icon: "📐", label: "Toán" },
  { icon: "⚛️", label: "Lý" },
  { icon: "🧪", label: "Hóa" },
  { icon: "🧬", label: "Sinh" },
];

export const SOCIAL: SubjectChip[] = [
  { icon: "📖", label: "Văn" },
  { icon: "📜", label: "Sử" },
  { icon: "🌍", label: "Địa" },
  { icon: "⚖️", label: "KTPL" },
  { icon: "🌎", label: "Anh" },
];

export const DGNL: SubjectChip[] = [
  { icon: "🎓", label: "HSA" },
  { icon: "🎓", label: "V-ACT" },
  { icon: "🎓", label: "TSA" },
  { icon: "🎓", label: "Sư phạm" },
];
