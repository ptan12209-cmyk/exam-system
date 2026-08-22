# Reliability — E2E smoke tests & Sentry

> Mục tiêu: không bao giờ phát hiện lỗi "qua lời học sinh phàn nàn".

## 1. Playwright E2E smoke tests

### Chạy local

```bash
npm run test:e2e          # chạy toàn bộ (dev server tự bật nếu chưa chạy)
npm run test:e2e:ui       # UI mode debug
npx playwright test e2e/guards.spec.ts   # chỉ bộ không cần tài khoản
```

### Các bộ spec

| File | Cần gì | Kiểm chứng gì |
|------|--------|----------------|
| `e2e/guards.spec.ts` | Không cần gì | Route guards (login redirect, feature-lock redirect), API 401/403/503, health generic, login sai mật khẩu báo lỗi |
| `e2e/rls-security.spec.ts` | `E2E_STUDENT_*` + Supabase env | **Học sinh KHÔNG đọc được đáp án**, không INSERT/UPDATE/DELETE submission, view an toàn không chứa cột đáp án |
| `e2e/student-flow.spec.ts` | `E2E_STUDENT_*` | Login → dashboard → danh sách đề → trang làm bài tải đề. **Mặc định KHÔNG nộp bài thật**; chỉ nộp khi `E2E_FULL_EXAM=true` |
| `e2e/teacher-flow.spec.ts` | `E2E_TEACHER_*` | Các trang quản lý GV tải đúng; HS không vào được trang GV |

### Biến môi trường (đặt trong `.env.local` hoặc Vercel/GitHub Secrets)

```
E2E_BASE_URL=            # bỏ trống để tự bật dev server; đặt URL khi test deployment
E2E_STUDENT_EMAIL=
E2E_STUDENT_PASSWORD=
E2E_TEACHER_EMAIL=
E2E_TEACHER_PASSWORD=
E2E_FULL_EXAM=true       # CHỈ bật khi test trên dữ liệu thử, không bật trên prod
```

### CI

`.github/workflows/ci.yml` có job `e2e` chạy `guards.spec.ts` (không cần secret) trên
mỗi push/PR vào `main`. Các spec cần tài khoản tự skip khi thiếu credentials —
muốn chạy đầy đủ trên CI thì thêm secrets `E2E_STUDENT_EMAIL/...` và bỏ điều kiện skip.

> ⚠️ Lưu ý: CI hiện chỉ trigger trên `main`. Nhánh làm việc cần PR vào main
> (hoặc thêm branch vào `on.push.branches`) để được kiểm tra.

## 2. Sentry error tracking

SDK đã được wire sẵn (`@sentry/nextjs` v10) và **hoàn toàn im lặng cho đến khi
bạn cung cấp DSN** — không ảnh hưởng build hay runtime hiện tại.

### Kích hoạt (5 phút)

1. Tạo tài khoản tại [sentry.io](https://sentry.io) (free tier đủ dùng) → Create project → **Next.js**
2. Lấy DSN dạng `https://xxx@oXXX.ingest.us.sentry.io/XXX`
3. Thêm env vars (local `.env.local` + Vercel → Settings → Environment Variables):

```
NEXT_PUBLIC_SENTRY_DSN=https://...        # bắt buộc
SENTRY_ORG=                               # tùy chọn, để upload sourcemaps
SENTRY_PROJECT=                           # tùy chọn
SENTRY_AUTH_TOKEN=                        # tùy chọn — có thì tự upload sourcemaps
```

4. Deploy lại. Test bằng cách truy cập một URL gây lỗi, thấy event trên Sentry dashboard.

### Những gì được capture

| Nơi | Cơ chế | File |
|-----|--------|------|
| Client (browser) | `instrumentation-client.ts` — lỗi JS, promise rejection | `src/instrumentation-client.ts` |
| Server (API routes, RSC) | `onRequestError` qua `instrumentation.ts` | `src/instrumentation.ts` |
| Edge/middleware | `sentry.edge.config.ts` | `src/sentry.edge.config.ts` |
| React render crash toàn trang | `global-error.tsx` boundary | `src/app/global-error.tsx` |

### Riêng tư

- `sendDefaultPii: false` ở cả client lẫn server.
- Client `beforeSend` xóa payload nhạy cảm (`image_base64`, đáp án học sinh)
  khỏi event trước khi gửi.
- CSP `connect-src` đã cho phép `*.sentry.io` / `*.ingest.sentry.io`.
- Không có DSN ⇒ SDK không init ⇒ zero overhead.

## 3. Quy ước khi có sự cố production

1. Mở Sentry → lọc theo `environment` (vercel env) → xem stack + release
2. RLS/API lỗi thường hiện `permission denied` / `403` — đối chiếu `docs/SECURITY_HARDENING.md`
3. Sau khi fix, thêm regression test vào `e2e/` để lần sau CI bắt được
