# 🧑‍🎓 PROMPT — THIẾT KẾ STUDENT DASHBOARD (ExamHub Platform)

## ── ROLE ──────────────────────────────────────────────────────────────────────
Bạn là senior full-stack engineer kiêm UI/UX designer chuyên edtech gamified.
Nhiệm vụ: thiết kế và implement **Student Dashboard** cho nền tảng ExamHub —
hệ thống thi trắc nghiệm online gamified dành cho học sinh Việt Nam cấp THCS/THPT.

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
| AI | **Google Gemini API** (dùng qua worker) | — |
| Bot | **Discord Bot** (`scripts/discord-bot/`) | — |

> ⚠️ KHÔNG dùng shadcn/ui nếu chưa có trong dự án. Ưu tiên `components/ui/`
> đã có sẵn. KHÔNG thêm thư viện animation nặng không cần thiết.

---

## ── CẤU TRÚC THƯ MỤC THỰC TẾ ────────────────────────────────────────────────

```
exam-system/
├── src/
│   ├── app/
│   │   ├── student/                      ← KHU VỰC HỌC SINH (implement tại đây)
│   │   │   │
│   │   │   ├── dashboard/                ← Dashboard học sinh chung
│   │   │   ├── exams/                    ← Giao diện thi + xem kết quả cá nhân
│   │   │   ├── achievements/             ← Huy hiệu đã đạt
│   │   │   ├── analytics/                ← Radar chart, heatmap tiến trình
│   │   │   ├── checklist/                ← Nhiệm vụ hàng ngày + Pomodoro
│   │   │   ├── co-study/                 ← Phòng tự học nhóm
│   │   │   ├── notifications/            ← Hộp thư thông báo
│   │   │   ├── rewards/                  ← Shop đổi XP lấy quà
│   │   │   │
│   │   │   └── X/                        ← Sub-dashboard cá nhân hóa (X = student ID)
│   │   │       ├── dashboard/            ← Dashboard cá nhân hóa sâu hơn
│   │   │       ├── checklist/            ← Checklist riêng của học sinh X
│   │   │       └── timetable/            ← Thời khóa biểu cá nhân
│   │   │
│   │   └── (pages)/
│   │       └── arena/                    ← Đấu trường (dùng chung teacher + student)
│   │           ├── page.tsx              ← Lobby + danh sách phòng
│   │           └── [id]/result/          ← Kết quả sau khi thi
│   │
│   ├── components/
│   │   ├── ui/                           ← Base components (DÙNG CÁI NÀY)
│   │   ├── checklist/                    ← Pomodoro timer, Quote động lực, Lịch hôm nay
│   │   ├── exam/                         ← Bộ làm bài trắc nghiệm, Anti-cheat
│   │   ├── gamification/                 ← Leaderboard, check-in, shop (ĐÃ CÓ, TÁI SỬ DỤNG)
│   │   ├── proctoring/                   ← Camera giám sát + Gaze tracker (ĐÃ CÓ)
│   │   ├── pwa/                          ← Banner cài đặt PWA
│   │   ├── realtime/                     ← Số học sinh tham gia realtime
│   │   └── shared/                       ← Loading, stats card tái sử dụng
│   │
│   ├── lib/
│   │   ├── supabase/                     ← client.ts & server.ts (IMPORT TỪ ĐÂY)
│   │   ├── gamification/                 ← Logic XP, Level, Huy hiệu (ĐÃ CÓ)
│   │   └── subjects.ts                   ← Danh sách môn học (IMPORT TỪ ĐÂY)
│   │
│   ├── services/
│   │   ├── scoring.ts                    ← Chấm điểm tự động (ĐÃ CÓ)
│   │   └── user-server.ts                ← Quản lý hồ sơ, vai trò
│   │
│   └── hooks/                            ← useAuth, useAnswerForm... (ĐÃ CÓ)
```

---

## ── DATABASE SCHEMA THỰC TẾ ─────────────────────────────────────────────────

