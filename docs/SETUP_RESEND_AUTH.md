# Hướng dẫn setup Auth: Resend OTP + Google + Reset password

Áp dụng sau khi đã deploy code (migration + env). Làm lần lượt.

---

## 1. Chạy migration SQL (Supabase)

1. Mở **Supabase Dashboard → SQL Editor**
2. Paste toàn bộ file:

   `migrations/migration-feedback-and-email-verify.sql`

3. Run. Kiểm tra:

   - Bảng `email_otps`, `system_feedback` đã có
   - Cột `profiles.email_verified_at`, `profiles.account_source` đã có
   - User cũ được backfill `email_verified_at` (không bị lock)

---

## 2. Resend (gửi OTP)

1. Đăng ký / đăng nhập [resend.com](https://resend.com)
2. **API Keys** → Create → copy key (`re_...`) — **không commit key vào Git / chat công khai**
3. **Domains** → Add domain (vd. `luyende.id.vn`)
4. Thêm DNS records Resend yêu cầu (SPF, DKIM, DMARC) → đợi **Verified**

### DNS mẫu (domain `luyende.id.vn` — dán đúng name/host Resend hiển thị)

| Type | Name / Host (thường) | Value |
|------|----------------------|--------|
| **TXT (DKIM)** | `resend._domainkey` (hoặc host Resend chỉ định) | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDDgm5cKJGsfhew2osR839ArgBy+4zvno5deovXWU9exyGSjRqWJSoYEGwZ0ZZuKlT8B507E/EHAoLfvvXPQbued5ZkO9kuhMDkh+DoAaRBSQXXqn4xSvaOMWTFpg5f46+XglWdJVEqTnZXkZ1Pa1E0hWx0lyrOvL1yR4fJKSZCFwIDAQAB` — *prefix đầy đủ thường là `v=DKIM1; k=rsa; p=...` theo Resend* |
| **MX (SPF feedback)** | `send` (hoặc subdomain Resend) | `feedback-smtp.ap-northeast-1.amazonses.com` (priority 10) |
| **TXT (SPF)** | `send` (cùng host MX) | `v=spf1 include:amazonses.com ~all` |
| **TXT (DMARC)** | `_dmarc` | `v=DMARC1; p=none;` |

> Host chính xác (root vs `send` / `resend._domainkey`) **copy từ Resend Dashboard → Domain**, không đoán — mỗi domain Resend ghi khác nhau.

5. Env (local `.env.local` + **Vercel → Project → Settings → Environment Variables**):

```env
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=StudyHub <noreply@luyende.id.vn>
OTP_PEPPER=chuoi-ngau-nhien-dai-it-nhat-32-ky-tu
NEXT_PUBLIC_APP_URL=https://luyende.id.vn
```

6. Redeploy Vercel sau khi thêm env.

**Test OTP**

- Đăng ký tài khoản mới (self-register)
- Check inbox / spam: subject dạng `1234 — Mã xác thực StudyHub`
- Nếu chưa có `RESEND_API_KEY`, server log in dev sẽ in `DEV OTP for email@...: ####`

---

## 3. Supabase Auth URLs

**Authentication → URL Configuration**

| Field | Value |
|-------|--------|
| Site URL | `https://your-production-domain.com` |
| Redirect URLs | `https://your-production-domain.com/auth/callback` |
| | `https://your-production-domain.com/reset-password` |
| | `http://localhost:3000/auth/callback` (dev) |
| | `http://localhost:3000/reset-password` (dev) |

**Email templates (optional)**  
Reset password: dùng template mặc định của Supabase (link tới `/reset-password`).

---

## 4. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create **OAuth client ID** → Web application
3. Authorized redirect URIs (quan trọng — URL **Supabase** callback, không phải app):

   ```
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```

4. Copy Client ID + Client Secret
5. Supabase → **Authentication → Providers → Google** → Enable → dán ID/Secret → Save
6. Trên app: nút **Tiếp tục với Google** ở `/login` → redirect `/auth/callback`

**Test:** login Google → profile `account_source=google`, `email_verified_at` có giá trị, không bị banner OTP.

---

## 5. Quy tắc verify (nhắc nhanh)

| Nguồn tài khoản | OTP? |
|-----------------|------|
| Đăng ký email (`self_register`) | Có — gửi sau register; soft 5 ngày; sau 5 ngày redirect `/verify-email` |
| Thầy cấp (`/api/online-study/create-student`) | Không — `account_source=teacher` + verified ngay |
| Google | Không — verified ngay |

---

## 6. Checklist nghiệm thu

- [ ] Migration đã chạy
- [ ] Env Resend + OTP_PEPPER + APP_URL trên Vercel
- [ ] Register → nhận OTP → verify → vào học
- [ ] Sau 5 ngày chưa verify → bị đưa về `/verify-email`
- [ ] Thầy cấp TK → login không OTP
- [ ] Quên mật khẩu → email Supabase → `/reset-password` OK
- [ ] Google login OK
- [ ] Góp ý HS → thầy thấy `/teacher/feedback`

---

## 7. Troubleshooting

| Hiện tượng | Kiểm tra |
|------------|----------|
| OTP không về | RESEND_API_KEY, domain verified, spam, log server |
| Reset password fail | Redirect URLs Supabase, Site URL |
| Google “redirect_uri_mismatch” | URI Google Cloud phải là `...supabase.co/auth/v1/callback` |
| User cũ bị chặn verify | Chạy lại backfill `email_verified_at` trong migration |
| Góp ý 500 | Migration `system_feedback` chưa apply / RLS |
