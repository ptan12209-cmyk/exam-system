"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useMemo } from "react"
import {
  ArrowRight,
  BookOpen,
  Check,
  GraduationCap,
  Layers,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react"
import {
  INTRO_SUBJECTS,
  PRICING,
  SUBJECTS_WITHOUT_DGNL,
  formatVnd,
  type CourseSubject,
} from "@/data/courses-intro"
import {
  SUPPORT_ZALO,
  SUPPORT_ZALO_URL,
  supportZaloUrlWithText,
} from "@/lib/support"
import { isRegistrationOpen, REGISTRATION_REOPEN_DATE } from "@/lib/features"
import { cn } from "@/lib/utils"

const ACCENT = "oklch(0.75 0.18 290)"
const BG = "#060510"

function SubjectArt({ subject }: { subject: CourseSubject }) {
  const h = subject.hue
  return (
    <div
      className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl"
      style={{
        background: `linear-gradient(145deg, oklch(0.35 0.12 ${h}), oklch(0.18 0.06 ${h}))`,
        boxShadow: `0 12px 40px oklch(0.4 0.12 ${h} / 0.35)`,
      }}
      aria-hidden
    >
      <span className="text-3xl drop-shadow-sm">{subject.icon}</span>
      <div
        className="pointer-events-none absolute -right-1 -top-1 h-6 w-6 rounded-full opacity-70"
        style={{ background: `oklch(0.75 0.14 ${h})` }}
      />
      <div
        className="pointer-events-none absolute -bottom-2 -left-2 h-10 w-10 rounded-xl opacity-30"
        style={{ background: `oklch(0.6 0.1 ${h})` }}
      />
    </div>
  )
}

function IntroBanner() {
  const sp = useSearchParams()
  const locked = sp.get("dang-ky") === "tam-khoa"
  if (!locked && isRegistrationOpen()) return null
  if (!locked && !isRegistrationOpen()) {
    return (
      <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-center text-[12px] text-amber-100/90">
        Đăng ký tài khoản tạm khóa. Dự kiến mở lại{" "}
        <strong className="text-amber-50">
          {new Date(`${REGISTRATION_REOPEN_DATE}T00:00:00+07:00`).toLocaleDateString(
            "vi-VN",
            { day: "numeric", month: "long", year: "numeric" }
          )}
        </strong>
        . Liên hệ Zalo để được tư vấn mua khóa.
      </div>
    )
  }
  return (
    <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-center text-[12px] text-amber-100/90">
      Đăng ký đang tạm khóa. Thầy mở lại theo lịch — xem{" "}
      <span className="font-mono text-amber-50">docs/REMINDER_OPEN_REGISTRATION_2026-07-29.md</span>
    </div>
  )
}

function CoursesIntroPage() {
  const regOpen = isRegistrationOpen()
  const stem = useMemo(
    () => INTRO_SUBJECTS.filter((s) => s.group === "stem" || s.group === "language"),
    []
  )
  const social = useMemo(
    () => INTRO_SUBJECTS.filter((s) => s.group === "social"),
    []
  )
  const dgnl = useMemo(
    () => INTRO_SUBJECTS.filter((s) => s.group === "dgnl"),
    []
  )

  const zaloBuy = supportZaloUrlWithText(
    "Em quan tâm khóa học online StudyHub, muốn được tư vấn gói và thanh toán."
  )

  return (
    <div className="min-h-[100dvh] text-[#e8e4f0]" style={{ background: BG }}>
      <Suspense fallback={null}>
        <IntroBanner />
      </Suspense>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#060510]/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: "oklch(0.75 0.18 290 / 0.15)", color: ACCENT }}
            >
              S
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-none">StudyHub</p>
              <p className="mt-0.5 text-[10px] text-[#8C87A2]">Khóa học online</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/landing"
              className="hidden text-[13px] font-medium text-[#8C87A2] hover:text-white sm:inline"
            >
              Xem trang nền tảng
            </Link>
            <a
              href={zaloBuy}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold sm:px-4 sm:text-[13px]"
              style={{ background: ACCENT, color: BG }}
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Tư vấn Zalo
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16 md:pb-20">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[min(900px,100%)] -translate-x-1/2 rounded-full opacity-50"
          style={{
            background:
              "radial-gradient(circle, oklch(0.75 0.18 290 / 0.18), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p
            className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: ACCENT }}
          >
            Chương trình học online 2025–2026
          </p>
          <h1 className="text-[clamp(1.85rem,5vw,3rem)] font-medium leading-[1.12] tracking-[-0.03em] text-balance">
            Khóa học video bám sát{" "}
            <span className="font-serif-italic" style={{ color: ACCENT }}>
              THPT
            </span>
            <br />
            &amp; luyện{" "}
            <span className="font-serif-italic" style={{ color: ACCENT }}>
              ĐGNL
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-[#8C87A2] text-pretty">
            Xem rõ môn học, giáo viên phụ trách và bảng giá. Học theo video + tài liệu trên
            cổng StudyHub — linh hoạt thời gian, không ép tiến độ tập trung.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#bang-gia"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl text-[14px] font-semibold sm:w-auto sm:px-8"
              style={{ background: ACCENT, color: BG }}
            >
              Xem bảng giá
              <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              href="/landing"
              className="inline-flex h-12 w-full max-w-xs items-center justify-center rounded-xl border border-white/15 text-[14px] font-medium text-[#e8e4f0] hover:bg-white/[0.04] sm:w-auto sm:px-8"
            >
              Xem trang nền tảng
            </Link>
          </div>
          <p className="mt-4 text-[12px] text-[#8C87A2]/80">
            {regOpen
              ? "Có thể đăng ký tài khoản ngay."
              : `Đăng ký tài khoản tạm khóa · dự kiến mở ${REGISTRATION_REOPEN_DATE.split("-").reverse().join("/")}. Liên hệ Zalo để mua khóa.`}
          </p>
        </div>
      </section>

      {/* Highlights */}
      <section className="border-y border-white/[0.06] px-4 py-10 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-3">
          {[
            {
              icon: BookOpen,
              t: "Video + tài liệu",
              d: "Mỗi môn có thư mục bài giảng, playlist và file ôn tập.",
            },
            {
              icon: Users,
              t: "Giáo viên theo môn",
              d: "Mỗi môn có thầy/cô phụ trách nội dung chuyên sâu.",
            },
            {
              icon: Layers,
              t: "Mua lẻ hoặc combo",
              d: "Linh hoạt 1 môn, 3 môn, hoặc full (có/không ĐGNL).",
            },
          ].map((item) => (
            <div
              key={item.t}
              className="rounded-2xl border border-white/[0.07] p-5"
              style={{ background: "oklch(0.11 0.02 290)" }}
            >
              <item.icon className="mb-3 h-5 w-5" style={{ color: ACCENT }} />
              <p className="text-[15px] font-semibold">{item.t}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#8C87A2]">{item.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Subjects */}
      <section id="mon-hoc" className="px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 max-w-xl">
            <p
              className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: ACCENT }}
            >
              Các môn học
            </p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.02em]">
              Nội dung & giáo viên phụ trách
            </h2>
            <p className="mt-2 text-[14px] text-[#8C87A2]">
              Tên giáo viên có thể cập nhật trong{" "}
              <code className="rounded bg-white/5 px-1 text-[12px]">src/data/courses-intro.ts</code>
              .
            </p>
          </div>

          <SubjectBlock title="Khối tự nhiên & Anh" subjects={stem} />
          <SubjectBlock title="Khối xã hội" subjects={social} className="mt-12" />
          <SubjectBlock
            title="Đánh giá năng lực (ĐGNL)"
            subjects={dgnl}
            className="mt-12"
            note="Gói ĐGNL tính riêng hoặc gộp trong combo 599k."
          />
        </div>
      </section>

      {/* Pricing */}
      <section id="bang-gia" className="border-t border-white/[0.06] px-4 py-16 sm:px-6 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <p
              className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: ACCENT }}
            >
              Bảng giá
            </p>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.02em]">
              Chọn gói phù hợp
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-[14px] text-[#8C87A2]">
              Combo 3 môn và combo toàn vẹn 450k{" "}
              <strong className="text-[#e8e4f0]/90">chưa tính ĐGNL</strong>. Gói 599k mới gồm
              ĐGNL.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.values(PRICING).map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border p-5 sm:p-6",
                  plan.highlight
                    ? "border-[oklch(0.75_0.18_290/0.45)] bg-[oklch(0.75_0.18_290/0.08)]"
                    : "border-white/[0.07] bg-[oklch(0.11_0.02_290)]"
                )}
              >
                {plan.highlight && (
                  <span
                    className="absolute -top-2.5 left-4 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{ background: ACCENT, color: BG }}
                  >
                    Phổ biến
                  </span>
                )}
                <p className="text-[13px] font-semibold text-[#e8e4f0]">{plan.name}</p>
                <p
                  className="mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-[1.65rem]"
                  style={{ color: ACCENT }}
                >
                  {formatVnd(plan.price)}
                </p>
                <p className="mt-3 flex-1 text-[12px] leading-relaxed text-[#8C87A2]">
                  {plan.note}
                </p>
                <a
                  href={supportZaloUrlWithText(
                    `Em muốn mua gói: ${plan.name} (${formatVnd(plan.price)})`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex h-10 items-center justify-center rounded-xl text-[13px] font-semibold"
                  style={
                    plan.highlight
                      ? { background: ACCENT, color: BG }
                      : {
                          border: "1px solid rgba(255,255,255,0.12)",
                          color: "#e8e4f0",
                        }
                  }
                >
                  Nhắn Zalo mua gói
                </a>
              </div>
            ))}
          </div>

          <div
            className="mt-8 rounded-2xl border border-white/[0.07] p-5 text-[13px] leading-relaxed text-[#8C87A2]"
            style={{ background: "oklch(0.11 0.02 290)" }}
          >
            <p className="font-semibold text-[#e8e4f0]">Ghi chú nhanh</p>
            <ul className="mt-2 space-y-1.5">
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                Môn thường (không ĐGNL): {SUBJECTS_WITHOUT_DGNL.map((s) => s.label).join(", ")}.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                ĐGNL gồm HSA, VACT, TSA — chỉ có trong gói <strong className="text-[#e8e4f0]">599.000đ</strong>{" "}
                hoặc mua lẻ theo tư vấn.
              </li>
              <li className="flex gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: ACCENT }} />
                Thanh toán / mở khóa: nhắn Zalo{" "}
                <a href={SUPPORT_ZALO_URL} className="font-semibold" style={{ color: ACCENT }}>
                  {SUPPORT_ZALO}
                </a>
                .
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA to landing */}
      <section className="border-t border-white/[0.06] px-4 py-16 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Sparkles className="mb-4 h-6 w-6" style={{ color: ACCENT }} />
          <h2 className="text-[clamp(1.35rem,3vw,1.85rem)] font-medium tracking-tight text-balance">
            Muốn xem giao diện cổng học trông như thế nào?
          </h2>
          <p className="mt-2 max-w-md text-[14px] text-[#8C87A2]">
            Trang nền tảng giới thiệu không gian học video, thư mục bài giảng và cách học
            online trên StudyHub.
          </p>
          <Link
            href="/landing"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-xl px-8 text-[14px] font-semibold transition-all hover:brightness-110"
            style={{ background: ACCENT, color: BG }}
          >
            Xem trang nền tảng
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!regOpen && (
            <p className="mt-4 text-[12px] text-[#8C87A2]/75">
              Tạo tài khoản tạm thời chưa mở — thầy sẽ bật lại khoảng{" "}
              {REGISTRATION_REOPEN_DATE.split("-").reverse().join("/")}.
            </p>
          )}
        </div>
      </section>

      <footer className="border-t border-white/[0.06] px-4 py-8 text-center text-[12px] text-[#8C87A2] sm:px-6">
        <p className="flex items-center justify-center gap-2">
          <GraduationCap className="h-4 w-4" style={{ color: ACCENT }} />
          StudyHub · Học online THPT
        </p>
        <p className="mt-2">
          Zalo hỗ trợ:{" "}
          <a href={SUPPORT_ZALO_URL} className="font-semibold" style={{ color: ACCENT }}>
            {SUPPORT_ZALO}
          </a>
        </p>
        <p className="mt-3 text-[11px] text-[#8C87A2]/60">
          © {new Date().getFullYear()} StudyHub · luyende.id.vn
        </p>
      </footer>
    </div>
  )
}

