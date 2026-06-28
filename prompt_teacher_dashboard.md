# 🎓 PROMPT — THIẾT KẾ TEACHER DASHBOARD (ExamHub Platform)

## ── ROLE ──────────────────────────────────────────────────────────────────────
Bạn là senior full-stack engineer kiêm UI/UX designer chuyên edtech SaaS.
Nhiệm vụ: thiết kế và implement **Teacher Dashboard** cho nền tảng ExamHub —
hệ thống thi trắc nghiệm online gamified dành cho giáo dục Việt Nam.

---

## ── TECH STACK CHÍNH XÁC ──────────────────────────────────────────────────────

| Layer | Công nghệ | Phiên bản |
|---|---|---|
| Framework | **Next.js** (App Router) | **16.1** |
| UI Library | **React** | **19.0** |
| Language | **TypeScript** | 5.x |
| Styling | **Tailwind CSS** | **4.x** |
| Icons | **Lucide React** | Latest |
| Charts | **Recharts** | Latest |
| Backend | **Supabase** (Auth + DB + Storage + Realtime) | Latest |
| Database | **PostgreSQL** + Row Level Security | — |
| AI | **Google Gemini API** | — |
| Streaming | **YouTube Data API** | — |
| PDF Worker | **Python FastAPI** (`worker/`) | — |
| Bot | **Discord Bot** (`scripts/discord-bot/`) | — |

> ⚠️ KHÔNG dùng shadcn/ui nếu chưa có trong dự án. Ưu tiên `components/ui/`
> đã có sẵn (button, card, dialog, progress...). KHÔNG thêm Framer Motion
> hay thư viện animation nặng trừ khi cần thiết.

---

## ── CẤU TRÚC THƯ MỤC THỰC TẾ ────────────────────────────────────────────────

```
exam-system/
├── src/
│   ├── app/
│   │   ├── teacher/                  ← KHU VỰC GIÁO VIÊN (implement tại đây)
│   │   │   ├── dashboard/            ← Dashboard tổng quan ✅ (cần nâng cấp)
│   │   │   ├── exams/                ← CRUD đề thi, chấm điểm, giám sát
│   │   │   ├── exam-bank/            ← Ngân hàng đề thi
│   │   │   ├── question-bank/        ← Ngân hàng câu hỏi riêng biệt
│   │   │   ├── analytics/            ← Thống kê điểm số, tỉ lệ nộp bài
│   │   │   ├── arena/                ← Tạo và quản lý phòng đấu trường
│   │   │   ├── monitor/              ← Giám sát Voice Discord + thời khóa biểu
│   │   │   ├── study/                ← Cấu hình bài giảng, chương, bài học
│   │   │   └── timetable/            ← Quản lý thời khóa biểu giảng dạy
│   │   └── api/
│   │       ├── exams/                ← API quản lý đề thi
│   │       ├── extract-questions/    ← AI trích xuất câu hỏi từ PDF (Gemini)
│   │       ├── arena/                ← API khởi tạo phòng đấu trường
│   │       ├── achievements/         ← API thành tích
│   │       ├── study/                ← API giáo trình (chương, bài học, tài liệu)
│   │       ├── study-sessions/       ← API đồng bộ Discord Bot + cảnh báo
│   │       ├── profile/              ← API hồ sơ người dùng
│   │       └── titles/               ← API danh hiệu đặc biệt
│   │
│   ├── components/
│   │   ├── ui/                       ← Base components có sẵn (DÙNG CÁI NÀY)
│   │   ├── exam/                     ← Bộ xem câu hỏi, anti-cheat
│   │   ├── gamification/             ← Leaderboard, check-in, shop
│   │   ├── realtime/                 ← Số lượng học sinh tham gia realtime
│   │   └── shared/                   ← Loading, stats card tái sử dụng
│   │
│   ├── lib/
│   │   ├── supabase/                 ← client.ts & server.ts (IMPORT TỪ ĐÂY)
│   │   ├── gamification/             ← Logic XP, Level, Huy hiệu, Streak
│   │   └── subjects.ts               ← Danh sách môn học (IMPORT TỪ ĐÂY)
│   │
│   ├── services/
│   │   ├── exam-server.ts            ← Nghiệp vụ đề thi, chấm điểm
│   │   └── user-server.ts            ← Nghiệp vụ hồ sơ, vai trò
│   │
│   └── hooks/                        ← useAuth, usePdfUpload, useAnswerForm...
│
└── worker/
    ├── main.py                        ← FastAPI server nhận file PDF
    ├── gemini_service.py              ← Gọi Gemini phân tích đề thi
    └── pdf_parser.py                  ← Đọc văn bản từ PDF
```