```sql
-- Bảng chính (đã tồn tại, KHÔNG tạo lại, chỉ query)

profiles               -- Hồ sơ học sinh
  id          UUID     FK → auth.users
  role        TEXT     'student'
  full_name   TEXT
  class       TEXT
  xp          INT      -- tổng XP tích lũy
  level       INT      -- level hiện tại
  avatar_url  TEXT

exams                  -- Đề thi được giao
  id, title, subject, duration, total_questions
  status               'published' | 'draft'
  is_scheduled, start_time, end_time

questions              -- Câu hỏi
  id, exam_id, question_text   -- hỗ trợ LaTeX
  options JSONB                -- mảng 4 đáp án
  correct_answer INT           -- index 0-3
  order_index INT

submissions            -- Bài làm của học sinh
  id, exam_id, student_id
  answers JSONB        -- {questionIndex: chosenOptionIndex}
  score NUMERIC
  time_spent INT       -- giây

arena_sessions         -- Phòng đấu trường
  id, host_id, exam_id
  status               'waiting' | 'active' | 'ended'
  started_at TIMESTAMPTZ

notifications          -- Thông báo từ giáo viên
  id, user_id, title, message, type, is_read

-- Gamification (ĐÃ CÓ, tái sử dụng)
achievements           -- Định nghĩa huy hiệu
user_achievements      -- Huy hiệu học sinh đã đạt (user_id, achievement_id, unlocked_at)
rewards                -- Phần thưởng trong shop (tên, giá XP, mô tả)
user_rewards           -- Phần thưởng đã đổi
daily_checkins         -- Lịch sử điểm danh (user_id, date, xp_earned)
user_titles            -- Danh hiệu đặc biệt đã đạt
```

---

## ── API ROUTES ĐÃ CÓ SẴN ────────────────────────────────────────────────────

```typescript
// Dùng các route này — KHÔNG tạo lại:

POST   /api/daily-checkin     // Điểm danh hàng ngày → +XP → cập nhật streak
GET    /api/achievements      // Danh sách thành tích + trạng thái của học sinh
GET    /api/rewards           // Danh sách phần thưởng trong shop
POST   /api/rewards           // Đổi XP lấy phần thưởng
GET    /api/challenges        // Thử thách hàng ngày hiện tại
GET    /api/titles            // Danh hiệu đã đạt
GET    /api/exams             // Đề thi được giao cho học sinh
GET    /api/exams/[id]        // Chi tiết đề + câu hỏi để làm bài
POST   /api/exams/[id]        // Nộp bài → auto chấm → trả kết quả
GET    /api/profile           // Hồ sơ cá nhân
POST   /api/upload-avatar     // Upload ảnh đại diện
GET    /api/study-sessions    // Lịch sử phòng voice Discord
```

---

## ── DESIGN SYSTEM ───────────────────────────────────────────────────────────

### Palette — Dark Mode Gamified
| Token | Hex | Dùng cho |
|---|---|---|
| Surface | `#0F0F23` | Background toàn trang |
| Card | `#1A1A3E` | Card, panel |
| Card 2 | `#1E1E4A` | Card hover, nested |
| Border | `#2D2D6B` | Border, divider |
| Primary | `#6366F1` | Button, active, link |
| Accent XP | `#F59E0B` | XP, streak, phần thưởng |
| Accent Rank | `#8B5CF6` | Rank, prestige |
| Text | `#F1F5F9` | Nội dung chính |
| Muted | `#94A3B8` | Nhãn phụ, timestamp |
| Success | `#22C55E` | Đúng, đạt |
| Danger | `#EF4444` | Sai, cảnh báo |
| Streak | `#F97316` | Lửa streak |

### Rank Colors
```typescript
// lib/gamification/ đã có — dùng lại
const RANK_COLORS = {
  Bronze:   '#CD7F32',
  Silver:   '#C0C0C0',
  Gold:     '#FFD700',
  Platinum: '#E8E8E8',
  Diamond:  '#B9F2FF',
};
```

### Typography
- **Heading:** `font-bold` weight 700-800 (Plus Jakarta Sans nếu có, hoặc Inter)
- **Body:** `font-normal` / `font-medium`
- **Số liệu:** `font-mono` (điểm, XP, timer)

### Signature Element
XP Progress Bar phát sáng chạy ngang màn hình trong Topbar.
CSS: `box-shadow: 0 0 12px #6366F1, 0 0 24px #6366F180`.

---

## ── LAYOUT TỔNG THỂ ────────────────────────────────────────────────────────

