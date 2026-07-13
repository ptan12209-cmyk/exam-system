"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
} from "framer-motion"
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  FolderOpen,
  GraduationCap,
  Menu,
  Play,
  Unlock,
  Video,
  X,
} from "lucide-react"
import {
  ACCENT,
  BG,
  easeOutQuart,
  revealProps,
  revealScaleProps,
} from "@/components/landing/motion"
import {
  SUPPORT_EMAIL,
  SUPPORT_EMAIL_URL,
  SUPPORT_ZALO,
  SUPPORT_ZALO_URL,
} from "@/lib/support"
import { cn } from "@/lib/utils"

/* ─── Scroll progress ─── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])
  const reduce = useReducedMotion()
  if (reduce) return null
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left"
      style={{ scaleX, background: ACCENT }}
      aria-hidden
    />
  )
}

/* ─── Counter ─── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })
  const reduce = useReducedMotion()
  const [val, setVal] = useState(reduce ? target : 0)

  useEffect(() => {
    if (!inView || reduce) {
      setVal(target)
      return
    }
    const duration = 1400
    const startTime = performance.now()
    let raf = 0
    function tick(now: number) {
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      setVal(Math.floor(eased * target))
      if (progress < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, target, reduce])

  return (
    <span ref={ref} className="tabular-nums">
      {val.toLocaleString("vi-VN")}
      {suffix}
    </span>
  )
}

/**
 * Pure video background (no hand-drawn UI).
 * CSP must allow CloudFront in media-src (next.config.ts).
 */
function SoftVideo({
  src,
  className,
  opacity = 1,
}: {
  src: string
  className?: string
  opacity?: number
}) {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const v = ref.current
    if (!v || reduce) return
    const play = () => {
      void v.play().catch(() => {})
    }
    if (v.readyState >= 2) play()
    else v.addEventListener("loadeddata", play, { once: true })
  }, [reduce, src])

  return (
    <video
      ref={ref}
      src={src}
      className={className}
      style={{ opacity }}
      muted
      loop
      playsInline
      preload="auto"
      autoPlay
      aria-hidden
    />
  )
}

const FEATURE_VIDEO_FOLDER =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_125119_8e5ae31c-0021-4396-bc08-f7aebeb877a2.mp4"
const FEATURE_VIDEO_PLAYER =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_132944_a0d124bb-eaa1-4082-aa30-2310efb42b4b.mp4"
const HERO_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_120549_0cd82c36-56b3-4dd9-b190-069cfc3a623f.mp4"