function SubjectBlock({
  title,
  subjects,
  className,
  note,
}: {
  title: string
  subjects: CourseSubject[]
  className?: string
  note?: string
}) {
  return (
    <div className={className}>
      <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-wider text-[#8C87A2]">
        {title}
      </h3>
      {note && <p className="mb-4 text-[12px] text-[#8C87A2]/80">{note}</p>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((s) => (
          <article
            key={s.value}
            className="rounded-2xl border border-white/[0.07] p-5 transition-colors hover:border-white/[0.12]"
            style={{ background: "oklch(0.11 0.02 290)" }}
          >
            <SubjectArt subject={s} />
            <h4 className="text-center text-[16px] font-semibold text-[#e8e4f0]">
              {s.label}
            </h4>
            <p className="mt-2 text-center text-[12px] leading-relaxed text-[#8C87A2]">
              {s.blurb}
            </p>
            <div className="mt-4 border-t border-white/[0.06] pt-3">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#8C87A2]/70">
                Giáo viên
              </p>
              {s.teachers.map((t) => (
                <div key={t.name} className="mt-1.5">
                  <p className="text-[13px] font-medium text-[#e8e4f0]">{t.name}</p>
                  <p className="text-[11px] text-[#8C87A2]">{t.role}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[100dvh] items-center justify-center text-sm text-[#8C87A2]"
          style={{ background: BG }}
        >
          Đang tải…
        </div>
      }
    >
      <CoursesIntroPage />
    </Suspense>
  )
}