```
┌──────────────────────────────────────────────────────────────────┐
│  TOPBAR (full width, dark #0F0F23)                               │
│  [Logo] · [XP Bar ████████░░ 85% — glow] · [🔥7] · [🔔] · [👤] │
├──────────────────────────────────────────────────────────────────┤
│  NAV TABS (horizontal):                                          │
│  [Trang Chủ] [Làm Đề] [Đấu Trường] [Thành Tích] [Thống Kê]    │
│              [Checklist] [Cùng Học] [Phần Thưởng] [Thông Báo]  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                   PAGE CONTENT (dark bg)                        │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

Mobile: Nav tabs thu gọn thành **Bottom Tab Bar** (5 tab chính quan trọng nhất).

---

## ── TRANG 1: `/student/dashboard` — Trang Chủ ─────────────────────────────

**File:** `src/app/student/dashboard/page.tsx`

### Hero Section
```
┌──────────────────────────────────────────────────────────────────┐
│  Chào mừng trở lại, Minh Tuấn! 👋                               │
│                                                                  │
│  ┌────────────────────────┐   🔥 Streak: 7 ngày                 │
│  │ [Avatar + rank ring]   │   Level 12 · Gold                    │
│  │                        │   XP: 4,280 / 5,000                 │
│  │                        │   [██████████░░░] 85%               │
│  └────────────────────────┘   Còn 720 XP → Level 13            │
└──────────────────────────────────────────────────────────────────┘
```
```typescript
// Query hồ sơ học sinh hiện tại
const { data: profile } = await supabase
  .from('profiles')
  .select('full_name, xp, level, avatar_url, class')
  .eq('id', userId)
  .single();
