# 🎓 ExamHub - Hệ Thống Thi Trắc Nghiệm Online

> Nền tảng giao bài, làm bài, chấm điểm và quản lý học sinh trực tuyến

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16.1-black.svg)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)
![License](https://img.shields.io/badge/license-MIT-yellow.svg)

---

## 📋 Mục Lục

- [Giới Thiệu](#-giới-thiệu)
- [Tính Năng](#-tính-năng)
- [Công Nghệ](#-công-nghệ-sử-dụng)
- [Cấu Trúc Dự Án](#-cấu-trúc-chi-tiết-toàn-bộ-dự-án-all-in-one-repo-structure)
- [Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
- [Tài Khoản Demo](#-tài-khoản-demo)
- [API Reference](#-api-reference)
- [Database Schema](#-database-schema)
- [Screenshots](#-screenshots)

---

## 🌟 Giới Thiệu

**ExamHub** là hệ thống thi trắc nghiệm online được thiết kế dành cho giáo viên và học sinh, với mục tiêu:

- 📚 **Luyện đề hiệu quả**: Kho đề thi đa dạng, hỗ trợ 8+ môn học
- 👥 **Quản lý học sinh**: Liên kết tài khoản, giao nhiệm vụ và theo dõi kết quả
- ⚔️ **Đấu trường realtime**: Thi đấu trực tiếp với bạn bè
- 📊 **Phân tích kết quả**: Phổ điểm, bài nộp và thống kê theo từng đề

### Đối Tuyên Sử Dụng

| Vai trò | Chức năng chính |
|---------|-----------------|
| **Học sinh** | Nhận đề, làm bài, xem kết quả và theo dõi tiến độ |
| **Giáo viên** | Tạo/giao đề, quản lý học sinh, chấm bài và xem thống kê |
| **Admin** | Quản lý toàn hệ thống, cấu hình |

---

## 🔒 Trạng Thái Sản Phẩm

Repo hiện chạy ở chế độ **core exam** (`ONLINE_STUDY_ENABLED = false` trong
`src/lib/features.ts`). Các trang/API khóa học video, học liệu, live/co-study và
thanh toán khóa học được giữ lại trong mã nguồn nhưng bị chặn ở middleware.

Các luồng đang mở: đăng nhập bằng tài khoản giáo viên cấp, dashboard, đề thi,
ngân hàng câu hỏi, làm bài, chấm điểm, thống kê, đấu trường,
checklist/thời khóa biểu và quản lý học sinh.

---

## ✨ Tính Năng

### 👩‍🎓 Dành Cho Học Sinh

| Tính năng | Mô tả |
|-----------|-------|
| **Dashboard** | Tổng quan đề được giao, bài đã làm và điểm số |
| **Làm đề thi** | Làm bài với timer, xem trước đề trên modal |
| **Xem kết quả** | Phân tích chi tiết từng câu đúng/sai |
| **Đấu trường** | Thi đấu realtime với người khác |
| **Thống kê cá nhân** | Biểu đồ tiến bộ theo thời gian |
| **Checklist** | Theo dõi nhiệm vụ giáo viên giao |
| **Thời khóa biểu** | Xem lịch học và lịch kiểm tra |

### 👨‍🏫 Dành Cho Giáo Viên

| Tính năng | Mô tả |
|-----------|-------|
| **Dashboard** | Tổng quan đề thi, số lượng nộp bài |
| **Tạo đề thi** | Upload PDF đề và nạp một JSON đáp án gồm trắc nghiệm, đúng/sai, trả lời ngắn |
| **Ngân hàng đề** | Quản lý, sửa, xóa đề thi |
| **Chấm bài** | Tự động chấm điểm, xem chi tiết bài nộp |
| **Quản lý học sinh** | Cấp/khóa tài khoản, giao nhiệm vụ và theo dõi tiến độ |
| **Đấu trường** | Tạo phòng thi đấu cho học sinh |
| **Thống kê** | Phân tích kết quả theo lớp, đề, câu hỏi |
| **Thông báo** | Gửi thông báo đến học sinh |

### 🌐 Tính Năng Chung

| Tính năng | Mô tả |
|-----------|-------|
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

### API tích hợp
| Service | Mục đích |
|---------|----------|
| **Supabase Auth Admin** | Giáo viên cấp và quản lý tài khoản học sinh |

### Deployment
| Platform | Mục đích |
|----------|----------|
| **Vercel** | Frontend hosting |
| **Supabase Cloud** | Database hosting |
| **GitHub** | Source control |

---

## 📁 Cấu Trúc Chi Tiết Toàn Bộ Dự Án (All-in-One Repo Structure)

Mã nguồn dự án được tổ chức dạng Monorepo tích hợp Frontend Next.js App Router, API Backend, Supabase và các công cụ giám sát học sinh.

```
exam-system/
├── supabase-core-exam.sql                # SQL duy nhất rebuild database core exam
├── migrations/                           # Lưu trữ toàn bộ các tệp Migrations của Supabase PostgreSQL
│   ├── combined_database_schema.sql      # Schema CSDL hợp nhất toàn hệ thống
│   ├── migration-checklist-timetable.sql # Khởi tạo bảng checklist và thời khóa biểu gốc
│   ├── migration-linked-timetable-rls.sql# Phân quyền RLS cho giáo viên/học sinh/phụ huynh liên kết
│   ├── migration-rewards-shop.sql        # Di chuyển bảng tích lũy điểm thưởng và đổi quà
│   ├── migration-timetable-bot-tracking.sql # Bảng nhật ký học tập và RLS cho Bot giám sát
│   ├── migration-youtube-live.sql        # Cấu hình buổi dạy YouTube Live
│   └── supabase-schema.sql               # Các hàm SQL và trigger tự động cập nhật XP/Streak
│
├── scripts/
│   └── discord-bot/                      # Discord Bot giám sát phòng voice & thời khóa biểu
│       ├── commands/                     # 21 Lệnh Slash quản trị (taode, taode-ai, phantich, diemdanh...)
│       ├── handlers/                     # Handlers tương tác, VoiceState và TimetableScheduler
│       ├── utils/                        # Tiện ích kết nối Supabase CSDL, hằng số, Gemini API
│       ├── expressServer.js              # Server Express API giao tiếp Web-to-Bot
│       ├── index.js                      # Điểm khởi chạy chính của Bot
│       ├── tracker.js                    # Tracker theo dõi voice
│       └── README.md                     # Hướng dẫn chi tiết thiết lập và sử dụng Bot
│
├── src/                                  # Mã nguồn chính của ứng dụng Web Next.js 16+
│   ├── app/                              # App Router & API Endpoints
│   │   ├── (auth)/                       # Nhóm xác thực (Đăng nhập, Đăng ký)
│   │   ├── (pages)/                      # Các trang tĩnh giao diện chính
│   │   │   ├── arena/                    # Đấu trường realtime (/arena, /arena/[id]/result)
│   │   │   ├── live/                     # Trang học trực tuyến qua YouTube Live
│   │   │   ├── pricing/                  # Trang giá và thanh toán dịch vụ
│   │   │   ├── profile/                  # Trang thông tin tài khoản người dùng công khai
│   │   │   └── resources/                # Kho tài liệu học tập (/resources, /resources/upload)
│   │   ├── student/                      # Khu vực dành cho Học sinh
│   │   │   ├── X/                        # Dashboard & Thời khóa biểu tùy chỉnh của Học sinh X
│   │   │   │   ├── checklist/            # Dashboard checklist công việc
│   │   │   │   ├── dashboard/            # Dashboard học tập cá nhân hóa
│   │   │   │   └── timetable/            # Giao diện thời khóa biểu thông minh đồng bộ Supabase
│   │   │   ├── achievements/             # Xem huy hiệu học tập đã đạt được
│   │   │   ├── analytics/                # Biểu đồ radar, heatmap tiến trình học
│   │   │   ├── checklist/                # Nhiệm vụ hàng ngày, Pomodoro học sinh
│   │   │   ├── co-study/                 # Kênh tự học nhóm và kết nối
│   │   │   ├── dashboard/                # Dashboard học sinh chung
│   │   │   ├── exams/                    # Giao diện thi trắc nghiệm và kết quả thi cá nhân
│   │   │   ├── notifications/            # Hộp thư thông báo học tập
│   │   │   └── rewards/                  # Shop đổi điểm kinh nghiệm (XP) lấy quà
│   │   ├── teacher/                      # Khu vực dành cho Giáo viên
│   │   │   ├── analytics/                # Thống kê điểm số và tỉ lệ nộp bài của học sinh
│   │   │   ├── arena/                    # Bảng quản lý tạo phòng đấu trường thi đấu realtime
│   │   │   ├── dashboard/                # Dashboard điều hành của giáo viên
│   │   │   ├── exam-bank/                # Ngân hàng đề thi trắc nghiệm
│   │   │   ├── exams/                    # CRUD đề thi, chấm điểm và đài giám sát
│   │   │   ├── monitor/                  # Đài giám sát học voice & thời khóa biểu Discord học sinh
│   │   │   ├── question-bank/            # Quản lý ngân hàng câu hỏi
│   │   │   ├── study/                    # Cấu hình bài giảng học tập
│   │   │   └── timetable/                # Quản lý thời khóa biểu giảng dạy lớp học
│   │   ├── api/                          # Next.js API Routes (Backend)
│   │   │   ├── achievements/             # API quản lý và mở khóa danh hiệu
│   │   │   ├── arena/                    # API khởi tạo phòng đấu trường realtime
│   │   │   ├── challenges/               # API danh sách thử thách hàng ngày
│   │   │   ├── daily-checkin/            # API điểm danh tích lũy Streak
│   │   │   ├── exams/                    # API quản lý đề thi trắc nghiệm
│   │   │   ├── teacher/students/         # API giáo viên cấp và quản lý tài khoản học sinh
│   │   │   ├── parent/                   # API liên kết phụ huynh giám sát
│   │   │   ├── profile/                  # API cập nhật hồ sơ người dùng
│   │   │   ├── rewards/                  # API mua sắm quà bằng XP
│   │   │   ├── study-sessions/           # API đồng bộ dữ liệu Voice/Bot Discord và gửi cảnh báo
│   │   │   ├── study/                    # API quản lý giáo trình (chương, bài học, tài liệu)
│   │   │   ├── titles/                   # API trao danh hiệu đặc biệt
│   │   │   └── upload-avatar/            # API upload ảnh đại diện lên Supabase Storage
│   │   └── layout.tsx                # Giao diện khung chính (Root Layout)
│   │
│   ├── components/                       # Thư mục chứa các React Components dùng chung
│   │   ├── ui/                           # Base UI Components (button, card, dialog, progress...)
│   │   ├── checklist/                    # Widgets Pomodoro, Quote động lực, Lịch hôm nay
│   │   ├── exam/                         # Bộ làm bài trắc nghiệm (Digital question viewer, Anti-cheat...)
│   │   ├── gamification/                 # Hệ thống bảng xếp hạng (Leaderboard), check-in, shop quà
│   │   ├── proctoring/                   # Giám sát camera học sinh và theo dõi ánh mắt (Gaze tracker)
│   │   ├── pwa/                          # Banner cài đặt ứng dụng tiến trình PWA
│   │   ├── realtime/                     # Hiển thị số lượng học sinh tham gia realtime
│   │   └── shared/                       # Các component loading, stats card tái sử dụng
│   │
│   ├── data/                             # Dữ liệu tĩnh cục bộ (danh ngôn, cài đặt môn học)
│   ├── hooks/                            # Custom React Hooks (useAuth, usePdfUpload, useAnswerForm...)
│   ├── lib/                              # Thư viện tiện ích, cấu hình và lớp kết nối
│   │   ├── supabase/                     # Supabase clients (client.ts & server.ts)
│   │   ├── gamification/                 # Logic tính toán XP, Level, Huy hiệu, Streak
│   │   ├── answer-json.ts                # Kiểm tra và chuẩn hóa JSON đáp án 3 dạng câu hỏi
│   │   └── subjects.ts                   # Định nghĩa danh sách các môn học
│   └── services/                         # Tầng xử lý nghiệp vụ kết nối trực tiếp Supabase Database
│       ├── exam-server.ts                # Nghiệp vụ liên quan đến quản lý và chấm điểm đề thi
│       ├── scoring.ts                    # Công cụ chấm điểm trắc nghiệm tự động
│       └── user-server.ts                # Nghiệp vụ quản lý thông tin hồ sơ và vai trò học sinh
│
├── worker/                               # Health service cũ; không còn endpoint AI/PDF
│   ├── main.py                           # FastAPI health endpoint
│   └── requirements.txt                  # Dependencies tối thiểu
│
├── package.json                          # Tệp quản lý các dependencies và scripts chạy dự án Web
├── vercel.json                           # Cấu hình deploy ứng dụng Web lên Vercel Cloud
└── README.md                             # Tài liệu hướng dẫn sử dụng và phát triển dự án
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
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key # optional, Discord bot only
```

### Bước 4: Chạy Migrations
Sao lưu dữ liệu, sau đó chạy **duy nhất** file `supabase-core-exam.sql` trong
Supabase SQL Editor. File này xóa và tạo lại toàn bộ schema `public` nhưng không
xóa `auth.users` hay file trong Storage.

Trong Supabase Dashboard → Authentication, tắt **Allow new users to sign up**.
Nếu cần kích hoạt tài khoản giáo viên đầu tiên, chạy sau khi file SQL hoàn tất:

```sql
select public.promote_auth_user_to_teacher('teacher@example.com');
```

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
| `/api/auth/register` | POST | Luôn trả 403; đăng ký công khai bị khóa |
| `/api/teacher/students` | GET/POST/PATCH | Giáo viên cấp và khóa/mở tài khoản học sinh |

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