---

## ── DATABASE SCHEMA THỰC TẾ ─────────────────────────────────────────────────

```sql
-- Bảng chính (đã tồn tại, KHÔNG tạo lại)

profiles                  -- Thông tin người dùng
  id          UUID  FK → auth.users
  role        TEXT  -- 'teacher' | 'student'
  full_name   TEXT
  class       TEXT
  xp          INT
  level       INT
  avatar_url  TEXT

exams                     -- Đề thi
  id                UUID
  teacher_id        UUID  FK → profiles
  title             TEXT
  description       TEXT
  duration          INT   -- phút
  total_questions   INT
  subject           TEXT
  status            TEXT  -- 'draft' | 'published' | 'archived'
  is_scheduled      BOOL
  start_time        TIMESTAMPTZ
  end_time          TIMESTAMPTZ

questions                 -- Câu hỏi
  id              UUID
  exam_id         UUID  FK → exams
  question_text   TEXT  -- hỗ trợ LaTeX
  options         JSONB -- mảng 4 đáp án
  correct_answer  INT   -- index 0-3
  order_index     INT

submissions               -- Bài nộp
  id          UUID
  exam_id     UUID  FK → exams
  student_id  UUID  FK → profiles
  answers     JSONB
  score       NUMERIC
  time_spent  INT   -- giây

arena_sessions            -- Phòng đấu trường
  id          UUID
  host_id     UUID  FK → profiles  -- teacher
  exam_id     UUID  FK → exams
  status      TEXT  -- 'waiting' | 'active' | 'ended'
  started_at  TIMESTAMPTZ

notifications
  id        UUID
  user_id   UUID  FK → profiles
  title     TEXT
  message   TEXT
  type      TEXT
  is_read   BOOL

-- Bảng Gamification
achievements        -- Định nghĩa huy hiệu
user_achievements   -- Huy hiệu đã đạt (user_id, achievement_id)
rewards             -- Phần thưởng trong shop
user_rewards        -- Phần thưởng đã đổi
daily_checkins      -- Lịch sử điểm danh
user_titles         -- Danh hiệu đặc biệt đã đạt
```

---

## ── API ROUTES ĐÃ CÓ SẴN ────────────────────────────────────────────────────

```typescript
// Sử dụng các route có sẵn này, KHÔNG tạo lại:

POST   /api/extract-questions   // AI (Gemini) trích xuất câu hỏi từ PDF
GET    /api/exams               // Danh sách đề thi của giáo viên
POST   /api/exams               // Tạo đề thi mới
GET    /api/exams/[id]          // Chi tiết đề thi
PUT    /api/exams/[id]          // Cập nhật đề thi
DELETE /api/exams/[id]          // Xóa đề thi

POST   /api/arena               // Khởi tạo phòng đấu trường

GET    /api/achievements        // Danh sách thành tích
POST   /api/achievements        // Trao thành tích

GET    /api/study               // Danh sách bài giảng/giáo trình
POST   /api/study               // Tạo bài giảng mới

GET    /api/study-sessions      // Lịch sử phòng voice Discord học sinh
POST   /api/titles              // Trao danh hiệu đặc biệt

POST   /api/upload-avatar       // Upload ảnh đại diện
POST   /api/profile             // Cập nhật hồ sơ
```

---

## ── DESIGN SYSTEM ───────────────────────────────────────────────────────────

### Palette
| Token | Hex | Dùng cho |
|---|---|---|
| Primary | `#1A56DB` | Button chính, active state, link |
| Accent | `#F59E0B` | XP, điểm nhấn gamification, badge |
| Surface | `#F8FAFF` | Background trang |
| Sidebar | `#0F172A` | Background sidebar |
| Sidebar hover | `#1E293B` | Nav item hover |
| Active indicator | `#F59E0B` | 4px border-left nav item đang chọn |
| Success | `#10B981` | Điểm cao, pass |
| Warning | `#F59E0B` | Cần chú ý |
| Danger | `#EF4444` | Điểm thấp, lỗi |
| Text | `#111827` | Nội dung chính |
| Muted | `#6B7280` | Nhãn phụ, timestamp |