```

### Điểm Danh Hàng Ngày
- Button "🎁 Điểm Danh Hôm Nay" (nếu chưa điểm danh)
- Gọi `POST /api/daily-checkin` → nhận XP + thông báo kết quả
- Nếu đã điểm danh: hiện "✅ Đã điểm danh hôm nay (+50 XP)"
- Dùng `daily_checkins` table để check

### 4 KPI Cards
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📝 Đề đã làm │ │ ⭐ Điểm TB  │ │ 🏆 Hạng lớp │ │ 🔥 Streak   │
│   [NUMBER]   │ │  [X.X/10]   │ │   #[N]/35   │ │  [N] ngày   │
│ tuần này: +3 │ │ +0.5 tháng  │ │ ↑ 2 vị trí  │ │ kỷ lục: 14  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### Đề Thi Được Giao (Timeline)
- Lấy từ `exams` được phân công, sắp xếp theo `start_time`
- Mỗi item: tên đề + môn học + thời gian + trạng thái (Chưa làm / Đã nộp / Quá hạn)
- Badge "⏰ Hôm nay" / "📅 Ngày mai" / "🔴 Quá hạn"
- Button: "Làm Bài" (nếu đang trong khoảng start_time – end_time)

### Phòng Đấu Trường Sắp Mở
- Lấy từ `arena_sessions` với `status = 'waiting'`
- Countdown đến giờ mở phòng
- Button "Vào Phòng" (nếu đã đến giờ)

### Thử Thách Hàng Ngày
- Gọi `GET /api/challenges`
- Hiện 3 thử thách với progress bar
- Ví dụ: "Làm đúng 5 câu Toán" · "Đạt điểm ≥ 8 trong 1 đề" · "Điểm danh hôm nay"

---

## ── TRANG 2: `/student/exams` — Làm Đề Thi ────────────────────────────────

**Files:**
- `src/app/student/exams/page.tsx` — danh sách
- `src/app/student/exams/[id]/page.tsx` — làm bài
- `src/app/student/exams/[id]/result/page.tsx` — kết quả

### Danh Sách Đề

**Tab 1: Được Giao**
- Đề từ giáo viên có `status = 'published'`
- Filter: tất cả / chưa làm / đã làm / quá hạn

**Tab 2: Lịch Sử Thi**
- Lấy từ `submissions` join `exams`
- Cột: Tên đề · Môn · Điểm · Thời gian làm · Ngày nộp
- Sort theo ngày (mới nhất trước)

### Giao Diện Làm Bài (Full Screen)
```typescript
// Sử dụng component/exam/ đã có sẵn:
// - Digital question viewer
// - Anti-cheat (tab visibility, copy-paste block)
// - useAnswerForm hook (đã có)
```

```
┌──────────────────────────────────────────────────────────────────┐
│  Kiểm Tra Giải Tích      Câu 5/40      ⏱ 01:12:35  [Nộp Bài] │
├──────────────────────────────────────────────────────────────────┤
│  QUESTION MAP: [1✓][2✓][3✓][4✓][5•][6 ][7 ]...[40 ]           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Câu 5 — Tính đạo hàm của f(x) = x³ - 3x² + 2x + 1           │
│  (LaTeX render — dùng component/exam/ đã có)                    │
│                                                                  │
│  ○ A.  f'(x) = 3x² - 6x + 2                                    │
│  ● B.  f'(x) = 3x² - 3x          ← đang chọn                   │
│  ○ C.  f'(x) = x² - 6x + 2                                     │
│  ○ D.  f'(x) = 3x - 6                                          │
│                                                                  │
│         [← Câu Trước]              [Câu Tiếp →]                │
└──────────────────────────────────────────────────────────────────┘
```

**Anti-cheat** (dùng `components/proctoring/` đã có):
- Kích hoạt nếu giáo viên bật tính năng giám sát
- Camera check + gaze tracker (`components/proctoring/`)
- Cảnh báo khi rời tab (tab visibility event)

**Nộp bài:**
```typescript
// services/scoring.ts đã có — dùng cho auto-chấm
const result = await fetch(`/api/exams/${examId}`, {
  method: 'POST',
  body: JSON.stringify({ answers, timeSpent })
});
// → lưu vào submissions table
// → tự động tính score dựa trên correct_answer
// → cập nhật XP qua lib/gamification/
```

### Trang Kết Quả
```
┌──────────────────────────────────────────────────────────────────┐
│  KẾT QUẢ BÀI THI                                               │
│                                                                  │
│          [⭕ 7.5/10]                                            │
│      30/40 câu đúng · 90 phút                                   │
│      +150 XP · Hạng trong lớp: #8                               │
│                                                                  │
│  PHÂN TÍCH TỪNG CÂU                                            │
│  ✅ Câu 1: Đúng          ❌ Câu 5: Sai (Đáp án đúng: A)        │
│  ✅ Câu 2: Đúng              [Xem giải thích chi tiết]          │
│  ...                                                             │
│                                                                  │
│  [Xem Lại Bài]     [Về Danh Sách]     [Chia Sẻ Kết Quả]       │
└──────────────────────────────────────────────────────────────────┘
```

---

## ── TRANG 3: `/student/achievements` — Thành Tích ─────────────────────────

**File:** `src/app/student/achievements/page.tsx`

> 💡 Dùng lại `components/gamification/` đã có sẵn nếu có badge components.

### Rank Progress Card
```
┌──────────────────────────────────────────────────────────────────┐
│  [Avatar + gold aura]   Level 12 · Gold Rank 🏆                 │
│                          XP: 4,280 / 7,000 để đạt Platinum      │
│  [Bronze]──[Silver]──[GOLD ●]──[Platinum]──[Diamond]            │
│                             bạn đây                             │
└──────────────────────────────────────────────────────────────────┘
```

### Huy Hiệu Grid
- Lấy từ `achievements` join `user_achievements`
- Filter: Tất cả / Đã mở / Chưa mở
- Badge đã mở: màu đầy đủ + hiện ngày đạt được
- Badge chưa mở: grayscale + overlay lock + tooltip "Điều kiện: ..."
- Progress bar cho badge đang tiến tới

```typescript
const { data: allAchievements } = await supabase.from('achievements').select('*');
const { data: userAchievements } = await supabase
  .from('user_achievements')
  .select('achievement_id, unlocked_at')
  .eq('user_id', userId);
```

### Danh Hiệu Đặc Biệt
- Lấy từ `user_titles`
- Badge đặc biệt (màu gradient) được trao bởi giáo viên hoặc system

### Streak Calendar (Heatmap kiểu GitHub)
- 12 tuần gần nhất, lấy từ `daily_checkins`
- Màu cell theo số XP kiếm được trong ngày
  - 0 hoạt động: `#1A1A3E`
  - Ít: `#312E81`
  - Nhiều: `#6366F1`
  - Max: `#A5B4FC`
