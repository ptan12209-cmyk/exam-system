"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from "framer-motion"
import { ArrowRight, ArrowUpRight, Play, Check } from "lucide-react"
import Hls from "hls.js"

/* ═══════════════════════════════════════════
   Motion helpers — ease-out-quart for premium feel
   ═══════════════════════════════════════════ */
const easeOutQuart = [0.25, 1, 0.5, 1] as const

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, delay, ease: easeOutQuart },
})

const revealScale = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.92 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 1, delay, ease: easeOutQuart },
})

/* ═══════════════════════════════════════════
   HLS Video Background
   ═══════════════════════════════════════════ */
function HlsVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    let hls: Hls | null = null
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: false })
      hls.loadSource(src)
      hls.attachMedia(v)
    } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src
    }
    return () => { hls?.destroy() }
  }, [src])
  return <video ref={ref} autoPlay loop muted playsInline className={className} />
}

/* ═══════════════════════════════════════════
   Scroll progress bar at top
   ═══════════════════════════════════════════ */
function ScrollProgress() {
  const { scrollYProgress } = useScroll()
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1])
  return (
    <motion.div
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left"
      style={{
        scaleX,
        background: "oklch(0.75 0.18 290)",
      }}
    />
  )
}

/* ═══════════════════════════════════════════
   Animated counter
   ═══════════════════════════════════════════ */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-100px" })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    let start = 0
    const duration = 1800
    const startTime = performance.now()
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out-quart
      const eased = 1 - Math.pow(1 - progress, 4)
      setVal(Math.floor(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target])

  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>
}

/* ═══════════════════════════════════════════
   Main page
   ═══════════════════════════════════════════ */
