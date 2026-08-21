# Performance Optimization — Tăng tốc tải trang

> Ngày: 2026-08-22 · Migration kèm theo: `migrations/migration-perf-helpers.sql`

## ⚠️ Bắt buộc chạy SQL

Chạy `migrations/migration-perf-helpers.sql` trên Supabase SQL Editor trước/n cùng lúc khi deploy.
RPC mới `get_unsubmitted_exam_count()` thay cho 4 query tuần tự mà MobileNav chạy
trên **mọi trang học sinh** (đếm đề chưa làm cho badge chấm đỏ).

## Đã tối ưu

| # | Thay đổi | File | Tác động |
|---|----------|------|----------|
| 1 | **Xóa framer-motion khỏi bundle dùng chung**: bỏ `template.tsx` (PageTransition) + toast chuyển sang CSS animation | `src/app/template.tsx`(xóa), `components/ui/toast.tsx`, `globals.css` | −30–50KB gz mọi route + bỏ delay 0.4s mỗi lần chuyển trang |
| 2 | **Dynamic import react-pdf (~1MB)**: chỉ load khi đề PDF thực sự render | `student/exams/[id]/take/page.tsx` | TTI trang làm bài giảm mạnh, đề digital không tải pdf.js |
| 3 | **Middleware fetch profile 1 lần/request** (trước: 2–3 lần) | `src/middleware.ts` | Mỗi navigation bớt 1–2 DB round-trip |
| 4 | **MobileNav badge**: 4 query tuần tự → 1 RPC + cache sessionStorage 60s | `components/pwa/MobileNav.tsx` | Mọi trang HS bớt 3 query + không kéo toàn bộ exams/submissions |
| 5 | **Dashboard HS song song hóa** (Promise.all): stats/exams/submissions/rank chạy đồng thời | `student/dashboard/page.tsx` | 7 round-trip tuần tự → ~3 nhóm song song |
| 6 | Trang danh sách đề HS song song hóa tương tự | `student/exams/page.tsx` | 5 → 3 nhóm |
| 7 | Analytics HS: profile/stats/submissions/student_stats đồng thời | `student/analytics/page.tsx` | 5 tuần tự → 1 batch |
| 8 | Notifications HS: song song + `.limit(50)` | `student/notifications/page.tsx` | Không kéo toàn bộ bảng thông báo |
| 9 | **Teacher dashboard**: submissions chỉ lấy 8 ngày gần nhất (chart chỉ cần 7) + song song hóa toàn bộ fetch | `teacher/dashboard/page.tsx` | Payload tỉ lệ thuận với usage → giờ là hằng số nhỏ |
| 10 | **Service worker cache-first** cho `_next/static` + fonts (immutable); bỏ auto-reload sau deploy | `public/sw.js`, `ServiceWorkerRegister.tsx` | Repeat visits nhanh hơn hẳn, hết hiện tượng reload kép sau deploy |
| 11 | **Bỏ `generateBuildId: Date.now()`** — Next tự tạo build id theo nội dung chunk | `next.config.ts` | Chunk không đổi giữa các deploy vẫn hit cache |
| 12 | Image formats AVIF/WebP | `next.config.ts` | Ảnh nhẹ hơn qua next/image |
| 13 | Tắt preload font Plus Jakarta + IBM Plex (chỉ brand DOL/Swiss dùng) | `layout.tsx` | Font payload trang đầu (Dream brand) giảm đáng kể |
| 14 | Realtime NotificationBell lọc `user_id` server-side | `NotificationBell.tsx` | Hết nhận stream INSERT của toàn bảng |

## Kết hợp với Phase 1 (Security)

- Các trang HS đã chuyển sang `exams_public` với select cột tường minh → không còn kéo
  đáp án (payload lớn nhất trước đây).
- Leaderboard HS đi qua RPC có sẵn cache 30s ở API route.

## Đề xuất cho giai đoạn sau

- Chuyển dần page sang Server Components để tận dụng streaming/RSC.
- `loading.tsx` skeleton per-segment cho cảm giác tải tức thì.
- Dọn dead code: `GazeTracker`, `@tensorflow/*`, `@mediapipe/*`, `services/exam-server.ts`,
  `services/submission-server.ts` (không ai import).
- Cache `/api/exams/[id]/questions` metadata ngắn hạn nếu cần.