- Hover tooltip: "12/06: 3 bài thi, +320 XP"

---

## ── TRANG 4: `/student/analytics` — Thống Kê Cá Nhân ──────────────────────

**File:** `src/app/student/analytics/page.tsx`

### Radar Chart — Kỹ Năng Theo Môn (Recharts RadarChart)
- 6-8 trục = 6-8 môn học (từ `lib/subjects.ts`)
- Tính từ `submissions` join `exams.subject` → điểm TB mỗi môn
- 2 polygons: "Của bạn" vs "Trung bình lớp"

### Biểu Đồ Tiến Bộ Theo Thời Gian (Recharts LineChart)
- X-axis: ngày/tuần, Y-axis: điểm trung bình
- Có thể filter theo môn học
- Hiện xu hướng: cải thiện hay đi xuống

### Heatmap Hoạt Động
- Tương tự GitHub contribution — số câu làm theo ngày
- Lấy từ `submissions.created_at` + `time_spent`

### Phân Tích Điểm Yếu
- Top 5 topic/chủ đề có tỉ lệ sai cao nhất
- Tính từ `submissions.answers` JSONB vs `questions.correct_answer`
- Button: "Luyện ngay" → link sang đề luyện topic đó

### Thống Kê Nhanh
- Tổng giờ học · Tổng câu đúng · Đề thi đã hoàn thành · Cuộc thi đã tham gia

---

## ── TRANG 5: `/student/checklist` — Nhiệm Vụ & Pomodoro ──────────────────

**File:** `src/app/student/checklist/page.tsx`

> 💡 Dùng lại `components/checklist/` đã có (Pomodoro, Quote động lực, Lịch).

### Layout 2 cột

**Trái — Pomodoro Timer**
```
┌──────────────────────────────────┐
│  🍅 Pomodoro                    │
│                                  │
│       [25:00]                   │
│   ĐANG HỌC                      │
│                                  │
│  [Bắt Đầu]  [Nghỉ]  [Reset]    │
│                                  │
│  Phiên 1/4 · Nghỉ sau 25p       │
└──────────────────────────────────┘
```
- Dùng lại component Pomodoro từ `components/checklist/`
- Sound notification khi hết giờ (Web Audio API)
- Sau 4 phiên: tự nghỉ dài 15 phút

**Phải — Danh Sách Nhiệm Vụ**
```
┌──────────────────────────────────┐
│  📋 Hôm Nay                    │
│                                  │
│  ✅ Học Toán — Chương 2         │
│  ⬜ Làm đề Lý tuần này          │
│  ⬜ Ôn tập Hóa hữu cơ           │
│  ──────────────────────          │
│  [+ Thêm nhiệm vụ]              │
└──────────────────────────────────┘
```
- CRUD nhiệm vụ (lưu local state hoặc Supabase nếu muốn persistent)
- Hoàn thành → gạch ngang + animation check
- Quote động lực xoay (từ `data/` folder đã có)

### Sub-dashboard: `/student/X/checklist`
Route này là phiên bản **cá nhân hóa** (X = student ID), có thể giáo viên assign nhiệm vụ trực tiếp cho học sinh X. Implement tương tự nhưng data từ Supabase (không dùng local state).

---

## ── TRANG 6: `/student/rewards` — Shop Phần Thưởng ───────────────────────

**File:** `src/app/student/rewards/page.tsx`

> 💡 Dùng lại `components/gamification/` cho phần shop đã có sẵn.

### Header
- Hiện XP hiện tại của học sinh (to, màu amber)
- "Bạn có **4,280 XP** để đổi quà"

