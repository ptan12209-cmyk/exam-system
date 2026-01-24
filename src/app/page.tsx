import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { GraduationCap, BookOpen, Users, Clock, CheckCircle, ArrowRight, Sparkles, Shield, Zap, Trophy } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">LuyenDe 2026</span>
            </div>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
              <Link href="/pricing" className="hover:text-blue-600 transition-colors">Bảng giá</Link>
              <Link href="/resources" className="hover:text-blue-600 transition-colors">Tài liệu</Link>
              <Link href="/live" className="hover:text-blue-600 transition-colors">Lớp học trực tiếp</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-gray-700 hover:text-blue-600 font-medium">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                  Bắt đầu miễn phí
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 bg-gradient-to-b from-blue-50/50 via-white to-white">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-8 shadow-sm">
            <Sparkles className="w-4 h-4" />
            Nền tảng luyện đề thi hàng đầu Việt Nam
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
            Luyện đề thi <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">thông minh</span>
            <br />
            Kết quả <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">vượt trội</span>
          </h1>

          <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Hệ thống hỗ trợ học sinh và giáo viên trong việc tổ chức, luyện tập và đánh giá bài thi hiệu quả.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 shadow-xl shadow-blue-500/25">
                Tạo tài khoản miễn phí
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 text-lg px-8">
                Đăng nhập
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">10K+</div>
              <div className="text-sm text-gray-500">Học sinh</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">500+</div>
              <div className="text-sm text-gray-500">Giáo viên</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">50K+</div>
              <div className="text-sm text-gray-500">Bài thi</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tính năng nổi bật
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Mọi thứ bạn cần để chuẩn bị cho kỳ thi sắp tới
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: BookOpen,
                title: "Kho đề thi phong phú",
                description: "Hàng ngàn đề thi từ các môn học, cập nhật liên tục theo chương trình mới",
                color: "bg-blue-600"
              },
              {
                icon: Zap,
                title: "Chấm điểm tự động",
                description: "Kết quả ngay lập tức sau khi nộp bài, phân tích chi tiết từng câu hỏi",
                color: "bg-emerald-600"
              },
              {
                icon: Trophy,
                title: "Bảng xếp hạng",
                description: "So sánh điểm với bạn bè, nhận thành tựu và phần thưởng hấp dẫn",
                color: "bg-amber-500"
              },
              {
                icon: Shield,
                title: "Chống gian lận",
                description: "Hệ thống AI giám sát thông minh, đảm bảo công bằng cho tất cả",
                color: "bg-purple-600"
              }
            ].map((feature, index) => (
              <Card key={index} className="border-gray-200 bg-white shadow-sm hover:shadow-lg transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* For Teachers & Students */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12">
          <div className="p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
            <div className="w-14 h-14 rounded-xl bg-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Dành cho Học sinh</h3>
            <ul className="space-y-3 text-gray-700 mb-6">
              <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-600" /> Luyện đề theo môn, theo cấp độ</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-600" /> Xem kết quả và giải thích chi tiết</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-600" /> Nhận XP, mở khóa thành tựu</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-blue-600" /> Tham gia đấu trường Arena</li>
            </ul>
            <Link href="/register?role=student">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Đăng ký học sinh
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="p-8 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
            <div className="w-14 h-14 rounded-xl bg-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-purple-500/20">
              <Users className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Dành cho Giáo viên</h3>
            <ul className="space-y-3 text-gray-700 mb-6">
              <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-purple-600" /> Tạo đề thi trong vài phút</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-purple-600" /> Upload PDF, AI trích xuất đáp án</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-purple-600" /> Theo dõi kết quả học sinh real-time</li>
              <li className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-purple-600" /> Xuất báo cáo Excel/PDF</li>
            </ul>
            <Link href="/register?role=teacher">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                Đăng ký giáo viên
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Sẵn sàng chinh phục kỳ thi?
          </h2>
          <p className="text-blue-100 mb-8 max-w-xl mx-auto text-lg">
            Tham gia cùng hàng ngàn học sinh và giáo viên trên khắp cả nước
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 text-lg px-8 shadow-xl">
              Bắt đầu ngay hôm nay
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-900 text-lg">LuyenDe 2026</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <Link href="/pricing" className="hover:text-blue-600">Bảng giá</Link>
              <Link href="/resources" className="hover:text-blue-600">Tài liệu</Link>
              <Link href="/live" className="hover:text-blue-600">Lớp học trực tiếp</Link>
              <a href="mailto:support@luyende.vn" className="hover:text-blue-600">Liên hệ</a>
            </div>
            <p className="text-gray-500 text-sm">
              © 2026 LuyenDe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