/* ─── Product preview: chrome + real product clip in player ─── */
function ProductPreview() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-2xl"
      style={{ background: "oklch(0.12 0.025 290)" }}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-3 text-[11px] font-mono text-white/35">
          StudyHub · Học online
        </span>
      </div>
      <div className="grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr] min-h-[220px] sm:min-h-[280px]">
        <div className="border-r border-white/[0.06] p-3 space-y-2">
          <p className="text-[9px] font-mono uppercase tracking-wider text-white/30 mb-2">
            Môn học
          </p>
          {["Toán", "Vật lý", "Hóa"].map((s, i) => (
            <div
              key={s}
              className={cn(
                "rounded-lg px-2 py-1.5 text-[11px] font-medium",
                i === 0
                  ? "bg-[oklch(0.75_0.18_290/0.15)] text-[oklch(0.82_0.14_290)]"
                  : "text-white/40"
              )}
            >
              {s}
            </div>
          ))}
          <div className="pt-3 space-y-1.5">
            <p className="text-[9px] font-mono uppercase tracking-wider text-white/30">
              Thư mục
            </p>
            {["Chương 1", "Chương 2", "Ôn tập"].map((f, i) => (
              <div
                key={f}
                className={cn(
                  "flex items-center gap-1.5 text-[10px]",
                  i === 0 ? "text-white/70" : "text-white/35"
                )}
              >
                <FolderOpen className="h-3 w-3 shrink-0" style={{ color: ACCENT }} />
                {f}
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 sm:p-4 flex flex-col gap-3">
          <div className="relative aspect-video rounded-xl overflow-hidden border border-white/[0.06] bg-black">
            <SoftVideo
              src={FEATURE_VIDEO_PLAYER}
              className="absolute inset-0 h-full w-full object-cover"
              opacity={0.9}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-full shadow-lg"
                style={{ background: "oklch(0.75 0.18 290 / 0.92)" }}
              >
                <Play className="h-4 w-4 text-[#060510] ml-0.5" fill="currentColor" />
              </div>
            </div>
            <div className="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-white/15">
              <div
                className="h-full w-[38%] rounded-full"
                style={{ background: ACCENT }}
              />
            </div>
          </div>
          <div>
            <p className="text-[12px] sm:text-[13px] font-semibold text-white/90">
              Bài 3 · Đạo hàm hàm hợp
            </p>
            <p className="text-[10px] sm:text-[11px] text-white/40 mt-0.5 font-mono">
              Video · Tài liệu PDF
            </p>
          </div>
          <div className="flex gap-2">
            <span
              className="rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wide"
              style={{
                background: "oklch(0.75 0.18 290 / 0.12)",
                color: ACCENT,
              }}
            >
              Video
            </span>
            <span className="rounded-md px-2 py-1 text-[9px] font-bold uppercase tracking-wide bg-emerald-500/10 text-emerald-400/90">
              Tài liệu
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   Landing page v3 — Calm Focus Education
   ═══════════════════════════════════════════ */
export default function HomePage() {
  const reduce = useReducedMotion()
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroOpacity = useTransform(heroProgress, [0, 0.75], [1, reduce ? 1 : 0])
  const heroScale = useTransform(heroProgress, [0, 0.75], [1, reduce ? 1 : 0.96])

  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useMotionValueEvent(heroProgress, "change", (v) => setScrolled(v > 0.06))

  const r0 = revealProps(reduce, 0)
  const r1 = revealProps(reduce, 0.08)
  const r2 = revealProps(reduce, 0.12)
  const rs0 = revealScaleProps(reduce, 0)
  const rs1 = revealScaleProps(reduce, 0.1)

  const navLinks = [
    { label: "Cách học", href: "#how" },
    { label: "Tính năng", href: "#features" },
    { label: "Đối tượng", href: "#audience" },
  ]

  return (
    <div
      className="relative text-[#e8e4f0] selection:bg-[oklch(0.75_0.18_290/0.35)] selection:text-[#060510]"
      style={{ background: BG }}
    >
        <ScrollProgress />

        {/* ─── NAV ─── */}
        <motion.nav
          className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-5 md:px-10 lg:px-12"
          initial={reduce ? false : { y: -16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: easeOutQuart }}
        >
          <motion.div
            className="absolute inset-0 -z-10 border-b"
            animate={{
              backgroundColor: scrolled ? "rgba(6,5,16,0.88)" : "rgba(6,5,16,0)",
              backdropFilter: scrolled ? "blur(14px) saturate(160%)" : "blur(0px)",
              borderColor: scrolled ? "rgba(193,140,255,0.1)" : "rgba(0,0,0,0)",
            }}
            transition={{ duration: 0.35 }}
          />

          <Link href="/" className="flex items-center gap-2.5 z-10">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
              style={{ background: "oklch(0.75 0.18 290 / 0.15)", color: ACCENT }}
            >
              S
            </div>
            <span className="text-[15px] font-semibold tracking-tight">StudyHub</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[13px] font-medium text-[#8C87A2] transition-colors hover:text-[#e8e4f0]"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 z-10">
            <Link
              href="/login"
              className="hidden sm:inline text-[13px] font-medium text-[#8C87A2] transition-colors hover:text-[#e8e4f0]"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all hover:brightness-110"
              style={{ background: ACCENT, color: BG }}
            >
              Bắt đầu học
              <ArrowUpRight size={14} strokeWidth={2.5} className="hidden sm:block" />
            </Link>
            <button
              type="button"
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-[#e8e4f0]"
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </motion.nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="fixed inset-x-0 top-16 z-40 border-b border-white/10 bg-[#060510]/95 backdrop-blur-xl md:hidden">
            <div className="flex flex-col gap-1 px-5 py-4">
              {navLinks.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-[#e8e4f0] hover:bg-white/5"
                >
                  {item.label}
                </a>
              ))}
              <Link
                href="/login"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-3 py-3 text-sm font-medium text-[#8C87A2]"
              >
                Đăng nhập
              </Link>
            </div>
          </div>
        )}

        {/* ─── HERO ─── */}
        <section
          ref={heroRef}
          className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden pt-16"
        >
          <div className="absolute inset-0">
            <SoftVideo
              src={HERO_VIDEO}
              className="h-full w-full object-cover"
              opacity={0.38}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060510] via-[#060510]/50 to-[#060510]/70" />
          </div>

          <motion.div
            className="relative z-10 flex w-full max-w-4xl flex-col items-center px-5 text-center sm:px-6"
            style={reduce ? undefined : { opacity: heroOpacity, scale: heroScale }}
          >
            <motion.p
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.25, ease: easeOutQuart }}
              className="mb-5 text-[11px] font-semibold uppercase tracking-[0.18em] sm:mb-6"
              style={{ color: ACCENT }}
            >
              Học online · Video · Tài liệu
            </motion.p>

            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, delay: 0.35, ease: easeOutQuart }}
              className="mb-5 max-w-3xl text-[clamp(2rem,5.5vw,3.75rem)] font-medium leading-[1.08] tracking-[-0.03em] text-balance"
            >
              Học trực tuyến{" "}
              <span className="font-serif-italic" style={{ color: ACCENT }}>
                tập trung
              </span>
              <br className="hidden sm:block" />{" "}
              theo nhịp của bạn
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.5, ease: easeOutQuart }}
              className="mb-8 max-w-lg text-[15px] leading-relaxed text-[#8C87A2] sm:mb-10 sm:text-base text-pretty"
            >
              Mở khóa môn, xem bài giảng video và tài liệu trên một cổng học gọn, rõ, dễ dùng
              cho học sinh và giáo viên.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.65, ease: easeOutQuart }}
              className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row"
            >
              <Link
                href="/register"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl px-7 text-[14px] font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: ACCENT, color: BG }}
              >
                Bắt đầu học
                <ArrowRight
                  size={16}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 px-7 text-[14px] font-medium text-[#e8e4f0] transition-colors hover:border-white/20 hover:bg-white/[0.04] active:scale-[0.98]"
              >
                Đăng nhập
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* ─── HOW IT WORKS — 3 steps ─── */}
        <section id="how" className="relative px-5 py-20 sm:px-6 md:px-12 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 max-w-xl md:mb-16">
              <motion.p
                {...r0}
                className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: ACCENT }}
              >
                Cách học
              </motion.p>
              <motion.h2
                {...r1}
                className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-medium leading-tight tracking-[-0.02em] text-balance"
              >
                Ba bước vào lớp online
              </motion.h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
              {[
                {
                  step: "01",
                  icon: Unlock,
                  title: "Mở khóa môn",
                  desc: "Chọn môn, thanh toán hoặc được giáo viên cấp quyền. Vào học ngay khi mở khóa.",
                },
                {
                  step: "02",
                  icon: Video,
                  title: "Xem video & tài liệu",
                  desc: "Thư mục rõ ràng, playlist video và file ôn tập trong cùng một màn hình.",
                },
                {
                  step: "03",
                  icon: BookOpen,
                  title: "Học theo nhịp riêng",
                  desc: "Mỗi em tự chọn thời điểm học. Không ép lịch, không đua tiến độ tập trung.",
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  {...revealProps(reduce, 0.06 * i)}
                  className="relative rounded-2xl border border-white/[0.07] p-6 sm:p-7 transition-colors hover:border-white/[0.12]"
                  style={{ background: "oklch(0.11 0.02 290)" }}
                >
                  <span
                    className="mb-4 block font-mono text-[11px] font-bold tabular-nums"
                    style={{ color: ACCENT }}
                  >
                    {item.step}
                  </span>
                  <item.icon
                    className="mb-4 h-6 w-6"
                    style={{ color: ACCENT }}
                    strokeWidth={1.5}
                  />
                  <h3 className="mb-2 text-[17px] font-semibold text-[#e8e4f0]">
                    {item.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[#8C87A2]">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PRODUCT PREVIEW ─── */}
        <section className="relative px-5 py-16 sm:px-6 md:px-12 md:py-24">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[min(900px,100%)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
            style={{
              background:
                "radial-gradient(circle, oklch(0.75 0.18 290 / 0.12), transparent 70%)",
            }}
          />
          <div className="relative mx-auto max-w-5xl">
            <div className="mb-10 text-center md:mb-12">
              <motion.h2
                {...r0}
                className="text-[clamp(1.5rem,3vw,2.25rem)] font-medium tracking-[-0.02em] text-balance"
              >
                Cổng học{" "}
                <span className="font-serif-italic" style={{ color: ACCENT }}>
                  gọn và rõ
                </span>
              </motion.h2>
              <motion.p
                {...r1}
                className="mx-auto mt-3 max-w-md text-[14px] text-[#8C87A2]"
              >
                Giao diện Drive-style: môn → thư mục → video. Học trên máy tính và điện thoại.
              </motion.p>
            </div>
            <motion.div {...rs0}>
              <ProductPreview />
            </motion.div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section id="features" className="relative px-5 py-20 sm:px-6 md:px-12 md:py-32">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 max-w-2xl md:mb-20">
              <motion.p
                {...r0}
                className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: ACCENT }}
              >
                Tính năng
              </motion.p>
              <motion.h2
                {...r1}
                className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-medium leading-tight tracking-[-0.02em] text-balance"
              >
                Không gian học{" "}
                <span className="font-serif-italic" style={{ color: ACCENT }}>
                  tinh gọn
                </span>
              </motion.h2>
            </div>

            <div className="space-y-16 md:space-y-24">
              <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
                <motion.div {...r0} className="order-2 space-y-4 md:order-1">
                  <div
                    className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[12px] font-semibold"
                    style={{
                      background: "oklch(0.75 0.18 290 / 0.1)",
                      color: ACCENT,
                    }}
                  >
                    <FolderOpen size={12} /> Học liệu
                  </div>
                  <h3 className="text-[clamp(1.2rem,2.2vw,1.6rem)] font-medium leading-snug">
                    Thư mục bài giảng như File Explorer
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#8C87A2] max-w-[48ch]">
                    Giáo viên sắp xếp chương, mục, bài. Học sinh mở đúng chỗ cần học, không
                    lẫn môn.
                  </p>
                </motion.div>
                <motion.div {...rs1} className="order-1 md:order-2">
                  {/* Media only — no hand-drawn UI, pure product clip */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                    <SoftVideo
                      src={FEATURE_VIDEO_FOLDER}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </motion.div>
              </div>

              <div className="grid items-center gap-8 md:grid-cols-2 md:gap-14">
                <motion.div {...rs0} className="order-1">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-black">
                    <SoftVideo
                      src={FEATURE_VIDEO_PLAYER}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </motion.div>
                <motion.div {...r1} className="order-2 space-y-4">
                  <div
                    className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[12px] font-semibold"
                    style={{
                      background: "oklch(0.72 0.12 170 / 0.12)",
                      color: "oklch(0.78 0.12 170)",
                    }}
                  >
                    <Video size={12} /> Video
                  </div>
                  <h3 className="text-[clamp(1.2rem,2.2vw,1.6rem)] font-medium leading-snug">
                    Video bài giảng & tài liệu cùng chỗ
                  </h3>
                  <p className="text-[15px] leading-relaxed text-[#8C87A2] max-w-[48ch]">
                    Playlist nhiều video, PDF đính kèm. Xem trên một trang, không nhảy app.
                  </p>
                </motion.div>
              </div>
            </div>

            {/* Stats strip */}
            <motion.div
              {...r2}
              className="mt-16 grid grid-cols-2 gap-4 rounded-2xl border border-white/[0.06] p-6 sm:grid-cols-4 sm:p-8 md:mt-20"
              style={{ background: "oklch(0.11 0.02 290)" }}
            >
              {[
                { n: 12, s: "+", l: "Môn học" },
                { n: 24, s: "/7", l: "Truy cập" },
                { n: 100, s: "%", l: "Học online" },
                { n: 1, s: "", l: "Cổng thống nhất" },
              ].map((stat) => (
                <div key={stat.l} className="text-center">
                  <p className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: ACCENT }}>
                    <Counter target={stat.n} suffix={stat.s} />
                  </p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-[#8C87A2]">
                    {stat.l}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ─── AUDIENCE ─── */}
        <section
          id="audience"
          className="relative border-t border-white/[0.06] px-5 py-20 sm:px-6 md:px-12 md:py-32"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center md:mb-16">
              <motion.h2
                {...r0}
                className="text-[clamp(1.6rem,3.5vw,2.5rem)] font-medium tracking-[-0.02em] text-balance"
              >
                Cho học sinh và{" "}
                <span className="font-serif-italic" style={{ color: ACCENT }}>
                  giáo viên
                </span>
              </motion.h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[
                {
                  role: "Học sinh",
                  icon: GraduationCap,
                  points: [
                    "Vào portal, chọn môn đã mở khóa",
                    "Xem video, mở tài liệu trên điện thoại hoặc máy tính",
                    "Học theo thời gian phù hợp với em",
                  ],
                  cta: "Tạo tài khoản học",
                  href: "/register",
                },
                {
                  role: "Giáo viên",
                  icon: FolderOpen,
                  points: [
                    "Quản lý thư mục & bài giảng hàng loạt",
                    "Cấp quyền môn, duyệt đơn mở khóa",
                    "Theo dõi giao dịch và import học liệu",
                  ],
                  cta: "Vào cổng giáo viên",
                  href: "/login",
                },
              ].map((card, i) => (
                <motion.div
                  key={card.role}
                  {...revealProps(reduce, 0.08 * i)}
                  className="flex flex-col rounded-2xl border border-white/[0.07] p-7 sm:p-8"
                  style={{ background: "oklch(0.11 0.02 290)" }}
                >
                  <div
                    className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ background: "oklch(0.75 0.18 290 / 0.12)" }}
                  >
                    <card.icon className="h-5 w-5" style={{ color: ACCENT }} />
                  </div>
                  <h3 className="mb-4 text-xl font-semibold">{card.role}</h3>
                  <ul className="mb-8 flex-1 space-y-3">
                    {card.points.map((p) => (
                      <li
                        key={p}
                        className="flex gap-2.5 text-[14px] leading-relaxed text-[#8C87A2]"
                      >
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0"
                          style={{ color: ACCENT }}
                        />
                        {p}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={card.href}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-opacity hover:opacity-90"
                    style={{ color: ACCENT }}
                  >
                    {card.cta} <ArrowRight size={14} />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA BAND ─── */}
        <section className="relative overflow-hidden px-5 py-20 sm:px-6 md:py-28">
          <div
            className="absolute inset-0 opacity-90"
            style={{
              background: `linear-gradient(135deg, oklch(0.75 0.18 290 / 0.18), ${BG} 55%)`,
            }}
          />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
            <motion.h2
              {...r0}
              className="mb-4 text-[clamp(1.75rem,4vw,2.75rem)] font-medium tracking-[-0.02em] text-balance"
            >
              Sẵn sàng vào lớp online
            </motion.h2>
            <motion.p
              {...r1}
              className="mb-8 max-w-md text-[15px] text-[#8C87A2]"
            >
              Đăng ký tài khoản hoặc đăng nhập để mở khóa môn và xem bài giảng.
            </motion.p>
            <motion.div
              {...r2}
              className="flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:w-auto sm:flex-row"
            >
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl px-8 text-[14px] font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ background: ACCENT, color: BG }}
              >
                Đăng ký miễn phí
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-white/15 px-8 text-[14px] font-medium hover:bg-white/[0.04] active:scale-[0.98]"
              >
                Đăng nhập
              </Link>
            </motion.div>
          </div>
        </section>

        {/* ─── FOOTER ─── */}
        <footer className="border-t border-white/[0.06] px-5 py-10 sm:px-6 md:px-12">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold"
                  style={{
                    background: "oklch(0.75 0.18 290 / 0.12)",
                    color: ACCENT,
                  }}
                >
                  S
                </div>
                <span className="text-[14px] font-semibold">StudyHub</span>
              </div>
              <p className="mt-3 max-w-xs text-[12px] leading-relaxed text-[#8C87A2]/80">
                © {new Date().getFullYear()} StudyHub · luyende.id.vn. Học liệu thuộc bản
                quyền. Cấm sao chép trái phép.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-[#8C87A2]">
              <Link href="/login" className="hover:text-[#e8e4f0]">
                Cổng học
              </Link>
              <Link href="/register" className="hover:text-[#e8e4f0]">
                Đăng ký
              </Link>
              <a
                href={SUPPORT_ZALO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#e8e4f0]"
              >
                Zalo {SUPPORT_ZALO}
              </a>
              <a href={SUPPORT_EMAIL_URL} className="hover:text-[#e8e4f0]">
                {SUPPORT_EMAIL}
              </a>
            </div>
          </div>
        </footer>

        {/* Mobile sticky CTA */}
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#060510]/92 p-3 backdrop-blur-lg md:hidden safe-bottom">
          <Link
            href="/register"
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[14px] font-semibold"
            style={{ background: ACCENT, color: BG }}
          >
            Bắt đầu học
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="h-16 md:hidden" aria-hidden />
    </div>
  )
}