### Grid Phần Thưởng (từ `rewards` table)
```
┌───────────────────┐ ┌───────────────────┐ ┌───────────────────┐
│  🎮 Skin Avatar   │ │  📚 Tài Liệu VIP  │ │  ⭐ Danh Hiệu    │
│  Kim Cương        │ │  Toán 12 Full     │ │  "Thiên Tài"      │
│                   │ │                   │ │                   │
│  500 XP           │ │  1000 XP          │ │  2000 XP          │
│  [Đổi Ngay]       │ │  [Đổi Ngay]       │ │  [Đổi Ngay]       │
└───────────────────┘ └───────────────────┘ └───────────────────┘
```
```typescript
// GET /api/rewards — danh sách phần thưởng
// POST /api/rewards — đổi quà
const response = await fetch('/api/rewards', {
  method: 'POST',
  body: JSON.stringify({ reward_id: rewardId })
});
// API sẽ: check XP đủ không → trừ XP → ghi user_rewards → trả kết quả
```
- Disable button nếu XP không đủ
- Hiện "Đã đổi ✅" nếu có trong `user_rewards`
- Confirm modal trước khi đổi: "Bạn có chắc muốn dùng 500 XP?"

---

## ── TRANG 7: `/student/co-study` — Phòng Tự Học Nhóm ─────────────────────

**File:** `src/app/student/co-study/page.tsx`

### Phòng Học Đang Mở
- Card mỗi phòng: Tên phòng + môn học + số người đang online + host
- Button "Tham Gia" → join realtime channel

### Tạo Phòng Mới
- Modal: Tên phòng · Môn học · Công khai / Riêng tư · Mật khẩu (nếu riêng)

### Trong Phòng (Realtime)
```
┌──────────────────────────────────────────────────────────────────┐
│  📚 Phòng Ôn Toán 12 — Chương Đạo Hàm      🟢 Online: 4       │
├────────────────────────┬─────────────────────────────────────────┤
│  THÀNH VIÊN ONLINE     │  CHAT NHANH                            │
│  🟢 Minh Tuấn (bạn)   │  Tuấn: Mọi người hiểu câu 5 không?    │
│  🟢 Hà Linh           │  Linh: Hiểu rồi, để tui giải thích      │
│  🟢 Bảo Châu          │  ...                                    │
│  🟢 Nam               │  [Nhập tin nhắn...]  [Gửi]             │
└────────────────────────┴─────────────────────────────────────────┘
```
- Dùng Supabase Realtime Presence để track online users
- Chat đơn giản qua Supabase Realtime channel

---

## ── TRANG 8: `/student/notifications` — Thông Báo ─────────────────────────

**File:** `src/app/student/notifications/page.tsx`

### Layout
- Tabs: `Tất cả` · `Chưa đọc` · `Đề thi` · `Đấu trường` · `Thành tích`
- Lấy từ `notifications` where `user_id = auth.uid()`

```typescript
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Notification Item
```
┌──────────────────────────────────────────────────────────────────┐
│ 🔵 📝 Đề thi mới                              10 phút trước    │
│    Thầy Nguyễn đã giao đề "Kiểm tra cuối kỳ"                   │
│    Hạn nộp: 20/06/2025 · 90 phút              [Làm Bài]        │
├──────────────────────────────────────────────────────────────────┤
│    🏆 Thành tích mới                          1 giờ trước      │
│    Bạn vừa đạt huy hiệu "Streak Warrior" (7 ngày liên tiếp)    │
└──────────────────────────────────────────────────────────────────┘
```
- Mark as read khi click (update `is_read = true`)
- Bulk "Đánh dấu tất cả đã đọc"
- Badge số thông báo chưa đọc trên nav icon

---

## ── TRANG 9: `/student/X/timetable` — Thời Khóa Biểu Cá Nhân ─────────────

**File:** `src/app/student/[id]/timetable/page.tsx`

### Lịch Tuần (Calendar View)
```
        Thứ 2   Thứ 3   Thứ 4   Thứ 5   Thứ 6   Thứ 7