export default function HomePage() {
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  })
  const heroOpacity = useTransform(heroProgress, [0, 0.7], [1, 0])
  const heroScale = useTransform(heroProgress, [0, 0.7], [1, 0.92])
  const heroFilter = useTransform(heroProgress, (v) => {
    const blur = v * (8 / 0.7)
    return blur > 0.1 ? `blur(${Math.min(blur, 8)}px)` : "none"
  })

  // Nav state — show bg after hero
  const [scrolled, setScrolled] = useState(false)
  useMotionValueEvent(heroProgress, "change", (v) => setScrolled(v > 0.08))

  return (
    <div className="relative bg-[#060510] text-[#e8e4f0] selection:bg-[oklch(0.75_0.18_290)] selection:text-[#060510]">
      <ScrollProgress />

      {/* ─── NAV ─── */}
      <motion.nav
        className="fixed inset-x-0 top-0 z-50 flex items-center justify-between px-6 py-4 md:px-12"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: easeOutQuart }}
      >
        {/* bg layer */}
        <motion.div
          className="absolute inset-0 -z-10 border-b"
          animate={{
            backgroundColor: scrolled ? "rgba(6,5,16,0.85)" : "rgba(6,5,16,0)",
            backdropFilter: scrolled ? "blur(16px) saturate(180%)" : "blur(0px) saturate(100%)",
            borderColor: scrolled ? "rgba(193,140,255,0.08)" : "rgba(0,0,0,0)",
          }}
          transition={{ duration: 0.4 }}
        />

        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-[oklch(0.75_0.18_290)]" style={{ opacity: 0.15 }} />
            <span className="text-base font-bold tracking-tight" style={{ color: "oklch(0.75 0.18 290)" }}>E</span>
          </div>
          <span className="text-[15px] font-semibold tracking-[-0.02em]">ExamHub</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {[
            { label: "Tính năng", href: "#features" },
            { label: "Giải pháp", href: "#solution" },
            { label: "Đối tượng", href: "#audience" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[13px] font-medium tracking-wide text-[#8C87A2] transition-colors duration-200 hover:text-[#e8e4f0]"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-[13px] font-medium text-[#8C87A2] transition-colors hover:text-[#e8e4f0]"
          >
            Đăng nhập
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all duration-200 hover:brightness-110"
            style={{ background: "oklch(0.75 0.18 290)", color: "#060510" }}
          >
            Bắt đầu <ArrowUpRight size={14} strokeWidth={2.5} />
          </Link>
        </div>
      </motion.nav>

      {/* ═══════════════════════════════════════
          HERO — cinematic, single viewport
          ═══════════════════════════════════════ */}
      <section ref={heroRef} className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* BG Video */}
        <div className="absolute inset-0">
          <video
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_120549_0cd82c36-56b3-4dd9-b190-069cfc3a623f.mp4"
            className="h-full w-full object-cover"
            style={{ opacity: 0.35 }}
            muted autoPlay loop playsInline
          />
          {/* Bottom gradient to bg */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060510] via-[#060510]/40 to-transparent" />
          {/* Top vignette */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#060510]/60 via-transparent to-transparent" />
        </div>

        <motion.div
          className="relative z-10 flex flex-col items-center px-6 text-center"
          style={{ opacity: heroOpacity, scale: heroScale, filter: heroFilter }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.5, ease: easeOutQuart }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5"
            style={{
              borderColor: "oklch(0.75 0.18 290 / 0.2)",
              background: "oklch(0.75 0.18 290 / 0.06)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.75 0.18 290)" }} />
            <span className="text-[12px] font-medium tracking-wide" style={{ color: "oklch(0.75 0.18 290)" }}>
              Nền tảng ôn thi thế hệ mới
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.7, ease: easeOutQuart }}
            className="mb-6 max-w-4xl text-[clamp(2.5rem,6vw,5.5rem)] font-medium leading-[1.05] tracking-[-0.03em]"
            style={{ textWrap: "balance" }}
          >
            Luyện thi{" "}
            <span className="font-serif-italic" style={{ color: "oklch(0.75 0.18 290)" }}>nhẹ hơn</span>
            <br />
            Kết quả{" "}
            <span className="font-serif-italic" style={{ color: "oklch(0.75 0.18 290)" }}>rõ hơn</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9, ease: easeOutQuart }}
            className="mb-10 max-w-xl text-[clamp(0.95rem,1.8vw,1.125rem)] leading-relaxed text-[#8C87A2]"
            style={{ textWrap: "pretty" }}
          >
            Hệ thống thi trắc nghiệm & học trực tuyến tích hợp AI — giúp giáo viên tạo đề nhanh, học sinh ôn luyện hiệu quả, và nhà trường quản lý dễ dàng.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 1.1, ease: easeOutQuart }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-lg px-7 py-3.5 text-[14px] font-semibold transition-all duration-200 hover:brightness-110"
              style={{ background: "oklch(0.75 0.18 290)", color: "#060510" }}
            >
              Bắt đầu miễn phí
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e8e4f0]/10 px-7 py-3.5 text-[14px] font-medium text-[#e8e4f0] transition-all duration-200 hover:border-[#e8e4f0]/25 hover:bg-[#e8e4f0]/[0.04]"
            >
              Đăng nhập
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="absolute bottom-12 left-1/2 -translate-x-1/2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#8C87A2]/60">Kéo xuống</span>
              <div className="h-8 w-[1px] bg-gradient-to-b from-[#8C87A2]/40 to-transparent" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════════════════════
          STATS STRIP — horizontal, numbers-only
          ═══════════════════════════════════════ */}
      <section className="relative border-y border-[#e8e4f0]/[0.06] py-16 md:py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-6 md:grid-cols-4 md:gap-0 md:divide-x md:divide-[#e8e4f0]/[0.06]">
          {[
            { value: 10000, suffix: "+", label: "Học sinh sử dụng" },
            { value: 500, suffix: "+", label: "Giáo viên tin tưởng" },
            { value: 50000, suffix: "+", label: "Bài thi đã tạo" },
            { value: 12, suffix: "", label: "Môn học trực tuyến" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              {...reveal(i * 0.1)}
              className="flex flex-col items-center text-center md:px-8"
            >
              <span className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.03em] text-[#e8e4f0]">
                <Counter target={stat.value} suffix={stat.suffix} />
              </span>
              <span className="mt-1 text-[13px] text-[#8C87A2]">{stat.label}</span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FEATURES — asymmetric 2-column layout
          ═══════════════════════════════════════ */}
      <section id="features" className="relative px-6 py-28 md:px-12 md:py-40">
        <div className="mx-auto max-w-6xl">
          {/* Section heading */}
          <div className="mb-20 max-w-2xl">
            <motion.p
              {...reveal(0)}
              className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: "oklch(0.75 0.18 290)" }}
            >
              Tính năng nổi bật
            </motion.p>
            <motion.h2
              {...reveal(0.1)}
              className="text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.15] tracking-[-0.02em]"
              style={{ textWrap: "balance" }}
            >
              Một hệ sinh thái{" "}
              <span className="font-serif-italic" style={{ color: "oklch(0.75 0.18 290)" }}>gọn</span>{" "}
              nhưng đủ mạnh cho mọi nhu cầu giáo dục
            </motion.h2>
          </div>

          {/* Feature blocks — stacked asymmetric */}
          <div className="space-y-24 md:space-y-32">
            {/* Feature 1 */}
            <div className="grid items-center gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
              <motion.div {...reveal(0)} className="order-2 md:order-1 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[12px] font-semibold" style={{ background: "oklch(0.75 0.18 290 / 0.1)", color: "oklch(0.75 0.18 290)" }}>
                  <Play size={12} /> Kho đề thi
                </div>
                <h3 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium leading-snug tracking-[-0.01em]">
                  Hàng nghìn đề thi theo chủ đề, cấp độ và mục tiêu ôn luyện
                </h3>
                <p className="text-[15px] leading-relaxed text-[#8C87A2]" style={{ maxWidth: "50ch" }}>
                  Tổ chức nội dung khoa học theo cấu trúc cây thư mục — giáo viên dễ quản lý, học sinh dễ tìm kiếm. Hỗ trợ đầy đủ các môn THPT và theo chương trình mới nhất của Bộ GD&ĐT.
                </p>
              </motion.div>
              <motion.div {...revealScale(0.15)} className="order-1 md:order-2">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#e8e4f0]/[0.06]">
                  <video
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_125119_8e5ae31c-0021-4396-bc08-f7aebeb877a2.mp4"
                    className="h-full w-full object-cover"
                    style={{ opacity: 0.8 }}
                    muted autoPlay loop playsInline
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060510]/60 to-transparent" />
                </div>
              </motion.div>
            </div>

            {/* Feature 2 — reversed */}
            <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr] md:gap-16">
              <motion.div {...revealScale(0)} className="order-1">
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-[#e8e4f0]/[0.06]">
                  <video
                    src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_132944_a0d124bb-eaa1-4082-aa30-2310efb42b4b.mp4"
                    className="h-full w-full object-cover"
                    style={{ opacity: 0.7 }}
                    muted autoPlay loop playsInline
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#060510]/60 to-transparent" />
                </div>
              </motion.div>
              <motion.div {...reveal(0.15)} className="order-2 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[12px] font-semibold" style={{ background: "oklch(0.65 0.15 170 / 0.12)", color: "oklch(0.72 0.15 170)" }}>
                  <Play size={12} /> Học trực tuyến
                </div>
                <h3 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium leading-snug tracking-[-0.01em]">
                  Bài giảng video & tài liệu ôn tập đa phương tiện
                </h3>
                <p className="text-[15px] leading-relaxed text-[#8C87A2]" style={{ maxWidth: "50ch" }}>
                  Hỗ trợ nhiều video bài giảng và nhiều tài liệu đính kèm cho mỗi buổi học. Học sinh chọn xem playlist, tải tài liệu — tất cả trong một giao diện duyệt File Explorer trực quan.
                </p>
              </motion.div>
            </div>

            {/* Feature 3 */}
            <div className="grid items-center gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
              <motion.div {...reveal(0)} className="order-2 md:order-1 space-y-5">
                <div className="inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[12px] font-semibold" style={{ background: "oklch(0.70 0.15 60 / 0.12)", color: "oklch(0.78 0.15 60)" }}>
                  <Play size={12} /> AI hỗ trợ
                </div>
                <h3 className="text-[clamp(1.25rem,2.5vw,1.75rem)] font-medium leading-snug tracking-[-0.01em]">
                  Tạo đề thông minh với sự hỗ trợ của trí tuệ nhân tạo
                </h3>
                <p className="text-[15px] leading-relaxed text-[#8C87A2]" style={{ maxWidth: "50ch" }}>
                  Tối ưu quy trình tạo đề, phân tích kết quả và gợi ý nội dung theo ngữ cảnh thi cử. Giảm thời gian chuẩn bị, tăng chất lượng đánh giá.
                </p>
              </motion.div>
              <motion.div {...revealScale(0.15)} className="order-1 md:order-2">
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-[#e8e4f0]/[0.06]" style={{ background: "oklch(0.12 0.03 290)" }}>
                  {/* Abstract decorative element instead of a placeholder */}
                  <div className="relative">
                    <div className="h-32 w-32 rounded-2xl" style={{ background: "oklch(0.75 0.18 290 / 0.15)", boxShadow: "0 0 80px oklch(0.75 0.18 290 / 0.2)" }} />
                    <div className="absolute -right-8 -top-8 h-20 w-20 rounded-full" style={{ background: "oklch(0.70 0.15 60 / 0.12)", boxShadow: "0 0 60px oklch(0.70 0.15 60 / 0.15)" }} />
                    <div className="absolute -bottom-6 -left-6 h-16 w-16 rounded-xl" style={{ background: "oklch(0.65 0.15 170 / 0.12)", boxShadow: "0 0 50px oklch(0.65 0.15 170 / 0.15)" }} />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          SOLUTION — full-width immersive
          ═══════════════════════════════════════ */}
      <section id="solution" className="relative overflow-hidden py-28 md:py-40">
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[800px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, oklch(0.75 0.18 290 / 0.15), transparent 70%)" }} />

        <div className="relative mx-auto max-w-6xl px-6 md:px-12">
          <div className="mb-16 text-center">
            <motion.p
              {...reveal(0)}
              className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: "oklch(0.75 0.18 290)" }}
            >
              Giải pháp toàn diện
            </motion.p>
            <motion.h2
              {...reveal(0.1)}
              className="mx-auto max-w-3xl text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.15] tracking-[-0.02em]"
              style={{ textWrap: "balance" }}
            >
              Thiết kế cho{" "}
              <span className="font-serif-italic" style={{ color: "oklch(0.75 0.18 290)" }}>kết quả học tập</span>
              {" "}thực sự
            </motion.h2>
          </div>

          {/* Solution items — vertical list with left accent line */}
          <div className="mx-auto max-w-3xl space-y-0">
            {[
              {
                title: "Kho đề thi có cấu trúc",
                desc: "Tổ chức nội dung theo chủ đề, chương, cấp độ và mục tiêu ôn luyện. Hỗ trợ tìm kiếm nhanh và lọc thông minh.",
              },
              {
                title: "Công cụ tạo đề tốc hành",
                desc: "Giảm thao tác thừa, tăng tốc quy trình chuẩn bị bài thi. Hỗ trợ trắc nghiệm, tự luận và đề thi hỗn hợp.",
              },
              {
                title: "Theo dõi học tập trực quan",
                desc: "Giúp giáo viên nhìn nhanh vào tiến độ và kết quả. Biểu đồ phân tích điểm số, thống kê tỷ lệ đúng/sai theo chủ đề.",
              },
              {
                title: "Phân phối nội dung chính xác",
                desc: "Đưa đúng tài liệu tới đúng người dùng, đúng thời điểm. Hệ thống phân quyền chi tiết theo lớp và môn học.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                {...reveal(0.1 + i * 0.08)}
                className="group flex gap-5 border-b border-[#e8e4f0]/[0.06] py-8 first:pt-0 last:border-0 last:pb-0"
              >
                <div className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ background: "oklch(0.75 0.18 290 / 0.15)" }}>
                  <Check size={12} style={{ color: "oklch(0.75 0.18 290)" }} />
                </div>
                <div>
                  <h3 className="mb-1.5 text-[17px] font-semibold text-[#e8e4f0] transition-colors duration-200 group-hover:text-white">
                    {item.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[#8C87A2]" style={{ maxWidth: "55ch" }}>
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          AUDIENCE — who it's for
          ═══════════════════════════════════════ */}
      <section id="audience" className="relative border-t border-[#e8e4f0]/[0.06] px-6 py-28 md:px-12 md:py-40">
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 text-center">
            <motion.p
              {...reveal(0)}
              className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em]"
              style={{ color: "oklch(0.75 0.18 290)" }}
            >
              Dành cho ai
            </motion.p>
            <motion.h2
              {...reveal(0.1)}
              className="mx-auto max-w-2xl text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.15] tracking-[-0.02em]"
              style={{ textWrap: "balance" }}
            >
              Một nền tảng,{" "}
              <span className="font-serif-italic" style={{ color: "oklch(0.75 0.18 290)" }}>nhiều vai trò</span>
            </motion.h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                role: "Học sinh",
                desc: "Ôn luyện theo lộ trình cá nhân, làm đề thi thử, xem video bài giảng và theo dõi tiến độ học tập qua biểu đồ trực quan.",
                accent: "oklch(0.75 0.18 290)",
                accentBg: "oklch(0.75 0.18 290 / 0.08)",
              },
              {
                role: "Giáo viên",
                desc: "Tạo đề thi nhanh chóng, quản lý kho bài giảng trực tuyến dạng File Explorer, cấp quyền học sinh và theo dõi kết quả lớp học.",
                accent: "oklch(0.72 0.15 170)",
                accentBg: "oklch(0.72 0.15 170 / 0.08)",
              },
              {
                role: "Nhà trường",
                desc: "Tổng quan toàn bộ hoạt động dạy và học, thống kê điểm số, quản lý tài khoản giáo viên và phân phối nội dung quy mô lớn.",
                accent: "oklch(0.78 0.15 60)",
                accentBg: "oklch(0.78 0.15 60 / 0.08)",
              },
            ].map((item, i) => (
              <motion.div
                key={item.role}
                {...reveal(i * 0.1)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-[#e8e4f0]/[0.06] p-7 transition-all duration-300 hover:border-[#e8e4f0]/[0.12]"
                style={{ background: "oklch(0.10 0.02 290)" }}
              >
                {/* Top accent dot */}
                <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: item.accentBg }}>
                  <span className="text-sm font-bold" style={{ color: item.accent }}>{item.role[0]}</span>
                </div>

                <div>
                  <h3 className="mb-2 text-[18px] font-semibold text-[#e8e4f0]">{item.role}</h3>
                  <p className="text-[14px] leading-relaxed text-[#8C87A2]">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6">
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors duration-200"
                    style={{ color: item.accent }}
                  >
                    Tìm hiểu thêm <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          QUOTE / PHILOSOPHY STRIP
          ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden border-y border-[#e8e4f0]/[0.06] py-24 md:py-32">
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 50% at 50% 50%, oklch(0.75 0.18 290 / 0.04), transparent)" }} />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <motion.blockquote
            {...reveal(0)}
            className="text-[clamp(1.25rem,3vw,2rem)] font-medium leading-[1.5] tracking-[-0.01em] text-[#e8e4f0]"
            style={{ textWrap: "balance" }}
          >
            &ldquo;Cây lớn ôm vòng, sinh từ mầm nhỏ; đài cao chín tầng, khởi từ đất bao; hành trình vạn dặm, bắt đầu dưới chân.&rdquo;
          </motion.blockquote>
          <motion.cite
            {...reveal(0.15)}
            className="mt-6 block text-[14px] font-medium not-italic text-[#8C87A2]"
          >
            — Lão Tử
          </motion.cite>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          CTA — immersive final fold
          ═══════════════════════════════════════ */}
      <section className="relative flex min-h-[70vh] items-center justify-center overflow-hidden py-28 md:py-40">
        {/* BG Video */}
        <HlsVideo
          src="https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="absolute inset-0 bg-[#060510]/50" />
        {/* Ambient glow */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full" style={{ background: "radial-gradient(circle, oklch(0.75 0.18 290 / 0.1), transparent 70%)" }} />

        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <motion.h2
            {...reveal(0)}
            className="mb-5 max-w-2xl text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-[-0.02em]"
            style={{ textWrap: "balance" }}
          >
            Sẵn sàng{" "}
            <span className="font-serif-italic" style={{ color: "oklch(0.75 0.18 290)" }}>bắt đầu</span>?
          </motion.h2>

          <motion.p
            {...reveal(0.1)}
            className="mb-10 max-w-md text-[15px] leading-relaxed text-[#8C87A2]"
            style={{ textWrap: "pretty" }}
          >
            Tham gia cùng hàng nghìn giáo viên và học sinh đã tin tưởng ExamHub cho hành trình học tập.
          </motion.p>

          <motion.div {...reveal(0.2)} className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-lg px-8 py-4 text-[15px] font-semibold transition-all duration-200 hover:brightness-110"
              style={{ background: "oklch(0.75 0.18 290)", color: "#060510" }}
            >
              Đăng ký miễn phí
              <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-lg border border-[#e8e4f0]/10 px-8 py-4 text-[15px] font-medium text-[#e8e4f0] transition-all duration-200 hover:border-[#e8e4f0]/25 hover:bg-[#e8e4f0]/[0.04]"
            >
              Đăng nhập
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════ */}
      <footer className="border-t border-[#e8e4f0]/[0.06] px-6 py-12 md:px-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-7 w-7 items-center justify-center">
              <div className="absolute inset-0 rounded-md" style={{ background: "oklch(0.75 0.18 290 / 0.12)" }} />
              <span className="text-sm font-bold" style={{ color: "oklch(0.75 0.18 290)" }}>E</span>
            </div>
            <span className="text-[14px] font-semibold tracking-tight">ExamHub</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-[13px] text-[#8C87A2]">
            <Link href="/tra-cuu-diem" className="transition-colors hover:text-[#e8e4f0]">Tra cứu điểm thi</Link>
            <Link href="/login" className="transition-colors hover:text-[#e8e4f0]">Đăng nhập</Link>
            <Link href="/register" className="transition-colors hover:text-[#e8e4f0]">Đăng ký</Link>
          </div>

          <p className="text-[12px] text-[#8C87A2]/60">
            © {new Date().getFullYear()} ExamHub. All rights reserved.
          </p>
        </div>
      </footer>

      {/* ─── Reduced motion alternative ─── */}
      <style jsx global>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
