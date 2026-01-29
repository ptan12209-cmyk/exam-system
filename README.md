# 🎓 ExamHub - Hệ Thống Thi Trắc Nghiệm Online

> Nền tảng luyện đề thi trực tuyến hiện đại, tích hợp gamification và đấu trường realtime

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

---

## 📋 Mục Lục

- [Giới Thiệu](#-giới-thiệu)
- [Tính Năng](#-tính-năng)
- [Công Nghệ](#-công-nghệ-sử-dụng)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
- [Tài Khoản Demo](#-tài-khoản-demo)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Screenshots](#-screenshots)

---

## 🌟 Giới Thiệu

**ExamHub** là hệ thống thi trắc nghiệm online được thiết kế dành cho giáo viên và học sinh, với mục tiêu:

- 📚 **Luyện đề hiệu quả**: Kho đề thi đa dạng, hỗ trợ 8+ môn học
- 🎮 **Gamification**: Hệ thống XP, huy hiệu, bảng xếp hạng tạo động lực học tập
- ⚔️ **Đấu trường realtime**: Thi đấu trực tiếp với bạn bè
- 📺 **Live class**: Học trực tiếp qua YouTube Live tích hợp

### Đối Tượng Sử Dụng

| Vai trò | Chức năng chính |
|---------|-----------------|
| **Học sinh** | Làm đề, xem kết quả, tham gia đấu trường, nhận thành tích |
| **Giáo viên** | Tạo đề, quản lý ngân hàng câu hỏi, xem thống kê, live dạy |
| **Admin** | Quản lý toàn hệ thống, cấu hình |

---

## ✨ Tính Năng

### 👩‍🎓 Dành Cho Học Sinh

| Tính năng | Mô tả |
|-----------|-------|
| **Dashboard** | Tổng quan tiến độ học tập, XP, streak |
| **Làm đề thi** | Làm bài với timer, xem trước đề trên modal |
| **Xem kết quả** | Phân tích chi tiết từng câu đúng/sai |
| **Đấu trường** | Thi đấu realtime với người khác |
| **Thành tích** | Thu thập huy hiệu, danh hiệu đặc biệt |
| **Shop phần thưởng** | Đổi XP lấy quà |
| **Điểm danh hàng ngày** | Bonus XP mỗi ngày |
| **Thống kê cá nhân** | Biểu đồ tiến bộ theo thời gian |

### 👨‍🏫 Dành Cho Giáo Viên

| Tính năng | Mô tả |
|-----------|-------|
| **Dashboard** | Tổng quan đề thi, số lượng nộp bài |
| **Tạo đề thi** | Tạo đề thủ công hoặc upload PDF (AI trích xuất) |
| **Ngân hàng đề** | Quản lý, sửa, xóa đề thi |
| **Chấm bài** | Tự động chấm điểm, xem chi tiết bài nộp |
| **Đấu trường** | Tạo phòng thi đấu cho học sinh |
| **Thống kê** | Phân tích kết quả theo lớp, đề, câu hỏi |
| **YouTube Live** | Tích hợp live stream dạy học |
| **Thông báo** | Gửi thông báo đến học sinh |

### 🌐 Tính Năng Chung

| Tính năng | Mô tả |
|-----------|-------|
| **Kho tài liệu** | Upload và chia sẻ tài liệu PDF |
| **Dark mode** | Giao diện sáng/tối |
| **Responsive** | Tương thích mobile/tablet/desktop |
| **PWA** | Cài đặt như app native |
| **Realtime** | Cập nhật dữ liệu tức thì |
| **Multi-language** | Hỗ trợ tiếng Việt |

---

## 🛠 Công Nghệ Sử Dụng

### Frontend
| Công nghệ | Phiên bản | Mục đích |
|-----------|-----------|----------|
| **Next.js** | 16.1 | Framework React với App Router |
| **React** | 19.0 | UI Library |
| **TypeScript** | 5.x | Type-safe JavaScript |
| **Tailwind CSS** | 4.x | Styling |
| **Lucide Icons** | Latest | Icon library |
| **Recharts** | Latest | Biểu đồ thống kê |

### Backend & Database
| Công nghệ | Mục đích |
|-----------|----------|
| **Supabase** | BaaS (Auth, Database, Storage, Realtime) |
| **PostgreSQL** | Database |
| **Row Level Security** | Bảo mật dữ liệu |
| **Edge Functions** | Serverless functions |

### AI & APIs
| Service | Mục đích |
|---------|----------|
| **Google Gemini** | Trích xuất câu hỏi từ PDF |
| **YouTube Data API** | Live streaming |

### Deployment
| Platform | Mục đích |
|----------|----------|
| **Vercel** | Frontend hosting |
| **Supabase Cloud** | Database hosting |
| **GitHub** | Source control |

---

## 📁 Cấu Trúc Dự Án

```
exam-system/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (pages)/           # Route groups
│   │   │   ├── student/       # Trang học sinh
│   │   │   ├── teacher/       # Trang giáo viên
│   │   │   ├── arena/         # Đấu trường
│   │   │   ├── live/          # Live class
│   │   │   └── resources/     # Kho tài liệu
│   │   ├── api/               # API Routes
│   │   └── layout.tsx         # Root layout
│   │
│   ├── components/            # React Components
│   │   ├── ui/               # Base UI (Button, Card, Input...)
│   │   ├── gamification/     # XP, Achievements, Rewards
│   │   ├── realtime/         # Live features
│   │   └── shared/           # Reusable components
│   │
│   └── lib/                  # Utilities
│       ├── supabase/         # Supabase client
│       ├── gamification.ts   # XP, Level logic
│       └── subjects.ts       # Subject config
│
├── public/                   # Static assets
├── migrations/               # SQL migrations
└── package.json
```

---

## 🚀 Hướng Dẫn Cài Đặt

### Yêu Cầu Hệ Thống
- Node.js 18+
- npm hoặc yarn
- Tài khoản Supabase

### Bước 1: Clone Project
```bash
git clone https://github.com/ptan12209-cmyk/exam-system.git
cd exam-system
```

### Bước 2: Cài Dependencies
```bash
npm install
```

### Bước 3: Cấu Hình Environment
Tạo file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### Bước 4: Chạy Migrations
Chạy các file SQL trong thư mục gốc theo thứ tự trong Supabase SQL Editor.

### Bước 5: Chạy Development Server
```bash
npm run dev
```

Truy cập: `http://localhost:3000`

---

## 👤 Tài Khoản Demo

| Vai trò | Email | Password |
|---------|-------|----------|
| Giáo viên | teacher@demo.com | demo123 |
| Học sinh | student@demo.com | demo123 |

---

## 📡 API Reference

### Authentication
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/auth/signup` | POST | Đăng ký |
| `/api/auth/login` | POST | Đăng nhập |

### Gamification
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/achievements` | GET/POST | Thành tích |
| `/api/rewards` | GET/POST | Phần thưởng |
| `/api/daily-checkin` | POST | Điểm danh |
| `/api/challenges` | GET | Thử thách |
| `/api/titles` | GET | Danh hiệu |

### Content
| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/api/extract-questions` | POST | AI trích xuất câu hỏi từ PDF |
| `/api/upload-avatar` | POST | Upload ảnh đại diện |
| `/api/send-notification` | POST | Gửi thông báo |

---

## 🗄 Database Schema

### Bảng Chính

```
profiles          # Thông tin người dùng
├── id (FK → auth.users)
├── role (teacher/student)
├── full_name
├── class
├── xp, level
└── avatar_url

exams             # Đề thi
├── id
├── teacher_id (FK → profiles)
├── title, description
├── duration, total_questions
├── subject, status
└── is_scheduled, start_time, end_time

questions         # Câu hỏi
├── id
├── exam_id (FK → exams)
├── question_text
├── options (jsonb)
├── correct_answer
└── order_index

submissions       # Bài nộp
├── id
├── exam_id (FK → exams)
├── student_id (FK → profiles)
├── answers (jsonb)
├── score
└── time_spent

arena_sessions    # Phòng đấu trường
├── id
├── host_id
├── exam_id
├── status
└── started_at

notifications     # Thông báo
├── id
├── user_id
├── title, message
├── type
└── is_read
```

### Bảng Gamification

```
achievements      # Huy hiệu
user_achievements # Huy hiệu đã đạt
rewards           # Phần thưởng trong shop
user_rewards      # Phần thưởng đã đổi
daily_checkins    # Lịch sử điểm danh
user_titles       # Danh hiệu đã đạt
```

---

## 📸 Screenshots

### Trang Landing
- Hero section với gradient animation
- Features showcase
- Call-to-action

### Dashboard Học Sinh
- Stats cards (XP, Streak, Đề đã làm)
- Biểu đồ tiến độ
- Đề thi gần đây

### Dashboard Giáo Viên
- Thống kê tổng quan
- Quản lý đề thi
- Danh sách bài nộp

### Đấu Trường
- Realtime leaderboard
- Countdown timer
- Live participants

---

## 📊 Thống Kê Dự Án

| Metric | Giá trị |
|--------|---------|
| Tổng số trang | 39+ |
| Components | 50+ |
| API endpoints | 15+ |
| Database tables | 20+ |
| Lines of code | ~25,000 |

---

## 🔮 Roadmap

### Đã Hoàn Thành ✅
- [x] Authentication (Login/Register)
- [x] CRUD Đề thi & Câu hỏi
- [x] Làm bài & Chấm điểm tự động
- [x] Gamification (XP, Level, Achievements)
- [x] Đấu trường Realtime
- [x] Kho tài liệu
- [x] YouTube Live integration
- [x] Dark mode
- [x] Mobile responsive

### Đang Phát Triển 🚧
- [ ] Giải thích đáp án
- [ ] Thử thách hàng ngày nâng cao
- [ ] Push notifications

### Kế Hoạch 📋
- [ ] AI phân tích điểm yếu
- [ ] Nhóm học tập
- [ ] Mobile app (React Native)
- [ ] Marketplace đề thi

---

## 🤝 Đóng Góp

Mọi đóng góp đều được chào đón! Vui lòng:
1. Fork dự án
2. Tạo branch mới (`git checkout -b feature/AmazingFeature`)
3. Commit thay đổi (`git commit -m 'Add AmazingFeature'`)
4. Push lên branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

---

## 📄 License

Dự án được phân phối dưới giấy phép MIT. Xem `LICENSE` để biết thêm chi tiết.

---

## 📞 Liên Hệ

**Developer**: Ptan12209  
**Email**: ptan12209@gmail.com  
**GitHub**: [@ptan12209-cmyk](https://github.com/ptan12209-cmyk)

---

<p align="center">
  Made with ❤️ by ExamHub Team
</p>