07:00  │        │       │       │       │       │
07:30  │Toán    │       │Toán   │       │Toán   │
08:00  │        │Vật Lý │       │Vật Lý │       │
```
- Đồng bộ từ giáo viên (đã tạo trong `teacher/timetable`)
- Học sinh thêm task tự học riêng
- Color code theo môn (từ `subjects.ts`)
- Click tiết → popup chi tiết (bài học, tài liệu liên quan)

### Today Summary
- Tiết học hôm nay · Bài tập cần nộp · Cuộc thi sắp diễn ra

---

## ── ARENA (Route chung) `/arena` ───────────────────────────────────────────

**Files:**
- `src/app/(pages)/arena/page.tsx` — Lobby
- `src/app/(pages)/arena/[id]/result/page.tsx` — Kết quả

### Lobby
```
┌──────────────────────────────────────────────────────────────────┐
│  ⚔️ ARENA                                    🔴 ĐANG LIVE: 1   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🏆 Arena Toán 12 — Đang diễn ra                         │   │
│  │  ⏱ Còn: 00:45:12     👥 34 học sinh                     │   │
│  │  [           VÀO THI NGAY           ]                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  SẮP MỞ:                                                        │
│  [Arena Hóa 11 · 20:00]  [Tốc Chiến Lý · 19:00 ngày mai]      │
└──────────────────────────────────────────────────────────────────┘
```

### Live Arena (trong phòng)
```
┌──────────────────────────────────────────────────────────────────┐
│ 🔴LIVE  Arena Toán 12     Câu 12/40     ⏱ 01:45   Hạng: #5   │
├──────────────────────────────────────────────────────────────────┤
│  [Câu hỏi LaTeX render — components/exam/ đã có]               │
│                                                                  │
│  [A] ...    [B] ...    [C] ...    [D] ...                       │
│                                                                  │
│  LIVE RANKING: 👑 Linh 92đ  |  Tuấn (bạn) 88đ  |  Châu 85đ   │
└──────────────────────────────────────────────────────────────────┘
```
- Timer đổi màu amber < 30s, đỏ < 10s + pulse
- Realtime leaderboard (Supabase Realtime channel `arena:${sessionId}`)
- Dùng `components/realtime/` đã có

### Kết Quả Arena
```
┌──────────────────────────────────────────────────────────────────┐
│     [🥈]       [🥇]       [🥉]                                  │
│   Tuấn      Linh       Châu                                     │
│   88đ        92đ        85đ                                     │
│                                                                  │
│  Bạn đứng vị trí #2 / 34                                        │
│  +200 XP · +25 điểm thưởng                                     │
│                                                                  │
│  [Xem Bảng Xếp Hạng Đầy Đủ]   [Về Trang Chủ]                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## ── GAMIFICATION LOGIC (Dùng Từ `lib/gamification/`) ──────────────────────

```typescript
// lib/gamification/ đã có — IMPORT VÀ DÙNG LẠI, không viết mới

// XP events
import { awardXP } from '@/lib/gamification';

// Sau khi nộp bài:
await awardXP(userId, 'exam_submit', { score, examId });

// Sau khi điểm danh:
await awardXP(userId, 'daily_checkin', {});

// Kiểm tra và mở khóa huy hiệu tự động:
await checkAndUnlockAchievements(userId);
```

---

## ── PROCTORING (Giám Sát Thi — Dùng `components/proctoring/`) ─────────────

```typescript
// components/proctoring/ đã có — dùng khi giáo viên bật tính năng

// Trong trang làm bài (student/exams/[id]/page.tsx):
import { ProctoringProvider } from '@/components/proctoring';

// Bọc giao diện làm bài với ProctoringProvider
// - Camera check
// - Gaze tracker (theo dõi ánh mắt)
// - Tab visibility (cảnh báo khi rời tab)
```

---

## ── COMPONENT ARCHITECTURE ─────────────────────────────────────────────────

