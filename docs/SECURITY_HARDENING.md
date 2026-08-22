# Security Hardening — Chống lộ đáp án & tài liệu nội bộ

> Ngày: 2026-08-22 · Migration: `migrations/migration-security-hardening.sql`

## Vấn đề đã vá

| Mã | Rủi ro | Cách vá |
|----|--------|---------|
| C1 | Học sinh SELECT trực tiếp bảng `exams` → đọc **toàn bộ đáp án** mọi đề đã publish ngay từ browser | Xóa policy `exams_student_select_published`. HS đọc qua view `exams_public` (không có cột đáp án, chỉ dòng `published`) |
| C2 | Bảng `questions` lộ `correct_answer`, `explanation` | Xóa policy `questions_student_select`. HS đọc qua view `questions_public` |
| C3 | Bucket storage `exam-pdfs` + `exams` **PUBLIC** — ai cũng tải được đề nội bộ | Chuyển bucket sang private. HS nhận **signed URL 6h** do `/api/exams/[id]/questions` cấp sau khi qua kiểm tra eligibility. GV/admin đọc trực tiếp. `avatars` giữ public |
| C4 | HS tự UPDATE/DELETE submission của mình (sửa điểm, xóa bài thi lại) | `REVOKE INSERT/UPDATE/DELETE ON submissions FROM authenticated` — ghi chỉ qua API server (service role) |
| C5 | HS INSERT submission giả với điểm 10 | Như trên — `/api/exams/submit` chấm điểm server-side, insert bằng service role |
| H1 | Đọc chéo bài làm + đáp án của cả lớp khi đang thi (policy "ranked submissions") | Xóa mệnh đề. Xếp hạng chỉ qua RPC `get_exam_leaderboard` (aggregate, không có đáp án) |
| H4 | Mọi user đọc profile đầy đủ của mọi GV (email, SĐT, discord) | Xóa mệnh đề blanket. GV chỉ đọc được profile: chính mình, HS mình quản lý (`parent_student_links`), HS **đã nộp bài vào đề của mình** |
| H2 | Ghi khuôn mặt hộ học sinh bất kỳ qua `/api/monitor/analyze` | Bắt buộc `manages_student()` |
| H3 | Proxy LLM trả phí không auth (`/api/ai/outline`) | `requireAuth` + rate limit 5/5ph + cap input |
| M1 | `/api/exams/[id]/questions` không kiểm tra đúng khối lớp/được giao | Thêm check `assigned_to` + `target_grade` + `target_classes` |
| M2 | Avatar upload: path sai policy, tin Content-Type client | Upload vào `<uid>/<ts>.<ext>`, sniff magic bytes |
| M4 | Anti-cheat counters do client ghi đè | `sync-draft` giữ MAX(server, client) — không reset được |
| M5 | `submit-offline` bỏ qua publish/schedule, tin timestamp client | Check `status='published'` + window server-side; timestamp = server |
| M6 | Auth cache 32-bit hash dễ collision | SHA-256 |
| M7 | Thiếu rate limit: export, send-notification, upload-avatar | Đã thêm |
| L5 | `submit` không kiểm tra session thuộc về user | Thêm `.eq('student_id', user.id)` |
| L6 | `/api/health` lộ env nào đang cấu hình | Chỉ trả `{ok, ts}` |

## Cách áp dụng lên Supabase (BẮT BUỘC)

1. Mở **Supabase Dashboard → SQL Editor**
2. Dán toàn bộ nội dung `migrations/migration-security-hardening.sql` → **Run**
3. Xác minh:

```sql
-- HS không còn đọc đáp án trực tiếp (chạy với role authenticated):
-- → phải lỗi permission denied
select correct_answers from public.exams limit 1;

-- View an toàn hoạt động:
select count(*) from public.exams_public;

-- RPC trả null khi chưa nộp bài:
select public.get_graded_exam_for_student('<exam-uuid>');
```

4. Không cần cấu hình thêm — code đã đồng bộ với schema mới.

## Luồng dữ liệu đáp án sau khi vá

```
HS làm bài   → GET  /api/exams/[id]/questions  (server strip keys, signed PDF URL)
HS nộp bài   → POST /api/exams/submit          (server chấm bằng service role, client không ghi DB được)
HS xem kết quả → RPC get_graded_exam_for_student (chỉ trả keys khi ĐÃ có submission)
Bảng xếp hạng  → RPC get_exam_leaderboard       (aggregate: tên + điểm + thời gian)
GV toàn quyền  → bảng gốc qua RLS owns_exam()
```

## Đã biết / cố tình giữ nguyên

- `arena_results`, `student_stats` cho client tự ghi — feature đang khóa (`ARENA_ENABLED`, `GAMIFICATION_ENABLED = false`), sẽ khóa RLS khi bật lại.
- `GazeTracker` + `@mediapipe/*` + `@tensorflow/*`: dead code, chỉ tốn dung lượng install — sẽ dọn khi tối ưu bundle.
- VNPay sandbox fallback trong `src/lib/vnpay.ts` (fail-closed ở prod) — cần rotate key.
- OTP pepper fallback dev — cần đặt `OTP_PEPPER` riêng trên Vercel.

## Checklist vận hành đề xuất

- [x] Chạy migration SQL trên Supabase
- [ ] Vercel: đảm bảo `SUPABASE_SERVICE_ROLE_KEY` đã set (submit API cần)
- [ ] Test thủ công: HS làm bài → nộp → xem kết quả → làm lại
- [ ] Test GV: tạo đề (upload PDF) → publish → xem bài nộp HS → export CSV
- [ ] Xác nhận HS không tải được PDF qua URL public cũ (404)
