"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { motion, useScroll } from "framer-motion"
import {
  ArrowRight,
  Asterisk,
  Bot,
  ChevronRight,
  GraduationCap,
  Instagram,
  Linkedin,
  Sparkles,
  Star,
  Twitter,
  Users,
  Zap,
  Shield,
  Trophy,
  BookOpen,
} from "lucide-react"
import Hls from "hls.js"

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, delay, ease: "easeOut" } as const,
})

const HlsVideoBackground = ({ src }: { src: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let hls: Hls | null = null

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: false })
      hls.loadSource(src)
      hls.attachMedia(video)
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src
    }

    return () => {
      if (hls) hls.destroy()
    }
  }, [src])

  return <video ref={videoRef} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover z-0" />
}

export default function HomePage() {
  const missionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: missionRef,
    offset: ["start 80%", "end 60%"],
  })

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))] selection:bg-[hsl(var(--foreground))] selection:text-[hsl(var(--background))]">


      <nav className="fixed inset-x-0 top-0 z-50 px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-[hsla(var(--foreground),0.6)]">
            <div className="h-3 w-3 rounded-full border border-[hsla(var(--foreground),0.6)]" />
          </div>
          <span className="text-lg font-bold tracking-tight">ExamHub</span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[hsl(var(--muted-foreground))]">
          <Link href="#features" className="hover:text-[hsl(var(--foreground))] transition-colors">Tính năng</Link>
          <span className="opacity-40">•</span>
          <Link href="#audience" className="hover:text-[hsl(var(--foreground))] transition-colors">Đối tượng</Link>
          <span className="opacity-40">•</span>
          <Link href="#solution" className="hover:text-[hsl(var(--foreground))] transition-colors">Giải pháp</Link>
          <span className="opacity-40">•</span>
          <Link href="#cta" className="hover:text-[hsl(var(--foreground))] transition-colors">Bắt đầu</Link>
        </div>

        <div className="flex items-center gap-3">
          {[Instagram, Linkedin, Twitter].map((Icon, idx) => (
            <button key={idx} className="liquid-glass flex h-10 w-10 items-center justify-center rounded-full text-[hsl(var(--foreground))] transition-transform hover:scale-105">
              <Icon size={18} />
            </button>
          ))}
        </div>
      </nav>

      <section className="relative flex h-screen w-full items-center justify-center overflow-hidden px-6 text-center">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <video
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_120549_0cd82c36-56b3-4dd9-b190-069cfc3a623f.mp4"
            className="h-full w-full object-cover opacity-70"
            muted
            autoPlay
            loop
            playsInline
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 z-0 h-64 bg-gradient-to-t from-[hsl(var(--background))] to-transparent" />

        <div className="relative z-10 flex flex-col items-center pt-28 md:pt-32">
          <motion.div {...fadeUp(0.1)} className="mb-8 flex items-center gap-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map((i) => (
                <img key={i} src={`https://i.pravatar.cc/100?img=${i + 10}`} alt={`Avatar ${i}`} className="h-8 w-8 rounded-full border-2 border-[hsl(var(--background))]" />
              ))}
            </div>
            <span className="text-sm text-[hsl(var(--muted-foreground))]">7,000+ người dùng đã tham gia</span>
          </motion.div>

          <motion.h1 {...fadeUp(0.2)} className="mb-6 text-5xl font-medium tracking-[-2px] md:text-7xl lg:text-8xl">
            Luyện thi <span className="font-serif-italic">nhẹ hơn</span>
            <br />
            Kết quả <span className="font-serif-italic">rõ hơn</span>
          </motion.h1>

          <motion.p {...fadeUp(0.3)} className="mb-12 max-w-3xl text-lg leading-[1.7] text-[hsl(var(--hero-subtitle))]">
            Một nền tảng thi trắc nghiệm hiện đại giúp học sinh luyện tập, giáo viên tổ chức bài thi và cả hai bên theo dõi
            tiến độ rõ ràng hơn.
          </motion.p>

          <motion.div {...fadeUp(0.4)} className="flex flex-col gap-4 sm:flex-row">
            <Link href="/register" className="rounded-full bg-[hsl(var(--foreground))] px-8 py-3.5 text-sm font-semibold text-[hsl(var(--background))] transition-transform hover:scale-[1.03] inline-flex items-center justify-center gap-2">
              Bắt đầu miễn phí <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="liquid-glass rounded-full px-8 py-3.5 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--foreground))]/5 inline-flex items-center justify-center">
              Đăng nhập
            </Link>
          </motion.div>

          <motion.div {...fadeUp(0.5)} className="mt-20 grid max-w-xl grid-cols-3 gap-8">
            {[
              { value: "10K+", label: "Học sinh" },
              { value: "500+", label: "Giáo viên" },
              { value: "50K+", label: "Bài thi" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold tracking-tight md:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm font-medium text-[hsl(var(--muted-foreground))]">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="features" className="px-6 py-28 md:px-10">
        <div className="mb-24 text-center">
          <motion.h2 {...fadeUp(0.1)} className="mb-8 text-5xl font-medium tracking-tight md:text-7xl lg:text-8xl">
            Một hệ thống <span className="font-serif-italic">gọn</span> nhưng đủ mạnh
          </motion.h2>
          <motion.p {...fadeUp(0.2)} className="mx-auto max-w-2xl text-lg text-[hsl(var(--muted-foreground))]">
            Tập trung vào những tính năng cốt lõi để việc luyện thi, tổ chức đề và theo dõi tiến độ trở nên rõ ràng hơn.
          </motion.p>
        </div>

        <div className="mx-auto mb-20 grid max-w-6xl gap-12 md:grid-cols-3">
          {[
            { icon: Bot, title: "AI hỗ trợ", desc: "Tối ưu tạo đề, phân tích và hỗ trợ nội dung theo ngữ cảnh thi cử." },
            { icon: Asterisk, title: "Tìm kiếm thông minh", desc: "Tiếp cận đề, tài liệu và câu hỏi theo cách nhanh, trực tiếp và ít nhiễu." },
            { icon: Sparkles, title: "Trải nghiệm rõ ràng", desc: "Giao diện tối giản, nhấn vào nội dung thay vì hiệu ứng thừa." },
          ].map((item, i) => (
            <motion.div key={item.title} {...fadeUp(0.3 + i * 0.1)} className="flex flex-col items-center text-center">
              <div className="mb-8 flex h-[200px] w-[200px] items-center justify-center rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                <item.icon size={64} strokeWidth={1} className="text-[hsl(var(--foreground))]/60" />
              </div>
              <h3 className="mb-2 text-base font-semibold">{item.title}</h3>
              <p className="max-w-[250px] text-sm text-[hsl(var(--muted-foreground))]">{item.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.p {...fadeUp(0.6)} className="text-center text-sm text-[hsl(var(--muted-foreground))]">
          Tập trung vào trải nghiệm học tập trước, trang trí sau.
        </motion.p>
      </section>

      <section ref={missionRef} className="relative px-6 pb-32 pt-0 md:px-10 md:pb-44">
        <div className="mb-20 flex justify-center">
          <div className="relative aspect-square w-full max-w-[800px] overflow-hidden rounded-full border border-[hsl(var(--border))]/30">
            <video
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_132944_a0d124bb-eaa1-4082-aa30-2310efb42b4b.mp4"
              className="h-full w-full object-cover opacity-60 mix-blend-screen"
              muted
              autoPlay
              loop
              playsInline
            />
          </div>
        </div>

        <div className="mx-auto flex max-w-5xl flex-col text-center md:text-left">
          <div className="mb-10 max-w-5xl text-2xl font-medium leading-tight tracking-[-1px] md:text-4xl lg:text-5xl">
            Chúng tôi xây dựng một không gian nơi học sinh dễ tập trung hơn, giáo viên dễ vận hành hơn, và mỗi lần ôn tập
            đều đi thẳng vào giá trị cốt lõi.
          </div>
          <div className="max-w-5xl text-xl font-medium leading-tight md:text-2xl lg:text-3xl">
            Một nền tảng nơi nội dung, cộng đồng và dữ liệu học tập cùng vận hành mượt mà — ít nhiễu hơn, ít ma sát hơn,
            và rõ ràng hơn cho mọi người dùng.
          </div>
        </div>
      </section>

      <section id="solution" className="border-t border-[hsl(var(--border))]/30 px-6 py-32 md:px-10 md:py-44">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp(0.1)} className="mb-16 text-center md:text-left">
            <span className="mb-4 block text-xs uppercase tracking-[3px] text-[hsl(var(--muted-foreground))]">Solution</span>
            <h2 className="text-4xl font-medium tracking-tight md:text-6xl">
              Thiết kế cho <span className="font-serif-italic">kết quả học tập</span>
            </h2>
          </motion.div>

          <motion.div {...fadeUp(0.2)} className="mb-20 aspect-[3/1] w-full overflow-hidden rounded-2xl border border-[hsl(var(--border))]/30">
            <video
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260325_125119_8e5ae31c-0021-4396-bc08-f7aebeb877a2.mp4"
              className="h-full w-full object-cover opacity-80"
              muted
              autoPlay
              loop
              playsInline
            />
          </motion.div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            {[
              { title: "Kho đề thi", desc: "Tổ chức nội dung theo chủ đề, cấp độ và mục tiêu ôn luyện." },
              { title: "Công cụ tạo đề", desc: "Giảm thao tác thừa, tăng tốc quy trình chuẩn bị bài thi." },
              { title: "Theo dõi học tập", desc: "Giúp giáo viên nhìn nhanh vào tiến độ và kết quả." },
              { title: "Phân phối nội dung", desc: "Đưa đúng tài liệu tới đúng người dùng, đúng thời điểm." },
            ].map((feature, i) => (
              <motion.div key={feature.title} {...fadeUp(0.3 + i * 0.1)} className="flex flex-col border-l border-[hsl(var(--border))]/50 pl-6">
                <h3 className="mb-2 text-base font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="relative flex items-center justify-center overflow-hidden border-t border-[hsl(var(--border))]/30 py-32 text-center md:py-44">
        <HlsVideoBackground src="https://stream.mux.com/8wrHPCX2dC3msyYU9ObwqNdm00u3ViXvOSHUMRYSEe5Q.m3u8" />
        <div className="absolute inset-0 z-[1] bg-[hsl(var(--background))]/45" />

        <div className="relative z-10 flex flex-col items-center px-6">
          <motion.div {...fadeUp(0.1)} className="mb-8">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-[hsl(var(--foreground))]">
              <div className="h-5 w-5 rounded-full border border-[hsl(var(--foreground))]" />
            </div>
          </motion.div>

          <motion.h2 {...fadeUp(0.2)} className="mb-6 font-serif-italic text-5xl md:text-7xl">
            Sẵn sàng bắt đầu?
          </motion.h2>

          <motion.p {...fadeUp(0.3)} className="mb-10 max-w-md text-lg text-[hsl(var(--muted-foreground))]">
            Nền tảng thi trắc nghiệm hiện đại dành cho học sinh và giáo viên, được thiết kế để việc luyện tập và tổ chức
            đề thi trở nên rõ ràng hơn.
          </motion.p>

          <motion.div {...fadeUp(0.4)} className="flex flex-col gap-4 sm:flex-row">
            <Link href="/register" className="rounded-lg bg-[hsl(var(--foreground))] px-8 py-3.5 text-sm font-semibold text-[hsl(var(--background))] transition-transform hover:scale-105 inline-flex items-center justify-center">
              Bắt đầu ngay
            </Link>
            <Link href="/login" className="liquid-glass rounded-lg px-8 py-3.5 text-sm font-medium text-[hsl(var(--foreground))] transition-colors hover:bg-[hsl(var(--foreground))]/5 inline-flex items-center justify-center">
              Đăng nhập
            </Link>
          </motion.div>
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-6 border-t border-[hsl(var(--border))]/20 px-6 py-12 md:flex-row md:px-10">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">© 2026 ExamHub. All rights reserved.</p>
        <div className="flex items-center gap-8 text-sm text-[hsl(var(--muted-foreground))]">
          <Link href="/pricing" className="hover:text-[hsl(var(--foreground))] transition-colors">Bảng giá</Link>
          <Link href="/resources" className="hover:text-[hsl(var(--foreground))] transition-colors">Tài liệu</Link>
          <Link href="/live" className="hover:text-[hsl(var(--foreground))] transition-colors">Lớp học trực tiếp</Link>
        </div>
      </footer>
    </div>
  )
}