### Typography
- **Heading:** `font-bold` (Inter hệ thống, weight 700)
- **Body:** `font-normal` / `font-medium`
- **Số liệu/điểm:** `font-mono` (JetBrains Mono hoặc monospace)
- Scale: `text-xs` · `text-sm` · `text-base` · `text-lg` · `text-2xl` · `text-4xl`

### Signature Element
Dark sidebar (`#0F172A`) tương phản mạnh với main area sáng.
Active nav item: `border-l-4 border-amber-400 bg-slate-800 text-white`.

---

## ── LAYOUT TỔNG THỂ ────────────────────────────────────────────────────────

```
┌──────────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed, dark #0F172A)    │  MAIN AREA            │
│                                         │                        │
│  [Logo ExamHub]                         │  TOPBAR               │
│  ─────────────────                      │  breadcrumb + notif   │
│  ● Dashboard        ←active             │  + avatar             │
│  ● Đề Thi                               │  ─────────────────    │
│  ● Ngân Hàng Đề                         │                        │
│  ● Ngân Hàng Câu Hỏi                    │  PAGE CONTENT         │
│  ● Thống Kê                             │                        │
│  ● Đấu Trường                           │                        │
│  ● Giám Sát Discord                     │                        │
│  ● Bài Giảng                            │                        │
│  ● Thời Khóa Biểu                       │                        │
│  ─────────────────                      │                        │
│  ● YouTube Live     (link ngoài)        │                        │
│  ─────────────────                      │                        │
│  [Avatar + Tên GV]                      │                        │
└──────────────────────────────────────────────────────────────────┘
```

Sidebar collapse thành icon-only ở `lg:` breakpoint.
Dưới `md:`: ẩn sidebar, dùng top navigation bar.

---

## ── TRANG 1: `/teacher/dashboard` ──────────────────────────────────────────

**File:** `src/app/teacher/dashboard/page.tsx`
**Mục đích:** Snapshot nhanh — giáo viên biết ngay hôm nay cần làm gì.

### Row 1 — 4 KPI Cards
```
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ 📝 Đề Thi     │ │ 📬 Bài Nộp   │ │ 👥 Học Sinh   │ │ ⚔️ Đấu Trường │
│ đã tạo        │ │ chưa xem      │ │ đang hoạt động│ │ tuần này      │
│ [NUMBER]      │ │ [NUMBER]      │ │ [NUMBER]      │ │ [NUMBER]      │
│ +3 tuần này   │ │ 12 mới hôm nay│ │ 87% active    │ │ 2 sắp diễn ra │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```
Query:
```typescript
// Đề thi của giáo viên
const { data: exams } = await supabase
  .from('exams')
  .select('id, status, created_at')
  .eq('teacher_id', teacherId);

// Bài nộp chưa xem (submissions mới trong 24h)
const { data: newSubmissions } = await supabase
  .from('submissions')
  .select('id, created_at, exam_id')
  .in('exam_id', examIds)
  .gte('created_at', new Date(Date.now() - 86400000).toISOString());
```

### Row 2 — 2 cột (7:5)

**Trái (60%) — Biểu Đồ Hoạt Động 7 Ngày** (Recharts LineChart)
- Line 1: "Số bài nộp" (màu `#1A56DB`)
- Line 2: "Học sinh tham gia" (màu `#F59E0B`)
- X-axis: ngày trong tuần, Y-axis: số lượng
- Tooltip card với rounded-lg

**Phải (40%) — Phân Phối Điểm** (Recharts PieChart/DonutChart)
- 5 phần: Xuất sắc (≥9) · Giỏi (7-8.9) · Khá (5-6.9) · TB (3-4.9) · Yếu (<3)
- Center donut: điểm trung bình chung
- Legend dạng list bên dưới chart

### Row 3 — 2 cột (1:1)

**Trái — Đề Thi Gần Đây**
- List 5 đề mới nhất từ `exams` table
- Mỗi item: badge môn học + tên đề + số câu + trạng thái + nút xem
- "Xem tất cả" → `/teacher/exams`