```
src/
├── app/student/
│   ├── layout.tsx                  ← StudentLayout (topbar + XP bar + nav tabs)
│   ├── dashboard/page.tsx          ← Trang chủ
│   ├── exams/
│   │   ├── page.tsx                ← Danh sách đề thi
│   │   ├── [id]/page.tsx           ← Làm bài (dùng components/exam/)
│   │   └── [id]/result/page.tsx    ← Kết quả + phân tích
│   ├── achievements/page.tsx       ← Huy hiệu + rank + streak calendar
│   ├── analytics/page.tsx          ← Radar chart + biểu đồ tiến bộ
│   ├── checklist/page.tsx          ← Pomodoro + todo list
│   ├── co-study/page.tsx           ← Phòng tự học nhóm
│   ├── notifications/page.tsx      ← Hộp thư thông báo
│   ├── rewards/page.tsx            ← Shop XP
│   └── [id]/
│       ├── dashboard/page.tsx      ← Sub-dashboard cá nhân
│       ├── checklist/page.tsx      ← Checklist cá nhân
│       └── timetable/page.tsx      ← Thời khóa biểu

└── components/student/             ← Tạo mới, đặt tại đây
    ├── StudentTopbar.tsx            ← XP glow bar + streak + notif badge
    ├── StudentNavTabs.tsx           ← Horizontal nav + bottom mobile
    ├── HeroWelcome.tsx              ← Avatar + level + XP
    ├── DailyCheckinButton.tsx       ← Điểm danh + animation
    ├── KPICards.tsx                 ← 4 stats cards
    ├── AssignedExamTimeline.tsx     ← Đề thi được giao
    ├── DailyChallenges.tsx          ← Thử thách hàng ngày
    ├── RankCard.tsx                 ← Rank progress + aura
    ├── AchievementGrid.tsx          ← Badge grid
    ├── StreakCalendar.tsx           ← GitHub heatmap
    ├── AnalyticsRadar.tsx           ← Recharts RadarChart
    ├── ProgressLineChart.tsx        ← Tiến bộ theo thời gian
    ├── RewardShopGrid.tsx           ← Shop grid + đổi quà
    ├── NotificationList.tsx         ← List thông báo
    ├── CoStudyRoom.tsx              ← Phòng học nhóm realtime
    └── ArenaLobby.tsx               ← Lobby + countdown
```

---

## ── RLS POLICIES ────────────────────────────────────────────────────────────

```typescript
// Tất cả query Supabase PHẢI filter theo user hiện tại:
const { data: { user } } = await supabase.auth.getUser();

// Submissions của học sinh này
const { data } = await supabase
  .from('submissions')
  .select('*')
  .eq('student_id', user.id);    // ← BẮT BUỘC

// Notifications của học sinh này
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id);       // ← BẮT BUỘC

// Dùng server client cho Server Components:
import { createClient } from '@/lib/supabase/server';
const supabase = await createClient();
```

---

## ── QUALITY CHECKLIST ───────────────────────────────────────────────────────

- [ ] Import Supabase từ `@/lib/supabase/client` hoặc `@/lib/supabase/server`
- [ ] Import subjects từ `@/lib/subjects.ts` (không hardcode tên môn)
- [ ] Dùng `lib/gamification/` cho mọi tính toán XP/Level/Badge
- [ ] Dùng `services/scoring.ts` cho chấm điểm (không tự viết lại)
- [ ] Dùng `components/gamification/` cho Leaderboard/Check-in/Shop
- [ ] Dùng `components/proctoring/` cho giám sát thi (không viết mới)
- [ ] Dùng `hooks/useAnswerForm.ts` cho form làm bài (đã có)
- [ ] Dark mode TOÀN BỘ — không có element nền trắng
- [ ] Tất cả text tiếng Việt đúng dấu
- [ ] Countdown timer không drift (dùng `Date.now()`, không `setInterval` cộng dồn)
- [ ] Loading skeleton cho mọi async section
- [ ] Empty state cho list rỗng (icon + CTA rõ ràng)
- [ ] Toast sau mọi action
- [ ] Session làm bài lưu vào `sessionStorage` (không mất khi tab blur)
- [ ] Bottom Tab Bar trên mobile (5 tab chính)

---

## ── THỨ TỰ IMPLEMENT ────────────────────────────────────────────────────────

1. `src/app/student/layout.tsx` — StudentLayout + Topbar + XP bar glow
2. `src/app/student/dashboard/page.tsx` — Hero + check-in + KPI + đề được giao
3. `src/app/student/exams/` — Danh sách + làm bài + kết quả
4. `src/app/(pages)/arena/` — Lobby + live + kết quả
5. `src/app/student/achievements/page.tsx` — Huy hiệu + streak calendar
6. `src/app/student/analytics/page.tsx` — Radar + biểu đồ tiến bộ
7. `src/app/student/rewards/page.tsx` — Shop XP
8. `src/app/student/checklist/page.tsx` — Pomodoro + todo
9. `src/app/student/co-study/page.tsx` — Phòng học nhóm
10. `src/app/student/notifications/page.tsx` — Thông báo
11. `src/app/student/[id]/timetable/page.tsx` — Thời khóa biểu cá nhân
