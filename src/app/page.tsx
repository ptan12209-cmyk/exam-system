import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  FileUp,
  GraduationCap,
  ShieldCheck,
  Users,
} from "lucide-react"
import Footer from "@/components/Footer"
import { Navbar } from "@/components/Navbar"

const features = [
  {
    icon: FileUp,
    title: "Tạo và giao đề nhanh",
    description:
      "Tải đề PDF, nhập đáp án hoặc chọn câu hỏi từ ngân hàng để phát hành bài tập cho đúng khối và lớp.",
  },
  {
    icon: ClipboardCheck,
    title: "Làm bài trực tuyến",
    description:
      "Học sinh nhận đề, làm bài có giới hạn thời gian, lưu tiến độ và xem kết quả sau khi nộp.",
  },
  {
    icon: BarChart3,
    title: "Chấm điểm và phân tích",
    description:
      "Tự động chấm điểm, xem phổ điểm, từng bài nộp và câu hỏi học sinh thường làm sai.",
  },
  {
    icon: Users,
    title: "Quản lý học sinh",
    description:
      "Liên kết tài khoản học sinh, giao nhiệm vụ, theo dõi hoạt động, kết quả và thời khóa biểu.",
  },
]

const workflow = [
  "Giáo viên tạo hoặc chọn đề từ ngân hàng câu hỏi",
  "Phát hành đề theo khối, lớp và thời gian làm bài",
  "Học sinh làm bài, hệ thống ghi nhận và chấm điểm",
  "Giáo viên theo dõi kết quả và hỗ trợ từng học sinh",
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Navbar />

      <main>
        <section className="relative overflow-hidden px-6 pb-24 pt-24 md:px-10 md:pb-32 md:pt-32">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-12rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-[hsl(var(--primary))]/10 blur-[120px]" />
            <div className="absolute bottom-[-16rem] right-[-10rem] h-[38rem] w-[38rem] rounded-full bg-[hsl(var(--accent))]/10 blur-[140px]" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))]/70 bg-[hsl(var(--card))]/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[hsl(var(--muted-foreground))]">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--primary))]" />
                Hệ thống bài tập trực tuyến
              </div>
              <h1 className="mt-7 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-[-0.05em] sm:text-6xl lg:text-7xl">
                Giao bài rõ ràng.
                <span className="mt-2 block text-[hsl(var(--muted-foreground))]">
                  Theo sát từng học sinh.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-[hsl(var(--muted-foreground))] sm:text-lg">
                ExamHub giúp giáo viên tạo đề, giao bài, chấm điểm và theo dõi
                tiến độ trong một nơi; học sinh chỉ cần đăng nhập và bắt đầu làm bài.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--foreground))] px-6 py-3.5 text-sm font-semibold text-[hsl(var(--background))] transition-transform hover:scale-[1.02]"
                >
                  Vào hệ thống <ArrowRight className="h-4 w-4" />
                </Link>
                <span className="inline-flex items-center justify-center rounded-full border border-[hsl(var(--border))] px-6 py-3.5 text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Tài khoản học sinh do giáo viên cấp
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--card))]/80 p-5 shadow-[0_40px_100px_-50px_rgba(0,0,0,0.55)] backdrop-blur">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--primary))]/10">
                    <GraduationCap className="h-5 w-5 text-[hsl(var(--primary))]" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Bảng điều khiển giáo viên</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Tổng quan lớp học hôm nay</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                  Đang hoạt động
                </span>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                {[
                  ["12", "Đề đã giao"],
                  ["86", "Bài đã nộp"],
                  ["8.1", "Điểm trung bình"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-2xl border border-[hsl(var(--border))]/50 bg-[hsl(var(--background))]/50 p-4">
                    <p className="text-2xl font-semibold">{value}</p>
                    <p className="mt-1 text-[10px] leading-4 text-[hsl(var(--muted-foreground))]">{label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2">
                {[
                  ["Kiểm tra 15 phút · Toán 12", "28/32 đã nộp"],
                  ["Ôn tập chương Dao động", "24/30 đã nộp"],
                  ["Bài tập Hóa hữu cơ", "19/27 đã nộp"],
                ].map(([title, status]) => (
                  <div key={title} className="flex items-center justify-between gap-4 rounded-2xl border border-[hsl(var(--border))]/40 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                      <span className="truncate text-xs font-medium">{title}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-[hsl(var(--muted-foreground))]">{status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-[hsl(var(--border))]/40 bg-[hsl(var(--card))]/35 px-6 py-24 md:px-10">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">Tính năng cốt lõi</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
                Mọi thứ cần thiết để vận hành lớp bài tập online
              </h2>
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--background))]/60 p-6">
                  <feature.icon className="h-6 w-6 text-[hsl(var(--primary))]" />
                  <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{feature.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 py-24 md:px-10">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[hsl(var(--primary))]">Quy trình</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em]">Từ đề bài đến dữ liệu tiến bộ</h2>
              <p className="mt-5 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                Luồng làm việc ngắn gọn cho giáo viên và dễ hiểu cho học sinh.
              </p>
            </div>
            <ol className="space-y-3">
              {workflow.map((step, index) => (
                <li key={step} className="flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))]/60 p-5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--foreground))] text-sm font-bold text-[hsl(var(--background))]">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium sm:text-base">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