**Phải — Bài Nộp Mới Nhất**
- List submissions mới từ `submissions` join `profiles` (student name) join `exams` (exam title)
- Mỗi item: avatar học sinh + tên + đề thi + điểm + timestamp
- "Xem tất cả" → `/teacher/analytics`

### Row 4 — Phòng Đấu Trường Sắp Diễn Ra
- Lấy từ `arena_sessions` có `status = 'waiting'`
- Card ngang: tên đề + giờ bắt đầu + số lượng người đăng ký
- Button: "Mở phòng" / "Xem chi tiết"

---

## ── TRANG 2: `/teacher/exams` — Quản Lý Đề Thi ────────────────────────────

**Files:**
- `src/app/teacher/exams/page.tsx` — danh sách
- `src/app/teacher/exams/[id]/page.tsx` — chi tiết + chấm điểm
- `src/app/teacher/exams/new/page.tsx` — tạo mới

### Header
```
[🔍 Tìm kiếm]  [Môn học ▼]  [Trạng thái ▼]  [Ngày ▼]     [+ Tạo Đề Mới]
```

### Exam Card Grid (3 cols desktop / 2 tablet / 1 mobile)
```
┌──────────────────────────────────────┐
│ [Toán] [Đang mở]              [⋮]   │
│                                      │
│ Kiểm Tra Giữa Kỳ — Giải Tích        │
│ 40 câu · 90 phút                     │
│                                      │
│ 📬 124 bài nộp · ⭐ Điểm TB: 6.8    │
│ 📅 Lịch thi: 15/06 14:00 – 15:30    │
│                                      │
│ [Xem bài nộp]  [Sửa]  [Tạo Arena]  │
└──────────────────────────────────────┘
```
- Badge môn: màu khác nhau theo `subjects.ts`
- Badge trạng thái: `draft`=gray, `published`=green, `archived`=slate
- Menu `⋮`: Sửa · Xem trước · Tạo phòng Arena · Xóa

### Tạo Đề Mới — 2 Phương Thức (Tabs)

**Tab 1: Tạo Thủ Công**
- Form: Tiêu đề · Môn học · Mô tả · Thời gian · Lịch thi (toggle `is_scheduled`)
- Thêm câu hỏi: inline editor, hỗ trợ LaTeX trong `question_text`
- Drag-to-reorder câu hỏi (cập nhật `order_index`)

**Tab 2: Upload PDF → AI Trích Xuất**
```
┌────────────────────────────────────────────────────┐
│  📄 Kéo thả hoặc chọn file PDF đề thi              │
│                                                    │
│  [Chọn File PDF]                                   │
│                                                    │
│  → Gửi tới Python Worker (worker/main.py)          │
│  → Gemini phân tích nội dung                       │
│  → POST /api/extract-questions                     │
│  → Hiện kết quả để review trước khi lưu            │
└────────────────────────────────────────────────────┘
```
```typescript
// hooks/usePdfUpload.ts (đã có) — dùng hook này
const { upload, isLoading, questions } = usePdfUpload();

// Gọi API extract
const response = await fetch('/api/extract-questions', {
  method: 'POST',
  body: formData  // file PDF
});
const { questions } = await response.json();
// Hiện questions để giáo viên review/sửa trước khi lưu
```

### Chi Tiết Đề — Tabs
- **Tab Câu Hỏi:** list câu, edit inline
- **Tab Bài Nộp:** table submissions (tên học sinh, điểm, thời gian làm, ngày nộp)
- **Tab Thống Kê:** phân phối điểm + top câu sai nhiều nhất (từ `answers` JSONB)

---

## ── TRANG 3: `/teacher/exam-bank` — Ngân Hàng Đề Thi ──────────────────────

**File:** `src/app/teacher/exam-bank/page.tsx`

Khác với `/teacher/exams` (quản lý đề đang dùng), đây là **kho lưu trữ** đề thi
đã archive hoặc của cộng đồng giáo viên.

### Layout
- Search + Filter (môn, độ khó, lớp, năm học)
- Grid cards tương tự `/teacher/exams` nhưng có thêm:
  - Badge "Của tôi" vs "Công khai"
  - Button "Nhân bản" → tạo copy mới để chỉnh sửa
  - Rating / số lượt dùng

---

## ── TRANG 4: `/teacher/question-bank` — Ngân Hàng Câu Hỏi ────────────────

**File:** `src/app/teacher/question-bank/page.tsx`

