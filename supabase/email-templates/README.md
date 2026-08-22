# Bộ mẫu Email Supabase Auth (Dream Violet & Hallmark)

Bộ mẫu email này được thiết kế riêng cho hệ thống **ExamHub**, tuân thủ nghiêm ngặt nguyên tắc **Hallmark (chống phong cách sáo rỗng của AI)** và phối màu **Dream Violet** chuẩn của dự án:
- **Nền tổng thể**: Obsidian `#0B0A13`
- **Thẻ nội dung**: Card Surface `#15131F` với viền tinh tế `#2A2344`
- **Màu chủ đạo (Accent)**: Tím Dream `#C18CFF`
- **Mã OTP**: Font Monospace (`JetBrains Mono`), viền bo góc `#363056`
- **Khả năng tương thích**: Tối ưu chuẩn HTML Table cho Gmail, Apple Mail, Outlook, iOS, Android (hỗ trợ tốt cả Light Mode và Dark Mode).

---

## Danh sách mẫu thư & Thiết lập trong Supabase Dashboard

Vào **Supabase Dashboard** -> **Authentication** -> **Email Templates**:

### 1. Confirm sign up
- **Tiêu đề email (Subject)**: `Xác nhận đăng ký tài khoản ExamHub`
- **Tệp nguồn**: `1-confirm-signup.html`
- **Biến Supabase**: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .SiteURL }}`

### 2. Invite user
- **Tiêu đề email (Subject)**: `Lời mời tham gia hệ thống ExamHub`
- **Tệp nguồn**: `2-invite-user.html`
- **Biến Supabase**: `{{ .ConfirmationURL }}`, `{{ .Email }}`

### 3. Magic link or OTP
- **Tiêu đề email (Subject)**: `{{ .Token }} là mã đăng nhập nhanh ExamHub của bạn`
- **Tệp nguồn**: `3-magic-link-otp.html`
- **Biến Supabase**: `{{ .ConfirmationURL }}`, `{{ .Token }}`

### 4. Change email address
- **Tiêu đề email (Subject)**: `Xác nhận thay đổi địa chỉ email ExamHub`
- **Tệp nguồn**: `4-change-email.html`
- **Biến Supabase**: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .NewEmail }}`

### 5. Reset password
- **Tiêu đề email (Subject)**: `Yêu cầu đặt lại mật khẩu ExamHub`
- **Tệp nguồn**: `5-reset-password.html`
- **Biến Supabase**: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .Email }}`

### 6. Reauthentication
- **Tiêu đề email (Subject)**: `{{ .Token }} là mã xác thực bảo mật ExamHub`
- **Tệp nguồn**: `6-reauthentication.html`
- **Biến Supabase**: `{{ .Token }}`, `{{ .Email }}`
