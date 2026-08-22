# AI Engine — Xưởng AI cho giáo viên

> Phase A của lộ trình AI. Model pool: **OpenRouter (free)** + **Google AI Studio**.

## Cấu hình (bắt buộc trước khi dùng)

Thêm env vars (local `.env.local` + Vercel):

```
# OpenRouter — model text mặc định (free tier)
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemma-4-26b-a4b-it   # tùy chọn, đây là default

# Google AI Studio — vision + failover pool
GEMINI_API_KEY=...                            # đã có sẵn trong project
GEMINI_MODEL=gemini-2.0-flash                 # tùy chọn
```

- Có 1 trong 2 key là chạy được; có cả 2 = **pool tự failover** (429/5xx → chuyển provider)
- Tác vụ **đọc ảnh** cần vision: mặc định route qua AI Studio (Gemma free chưa bật vision;
  nếu model của bạn hỗ trợ, đặt `OPENROUTER_VISION=1`)
- Không có key nào → các route trả 503, UI vẫn hoạt động bình thường

## 3 tính năng (tại `/teacher/ai` — "AI Studio" trên sidebar)

| Tab | Route | Làm gì |
|-----|-------|--------|
| **Tạo câu hỏi** | `POST /api/ai/generate-questions` | Dán lý thuyết → sinh MC/TF/SA kèm đáp án + lời giải. Xem bản nháp hoặc lưu thẳng vào ngân hàng câu hỏi |
| **Đáp án từ ảnh** | `POST /api/ai/parse-answer-image` | Chụp bảng đáp án → JSON cùng định dạng `multiple_choice / true_false / short_answer` với khung nhập tay |
| **Lời giải** | `POST /api/ai/explain` | 1 câu hỏi + đáp án → lời giải ngắn tiếng Việt |

## Nguyên tắc an toàn

- API keys **chỉ nằm server-side** — browser không bao giờ thấy
- Mọi route: `requireRole(teacher/admin)` + rate limit riêng + cap độ dài input
- Output AI được validate bằng zod (`draftQuestionSchema`) / tái sử dụng `parseAnswerJson`
  → AI không thể inject dữ liệu bậy vào DB
- Kết quả AI luôn ở trạng thái **bản nháp** — GV duyệt rồi mới dùng
- Không gửi PII học sinh lên model

## Kiến trúc

```
src/lib/ai/engine.ts      ← provider pool + failover (OpenAI-compatible wire)
src/lib/ai/prompts.ts     ← prompt builders (hợp đồng output nghiêm ngặt)
src/lib/ai/json-utils.ts  ← trích JSON từ output LLM (chống markdown/prose)
src/app/api/ai/*          ← 3 route (teacher-only)
src/app/teacher/ai        ← UI xưởng AI
```

## Roadmap tiếp theo

- [ ] Phase B: phát hiện trùng/bài làm giống nhau giữa HS (server-side similarity)
- [ ] Phase C: động cơ đánh giá năng lực theo tag/chương sau nhiều lượt làm bài
- [ ] Batch lời giải cho toàn bộ đề (1 click cho N câu)
- [ ] Nhập tài liệu PDF thay vì dán text (dùng pdf-parse đã có trong deps)