Quản lý câu hỏi **riêng lẻ** (tách khỏi đề cụ thể), tái sử dụng cho nhiều đề.

### Layout
```
[Tìm kiếm]  [Môn ▼]  [Chủ đề ▼]  [Độ khó ▼]     [+ Thêm Câu Hỏi]
─────────────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────────┐
│ #001  [Toán] [Dễ]                                               │
│                                                                  │
│ Tính đạo hàm của f(x) = x³ - 3x² + 2x + 1                     │
│ (LaTeX render inline)                                            │
│                                                                  │
│ A. 3x²-6x+2  B. 3x²-3x  C. x²-6x+2  D. 3x-6                  │
│                                    ✅ Đáp án: A                  │
│ [Sửa]  [Xóa]  [Thêm vào đề...]                                 │
└─────────────────────────────────────────────────────────────────┘
```
- Bulk select + thêm vào đề thi đang tạo
- Import câu từ file CSV/JSON

---

## ── TRANG 5: `/teacher/analytics` — Thống Kê ──────────────────────────────

**File:** `src/app/teacher/analytics/page.tsx`

### Filter Bar
- Date range picker + Chọn đề thi + Chọn lớp/nhóm học sinh

### Row 1 — Tổng Quan Nhanh (4 cards)
- Tổng bài nộp trong kỳ · Pass rate · Điểm TB · Tỉ lệ nộp đúng hạn

### Row 2 — Phân Tích Per Đề (Accordion)
Mỗi đề expand ra:
- Histogram phân phối điểm (Recharts BarChart)
- Table top 10 câu có tỉ lệ sai cao nhất
  - Tính từ `submissions.answers` JSONB: `answers[i] !== questions[i].correct_answer`

### Row 3 — Heatmap Lớp × Đề
- X-axis: tên đề thi · Y-axis: tên lớp (hoặc nhóm học sinh)
- Cell: điểm trung bình, màu gradient đỏ→vàng→xanh
- Dùng Recharts hoặc CSS grid tự tạo

### Row 4 — Bảng Xếp Hạng Học Sinh (theo giáo viên này)
- Sort theo điểm TB · Số bài nộp · XP kiếm được
- Export CSV button (tạo Blob + download)

---

## ── TRANG 6: `/teacher/arena` — Quản Lý Đấu Trường ───────────────────────

**File:** `src/app/teacher/arena/page.tsx`

### Danh Sách Arena Sessions
- Filter: `waiting` / `active` / `ended`
- Lấy từ `arena_sessions` where `host_id = teacherId`

### Card Arena
```
┌──────────────────────────────────────────────────┐
│ ⚔️ Arena Toán 12 — Giữa Kỳ         [🔴 LIVE]   │
│ Đề: Kiểm Tra Giải Tích · 40 câu · 90 phút       │
│ Bắt đầu: 15/06/2025 20:00                        │
│ 34 học sinh đang tham gia                        │
│                                                  │
│ [Vào Điều Khiển]  [Kết Thúc]  [Xem Kết Quả]   │
└──────────────────────────────────────────────────┘
```

### Tạo Phòng Mới — Modal / Wizard 3 bước
1. **Chọn đề thi** — dropdown từ `exams` của giáo viên
2. **Cài đặt** — thời gian bắt đầu, có đặt lịch không, thứ tự câu ngẫu nhiên
3. **Xác nhận** — hiện tóm tắt + button "Tạo Phòng"

```typescript
// Gọi API tạo arena
const response = await fetch('/api/arena', {
  method: 'POST',
  body: JSON.stringify({ exam_id, start_time, settings })
});
// Nhận lại arena_session.id để share link với học sinh
```

### Arena Control Panel (Full Screen — khi click "Vào Điều Khiển")
```
┌──────────────────────────────────────────────────────────────────┐
│ [🔴 LIVE] Arena Toán 12          Bắt đầu: 20:00  Còn: 00:47:32 │
├──────────────────────────────┬───────────────────────────────────┤
│  LEADERBOARD REALTIME        │  THỐNG KÊ PHÒNG                  │
│                              │                                   │
│  1. 👑 Hà Linh    92đ ⚡     │  Đang online: 🟢 34/35           │
│  2.    Minh Tuấn  88đ        │  Đã nộp: 28                      │
│  3.    Bảo Châu   85đ        │  Đang làm: 6                     │
│  ...                         │                                   │
│  [35 người]                  │  [Kết Thúc Sớm]                  │
└──────────────────────────────┴───────────────────────────────────┘
```
Realtime subscription:
```typescript
// components/realtime/ đã có sẵn pattern này
supabase
  .channel(`arena:${arenaSessionId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'submissions',
    filter: `arena_session_id=eq.${arenaSessionId}`
  }, handleNewSubmission)
  .subscribe();
