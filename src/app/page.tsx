import Link from "next/link"
import { Button } from "@/components/ui/button"
import { GraduationCap, BookOpen, Users, CheckCircle, ArrowRight, Sparkles, Shield, Zap, Trophy, Star, ChevronRight } from "lucide-react"
import { ThemeToggle } from "@/components/ui/ThemeToggle"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="glass-nav sticky top-0 z-50 safe-top">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3 group">
              <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Exam<span className="text-gradient">Hub</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">Bảng giá</Link>
              <Link href="/resources" className="hover:text-foreground transition-colors">Tài liệu</Link>
              <Link href="/live" className="hover:text-foreground transition-colors">Lớp học trực tiếp</Link>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium hidden sm:inline-flex">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button className="gradient-primary hover:opacity-90 text-white border-0 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/35 transition-all duration-300 font-semibold">
                  Bắt đầu miễn phí
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-4 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 gradient-mesh pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-indigo-400/10 dark:bg-indigo-400/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-96 h-96 bg-violet-400/10 dark:bg-violet-400/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card text-indigo-700 dark:text-indigo-300 text-sm font-semibold mb-8 animate-fade-in-down">
            <Sparkles className="w-4 h-4" />
            Nền tảng luyện đề thi hàng đầu Việt Nam
            <ChevronRight className="w-4 h-4" />
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-foreground mb-6 leading-tight tracking-tight animate-fade-in-up">
            Luyện đề thi{" "}
            <span className="text-gradient-animated">thông minh</span>
            <br />
            Kết quả{" "}
            <span className="text-gradient">vượt trội</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in-up stagger-2">
            Hệ thống hỗ trợ học sinh và giáo viên trong việc tổ chức, luyện tập và đánh giá bài thi hiệu quả.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up stagger-3">
            <Link href="/register">
              <Button size="lg" className="gradient-primary hover:opacity-90 text-white border-0 text-lg px-8 shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-300 font-semibold">
                Tạo tài khoản miễn phí
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-border text-foreground hover:bg-muted text-lg px-8 font-medium">
                Đăng nhập
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-3 gap-8 max-w-xl mx-auto animate-fade-in-up stagger-4">
            {[
              { value: "10K+", label: "Học sinh" },
              { value: "500+", label: "Giáo viên" },
              { value: "50K+", label: "Bài thi" }
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-extrabold text-gradient">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-muted/40 dark:bg-muted/20" />
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tính năng nổi bật
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Mọi thứ bạn cần để chuẩn bị cho kỳ thi sắp tới
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Kho đề thi phong phú",
                description: "Hàng ngàn đề thi từ các môn học, cập nhật liên tục theo chương trình mới",
                gradient: "from-blue-500 to-indigo-600",
                shadow: "shadow-blue-500/20"
              },
              {
                icon: Zap,
                title: "Chấm điểm tự động",
                description: "Kết quả ngay lập tức sau khi nộp bài, phân tích chi tiết từng câu hỏi",
                gradient: "from-emerald-500 to-teal-600",
                shadow: "shadow-emerald-500/20"
              },
              {
                icon: Trophy,
                title: "Bảng xếp hạng",
                description: "So sánh điểm với bạn bè, nhận thành tựu và phần thưởng hấp dẫn",
                gradient: "from-amber-500 to-orange-600",
                shadow: "shadow-amber-500/20"
              },
              {
                icon: Shield,
                title: "Chống gian lận",
                description: "Hệ thống AI giám sát thông minh, đảm bảo công bằng cho tất cả",
                gradient: "from-violet-500 to-purple-600",
                shadow: "shadow-violet-500/20"
              }
            ].map((feature, index) => (
              <div key={index} className="card-interactive p-6 bg-card group">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg ${feature.shadow}`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Teachers & Students */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          {/* Student Card */}
          <div className="relative p-8 rounded-2xl overflow-hidden group card-hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-indigo-100/50 to-blue-100/50 dark:from-indigo-900/20 dark:to-blue-900/20" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/25">
                <GraduationCap className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Dành cho Học sinh</h3>
              <ul className="space-y-3 text-foreground/80 mb-8">
                {[
                  "Luyện đề theo môn, theo cấp độ",
                  "Xem kết quả và giải thích chi tiết",
                  "Nhận XP, mở khóa thành tựu",
                  "Tham gia đấu trường Arena"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register?role=student">
                <Button className="gradient-primary hover:opacity-90 text-white border-0 shadow-lg shadow-indigo-500/25 font-semibold">
                  Đăng ký học sinh
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Teacher Card */}
          <div className="relative p-8 rounded-2xl overflow-hidden group card-hover-lift">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/30" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-violet-100/50 to-purple-100/50 dark:from-violet-900/20 dark:to-purple-900/20" />
            <div className="relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-violet-500/25">
                <Users className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-4">Dành cho Giáo viên</h3>
              <ul className="space-y-3 text-foreground/80 mb-8">
                {[
                  "Tạo đề thi trong vài phút",
                  "Upload PDF, AI trích xuất đáp án",
                  "Theo dõi kết quả học sinh real-time",
                  "Xuất báo cáo Excel/PDF"
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-violet-500 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register?role=teacher">
                <Button className="bg-gradient-to-r from-violet-500 to-purple-600 hover:opacity-90 text-white border-0 shadow-lg shadow-violet-500/25 font-semibold">
                  Đăng ký giáo viên
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="py-20 px-4 relative">
        <div className="absolute inset-0 bg-muted/40 dark:bg-muted/20" />
        <div className="max-w-5xl mx-auto relative z-10 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <blockquote className="text-xl md:text-2xl font-medium text-foreground mb-6 leading-relaxed max-w-3xl mx-auto">
            &ldquo;ExamHub giúp tôi tiết kiệm hàng giờ tạo đề và chấm bài. Học sinh cũng hào hứng hơn khi được thi online và nhận kết quả ngay lập tức.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold">
              GV
            </div>
            <div className="text-left">
              <p className="font-semibold text-foreground text-sm">Giáo viên Toán</p>
              <p className="text-muted-foreground text-xs">Trường THPT Nguyễn Du</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.15),transparent_70%)]" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Sẵn sàng chinh phục kỳ thi?
          </h2>
          <p className="text-white/70 mb-10 max-w-xl mx-auto text-lg">
            Tham gia cùng hàng ngàn học sinh và giáo viên trên khắp cả nước
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-indigo-700 hover:bg-white/90 text-lg px-10 shadow-xl font-semibold">
              Bắt đầu ngay hôm nay
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 gradient-primary rounded-xl flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-foreground">
                Exam<span className="text-gradient">Hub</span>
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
              <Link href="/pricing" className="hover:text-foreground transition-colors">Bảng giá</Link>
              <Link href="/resources" className="hover:text-foreground transition-colors">Tài liệu</Link>
              <Link href="/live" className="hover:text-foreground transition-colors">Lớp học trực tiếp</Link>
              <a href="mailto:support@examhub.vn" className="hover:text-foreground transition-colors">Liên hệ</a>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2026 ExamHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
