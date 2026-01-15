import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GraduationCap, BookOpen, Users, Clock, CheckCircle, ArrowRight } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">ExamHub</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" className="text-slate-300 hover:text-white">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  Bắt đầu miễn phí
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Nền tảng thi trắc nghiệm thông minh
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Tạo đề thi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">nhanh chóng</span>
            <br />
            Chấm điểm <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">tự động</span>
          </h1>

          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto">
            Giáo viên tải PDF → Hệ thống tạo đề thi tương tác → Học sinh làm bài → Điểm có ngay lập tức
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg px-8">
                Tạo tài khoản miễn phí
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800 text-lg px-8">
                Đăng nhập
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Tính năng nổi bật
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Mọi thứ bạn cần để tổ chức kỳ thi trực tuyến hiệu quả
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Upload PDF",
                description: "Tải đề thi PDF có sẵn, hệ thống tự động tạo giao diện thi",
                color: "from-blue-500 to-cyan-500"
              },
              {
                icon: Clock,
                title: "Đồng hồ đếm ngược",
                description: "Tự động nộp bài khi hết giờ, không lo quên thời gian",
                color: "from-purple-500 to-pink-500"
              },
              {
                icon: CheckCircle,
                title: "Chấm điểm tự động",
                description: "Kết quả ngay lập tức sau khi nộp bài, tiết kiệm thời gian",
                color: "from-green-500 to-emerald-500"
              },
              {
                icon: Users,
                title: "Bảng xếp hạng",
                description: "So sánh điểm với bạn bè, tạo động lực học tập",
                color: "from-orange-500 to-amber-500"
              }
            ].map((feature, index) => (
              <Card key={index} className="border-slate-700 bg-slate-800/50 hover:bg-slate-800/80 transition-all group">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-8 md:p-12 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-slate-700">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Sẵn sàng bắt đầu?
            </h2>
            <p className="text-slate-400 mb-8 max-w-xl mx-auto">
              Tạo tài khoản miễn phí ngay hôm nay và trải nghiệm cách tổ chức thi trắc nghiệm hiện đại
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 text-lg px-8">
                Bắt đầu ngay
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">ExamHub</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 ExamHub. Hệ thống thi trắc nghiệm trực tuyến.
          </p>
        </div>
      </footer>
    </div>
  )
}