```

---

## ── TRANG 7: `/teacher/monitor` — Giám Sát Discord ───────────────────────

**File:** `src/app/teacher/monitor/page.tsx`

Hiển thị dữ liệu từ **Discord Bot** (`scripts/discord-bot/`) ghi vào Supabase.
Bot theo dõi học sinh trong voice channel → lưu vào `study_sessions` table.

### Layout
```
┌──────────────────────────────────────────────────────────────────┐
│  📡 Giám Sát Học Voice Discord           Cập nhật: vừa xong    │
├──────────────────────────────────────────────────────────────────┤
│  ĐANG ONLINE (12 học sinh)                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ 🟢 Nam   │ │ 🟢 Linh │ │ 🟢 Tuấn │ │ 🔴 Châu │           │
│  │ 1h 24m   │ │ 45m      │ │ 2h 01m  │ │ offline  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
├──────────────────────────────────────────────────────────────────┤
│  LỊCH SỬ HỌC HÔM NAY                                           │
│  Học sinh     Vào       Ra        Tổng       Ghi chú            │
│  Minh Tuấn   08:00    10:05     2h 05m      ─                  │
│  Hà Linh     09:30    10:00     30m         rời sớm ⚠️          │
└──────────────────────────────────────────────────────────────────┘
```

```typescript
// Lấy dữ liệu từ API đồng bộ Discord Bot
const sessions = await fetch('/api/study-sessions').then(r => r.json());
// study-sessions API đọc từ Supabase table do Bot ghi vào
```

### Hành Động Giáo Viên
- Gửi cảnh báo đến học sinh không vào học (POST `/api/study-sessions` với `action: 'alert'`)
- Xem thống kê tuần: ai học nhiều nhất, ai ít tham gia

---

## ── TRANG 8: `/teacher/study` — Cấu Hình Bài Giảng ───────────────────────

**File:** `src/app/teacher/study/page.tsx`

Tổ chức nội dung dạy học theo cấu trúc: **Môn học → Chương → Bài học → Tài liệu**.

### Sidebar trái — Cây thư mục
```
📚 Toán 12
  📁 Chương 1: Hàm số
    📄 Bài 1.1: Khái niệm
    📄 Bài 1.2: Đồ thị
  📁 Chương 2: Đạo hàm
    📄 Bài 2.1: Định nghĩa
```

### Panel phải — Nội dung bài học
- Editor text + upload tài liệu PDF (link tới Supabase Storage)
- Liên kết đề thi kiểm tra bài học này
- Gán YouTube Live session cho bài học

```typescript
// Sử dụng /api/study để CRUD chương/bài học
const chapters = await fetch('/api/study?subject=math').then(r => r.json());
```

---

## ── TRANG 9: `/teacher/timetable` — Thời Khóa Biểu ──────────────────────

**File:** `src/app/teacher/timetable/page.tsx`

### Giao Diện Lịch Tuần
```
        Thứ 2   Thứ 3   Thứ 4   Thứ 5   Thứ 6   Thứ 7
07:00  │        │       │       │       │       │
08:00  │Toán 12A│       │Toán 12│       │Toán 12│
09:00  │        │Vật Lý │       │Vật Lý │       │
```
- Drag-to-create tiết học mới
- Click tiết → edit (lớp, phòng, ghi chú)
- Đồng bộ với `student/timetable` của học sinh (cùng DB table)
- Toggle: xem theo tuần / tháng

---

## ── COMPONENT ARCHITECTURE ─────────────────────────────────────────────────

```
src/
├── app/teacher/
│   ├── layout.tsx                  ← TeacherLayout (sidebar + topbar)
│   ├── dashboard/page.tsx          ← Tổng quan
│   ├── exams/
│   │   ├── page.tsx                ← Danh sách đề thi
│   │   ├── new/page.tsx            ← Tạo đề mới (manual + PDF upload)
│   │   └── [id]/page.tsx           ← Chi tiết + bài nộp + thống kê
│   ├── exam-bank/page.tsx          ← Ngân hàng đề
│   ├── question-bank/page.tsx      ← Ngân hàng câu hỏi
│   ├── analytics/page.tsx          ← Thống kê điểm + heatmap
│   ├── arena/page.tsx              ← Quản lý đấu trường
│   ├── monitor/page.tsx            ← Giám sát Discord voice
│   ├── study/page.tsx              ← Cấu hình bài giảng
│   └── timetable/page.tsx          ← Thời khóa biểu

└── components/teacher/             ← Tạo mới, đặt tại đây
    ├── TeacherSidebar.tsx
    ├── TeacherTopbar.tsx
    ├── KPICard.tsx
    ├── ActivityChart.tsx           ← Recharts LineChart
    ├── ScoreDistribution.tsx       ← Recharts PieChart
    ├── ExamCard.tsx
    ├── ExamFormModal.tsx           ← Tạo/sửa đề
    ├── PdfUploadPanel.tsx          ← Upload PDF + preview câu hỏi AI
    ├── SubmissionsTable.tsx
    ├── QuestionBankTable.tsx
    ├── AnalyticsHeatmap.tsx
    ├── ArenaCard.tsx
    ├── ArenaCreateModal.tsx
    ├── ArenaControlPanel.tsx       ← Realtime leaderboard
    ├── MonitorDashboard.tsx        ← Discord voice tracking
    ├── StudyTree.tsx               ← Cây chương/bài học
    └── TimetableGrid.tsx           ← Lịch dạy học tuần
```

---

## ── TÍCH HỢP YOUTUBE LIVE ──────────────────────────────────────────────────

Nút "📺 Bắt Đầu Live" trong sidebar mở tab `/live` (đã có trang này tại
`src/app/(pages)/live/`). Từ Teacher Dashboard, chỉ cần link tới.

```typescript
// Trong TeacherSidebar.tsx
<Link href="/live" target="_blank" rel="noopener">
  <YoutubeIcon /> YouTube Live
</Link>
```

---

## ── RLS POLICIES ────────────────────────────────────────────────────────────

```sql
-- Tất cả query phải filter theo teacher_id = auth.uid()
-- RLS đã được set trong Supabase, nhưng client code cũng phải filter đúng

-- Ví dụ query đúng:
const { data } = await supabase
  .from('exams')
  .select('*')
  .eq('teacher_id', user.id);   // ← BẮT BUỘC

-- Dùng supabase server client cho Server Components:
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

---

## ── QUALITY CHECKLIST ───────────────────────────────────────────────────────

- [ ] Import Supabase client từ `@/lib/supabase/client` hoặc `@/lib/supabase/server`
- [ ] Import danh sách môn học từ `@/lib/subjects.ts` (không hardcode)
- [ ] Dùng service functions từ `@/services/exam-server.ts` cho logic phức tạp
- [ ] Tất cả text tiếng Việt đúng dấu
- [ ] Loading skeleton cho mọi async data
- [ ] Empty state cho list rỗng (icon + hướng dẫn hành động)
- [ ] Toast notification sau mỗi action (success/error)
- [ ] Responsive: desktop sidebar, tablet icon-only, mobile top nav
- [ ] RLS: mọi query filter `teacher_id = auth.uid()`
- [ ] Error boundary với retry button

---

## ── THỨ TỰ IMPLEMENT ────────────────────────────────────────────────────────

1. `src/app/teacher/layout.tsx` — TeacherLayout + TeacherSidebar
2. `src/app/teacher/dashboard/page.tsx` — KPI + charts + recent activity
3. `src/app/teacher/exams/` — CRUD đề thi + PDF upload
4. `src/app/teacher/analytics/page.tsx` — Thống kê + heatmap
5. `src/app/teacher/arena/page.tsx` — Đấu trường + control panel
6. `src/app/teacher/question-bank/page.tsx` — Ngân hàng câu hỏi
7. `src/app/teacher/exam-bank/page.tsx` — Ngân hàng đề
8. `src/app/teacher/monitor/page.tsx` — Giám sát Discord
9. `src/app/teacher/study/page.tsx` — Bài giảng
10. `src/app/teacher/timetable/page.tsx` — Thời khóa biểu
